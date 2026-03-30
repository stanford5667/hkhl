
-- Stream recordings table
CREATE TABLE public.stream_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  recorded_by UUID NOT NULL,
  title TEXT,
  duration_seconds INTEGER,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stream_recordings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view recordings
CREATE POLICY "Authenticated users can view recordings"
  ON public.stream_recordings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/delete
CREATE POLICY "Admins can insert recordings"
  ON public.stream_recordings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete recordings"
  ON public.stream_recordings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Storage bucket for recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('stream-recordings', 'stream-recordings', true, 524288000)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins can upload recordings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'stream-recordings' AND public.is_admin());

CREATE POLICY "Anyone can view recordings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'stream-recordings');

CREATE POLICY "Admins can delete recordings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'stream-recordings' AND public.is_admin());
