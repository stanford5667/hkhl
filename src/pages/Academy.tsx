import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/shared/PageLoader';

// Academy redirects directly to the main course — no extra clicks
export default function Academy() {
  const { data: course, isLoading } = useQuery({
    queryKey: ['main-course'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id')
        .eq('is_published', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <PageLoader />;
  if (course) return <Navigate to={`/academy/course/${course.id}`} replace />;

  return (
    <div className="container mx-auto p-6 text-center py-20">
      <p className="text-muted-foreground">No courses available yet.</p>
    </div>
  );
}
