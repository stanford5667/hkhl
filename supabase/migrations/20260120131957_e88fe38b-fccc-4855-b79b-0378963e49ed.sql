-- Drop both existing versions to eliminate ambiguity
DROP FUNCTION IF EXISTS public.screen_study_probabilities(
  numeric, numeric, numeric, numeric, integer, text[], text[], text[], text[], 
  boolean, integer, text, text, integer, integer
);

DROP FUNCTION IF EXISTS public.screen_study_probabilities(
  numeric, numeric, numeric, numeric, integer, integer, text[], text[], text[], text[], 
  boolean, integer, text, text, integer, integer
);

-- Create single unified version
CREATE OR REPLACE FUNCTION public.screen_study_probabilities(
  min_probability numeric DEFAULT 50,
  max_probability numeric DEFAULT 100,
  min_expected_return numeric DEFAULT NULL,
  max_expected_return numeric DEFAULT NULL,
  min_sample_size integer DEFAULT 5,
  lookforward_days_filter integer DEFAULT NULL,
  study_categories text[] DEFAULT NULL,
  study_ids text[] DEFAULT NULL,
  sectors text[] DEFAULT NULL,
  market_cap_tiers text[] DEFAULT NULL,
  only_active_signals boolean DEFAULT false,
  sort_by text DEFAULT 'probability_score',
  sort_order text DEFAULT 'DESC',
  result_limit integer DEFAULT 50,
  result_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  ticker text,
  name text,
  sector text,
  market_cap_tier text,
  study_id text,
  study_name text,
  study_category text,
  lookforward_days integer,
  probability_score numeric,
  expected_return numeric,
  win_rate numeric,
  avg_gain numeric,
  avg_loss numeric,
  sample_size integer,
  confidence_level text,
  signal_active boolean,
  last_signal_date timestamp with time zone,
  calculated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    AND (study_ids IS NULL OR s.study_id = ANY(study_ids))
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
    CASE WHEN sort_by = 'sample_size' AND sort_order = 'ASC' THEN s.sample_size END ASC NULLS LAST,
    CASE WHEN sort_by = 'win_rate' AND sort_order = 'DESC' THEN s.win_rate END DESC NULLS LAST,
    CASE WHEN sort_by = 'win_rate' AND sort_order = 'ASC' THEN s.win_rate END ASC NULLS LAST
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;