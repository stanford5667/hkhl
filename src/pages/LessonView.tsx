import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUsage } from '@/contexts/UsageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
  Download,
  Play,
  Lock,
  Sparkles,
  LogIn,
  X,
  BarChart3,
  Search,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileAuthSheet } from '@/components/auth/MobileAuthSheet';
import { UpgradeModal } from '@/components/premium/UpgradeModal';
import { launchCheckout } from '@/lib/checkout';

import { getPreviewLimitSeconds, getPreviewLabel, isLessonPreviewable, getPreviewableLessonCount } from '@/lib/coursePreview';
import { getTopicThumbnail } from '@/lib/lessonThumbnails';


// Premium dark thumbnail gradients
const THUMB_GRADIENTS = [
  'from-[hsl(200,60%,8%)] via-[hsl(220,40%,12%)] to-[hsl(240,30%,6%)]',
  'from-[hsl(260,50%,10%)] via-[hsl(230,40%,12%)] to-[hsl(210,30%,6%)]',
  'from-[hsl(170,40%,8%)] via-[hsl(200,35%,10%)] to-[hsl(230,30%,6%)]',
  'from-[hsl(30,40%,8%)] via-[hsl(20,30%,10%)] to-[hsl(240,20%,6%)]',
  'from-[hsl(340,40%,10%)] via-[hsl(280,30%,10%)] to-[hsl(240,25%,6%)]',
  'from-[hsl(210,50%,10%)] via-[hsl(230,45%,14%)] to-[hsl(250,30%,6%)]',
];



export default function LessonView() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro } = useUsage();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLIFrameElement | HTMLVideoElement>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [previewEnded, setPreviewEnded] = useState(false);
  const [measuredDuration, setMeasuredDuration] = useState<number | null>(null);


  // Fetch lesson details
  const { data: lesson } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_lessons')
        .select(`
          *,
          module:course_modules(
            id,
            title,
            order_index,
            course:courses(id, title)
          )
        `)
        .eq('id', lessonId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch all lessons in course for navigation
  const { data: allLessons } = useQuery({
    queryKey: ['course-lessons', lesson?.module?.course?.id],
    queryFn: async () => {
      if (!lesson?.module?.course?.id) return [];

      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          id,
          title,
          order_index,
          lessons:course_lessons(
            id,
            title,
            order_index,
            is_preview
          )
        `)
        .eq('course_id', lesson.module.course.id)
        .order('order_index');

      if (error) throw error;
      return data;
    },
    enabled: !!lesson?.module?.course?.id,
  });

  // Fetch lesson progress
  const { data: progress } = useQuery({
    queryKey: ['lesson-progress', lessonId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch study materials for this lesson
  const { data: materials } = useQuery({
    queryKey: ['lesson-materials', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_materials')
        .select('*')
        .eq('lesson_id', lessonId);

      if (error) throw error;
      return data;
    },
  });

  // Mark lesson as complete mutation
  const completeLessonMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
          last_position: lesson?.video_duration || 0,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
      toast.success('Lesson marked as complete!');
    },
  });

  // Update video position mutation
  const updatePositionMutation = useMutation({
    mutationFn: async (position: number) => {
      if (!user) return;

      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          last_position: position,
        });

      if (error) throw error;
    },
  });

  // Auto-save progress every 10 seconds
  useEffect(() => {
    if (!user || !lesson) return;

    const interval = setInterval(() => {
      if (videoProgress > 0) {
        updatePositionMutation.mutate(videoProgress);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [videoProgress, user, lesson]);

  // Reset per-lesson playback state when navigating between lessons —
  // otherwise a finished preview leaves the "Preview ended" overlay stuck on
  // the next lesson the user opens.
  useEffect(() => {
    setPreviewEnded(false);
    setVideoProgress(0);
    setMeasuredDuration(null);
  }, [lessonId]);

  const handleMarkComplete = () => {
    completeLessonMutation.mutate();
  };

  const isDirectVideoUrl = (url: string) => {
    const clean = url.split('?')[0].toLowerCase();
    return clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.webm') || clean.endsWith('.m4v');
  };

  const getVideoEmbedUrl = (url: string, provider: string, limitSeconds?: number) => {
    if (provider === 'youtube') {
      const videoId = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
      const endParam = limitSeconds ? `&start=0&end=${limitSeconds}` : '';
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0${endParam}`;
    }
    if (provider === 'vimeo') {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };


  const getCurrentLessonIndex = () => {
    if (!allLessons) return -1;
    let currentIndex = -1;
    let lessonCount = 0;
    for (const module of allLessons) {
      for (const l of (module.lessons || [])) {
        if (l.id === lessonId) {
          currentIndex = lessonCount;
          break;
        }
        lessonCount++;
      }
      if (currentIndex !== -1) break;
    }
    return currentIndex;
  };

  const navigateToLesson = (direction: 'next' | 'prev') => {
    if (!allLessons) return;
    const flatLessons = allLessons.flatMap(m => m.lessons || []);
    const currentIndex = getCurrentLessonIndex();
    if (currentIndex === -1) return;
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < flatLessons.length) {
      navigate(`/academy/lesson/${flatLessons[nextIndex].id}`);
    }
  };

  const handlePlayClick = () => {
    if (hasVideoAccess) return;
    setShowUpgradeModal(true);
  };

  const totalLessons = allLessons?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;

  if (!lesson) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  // Non-Pro viewers can only preview the first 30% of the course's lessons,
  // and each of those plays as a short capped window.
  const flatLessonIds = allLessons?.flatMap((m: any) => (m.lessons || []).map((l: any) => l.id)) || [];
  const lessonIndex = flatLessonIds.indexOf(lesson.id);
  const lessonCount = flatLessonIds.length || totalLessons;
  const previewableCount = getPreviewableLessonCount(lessonCount);
  const hasFullAccess = Boolean(user && isPro);
  const canPreviewThisLesson = lessonCount === 0 || isLessonPreviewable(lessonIndex, lessonCount);
  const hasVideoAccess = hasFullAccess || canPreviewThisLesson;
  const isPreviewOnly = !hasFullAccess && canPreviewThisLesson;
  const effectiveDuration = lesson?.video_duration || measuredDuration;
  const previewLimit = getPreviewLimitSeconds(effectiveDuration);
  const previewLabel = getPreviewLabel(effectiveDuration);
  const courseProgress = 45;
  const previewSecondsLeft = Math.max(0, Math.round(previewLimit - videoProgress));
  const showPreviewWarning =
    isPreviewOnly && !previewEnded && videoProgress > 5 && previewSecondsLeft <= 45;

  // One-click upgrade: skip the extra modal step and go straight to Stripe.
  const startCheckout = () =>
    launchCheckout(
      {
        plan: 'research_education',
        billingInterval: 'annual',
        source: 'lesson_preview_paywall',
        returnPath: `/academy/lesson/${lessonId}`,
      },
      { onNeedsAuth: () => setShowAuthSheet(true) },
    );



  const gradientIndex = (lesson.module?.order_index || 0) % THUMB_GRADIENTS.length;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/academy" className="hover:text-foreground transition-colors">Academy</Link>
          <span>/</span>
          <Link
            to={`/academy/course/${lesson.module?.course?.id}`}
            className="hover:text-foreground transition-colors"
          >
            {lesson.module?.course?.title}
          </Link>
          <span>/</span>
          <span className="text-foreground">{lesson.title}</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* ─── Video Player Tease ─── */}
          <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/40">
            <div className="aspect-video relative">
              {hasVideoAccess && lesson.video_url ? (
                /* Actual video for paying users */
                (lesson.video_provider === 'custom' && isDirectVideoUrl(lesson.video_url)) ? (
                  <video
                    ref={videoRef as React.RefObject<HTMLVideoElement>}
                    className="w-full h-full object-cover"
                    src={lesson.video_url}
                    controls
                    onLoadedMetadata={(e) => {
                      const el = e.currentTarget as HTMLVideoElement;
                      if (Number.isFinite(el.duration) && el.duration > 0) {
                        setMeasuredDuration(Math.floor(el.duration));
                      }
                    }}
                    preload="metadata"
                    onTimeUpdate={(e) => {
                      const el = e.currentTarget as HTMLVideoElement;
                      setVideoProgress(Math.floor(el.currentTime));
                      if (isPreviewOnly && el.currentTime >= previewLimit) {
                        el.pause();
                        el.currentTime = previewLimit;
                        setPreviewEnded(true);
                      }
                    }}
                    onSeeking={(e) => {
                      const el = e.currentTarget as HTMLVideoElement;
                      if (isPreviewOnly && el.currentTime > previewLimit) {
                        el.currentTime = previewLimit;
                      }
                    }}
                  />
                ) : (
                  <iframe
                    ref={videoRef as React.RefObject<HTMLIFrameElement>}
                    src={getVideoEmbedUrl(
                      lesson.video_url,
                      lesson.video_provider || 'youtube',
                      isPreviewOnly ? previewLimit : undefined
                    )}
                    title={lesson.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )
              ) : (

                /* Premium Thumbnail Tease — visible to everyone without access */
                <div
                  className="w-full h-full cursor-pointer group relative select-none"
                  onClick={handlePlayClick}
                >
                  {/* Dark premium gradient background */}
                  {/* Relevant real-world photo for the lesson topic */}
                  <img
                    src={getTopicThumbnail(lesson.title, lesson.module?.title, lesson.module?.course?.title)}
                    alt={lesson.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${THUMB_GRADIENTS[gradientIndex]} opacity-60`} />

                  {/* Subtle noise texture overlay */}
                  <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")' }} />

                  {/* Faux player chrome — bottom bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent flex items-end px-4 pb-2.5">
                    <div className="flex items-center gap-3 w-full">
                      <Play className="w-4 h-4 text-white/60 fill-white/60" />
                      <div className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
                        <div className="h-full w-0 rounded-full bg-primary" />
                      </div>
                      <span className="text-[11px] text-white/40 font-mono tabular-nums">
                        {lesson.video_duration
                          ? `0:00 / ${Math.floor(lesson.video_duration / 60)}:${String(lesson.video_duration % 60).padStart(2, '0')}`
                          : '0:00 / --:--'}
                      </span>
                    </div>
                  </div>

                  {/* 🔒 Premium Badge — top right */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white/80 tracking-wide uppercase">
                      <Lock className="w-3 h-3" />
                      Premium
                    </span>
                  </div>

                  {/* Center Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-[72px] h-[72px] rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.12] flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-300"
                    >
                      <Play className="w-8 h-8 text-white fill-white ml-0.5 drop-shadow-lg" />
                    </motion.div>
                  </div>

                  {/* Title watermark */}
                  <div className="absolute top-3 left-4">
                    <p className="text-white/30 text-xs font-medium tracking-wider uppercase">
                      {lesson.module?.course?.title}
                    </p>
                  </div>
                </div>
              )}

              {/* Preview badge */}
              {isPreviewOnly && (
                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white/80 tracking-wide uppercase">
                    <Sparkles className="w-3 h-3" />
                    {previewLabel ? `${previewLabel} preview` : 'Free preview'}
                  </span>
                </div>
              )}

              {/* Preview running out — nudge before the hard stop */}
              <AnimatePresence>
                {showPreviewWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-background/85 backdrop-blur-md px-3 py-2"
                  >
                    <p className="text-xs md:text-sm text-foreground">
                      <span className="font-semibold text-primary">
                        {previewSecondsLeft}s
                      </span>{' '}
                      of preview left — unlock the full lesson and the rest of the Academy.
                    </p>
                    <Button size="sm" onClick={startCheckout}>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Unlock now
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>



              {/* Preview limit reached — paywall overlay */}
              <AnimatePresence>
                {isPreviewOnly && previewEnded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-md px-6 text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg md:text-2xl font-bold tracking-tight">
                        You just saw the setup. Pro shows you the trade.
                      </p>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        The rest of this lesson breaks down the hedge-fund process step by step — then
                        you run it yourself with{' '}
                        <span className="font-semibold text-foreground">AI backtesting</span>, the
                        screener, and live trade ideas from the chatroom.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <span>Instant access</span>
                        <span className="text-primary">•</span>
                        <span>Cancel anytime</span>
                        <span className="text-primary">•</span>
                        <span>Full Academy included</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button size="lg" onClick={startCheckout}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Unlock the full lesson
                      </Button>
                      <Button variant="outline" onClick={() => setShowUpgradeModal(true)}>
                        See what Pro includes
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setPreviewEnded(false);
                          const el = videoRef.current as HTMLVideoElement | null;
                          if (el && 'currentTime' in el) el.currentTime = 0;
                        }}
                      >
                        Rewatch preview
                      </Button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 pt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-primary" />
                        Backtest this lesson's thesis
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-primary" />
                        Screen the same setup
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-primary" />
                        Chatroom trade ideas
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>


          {/* ─── Upgrade Modal ─── */}
          <UpgradeModal
            isOpen={showUpgradeModal}
            feature="courses"
            onClose={() => setShowUpgradeModal(false)}
          />

          {/* ─── Lesson Info ─── */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-xl md:text-2xl mb-2">{lesson.title}</CardTitle>
                  <p className="text-muted-foreground">
                    {lesson.description || 'No description available.'}
                  </p>
                </div>
                {user && hasVideoAccess && (
                  !progress?.completed ? (
                    <Button
                      onClick={handleMarkComplete}
                      disabled={completeLessonMutation.isPending}
                      variant="outline"
                      className="shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-500 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold">Completed</span>
                    </div>
                  )
                )}
              </div>
            </CardHeader>
          </Card>

          {/* ─── Tabs for Content, Materials ─── */}
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="materials">
                Materials ({materials?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              {lesson.content && (
                <Card>
                  <CardHeader>
                    <CardTitle>Lesson Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="materials" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Study Materials</CardTitle>
                </CardHeader>
                <CardContent>
                  {materials && materials.length > 0 ? (
                    <div className="space-y-3">
                      {materials.map((material: any) => (
                        <div
                          key={material.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium">{material.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {material.description}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No materials available for this lesson yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigateToLesson('prev')}
              disabled={getCurrentLessonIndex() === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous Lesson
            </Button>
            <Button
              onClick={() => navigateToLesson('next')}
              disabled={
                !allLessons ||
                getCurrentLessonIndex() ===
                  allLessons.flatMap(m => m.lessons || []).length - 1
              }
            >
              Next Lesson
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* ─── Sidebar - Course Curriculum ─── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall</span>
                  <span className="font-semibold">{courseProgress}%</span>
                </div>
                <Progress value={courseProgress} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course Content</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {allLessons?.map((module: any, moduleIndex: number) => (
                  <div key={module.id} className="border-b last:border-0">
                    <div className="p-4 font-semibold bg-muted/50 text-sm">
                      {moduleIndex + 1}. {module.title}
                    </div>
                    <div>
                      {module.lessons?.map((l: any, lessonIndex: number) => {
                        const isCurrentLesson = l.id === lessonId;
                        const globalIndex = flatLessonIds.indexOf(l.id);
                        const isLocked = false;


                        return (
                          <Link
                            key={l.id}
                            to={`/academy/lesson/${l.id}`}
                            className={`block p-3 pl-5 hover:bg-muted/50 transition-colors text-sm ${
                              isCurrentLesson ? 'bg-primary/10 border-l-4 border-primary' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="line-clamp-1 flex-1">
                                {moduleIndex + 1}.{lessonIndex + 1} {l.title}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {progress?.completed && isCurrentLesson && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                )}
                                {isLocked && (
                                  <Lock className="w-3 h-3 text-muted-foreground/50" />
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
