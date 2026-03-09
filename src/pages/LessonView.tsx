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
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
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
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileAuthSheet } from '@/components/auth/MobileAuthSheet';

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
  const { isResearchTier } = useUsage();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLIFrameElement | HTMLVideoElement>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);

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

  const handleMarkComplete = () => {
    completeLessonMutation.mutate();
  };

  const isDirectVideoUrl = (url: string) => {
    const clean = url.split('?')[0].toLowerCase();
    return clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.webm') || clean.endsWith('.m4v');
  };

  const getVideoEmbedUrl = (url: string, provider: string) => {
    if (provider === 'youtube') {
      const videoId = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
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
    if (hasVideoAccess) return; // Access granted, video plays normally
    setShowUpgradeModal(true);
  };

  const handleSubscribe = async () => {
    if (!user) {
      setShowUpgradeModal(false);
      setShowAuthSheet(true);
      return;
    }
    setIsCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: 'research_education', return_path: `/academy/lesson/${lessonId}` }
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setIsCheckoutLoading(false);
    }
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

  const isFreeLesson = lesson?.is_preview;
  const hasVideoAccess = user && (isResearchTier || isFreeLesson);
  const courseProgress = 45;
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
                    preload="metadata"
                    onTimeUpdate={(e) => setVideoProgress(Math.floor((e.currentTarget as HTMLVideoElement).currentTime))}
                  />
                ) : (
                  <iframe
                    ref={videoRef as React.RefObject<HTMLIFrameElement>}
                    src={getVideoEmbedUrl(lesson.video_url, lesson.video_provider || 'youtube')}
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
                  <div className={`absolute inset-0 bg-gradient-to-br ${THUMB_GRADIENTS[gradientIndex]}`} />

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
            </div>
          </div>

          {/* ─── Upgrade Modal (Dialog) ─── */}
          <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
            <DialogContent className="sm:max-w-md border-white/10 bg-[hsl(230,25%,9%)] p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
              <DialogTitle className="sr-only">Unlock the Masterclass</DialogTitle>
              {/* Top accent line */}
              <div className="h-1 w-full bg-gradient-to-r from-primary via-cyan-400 to-primary" />

              <div className="p-8 text-center">
                {/* Icon */}
                <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>

                {/* Headline */}
                <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  Unlock the Masterclass
                </h2>

                {/* Subtext */}
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xs mx-auto">
                  Get instant access to <span className="text-foreground font-medium">{lesson.title}</span> and{' '}
                  <span className="text-foreground font-medium">{totalLessons}+ lessons</span> for{' '}
                  <span className="text-primary font-semibold">$100/month</span>
                </p>

                {/* Features */}
                <div className="flex flex-col gap-2 mb-7 text-left max-w-xs mx-auto">
                  {[
                    'Full video course library',
                    'Trade signals & community research',
                    'Strategy backtesting tools',
                    'Priority support'
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button
                  onClick={handleSubscribe}
                  disabled={isCheckoutLoading}
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all"
                >
                  {isCheckoutLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {user ? 'Subscribe & Start Learning' : 'Sign Up & Subscribe'}
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Auth sheet – shown when unauthenticated user hits subscribe */}
          <MobileAuthSheet
            open={showAuthSheet}
            onOpenChange={setShowAuthSheet}
            title="Create your account"
            description="Sign up first, then complete your Research & Education subscription."
            onSuccess={handleSubscribe}
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
                        const isFreeTier = l.is_preview;
                        const isLocked = !hasVideoAccess && !isFreeTier;

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
