-- =====================================================
-- UNIVERSE-WIDE PROBABILITY SCREENING SYSTEM
-- Database Schema for Ticker Universe & Probability Scores
-- =====================================================

-- 1. Ticker Universe Table - All tradeable assets from Polygon
CREATE TABLE IF NOT EXISTS public.ticker_universe (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  asset_type TEXT DEFAULT 'stock',
  primary_exchange TEXT,
  sector TEXT,
  industry TEXT,
  market_cap BIGINT,
  market_cap_tier TEXT, -- mega, large, mid, small, micro
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ticker_universe_sector ON public.ticker_universe(sector);
CREATE INDEX IF NOT EXISTS idx_ticker_universe_market_cap_tier ON public.ticker_universe(market_cap_tier);
CREATE INDEX IF NOT EXISTS idx_ticker_universe_is_active ON public.ticker_universe(is_active);

-- 2. Universe Probability Scores - Calculated probabilities for each ticker
CREATE TABLE IF NOT EXISTS public.universe_probability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL REFERENCES public.ticker_universe(symbol) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'earnings', 'dividend', 'fomc', 'cpi', 'jobs', 'general'
  probability_score NUMERIC(5,2), -- 0-100
  expected_return NUMERIC(6,3), -- Expected return percentage
  sample_size INTEGER DEFAULT 0,
  win_rate NUMERIC(5,2), -- Historical win rate
  avg_gain NUMERIC(6,3),
  avg_loss NUMERIC(6,3),
  days_until_event INTEGER,
  next_event_date DATE,
  confidence_level TEXT DEFAULT 'medium', -- low, medium, high
  calculation_method TEXT DEFAULT 'historical',
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(symbol, event_type)
);

-- Create indexes for fast screening queries
CREATE INDEX IF NOT EXISTS idx_ups_probability ON public.universe_probability_scores(probability_score DESC);
CREATE INDEX IF NOT EXISTS idx_ups_expected_return ON public.universe_probability_scores(expected_return DESC);
CREATE INDEX IF NOT EXISTS idx_ups_event_type ON public.universe_probability_scores(event_type);
CREATE INDEX IF NOT EXISTS idx_ups_days_until ON public.universe_probability_scores(days_until_event);
CREATE INDEX IF NOT EXISTS idx_ups_symbol ON public.universe_probability_scores(symbol);

-- 3. Screening Results Cache - For fast materialized views
CREATE TABLE IF NOT EXISTS public.probability_screen_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  results JSONB NOT NULL,
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT now() + INTERVAL '1 hour'
);

CREATE INDEX IF NOT EXISTS idx_psc_cache_key ON public.probability_screen_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_psc_expires ON public.probability_screen_cache(expires_at);

-- 4. Event Probability History - Track historical accuracy
CREATE TABLE IF NOT EXISTS public.event_probability_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  predicted_probability NUMERIC(5,2),
  predicted_return NUMERIC(6,3),
  actual_return NUMERIC(6,3),
  was_correct BOOLEAN,
  days_before_prediction INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eph_symbol ON public.event_probability_history(symbol);
CREATE INDEX IF NOT EXISTS idx_eph_event_date ON public.event_probability_history(event_date);
CREATE INDEX IF NOT EXISTS idx_eph_event_type ON public.event_probability_history(event_type);

-- 5. Database function to screen universe
CREATE OR REPLACE FUNCTION public.screen_universe(
  min_probability NUMERIC DEFAULT 50,
  max_probability NUMERIC DEFAULT 100,
  min_expected_return NUMERIC DEFAULT NULL,
  max_expected_return NUMERIC DEFAULT NULL,
  min_sample_size INTEGER DEFAULT 5,
  event_types TEXT[] DEFAULT NULL,
  sectors TEXT[] DEFAULT NULL,
  market_cap_tiers TEXT[] DEFAULT NULL,
  max_days_until_event INTEGER DEFAULT NULL,
  sort_by TEXT DEFAULT 'probability_score',
  sort_order TEXT DEFAULT 'DESC',
  result_limit INTEGER DEFAULT 50,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  symbol TEXT,
  name TEXT,
  sector TEXT,
  market_cap_tier TEXT,
  event_type TEXT,
  probability_score NUMERIC,
  expected_return NUMERIC,
  sample_size INTEGER,
  win_rate NUMERIC,
  days_until_event INTEGER,
  next_event_date DATE,
  confidence_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tu.symbol,
    tu.name,
    tu.sector,
    tu.market_cap_tier,
    ups.event_type,
    ups.probability_score,
    ups.expected_return,
    ups.sample_size,
    ups.win_rate,
    ups.days_until_event,
    ups.next_event_date,
    ups.confidence_level
  FROM universe_probability_scores ups
  JOIN ticker_universe tu ON ups.symbol = tu.symbol
  WHERE ups.probability_score >= min_probability
    AND ups.probability_score <= max_probability
    AND ups.sample_size >= min_sample_size
    AND tu.is_active = true
    AND (min_expected_return IS NULL OR ups.expected_return >= min_expected_return)
    AND (max_expected_return IS NULL OR ups.expected_return <= max_expected_return)
    AND (event_types IS NULL OR ups.event_type = ANY(event_types))
    AND (sectors IS NULL OR tu.sector = ANY(sectors))
    AND (market_cap_tiers IS NULL OR tu.market_cap_tier = ANY(market_cap_tiers))
    AND (max_days_until_event IS NULL OR ups.days_until_event <= max_days_until_event)
  ORDER BY
    CASE WHEN sort_by = 'probability_score' AND sort_order = 'DESC' THEN ups.probability_score END DESC,
    CASE WHEN sort_by = 'probability_score' AND sort_order = 'ASC' THEN ups.probability_score END ASC,
    CASE WHEN sort_by = 'expected_return' AND sort_order = 'DESC' THEN ups.expected_return END DESC,
    CASE WHEN sort_by = 'expected_return' AND sort_order = 'ASC' THEN ups.expected_return END ASC,
    CASE WHEN sort_by = 'days_until_event' AND sort_order = 'ASC' THEN ups.days_until_event END ASC,
    CASE WHEN sort_by = 'days_until_event' AND sort_order = 'DESC' THEN ups.days_until_event END DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- Enable RLS
ALTER TABLE public.ticker_universe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universe_probability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.probability_screen_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_probability_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read access for all authenticated users
CREATE POLICY "Authenticated users can read ticker universe"
  ON public.ticker_universe FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read probability scores"
  ON public.universe_probability_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read screen cache"
  ON public.probability_screen_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read probability history"
  ON public.event_probability_history FOR SELECT
  TO authenticated
  USING (true);

-- Service role policies for edge functions to write
CREATE POLICY "Service role can manage ticker universe"
  ON public.ticker_universe FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage probability scores"
  ON public.universe_probability_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage screen cache"
  ON public.probability_screen_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage probability history"
  ON public.event_probability_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);