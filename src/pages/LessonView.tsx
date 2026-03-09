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
  LogIn
} from 'lucide-react';
import { toast } from 'sonner';

export default function LessonView() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isResearchTier } = useUsage();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLIFrameElement | HTMLVideoElement>(null);
  const [videoProgress, setVideoProgress] = useState(0);

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
            order_index
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

  // Find current lesson index and navigate to next/previous
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

  const courseProgress = 45; // This would come from actual calculation

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/academy" className="hover:text-foreground">Academy</Link>
          <span>/</span>
          <Link 
            to={`/academy/course/${lesson.module?.course?.id}`}
            className="hover:text-foreground"
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
          {/* Video Player */}
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {lesson.video_url ? (
                  (lesson.video_provider === 'custom' && isDirectVideoUrl(lesson.video_url)) ? (
                    <video
                      ref={videoRef as React.RefObject<HTMLVideoElement>}
                      className="w-full h-full"
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
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Video not available</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lesson Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-xl md:text-2xl mb-2">{lesson.title}</CardTitle>
                  <p className="text-muted-foreground">{lesson.description}</p>
                </div>
                {!progress?.completed ? (
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
                  <div className="flex items-center gap-2 text-green-500 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Completed</span>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Tabs for Content, Materials */}
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="materials">
                Materials ({materials?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Lesson Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none">
                    {lesson.content ? (
                      <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                    ) : (
                      <p className="text-muted-foreground">
                        No additional content available for this lesson. Watch the video above to continue learning.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
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

        {/* Sidebar - Course Curriculum */}
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
                      {module.lessons?.map((l: any, lessonIndex: number) => (
                        <Link
                          key={l.id}
                          to={`/academy/lesson/${l.id}`}
                          className={`block p-3 pl-6 hover:bg-muted/50 transition-colors text-sm ${
                            l.id === lessonId ? 'bg-primary/10 border-l-4 border-primary' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="line-clamp-1">
                              {moduleIndex + 1}.{lessonIndex + 1} {l.title}
                            </span>
                            {progress?.completed && l.id === lessonId && (
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            )}
                          </div>
                        </Link>
                      ))}
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