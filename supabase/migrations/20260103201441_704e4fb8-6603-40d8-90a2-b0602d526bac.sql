-- Create market_daily_bars table (core price storage)
CREATE TABLE IF NOT EXISTS market_daily_bars (
  id BIGSERIAL PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL,
  bar_date DATE NOT NULL,
  open DECIMAL(18,6) NOT NULL,
  high DECIMAL(18,6) NOT NULL,
  low DECIMAL(18,6) NOT NULL,
  close DECIMAL(18,6) NOT NULL,
  volume BIGINT NOT NULL,
  vwap DECIMAL(18,6),
  transactions INTEGER,
  
  daily_return DECIMAL(12,8),
  log_return DECIMAL(12,8),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(ticker, bar_date)
);

CREATE INDEX IF NOT EXISTS idx_bars_ticker_date ON market_daily_bars(ticker, bar_date DESC);
CREATE INDEX IF NOT EXISTS idx_bars_date ON market_daily_bars(bar_date DESC);
CREATE INDEX IF NOT EXISTS idx_bars_ticker ON market_daily_bars(ticker);

-- Create asset_universe table
CREATE TABLE IF NOT EXISTS asset_universe (
  ticker VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  
  category VARCHAR(50) NOT NULL,
  asset_type VARCHAR(20) NOT NULL,
  sector VARCHAR(100),
  industry VARCHAR(100),
  market_cap_tier VARCHAR(20),
  
  description TEXT,
  short_description VARCHAR(500),
  
  is_active BOOLEAN DEFAULT true,
  is_validated BOOLEAN DEFAULT false,
  validation_date TIMESTAMPTZ,
  data_start_date DATE,
  data_end_date DATE,
  total_bars INTEGER DEFAULT 0,
  
  is_free_tier BOOLEAN DEFAULT false,
  
  primary_exchange VARCHAR(20),
  currency VARCHAR(10) DEFAULT 'USD',
  
  avg_daily_volume BIGINT,
  avg_daily_dollar_volume DECIMAL(18,2),
  liquidity_score INTEGER DEFAULT 50,
  
  last_close DECIMAL(18,6),
  change_percent_1d DECIMAL(8,4),
  change_percent_1w DECIMAL(8,4),
  change_percent_1m DECIMAL(8,4),
  change_percent_ytd DECIMAL(8,4),
  volatility_30d DECIMAL(8,4),
  beta_spy DECIMAL(6,4),
  
  expense_ratio DECIMAL(6,4),
  aum BIGINT,
  
  polygon_ticker_id VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_universe_category ON asset_universe(category);
CREATE INDEX IF NOT EXISTS idx_universe_type ON asset_universe(asset_type);
CREATE INDEX IF NOT EXISTS idx_universe_sector ON asset_universe(sector);
CREATE INDEX IF NOT EXISTS idx_universe_active ON asset_universe(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_universe_validated ON asset_universe(is_validated) WHERE is_validated = true;
CREATE INDEX IF NOT EXISTS idx_universe_liquidity ON asset_universe(liquidity_score DESC);
CREATE INDEX IF NOT EXISTS idx_universe_tags ON asset_universe USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_universe_search ON asset_universe USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Create ticker_correlations table
CREATE TABLE IF NOT EXISTS ticker_correlations (
  ticker_a VARCHAR(20) NOT NULL,
  ticker_b VARCHAR(20) NOT NULL,
  correlation DECIMAL(6,4) NOT NULL,
  period_days INTEGER NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (ticker_a, ticker_b, period_days),
  CHECK (ticker_a < ticker_b)
);

CREATE INDEX IF NOT EXISTS idx_corr_ticker_a ON ticker_correlations(ticker_a);
CREATE INDEX IF NOT EXISTS idx_corr_ticker_b ON ticker_correlations(ticker_b);
CREATE INDEX IF NOT EXISTS idx_corr_period ON ticker_correlations(period_days);

-- RLS for market_daily_bars
ALTER TABLE market_daily_bars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read bars" ON market_daily_bars;
CREATE POLICY "Public read bars" ON market_daily_bars FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role write bars" ON market_daily_bars;
CREATE POLICY "Service role write bars" ON market_daily_bars FOR ALL USING (true) WITH CHECK (true);

-- RLS for asset_universe
ALTER TABLE asset_universe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read universe" ON asset_universe;
CREATE POLICY "Public read universe" ON asset_universe FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role write universe" ON asset_universe;
CREATE POLICY "Service role write universe" ON asset_universe FOR ALL USING (true) WITH CHECK (true);

-- RLS for ticker_correlations
ALTER TABLE ticker_correlations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read correlations" ON ticker_correlations;
CREATE POLICY "Public read correlations" ON ticker_correlations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role write correlations" ON ticker_correlations;
CREATE POLICY "Service role write correlations" ON ticker_correlations FOR ALL USING (true) WITH CHECK (true);

-- Helper functions
CREATE OR REPLACE FUNCTION get_ticker_returns(
  p_ticker VARCHAR,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 year',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(bar_date DATE, daily_return DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT m.bar_date, m.daily_return
  FROM market_daily_bars m
  WHERE m.ticker = p_ticker
    AND m.bar_date BETWEEN p_start_date AND p_end_date
    AND m.daily_return IS NOT NULL
  ORDER BY m.bar_date;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_portfolio_returns(
  p_tickers TEXT[],
  p_weights DECIMAL[],
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 year',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(bar_date DATE, portfolio_return DECIMAL) AS $$
BEGIN
  RETURN QUERY
  WITH ticker_returns AS (
    SELECT 
      m.bar_date,
      m.ticker,
      m.daily_return,
      p_weights[array_position(p_tickers, m.ticker)] as weight
    FROM market_daily_bars m
    WHERE m.ticker = ANY(p_tickers)
      AND m.bar_date BETWEEN p_start_date AND p_end_date
      AND m.daily_return IS NOT NULL
  )
  SELECT 
    tr.bar_date,
    SUM(tr.daily_return * tr.weight)::DECIMAL as portfolio_return
  FROM ticker_returns tr
  GROUP BY tr.bar_date
  HAVING COUNT(*) = array_length(p_tickers, 1)
  ORDER BY tr.bar_date;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_data_freshness()
RETURNS TABLE(
  ticker VARCHAR,
  last_bar_date DATE,
  days_stale INTEGER,
  needs_refresh BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.ticker,
    au.data_end_date as last_bar_date,
    (CURRENT_DATE - au.data_end_date)::INTEGER as days_stale,
    (CURRENT_DATE - au.data_end_date > 1) as needs_refresh
  FROM asset_universe au
  WHERE au.is_active = true
  ORDER BY days_stale DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION invalidate_affected_caches()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE calculation_cache 
  SET is_valid = false
  WHERE NEW.ticker = ANY(tickers)
    AND is_valid = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_market_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
DROP TRIGGER IF EXISTS trigger_invalidate_cache_on_bar_insert ON market_daily_bars;
CREATE TRIGGER trigger_invalidate_cache_on_bar_insert
  AFTER INSERT OR UPDATE ON market_daily_bars
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_affected_caches();

DROP TRIGGER IF EXISTS trigger_update_bars_timestamp ON market_daily_bars;
CREATE TRIGGER trigger_update_bars_timestamp
  BEFORE UPDATE ON market_daily_bars
  FOR EACH ROW
  EXECUTE FUNCTION update_market_data_timestamp();

DROP TRIGGER IF EXISTS trigger_update_universe_timestamp ON asset_universe;
CREATE TRIGGER trigger_update_universe_timestamp
  BEFORE UPDATE ON asset_universe
  FOR EACH ROW
  EXECUTE FUNCTION update_market_data_timestamp();