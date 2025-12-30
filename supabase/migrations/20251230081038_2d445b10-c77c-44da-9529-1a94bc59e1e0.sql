-- Drop previously created tables
DROP TABLE IF EXISTS public.economic_indicators CASCADE;
DROP TABLE IF EXISTS public.ma_transactions CASCADE;
DROP TABLE IF EXISTS public.deal_pipeline CASCADE;
DROP TABLE IF EXISTS public.pe_funds CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.portfolio_covenants CASCADE;
DROP TABLE IF EXISTS public.portfolio_assets CASCADE;

-- Portfolio Assets
CREATE TABLE portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('pe', 'real_estate', 'public_equity', 'credit', 'alternatives')),
  sector TEXT,
  invested_capital NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  irr NUMERIC,
  moic NUMERIC,
  vintage_year INTEGER,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  revenue_growth NUMERIC,
  ebitda_margin NUMERIC,
  debt_service_coverage NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Covenants
CREATE TABLE portfolio_covenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES portfolio_assets(id) ON DELETE CASCADE,
  covenant_type TEXT NOT NULL,
  current_value NUMERIC NOT NULL,
  limit_value NUMERIC NOT NULL,
  is_warning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES portfolio_assets(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  description TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('macro', 'portfolio', 'internal')),
  event_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PE Funds
CREATE TABLE pe_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_name TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  fund_type TEXT NOT NULL,
  target_size NUMERIC,
  current_size NUMERIC,
  status TEXT DEFAULT 'fundraising',
  prior_fund_irr NUMERIC,
  prior_fund_moic NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deal Pipeline
CREATE TABLE deal_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  sector TEXT,
  revenue NUMERIC,
  ebitda NUMERIC,
  asking_multiple NUMERIC,
  fit_score TEXT CHECK (fit_score IN ('high', 'medium', 'low')),
  stage TEXT DEFAULT 'sourcing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- M&A Transactions
CREATE TABLE ma_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_name TEXT NOT NULL,
  acquirer_name TEXT,
  sector TEXT,
  enterprise_value NUMERIC,
  ebitda_multiple NUMERIC,
  transaction_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Economic Indicators
CREATE TABLE economic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_name TEXT NOT NULL UNIQUE,
  current_value TEXT NOT NULL,
  change_value NUMERIC,
  category TEXT CHECK (category IN ('rates', 'economic', 'markets')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_covenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pe_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE ma_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_indicators ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for dev - you should tighten these for production)
CREATE POLICY "Allow all portfolio_assets" ON portfolio_assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all portfolio_covenants" ON portfolio_covenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all alerts" ON alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all pe_funds" ON pe_funds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all deal_pipeline" ON deal_pipeline FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all ma_transactions" ON ma_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all economic_indicators" ON economic_indicators FOR ALL USING (true) WITH CHECK (true);