
-- Table for saving AI-generated theme reports
CREATE TABLE public.saved_theme_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  theme_id TEXT NOT NULL,
  theme_title TEXT NOT NULL,
  theme_category TEXT,
  theme_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  tickers_data JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_theme_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved reports"
ON public.saved_theme_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved reports"
ON public.saved_theme_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved reports"
ON public.saved_theme_reports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved reports"
ON public.saved_theme_reports FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_saved_theme_reports_user ON public.saved_theme_reports (user_id);
