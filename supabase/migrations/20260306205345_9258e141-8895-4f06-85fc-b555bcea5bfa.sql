
-- Drop existing policies that use direct subqueries on user_roles
DROP POLICY IF EXISTS "Admins can insert course_lessons" ON public.course_lessons;
DROP POLICY IF EXISTS "Admins can update course_lessons" ON public.course_lessons;
DROP POLICY IF EXISTS "Admins can delete course_lessons" ON public.course_lessons;
DROP POLICY IF EXISTS "Admins can view all course_lessons" ON public.course_lessons;

-- Recreate using is_admin() security definer function to avoid RLS recursion
CREATE POLICY "Admins can insert course_lessons"
ON public.course_lessons FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update course_lessons"
ON public.course_lessons FOR UPDATE TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete course_lessons"
ON public.course_lessons FOR DELETE TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can view all course_lessons"
ON public.course_lessons FOR SELECT TO authenticated
USING (public.is_admin());
