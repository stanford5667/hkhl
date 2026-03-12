import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUsage } from '@/contexts/UsageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Clock,
  Users,
  Star,
  Play,
  CheckCircle2,
  Lock,
  BookOpen,
  Award,
  FileText,
  Sparkles,
  Shield,
  Zap,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Brain,
  Target,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import { MobileAuthSheet } from '@/components/auth/MobileAuthSheet';
import { useSocialProofToasts } from '@/components/academy/SocialProofToast';
import { ExitIntentPopup } from '@/components/academy/ExitIntentPopup';
import { TestimonialsSection } from '@/components/academy/TestimonialsSection';
import { BillingIntervalSheet } from '@/components/academy/BillingIntervalSheet';
import { MembershipStep } from '@/components/onboarding/MembershipStep';
import { FeatureComparisonPanel } from '@/components/auth/FeatureComparisonPanel';
import { Check, X } from 'lucide-react';

function getYouTubeThumbnail(url: string | null, provider: string | null): string | null {
  if (!url) return null;
  if (provider === 'youtube' || (!provider && url.includes('youtube.com'))) {
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  }
  return null;
}

// Gradient palette for CSS thumbnails based on lesson index
const THUMB_GRADIENTS = [
  'from-cyan-900/80 to-slate-900',
  'from-violet-900/80 to-slate-900',
  'from-amber-900/80 to-slate-900',
  'from-emerald-900/80 to-slate-900',
  'from-rose-900/80 to-slate-900',
  'from-blue-900/80 to-slate-900',
];

function LessonThumbnail({ lesson, index, thumbnail, isCompleted, canAccess }: {
  lesson: any; index: number; thumbnail: string | null;
  isCompleted: boolean; canAccess: boolean;
}) {
  const gradient = THUMB_GRADIENTS[index % THUMB_GRADIENTS.length];
  return (
    <div className="relative w-16 h-10 sm:w-24 sm:h-14 rounded-md overflow-hidden bg-muted flex-shrink-0 hidden xs:flex">
      {thumbnail ? (
        <img src={thumbnail} alt={lesson.title} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradient} p-1`}>
          <span className="text-[7px] sm:text-[8px] font-bold text-white/80 leading-tight text-center line-clamp-2 uppercase tracking-wide">
            {lesson.title}
          </span>
        </div>
      )}
      {lesson.video_duration != null && lesson.video_duration > 0 && (
        <span className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 bg-black/80 text-white text-[8px] sm:text-[10px] font-medium px-1 py-0.5 rounded">
          {formatLessonDuration(lesson.video_duration)}
        </span>
      )}
      {isCompleted && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
        </div>
      )}
      {!canAccess && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function formatLessonDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isResearchTier, isPro, refreshUsage, isLoading: isUsageLoading } = useUsage();
  const queryClient = useQueryClient();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [showBillingSheet, setShowBillingSheet] = useState(false);

  // Social proof toasts — show for guests/non-members
  useSocialProofToasts(!isResearchTier);

  // Check for successful subscription and auto-enroll
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionStatus = urlParams.get('subscription');
    
    if (subscriptionStatus === 'success' && user && courseId) {
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Refresh usage to get new subscription status
      refreshUsage().then(() => {
        // Auto-enroll in the course
        enrollMutation.mutate();
      });
    }
  }, [user, courseId]);

  // Fetch course details
  const { data: course, isLoading, error: courseError } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) throw new Error('No course ID');
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch course modules with lessons
  const { data: modules } = useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          *,
          lessons:course_lessons(*)
        `)
        .eq('course_id', courseId)
        .order('order_index')
        .order('order_index', { referencedTable: 'course_lessons' });

      if (error) throw error;
      return data;
    },
  });

  // Fetch enrollment
  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', courseId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch lesson progress
  const { data: lessonProgress } = useQuery({
    queryKey: ['lesson-progress-all', courseId, user?.id],
    queryFn: async () => {
      if (!user || !modules) return [];

      const lessonIds = modules.flatMap(m => m.lessons?.map((l: any) => l.id) || []);
      
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds);

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!modules,
  });

  // Fetch reviews
  const { data: reviews } = useQuery({
    queryKey: ['course-reviews', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_reviews')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
        });

      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Successfully enrolled in course!');
    },
    onError: (error) => {
      if (!error.message.includes('duplicate')) {
        toast.error('Failed to enroll: ' + error.message);
      }
    },
  });

  const handleSubscribe = async (skipAuthCheck = false) => {
    if (!user && !skipAuthCheck) {
      setShowAuthSheet(true);
      return;
    }

    // Show billing interval selection sheet
    setShowBillingSheet(true);
  };

  const handleStartLearning = () => {
    if (!user) {
      navigate('/auth', { state: { from: `/academy/course/${courseId}` } });
      return;
    }
    
    if (!isResearchTier && !course?.is_free) {
      handleSubscribe();
      return;
    }
    
    enrollMutation.mutate();
  };

  const completedLessons = new Set(
    lessonProgress?.filter(p => p.completed).map(p => p.lesson_id) || []
  );

  const totalLessons = modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
  const completedCount = completedLessons.size;
  const progressPercentage = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

  const getLevelColor = (level: string | null) => {
    switch (level) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'advanced': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Check if user has access (enrolled + subscribed, or free course)
  const hasAccess = enrollment && (isResearchTier || course?.is_free);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        <div className="animate-pulse space-y-4 sm:space-y-6">
          <div className="aspect-video bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }

  if (courseError || !course) {
    return (
      <div className="container mx-auto p-4 sm:p-6 text-center">
        <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl sm:text-2xl font-bold mb-2">
          {courseError ? 'Error loading course' : 'Course not found'}
        </h2>
        {courseError && (
          <p className="text-muted-foreground mb-4 text-sm">{(courseError as Error).message}</p>
        )}
        <Link to="/academy">
          <Button>Back to Academy</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 py-3 sm:p-6 max-w-6xl space-y-3 sm:space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-6">
          {/* Hero */}
          <Card className="overflow-hidden">
            {/* CSS Thumbnail */}
            <div className="relative aspect-[16/9] sm:aspect-video bg-[#0B0E14] flex items-center justify-center overflow-hidden">
              {/* Watermark text - responsive sizing */}
              <span className="absolute select-none text-[clamp(2rem,12vw,6rem)] lg:text-[5rem] font-extrabold tracking-tighter uppercase text-gray-800/30 leading-none pointer-events-none whitespace-nowrap">
                MASTERCLASS
              </span>
              {/* Overlay label - two lines */}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <span className="text-xs sm:text-sm md:text-base font-semibold tracking-[0.25em] sm:tracking-[0.35em] uppercase text-white/90">
                  INVESTMENT
                </span>
                <span className="text-xs sm:text-sm md:text-base font-semibold tracking-[0.25em] sm:tracking-[0.35em] uppercase text-white/90">
                  MASTERCLASS
                </span>
              </div>
              {course.is_free && (
                <Badge className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-green-500 text-white text-xs">Free Course</Badge>
              )}
              {!course.is_free && !isResearchTier && (
                <Badge className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-primary/90 text-primary-foreground text-xs flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span className="hidden sm:inline">Premium</span>
                </Badge>
              )}
            </div>
            <CardHeader className="p-3 sm:p-6">
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline" className={`text-xs ${getLevelColor(course.level)}`}>
                  {course.level || 'All Levels'}
                </Badge>
                <Badge variant="outline" className="text-xs">{course.category}</Badge>
              </div>
              <CardTitle className="text-lg sm:text-2xl md:text-3xl leading-tight">{course.title}</CardTitle>
              <CardDescription className={`text-sm sm:text-base ${!descExpanded ? 'line-clamp-5' : ''}`}>
                {course.description}
              </CardDescription>
              {course.description && course.description.length > 150 && (
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-xs text-primary hover:text-primary/80 font-medium mt-1 transition-colors"
                  >
                  {descExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  CS
                </div>
                <span className="text-foreground/80">Led by <span className="font-medium text-foreground">Chris Stanford</span>, Private Equity Investor</span>
              </div>
            </CardContent>
          </Card>

          {/* Value Prop Stats Bar — non-pro only */}
          {!hasAccess && (
            <Card className="overflow-hidden border-border/50">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{totalLessons}+ Lessons</p>
                      <p className="text-[10px] text-muted-foreground">Step-by-step</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Real Strategies</p>
                      <p className="text-[10px] text-muted-foreground">PE-grade tools</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">AI-Powered</p>
                      <p className="text-[10px] text-muted-foreground">Smart insights</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Certificate</p>
                      <p className="text-[10px] text-muted-foreground">On completion</p>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm h-9 sm:h-10"
                  onClick={() => {
                    if (!user) { setShowAuthSheet(true); return; }
                    handleSubscribe();
                  }}
                  disabled={isCheckoutLoading}
                >
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                  {isCheckoutLoading ? 'Loading...' : 'Start Your Investing Journey — from $83/mo'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs defaultValue="curriculum">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="curriculum" className="text-xs sm:text-sm">Curriculum</TabsTrigger>
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs sm:text-sm">Reviews ({reviews?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="curriculum" className="mt-4 sm:mt-6">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Course Content</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {modules?.length || 0} modules • {totalLessons} lessons
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Accordion type="multiple" defaultValue={modules?.[0] ? [modules[0].id] : []} className="w-full">
                    {modules?.map((module: any, moduleIndex: number) => (
                      <div key={module.id}>
                        <AccordionItem value={module.id}>
                          <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-left">
                              <span className="text-xs text-muted-foreground">
                                Module {moduleIndex + 1}
                              </span>
                              <span className="font-semibold text-sm sm:text-base">{module.title}</span>
                              <Badge variant="outline" className="text-xs w-fit">
                                {module.lessons?.length || 0} lessons
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="px-4 sm:px-6 pb-4 space-y-2">
                              {module.lessons?.map((lesson: any, lessonIndex: number) => {
                                const isCompleted = completedLessons.has(lesson.id);
                                const canAccess = hasAccess || lesson.is_preview;
                                const thumbnail = getYouTubeThumbnail(lesson.video_url, lesson.video_provider);
                                const globalIndex = modules!.slice(0, moduleIndex).reduce((s: number, m: any) => s + (m.lessons?.length || 0), 0) + lessonIndex;

                                return (
                                  <div
                                    key={lesson.id}
                                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                                    onClick={() => {
                                      navigate(`/academy/lesson/${lesson.id}`);
                                    }}
                                  >
                                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                      <LessonThumbnail
                                        lesson={lesson}
                                        index={globalIndex}
                                        thumbnail={thumbnail}
                                        isCompleted={isCompleted}
                                        canAccess={canAccess}
                                      />
                                      <div className="xs:hidden flex-shrink-0">
                                        {isCompleted ? (
                                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        ) : !canAccess ? (
                                          <Lock className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                          <Play className="w-4 h-4 text-muted-foreground" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-xs sm:text-sm truncate">
                                          {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                                        </p>
                                        {lesson.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-1 hidden sm:block">{lesson.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    {lesson.is_preview && !hasAccess && lessonIndex === 0 ? (
                                      <Badge className="text-[10px] sm:text-xs flex-shrink-0 ml-2 bg-primary/15 text-primary border-primary/30 gap-1">
                                        <Play className="w-2.5 h-2.5" />
                                        Free Preview
                                      </Badge>
                                    ) : lesson.is_preview && !hasAccess ? (
                                      <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0 ml-2">Preview</Badge>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                        {/* Inline CTA after every 2nd module for non-pro */}
                        {!hasAccess && moduleIndex > 0 && moduleIndex % 2 === 1 && moduleIndex < (modules?.length || 0) - 1 && (
                          <div className="mx-4 sm:mx-6 my-2 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 flex items-center gap-3">
                            <Flame className="w-4 h-4 text-primary flex-shrink-0" />
                            <p className="text-xs text-muted-foreground flex-1">
                              <span className="text-foreground font-medium">Don't stop here.</span> Unlock the full curriculum and accelerate your growth.
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary hover:text-primary/80 text-xs h-7 px-2 shrink-0"
                              onClick={() => {
                                if (!user) { setShowAuthSheet(true); return; }
                                handleSubscribe();
                              }}
                            >
                              Unlock <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </Accordion>
                  {/* Mid-curriculum CTA */}
                  {!hasAccess && (
                    <div className="px-4 sm:px-6 py-4 border-t border-border/50 bg-muted/30">
                     <div className="flex items-center justify-between gap-3">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          <Lock className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                          Unlock all {totalLessons} lessons
                        </p>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 shrink-0"
                          onClick={() => handleSubscribe()}
                          disabled={isCheckoutLoading}
                        >
                          {isCheckoutLoading ? 'Loading...' : 'Get Access'}
                        </Button>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1.5">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        7-day money-back guarantee • Cancel anytime
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="mt-4 sm:mt-6">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">About This Course</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 prose prose-invert prose-sm max-w-none">
                  <p>{course.description}</p>
                  <Separator className="my-4 sm:my-6" />
                  <h3 className="text-sm sm:text-base">What You'll Learn</h3>
                  <ul className="text-sm">
                    <li>Master fundamental concepts and techniques</li>
                    <li>Apply strategies in real-world scenarios</li>
                    <li>Build confidence in your trading decisions</li>
                    <li>Access practical tools and templates</li>
                  </ul>
                  {!hasAccess && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-muted-foreground flex-1">Ready to start learning?</p>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 shrink-0"
                          onClick={() => handleSubscribe()}
                          disabled={isCheckoutLoading}
                        >
                          {isCheckoutLoading ? 'Loading...' : 'Subscribe'}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-4 sm:mt-6">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Student Reviews</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {reviews && reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review: any) => (
                        <div key={review.id} className="border-b pb-4 last:border-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                                    i < review.rating ? 'text-yellow-500 fill-current' : 'text-muted'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm">{review.review}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                      No reviews yet. Be the first to review!
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <TestimonialsSection />

          {/* Full pricing comparison — non-pro only */}
          {!hasAccess && (
            <div className="mt-2">
              <MembershipStep
                onComplete={() => {}}
                onBack={() => {}}
                isStandalone
              />
            </div>
          )}
        </div>

        {/* Sidebar - hidden on mobile since we have sticky CTA */}
        <div className="hidden lg:block space-y-6">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div className="text-lg sm:text-xl font-bold">Research & Education</div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                From $83/month (billed annually at $1,000/yr)
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
              {hasAccess ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span>Your Progress</span>
                      <span className="font-semibold">{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} />
                  </div>
                  <Button className="w-full" onClick={() => {
                    const firstIncompleteLesson = modules
                      ?.flatMap((m: any) => m.lessons || [])
                      .find((l: any) => !completedLessons.has(l.id));
                    if (firstIncompleteLesson) {
                      navigate(`/academy/lesson/${firstIncompleteLesson.id}`);
                    }
                  }}>
                    <Play className="w-4 h-4 mr-2" />
                    Continue Learning
                  </Button>
                  {progressPercentage >= 100 && (
                    <Button variant="outline" className="w-full">
                      <Award className="w-4 h-4 mr-2" />
                      Get Certificate
                    </Button>
                  )}
                </>
              ) : enrollment && !isResearchTier ? (
                // Enrolled but subscription expired
                <div className="space-y-4">
                   <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-center">
                     <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
                     <p className="text-xs sm:text-sm text-muted-foreground">
                       Subscribe to continue learning
                     </p>
                  </div>
                  <Button 
                     className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => handleSubscribe()}
                    disabled={isCheckoutLoading}
                  >
                    {isCheckoutLoading ? 'Loading...' : 'Subscribe Now'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {!course.is_free && (
                     <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                       <div className="flex items-center gap-2 text-primary mb-1">
                         <Lock className="w-4 h-4" />
                         <span className="text-xs sm:text-sm font-medium">Premium Course</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requires Research & Education membership
                      </p>
                    </div>
                  )}
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
                    onClick={() => {
                      if (!user) {
                        setShowAuthSheet(true);
                        return;
                      }
                      if (isUsageLoading) return;
                      if (!isResearchTier && !course?.is_free) {
                        handleSubscribe();
                        return;
                      }
                      enrollMutation.mutate();
                    }}
                    disabled={enrollMutation.isPending || isCheckoutLoading || (!!user && isUsageLoading)}
                  >
                    {!user ? (
                      'Sign in to Start'
                    ) : isCheckoutLoading || isUsageLoading ? (
                      'Loading...'
                    ) : course.is_free ? (
                      'Start Free Course'
                    ) : isResearchTier ? (
                      'Start Learning'
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Subscribe & Start
                      </>
                    )}
                  </Button>
                </div>
              )}

              <Separator />

              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <p className="font-medium text-foreground">Membership includes:</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                  <span>Full video lesson library</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                  <span>Trade ideas & signals</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                  <span>Backtesting tools</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                  <span>Community research posts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                  <span>Portfolio analytics</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <span>{course.duration_hours} hours of content</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <span>{totalLessons} lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  <span>Certificate of completion</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Sticky Bottom CTA - mobile */}
      {!hasAccess && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-[#0B0E14]/90 backdrop-blur-md border-t border-border/40 p-3 sm:p-4 lg:hidden">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm h-11"
            onClick={() => {
              if (!user) {
                setShowAuthSheet(true);
                return;
              }
              handleSubscribe();
            }}
            disabled={isCheckoutLoading}
          >
            {isCheckoutLoading ? 'Loading...' : 'Unlock Full Masterclass — from $83/mo'}
          </Button>
        </div>
      )}

      {/* Bottom padding to prevent content from hiding behind sticky CTA */}
      {!hasAccess && <div className="h-20 lg:hidden" />}

      {/* Auth Sheet — shows inline sign-up then proceeds to billing selection */}
      <MobileAuthSheet
        open={showAuthSheet}
        onOpenChange={setShowAuthSheet}
        title="Create your account"
        description="Sign up first, then choose your membership plan."
        onSuccess={() => {
          setShowAuthSheet(false);
          // Small delay to let auth state settle, then show billing
          setTimeout(() => setShowBillingSheet(true), 300);
        }}
      />

      {/* Billing interval selection */}
      <BillingIntervalSheet
        open={showBillingSheet}
        onOpenChange={setShowBillingSheet}
        returnPath={`/academy/course/${courseId}`}
      />

      <ExitIntentPopup isLoggedIn={!!user} />
    </div>
  );
}
