
-- Fix UPDATE policy to include WITH CHECK (required for TUS resumable uploads)
DROP POLICY IF EXISTS "Admins can update course videos" ON storage.objects;
CREATE POLICY "Admins can update course videos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'course-videos'
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'course-videos'
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
