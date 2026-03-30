
CREATE TABLE public.saved_theme_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  share_id TEXT NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  title TEXT NOT NULL,
  category TEXT,
  theme_data JSONB NOT NULL,
  analysis_content TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(share_id)
);

ALTER TABLE public.saved_theme_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own analyses"
  ON public.saved_theme_analyses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public analyses viewable by anyone"
  ON public.saved_theme_analyses
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);
