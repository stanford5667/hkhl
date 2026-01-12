-- Create table for saved study results
CREATE TABLE public.saved_studies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  study_type TEXT NOT NULL,
  study_name TEXT NOT NULL,
  period TEXT NOT NULL,
  params JSONB DEFAULT '{}',
  result JSONB NOT NULL,
  bars_analyzed INTEGER,
  date_range JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_studies ENABLE ROW LEVEL SECURITY;

-- Users can only view their own saved studies
CREATE POLICY "Users can view their own saved studies"
ON public.saved_studies
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own saved studies
CREATE POLICY "Users can create their own saved studies"
ON public.saved_studies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved studies
CREATE POLICY "Users can update their own saved studies"
ON public.saved_studies
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own saved studies
CREATE POLICY "Users can delete their own saved studies"
ON public.saved_studies
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_saved_studies_user_ticker ON public.saved_studies(user_id, ticker);
CREATE INDEX idx_saved_studies_user_study_type ON public.saved_studies(user_id, study_type);

-- Add updated_at trigger
CREATE TRIGGER update_saved_studies_updated_at
BEFORE UPDATE ON public.saved_studies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();