-- Create a storage bucket for course videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('course-videos', 'course-videos', true, 524288000)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload videos
CREATE POLICY "Admins can upload course videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-videos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to update course videos
CREATE POLICY "Admins can update course videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-videos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to delete course videos
CREATE POLICY "Admins can delete course videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-videos' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Allow public read access to course videos
CREATE POLICY "Public can view course videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-videos');