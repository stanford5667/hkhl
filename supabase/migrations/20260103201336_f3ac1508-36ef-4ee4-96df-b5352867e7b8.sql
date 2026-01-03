-- Drop existing partial objects from failed migration
DROP INDEX IF EXISTS idx_cache_expires;
DROP INDEX IF EXISTS idx_cache_valid;
DROP INDEX IF EXISTS idx_cache_hash;
DROP INDEX IF EXISTS idx_cache_user;
DROP TABLE IF EXISTS calculation_cache CASCADE;
DROP TABLE IF EXISTS data_sync_log CASCADE;
DROP TABLE IF EXISTS metric_definitions CASCADE;

-- Recreate Table 4: calculation_cache - Cached portfolio calculations
CREATE TABLE calculation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Portfolio definition (for cache key)
  portfolio_hash VARCHAR(64) NOT NULL,
  tickers TEXT[] NOT NULL,
  weights DECIMAL(8,6)[] NOT NULL,
  
  -- Parameters
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  benchmark_ticker VARCHAR(20) DEFAULT 'SPY',
  risk_free_rate DECIMAL(6,4) DEFAULT 0.05,
  
  -- Cached results
  metrics JSONB NOT NULL,
  returns_series JSONB,
  calculation_traces JSONB,
  
  -- AI-generated content
  ai_interpretation JSONB,
  ai_suggestions JSONB,
  
  -- Validity
  is_valid BOOLEAN DEFAULT true,
  data_version INTEGER DEFAULT 1,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  
  -- User association (optional)
  user_id UUID REFERENCES auth.users(id),
  
  UNIQUE(portfolio_hash, start_date, end_date, benchmark_ticker)
);

CREATE INDEX idx_calc_cache_hash ON calculation_cache(portfolio_hash);
CREATE INDEX idx_calc_cache_valid ON calculation_cache(is_valid) WHERE is_valid = true;
CREATE INDEX idx_calc_cache_expires ON calculation_cache(expires_at);
CREATE INDEX idx_calc_cache_user ON calculation_cache(user_id);

-- Table 5: data_sync_log - Sync history and status
CREATE TABLE data_sync_log (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  tickers_total INTEGER,
  tickers_processed INTEGER DEFAULT 0,
  tickers_succeeded INTEGER DEFAULT 0,
  tickers_failed INTEGER DEFAULT 0,
  bars_inserted INTEGER DEFAULT 0,
  bars_updated INTEGER DEFAULT 0,
  
  errors JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  
  triggered_by VARCHAR(50),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_sync_log_status ON data_sync_log(status);
CREATE INDEX idx_sync_log_type_date ON data_sync_log(sync_type, started_at DESC);

-- Table 6: metric_definitions - Metric metadata (for UI)
CREATE TABLE metric_definitions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  
  plain_english TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  formula TEXT NOT NULL,
  formula_explained TEXT NOT NULL,
  
  interpretation JSONB NOT NULL,
  
  icon VARCHAR(50),
  color VARCHAR(50),
  
  example_calculation TEXT,
  
  display_order INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for new tables
ALTER TABLE calculation_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read calc cache" ON calculation_cache FOR SELECT USING (true);
CREATE POLICY "Authenticated insert calc cache" ON calculation_cache FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users update own calc cache" ON calculation_cache FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users delete own calc cache" ON calculation_cache FOR DELETE USING (user_id = auth.uid() OR user_id IS NULL);

ALTER TABLE data_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read data sync log" ON data_sync_log FOR SELECT USING (true);
CREATE POLICY "Service role write data sync log" ON data_sync_log FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read metric defs" ON metric_definitions FOR SELECT USING (true);
CREATE POLICY "Service role write metric defs" ON metric_definitions FOR ALL USING (true) WITH CHECK (true);