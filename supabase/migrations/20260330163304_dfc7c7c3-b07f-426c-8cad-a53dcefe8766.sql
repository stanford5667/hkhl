
ALTER TABLE public.research_posts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create storage bucket for research post thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('research-thumbnails', 'research-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload thumbnails
CREATE POLICY "Authenticated users can upload research thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'research-thumbnails');

-- Allow public read access to thumbnails
CREATE POLICY "Public can view research thumbnails"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'research-thumbnails');

-- Allow users to delete their own thumbnails
CREATE POLICY "Users can delete own research thumbnails"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'research-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
