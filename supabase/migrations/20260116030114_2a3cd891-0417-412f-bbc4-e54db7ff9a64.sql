-- Create table for caching pre-computed screened portfolios
CREATE TABLE public.screened_portfolios_cache (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  family TEXT NOT NULL,
  tickers TEXT[] NOT NULL,
  weights NUMERIC[] NOT NULL,
  risk_profile TEXT NOT NULL CHECK (risk_profile IN ('conservative', 'moderate', 'growth', 'aggressive')),
  
  -- Metrics
  cagr NUMERIC NOT NULL,
  total_return NUMERIC NOT NULL,
  volatility NUMERIC NOT NULL,
  sharpe NUMERIC NOT NULL,
  sortino NUMERIC NOT NULL,
  max_drawdown NUMERIC NOT NULL,
  data_points INTEGER NOT NULL,
  
  -- Metadata
  lookback_years INTEGER DEFAULT 1,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- For efficient queries
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common query patterns
CREATE INDEX idx_screened_portfolios_risk_profile ON public.screened_portfolios_cache(risk_profile);
CREATE INDEX idx_screened_portfolios_sharpe ON public.screened_portfolios_cache(sharpe DESC);
CREATE INDEX idx_screened_portfolios_cagr ON public.screened_portfolios_cache(cagr DESC);
CREATE INDEX idx_screened_portfolios_max_drawdown ON public.screened_portfolios_cache(max_drawdown ASC);
CREATE INDEX idx_screened_portfolios_volatility ON public.screened_portfolios_cache(volatility ASC);
CREATE INDEX idx_screened_portfolios_sortino ON public.screened_portfolios_cache(sortino DESC);
CREATE INDEX idx_screened_portfolios_expires ON public.screened_portfolios_cache(expires_at);

-- Enable RLS (public read, service-only write)
ALTER TABLE public.screened_portfolios_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached portfolios (public data)
CREATE POLICY "Anyone can read cached portfolios"
  ON public.screened_portfolios_cache
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete (via edge function)
-- No policy needed for INSERT/UPDATE/DELETE - only service role key can do it