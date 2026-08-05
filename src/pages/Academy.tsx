import { Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/shared/PageLoader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, Layers, Play } from 'lucide-react';
import { resolveCourseHours, formatHours } from '@/lib/courseContent';
import LessonDiagram from '@/components/academy/LessonThumbnail';

type CourseSummary = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  level: string | null;
  category: string | null;
  duration_hours: number | null;
  moduleCount: number;
  lessonCount: number;
  durationLabel: string;
  lessonIds: string[];
};

function getLevelColor(level: string | null) {
  switch (level) {
    case 'beginner':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'intermediate':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'advanced':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function Academy() {
  const { user } = useAuth();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['academy-courses'],
    queryFn: async (): Promise<CourseSummary[]> => {
      const { data: courseRows, error } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, level, category, duration_hours')
        .eq('is_published', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!courseRows?.length) return [];

      const { data: moduleRows, error: moduleError } = await supabase
        .from('course_modules')
        .select('id, course_id, lessons:course_lessons(id, video_duration)')
        .in('course_id', courseRows.map((c) => c.id));
      if (moduleError) throw moduleError;

      return courseRows.map((course) => {
        const mods = (moduleRows || []).filter((m: any) => m.course_id === course.id);
        const lessons = mods.flatMap((m: any) => m.lessons || []);
        const videoSeconds = lessons.reduce(
          (sum: number, l: any) => sum + (l.video_duration || 0),
          0,
        );
        return {
          ...course,
          moduleCount: mods.length,
          lessonCount: lessons.length,
          durationLabel: formatHours(resolveCourseHours(course.duration_hours, videoSeconds)),
          lessonIds: lessons.map((l: any) => l.id as string),
        };
      });
    },
  });

  // Enrolled course ids + completed lessons, used to show real progress
  const { data: progressData } = useQuery({
    queryKey: ['academy-progress', user?.id],
    queryFn: async () => {
      if (!user) return { enrolled: [] as string[], completed: [] as string[] };
      const [enrollments, progress] = await Promise.all([
        supabase.from('course_enrollments').select('course_id').eq('user_id', user.id),
        supabase.from('lesson_progress').select('lesson_id').eq('user_id', user.id).eq('completed', true),
      ]);
      return {
        enrolled: (enrollments.data || []).map((e: any) => e.course_id as string),
        completed: (progress.data || []).map((p: any) => p.lesson_id as string),
      };
    },
    enabled: !!user,
  });

  if (isLoading) return <PageLoader />;

  if (!courses || courses.length === 0) {
    return (
      <div className="container mx-auto p-6 text-center py-20">
        <p className="text-muted-foreground">No courses available yet.</p>
      </div>
    );
  }

  // Single-course catalog: keep today's behavior, no extra click
  if (courses.length === 1) {
    return <Navigate to={`/academy/course/${courses[0].id}`} replace />;
  }

  const completedSet = new Set(progressData?.completed || []);
  const enrolledSet = new Set(progressData?.enrolled || []);

  return (
    <div className="container mx-auto px-3 py-6 sm:p-6 max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold">Academy</h1>
        <p className="text-sm text-muted-foreground">
          Institutional-grade investing courses, taught end to end.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => {
          const isEnrolled = enrolledSet.has(course.id);
          const done = course.lessonIds.filter((id) => completedSet.has(id)).length;
          const pct = course.lessonCount > 0 ? (done / course.lessonCount) * 100 : 0;

          return (
            <Link
              key={course.id}
              to={`/academy/course/${course.id}`}
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            >
              <Card className="h-full overflow-hidden transition-colors group-hover:border-primary/40">
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : (
                    <LessonDiagram title={course.title} moduleTitle={course.category ?? undefined} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex size-12 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-sm">
                      <Play className="w-5 h-5 ml-0.5 text-white" />
                    </span>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {course.level && (
                      <Badge variant="outline" className={`text-[10px] capitalize ${getLevelColor(course.level)}`}>
                        {course.level}
                      </Badge>
                    )}
                    {course.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {course.category}
                      </Badge>
                    )}
                  </div>
                  <h2 className="font-heading font-semibold text-base leading-tight line-clamp-2">
                    {course.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {course.moduleCount} modules
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {course.lessonCount} lessons
                    </span>
                    {course.durationLabel && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {course.durationLabel}
                      </span>
                    )}
                  </div>
                  {isEnrolled && course.lessonCount > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Your progress</span>
                        <span className="font-semibold text-foreground">{Math.round(pct)}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
