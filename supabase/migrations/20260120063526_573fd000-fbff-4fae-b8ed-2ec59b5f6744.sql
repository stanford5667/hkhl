CREATE OR REPLACE FUNCTION public.screen_study_probabilities(
    min_probability DECIMAL DEFAULT 70,
    max_probability DECIMAL DEFAULT 100,
    min_expected_return DECIMAL DEFAULT NULL,
    max_expected_return DECIMAL DEFAULT NULL,
    min_sample_size INTEGER DEFAULT 5,
    lookforward_days_filter INTEGER DEFAULT 5,
    study_categories TEXT[] DEFAULT NULL,
    study_ids TEXT[] DEFAULT NULL,
    sectors TEXT[] DEFAULT NULL,
    market_cap_tiers TEXT[] DEFAULT NULL,
    only_active_signals BOOLEAN DEFAULT false,
    min_confluence INTEGER DEFAULT NULL,
    sort_by TEXT DEFAULT 'probability_score',
    sort_order TEXT DEFAULT 'DESC',
    result_limit INTEGER DEFAULT 50,
    result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    symbol VARCHAR(20),
    study_id VARCHAR(100),
    study_name VARCHAR(255),
    study_category VARCHAR(50),
    probability_score DECIMAL(5,2),
    expected_return DECIMAL(10,4),
    win_rate DECIMAL(5,2),
    sample_size INTEGER,
    avg_gain DECIMAL(10,4),
    avg_loss DECIMAL(10,4),
    confidence_level VARCHAR(20),
    signal_active BOOLEAN,
    last_signal_date TIMESTAMP,
    lookforward_days INTEGER,
    sector VARCHAR(50),
    market_cap_tier VARCHAR(20)
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sps.symbol,
    sps.study_id,
    sps.study_name,
    sps.study_category,
    sps.probability_score,
    sps.expected_return,
    sps.win_rate,
    sps.sample_size,
    sps.avg_gain,
    sps.avg_loss,
    sps.confidence_level,
    sps.signal_active,
    sps.last_signal_date,
    sps.lookforward_days,
    sps.sector,
    sps.market_cap_tier
  FROM public.study_probability_scores sps
  WHERE sps.is_valid = true
    AND sps.probability_score >= min_probability
    AND sps.probability_score <= max_probability
    AND sps.sample_size >= min_sample_size
    AND sps.lookforward_days = lookforward_days_filter
    AND (min_expected_return IS NULL OR sps.expected_return >= min_expected_return)
    AND (max_expected_return IS NULL OR sps.expected_return <= max_expected_return)
    AND (study_categories IS NULL OR sps.study_category = ANY(study_categories))
    AND (study_ids IS NULL OR sps.study_id = ANY(study_ids))
    AND (sectors IS NULL OR sps.sector = ANY(sectors))
    AND (market_cap_tiers IS NULL OR sps.market_cap_tier = ANY(market_cap_tiers))
    AND (NOT only_active_signals OR sps.signal_active = true)
    AND (
      min_confluence IS NULL
      OR sps.symbol IN (
        SELECT s.symbol
        FROM public.study_probability_scores s
        WHERE s.is_valid = true
          AND s.signal_active = true
        GROUP BY s.symbol
        HAVING COUNT(*) >= min_confluence
      )
    )
  ORDER BY
    CASE WHEN sort_by = 'probability_score' AND sort_order = 'DESC' THEN sps.probability_score END DESC,
    CASE WHEN sort_by = 'probability_score' AND sort_order = 'ASC' THEN sps.probability_score END ASC,
    CASE WHEN sort_by = 'expected_return' AND sort_order = 'DESC' THEN sps.expected_return END DESC,
    CASE WHEN sort_by = 'expected_return' AND sort_order = 'ASC' THEN sps.expected_return END ASC,
    CASE WHEN sort_by = 'sample_size' AND sort_order = 'DESC' THEN sps.sample_size END DESC,
    CASE WHEN sort_by = 'sample_size' AND sort_order = 'ASC' THEN sps.sample_size END ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;