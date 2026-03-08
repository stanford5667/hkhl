import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

function getYouTubeThumbnail(url: string | null, provider: string | null): string | null {
  if (!url) return null;
  if (provider === 'youtube' || (!provider && url.includes('youtube.com'))) {
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  }
  if (provider === 'custom' || (url.includes('/storage/') && url.match(/\.(mp4|webm|mov)$/i))) {
    return null; // uploaded videos – no easy thumbnail
  }
  return null;
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
  const queryClient = useQueryClient();

  // Fetch course details
  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return data;
    },
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
        .order('order_index');

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

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Successfully enrolled in course!');
    },
    onError: (error) => {
      toast.error('Failed to enroll: ' + error.message);
    },
  });

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto p-6 text-center">
        <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Course not found</h2>
        <Link to="/academy">
          <Button>Back to Academy</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <Card className="overflow-hidden">
            <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 to-purple-500/20">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-primary/50" />
                </div>
              )}
              {course.is_free && (
                <Badge className="absolute top-4 left-4 bg-green-500 text-white">Free Course</Badge>
              )}
            </div>
            <CardHeader>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant="outline" className={getLevelColor(course.level)}>
                  {course.level || 'All Levels'}
                </Badge>
                <Badge variant="outline">{course.category}</Badge>
              </div>
              <CardTitle className="text-2xl md:text-3xl">{course.title}</CardTitle>
              <CardDescription className="text-base">{course.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration_hours || 0} hours</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{course.student_count} students</span>
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-medium">{course.rating?.toFixed(1) || '0.0'}</span>
                  <span className="text-muted-foreground">({reviews?.length || 0} reviews)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="curriculum">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="curriculum" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Course Content</CardTitle>
                  <CardDescription>
                    {modules?.length || 0} modules • {totalLessons} lessons
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Accordion type="multiple" className="w-full">
                    {modules?.map((module: any, moduleIndex: number) => (
                      <AccordionItem key={module.id} value={module.id}>
                        <AccordionTrigger className="px-6 hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <span className="text-sm text-muted-foreground">
                              Module {moduleIndex + 1}
                            </span>
                            <span className="font-semibold">{module.title}</span>
                            <Badge variant="outline" className="ml-2">
                              {module.lessons?.length || 0} lessons
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="px-6 pb-4 space-y-2">
                            {module.lessons?.map((lesson: any, lessonIndex: number) => {
                              const isCompleted = completedLessons.has(lesson.id);
                              const canAccess = enrollment || lesson.is_preview;
                              const thumbnail = getYouTubeThumbnail(lesson.video_url, lesson.video_provider);

                              return (
                                <div
                                  key={lesson.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    canAccess ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50'
                                  }`}
                                  onClick={() => {
                                    if (canAccess) {
                                      navigate(`/academy/lesson/${lesson.id}`);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    {/* Thumbnail */}
                                    <div className="relative w-24 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                      {thumbnail ? (
                                        <img src={thumbnail} alt={lesson.title} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                          <Play className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                      )}
                                      {lesson.video_duration != null && lesson.video_duration > 0 && (
                                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1 py-0.5 rounded">
                                          {formatLessonDuration(lesson.video_duration)}
                                        </span>
                                      )}
                                      {/* Status icon overlay */}
                                      {isCompleted && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        </div>
                                      )}
                                      {!canAccess && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                          <Lock className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">
                                        {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                                      </p>
                                      {lesson.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1">{lesson.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  {lesson.is_preview && !enrollment && (
                                    <Badge variant="outline" className="text-xs">Preview</Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>About This Course</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-invert max-w-none">
                  <p>{course.description}</p>
                  <Separator className="my-6" />
                  <h3>What You'll Learn</h3>
                  <ul>
                    <li>Master fundamental concepts and techniques</li>
                    <li>Apply strategies in real-world scenarios</li>
                    <li>Build confidence in your trading decisions</li>
                    <li>Access practical tools and templates</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Student Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  {reviews && reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review: any) => (
                        <div key={review.id} className="border-b pb-4 last:border-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating ? 'text-yellow-500 fill-current' : 'text-muted'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{review.review}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No reviews yet. Be the first to review!
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <div className="text-2xl font-bold">Research & Education</div>
              <p className="text-sm text-muted-foreground mt-1">
                $100/month membership
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollment ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
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
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => {
                    if (!user) {
                      navigate('/auth');
                    } else {
                      enrollMutation.mutate();
                    }
                  }}
                  disabled={enrollMutation.isPending}
                >
                  {!user ? 'Sign in to Enroll' : 'Start Learning'}
                </Button>
              )}

              <Separator />

              <div className="space-y-3 text-sm">
                <p className="font-medium text-foreground">Membership includes:</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Full video lesson library</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Trade ideas & signals</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Backtesting tools</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Community research posts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Portfolio analytics</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{course.duration_hours} hours of content</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span>{totalLessons} lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <span>Certificate of completion</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}