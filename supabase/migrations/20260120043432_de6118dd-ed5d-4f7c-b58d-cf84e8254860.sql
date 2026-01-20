-- ============================================================
-- Study Probability Scores Table
-- Stores forward-looking probability calculations from Quant Lab studies
-- ============================================================

-- Create the main table
CREATE TABLE public.study_probability_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Asset identification
  ticker TEXT NOT NULL,
  name TEXT,
  sector TEXT,
  market_cap_tier TEXT,
  
  -- Study identification
  study_id TEXT NOT NULL,
  study_name TEXT NOT NULL,
  study_category TEXT NOT NULL,
  
  -- Time horizon (1, 5, 10, 20 days forward)
  lookforward_days INTEGER NOT NULL DEFAULT 5,
  
  -- Probability metrics
  probability_score NUMERIC NOT NULL,
  expected_return NUMERIC,
  win_rate NUMERIC,
  avg_gain NUMERIC,
  avg_loss NUMERIC,
  sample_size INTEGER NOT NULL DEFAULT 0,
  confidence_level TEXT DEFAULT 'low',
  
  -- Signal status
  signal_active BOOLEAN DEFAULT false,
  last_signal_date TIMESTAMPTZ,
  signal_strength NUMERIC,
  
  -- Study parameters that generated this score
  study_params JSONB,
  
  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  is_valid BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one score per ticker/study/lookforward combination
  CONSTRAINT unique_study_score UNIQUE (ticker, study_id, lookforward_days)
);

-- Create indexes for fast querying
CREATE INDEX idx_study_scores_ticker ON public.study_probability_scores(ticker);
CREATE INDEX idx_study_scores_study_id ON public.study_probability_scores(study_id);
CREATE INDEX idx_study_scores_category ON public.study_probability_scores(study_category);
CREATE INDEX idx_study_scores_probability ON public.study_probability_scores(probability_score DESC);
CREATE INDEX idx_study_scores_signal_active ON public.study_probability_scores(signal_active) WHERE signal_active = true;
CREATE INDEX idx_study_scores_lookforward ON public.study_probability_scores(lookforward_days);
CREATE INDEX idx_study_scores_sector ON public.study_probability_scores(sector);
CREATE INDEX idx_study_scores_market_cap ON public.study_probability_scores(market_cap_tier);
CREATE INDEX idx_study_scores_composite ON public.study_probability_scores(probability_score DESC, expected_return DESC, sample_size DESC);

-- Enable Row Level Security
ALTER TABLE public.study_probability_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read, service role to write
CREATE POLICY "Anyone can read study probability scores" 
ON public.study_probability_scores 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Service role can insert study probability scores"
ON public.study_probability_scores
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update study probability scores"
ON public.study_probability_scores
FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Service role can delete study probability scores"
ON public.study_probability_scores
FOR DELETE
TO service_role
USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_study_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_study_probability_scores_updated_at
BEFORE UPDATE ON public.study_probability_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_study_scores_updated_at();

-- ============================================================
-- Helper function: Screen study probabilities
-- ============================================================
CREATE OR REPLACE FUNCTION public.screen_study_probabilities(
  min_probability NUMERIC DEFAULT 50,
  max_probability NUMERIC DEFAULT 100,
  min_expected_return NUMERIC DEFAULT NULL,
  max_expected_return NUMERIC DEFAULT NULL,
  min_sample_size INTEGER DEFAULT 5,
  study_categories TEXT[] DEFAULT NULL,
  study_types TEXT[] DEFAULT NULL,
  sectors TEXT[] DEFAULT NULL,
  market_cap_tiers TEXT[] DEFAULT NULL,
  only_active_signals BOOLEAN DEFAULT false,
  lookforward_days_filter INTEGER DEFAULT NULL,
  sort_by TEXT DEFAULT 'probability_score',
  sort_order TEXT DEFAULT 'DESC',
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  ticker TEXT,
  name TEXT,
  sector TEXT,
  market_cap_tier TEXT,
  study_id TEXT,
  study_name TEXT,
  study_category TEXT,
  lookforward_days INTEGER,
  probability_score NUMERIC,
  expected_return NUMERIC,
  win_rate NUMERIC,
  avg_gain NUMERIC,
  avg_loss NUMERIC,
  sample_size INTEGER,
  confidence_level TEXT,
  signal_active BOOLEAN,
  last_signal_date TIMESTAMPTZ,
  calculated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.ticker,
    s.name,
    s.sector,
    s.market_cap_tier,
    s.study_id,
    s.study_name,
    s.study_category,
    s.lookforward_days,
    s.probability_score,
    s.expected_return,
    s.win_rate,
    s.avg_gain,
    s.avg_loss,
    s.sample_size,
    s.confidence_level,
    s.signal_active,
    s.last_signal_date,
    s.calculated_at
  FROM public.study_probability_scores s
  WHERE s.is_valid = true
    AND s.probability_score >= min_probability
    AND s.probability_score <= max_probability
    AND s.sample_size >= min_sample_size
    AND (min_expected_return IS NULL OR s.expected_return >= min_expected_return)
    AND (max_expected_return IS NULL OR s.expected_return <= max_expected_return)
    AND (study_categories IS NULL OR s.study_category = ANY(study_categories))
    AND (study_types IS NULL OR s.study_id = ANY(study_types))
    AND (sectors IS NULL OR s.sector = ANY(sectors))
    AND (market_cap_tiers IS NULL OR s.market_cap_tier = ANY(market_cap_tiers))
    AND (NOT only_active_signals OR s.signal_active = true)
    AND (lookforward_days_filter IS NULL OR s.lookforward_days = lookforward_days_filter)
  ORDER BY
    CASE WHEN sort_by = 'probability_score' AND sort_order = 'DESC' THEN s.probability_score END DESC NULLS LAST,
    CASE WHEN sort_by = 'probability_score' AND sort_order = 'ASC' THEN s.probability_score END ASC NULLS LAST,
    CASE WHEN sort_by = 'expected_return' AND sort_order = 'DESC' THEN s.expected_return END DESC NULLS LAST,
    CASE WHEN sort_by = 'expected_return' AND sort_order = 'ASC' THEN s.expected_return END ASC NULLS LAST,
    CASE WHEN sort_by = 'sample_size' AND sort_order = 'DESC' THEN s.sample_size END DESC NULLS LAST,
    CASE WHEN sort_by = 'sample_size' AND sort_order = 'ASC' THEN s.sample_size END ASC NULLS LAST
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Helper function: Analyze study confluence (multiple signals on same ticker)
-- ============================================================
CREATE OR REPLACE FUNCTION public.analyze_study_confluence(
  min_probability NUMERIC DEFAULT 70,
  lookforward_days_filter INTEGER DEFAULT 5,
  only_active_signals BOOLEAN DEFAULT true
)
RETURNS TABLE (
  ticker TEXT,
  name TEXT,
  sector TEXT,
  study_count BIGINT,
  avg_probability NUMERIC,
  total_expected_return NUMERIC,
  studies JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.ticker,
    MAX(s.name) as name,
    MAX(s.sector) as sector,
    COUNT(*) as study_count,
    AVG(s.probability_score) as avg_probability,
    SUM(s.expected_return) as total_expected_return,
    jsonb_agg(jsonb_build_object(
      'study_id', s.study_id,
      'study_name', s.study_name,
      'probability', s.probability_score,
      'expected_return', s.expected_return
    )) as studies
  FROM public.study_probability_scores s
  WHERE s.is_valid = true
    AND s.probability_score >= min_probability
    AND s.lookforward_days = lookforward_days_filter
    AND (NOT only_active_signals OR s.signal_active = true)
  GROUP BY s.ticker
  HAVING COUNT(*) >= 2
  ORDER BY COUNT(*) DESC, AVG(s.probability_score) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;