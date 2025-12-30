-- Portfolio Assets table
CREATE TABLE public.portfolio_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  investment_date DATE NOT NULL,
  investment_amount NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  ownership_pct NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  revenue_ltm NUMERIC,
  ebitda_ltm NUMERIC,
  employee_count INTEGER,
  health_score INTEGER DEFAULT 75,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Portfolio Covenants table
CREATE TABLE public.portfolio_covenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  covenant_type TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'compliant',
  next_test_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'general',
  source TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PE Funds table
CREATE TABLE public.pe_funds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fund_name TEXT NOT NULL,
  manager TEXT NOT NULL,
  strategy TEXT NOT NULL,
  vintage_year INTEGER NOT NULL,
  fund_size NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'closed',
  irr NUMERIC,
  tvpi NUMERIC,
  dpi NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Deal Pipeline table
CREATE TABLE public.deal_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  deal_type TEXT NOT NULL DEFAULT 'acquisition',
  stage TEXT NOT NULL DEFAULT 'sourcing',
  ev_range TEXT,
  ev_ebitda NUMERIC,
  source TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- M&A Transactions table
CREATE TABLE public.ma_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_name TEXT NOT NULL,
  acquirer_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  deal_value NUMERIC,
  ev_ebitda NUMERIC,
  ev_revenue NUMERIC,
  announced_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'announced',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Economic Indicators table
CREATE TABLE public.economic_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  indicator_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'rates',
  current_value NUMERIC NOT NULL,
  previous_value NUMERIC,
  change_pct NUMERIC,
  unit TEXT NOT NULL DEFAULT '%',
  source TEXT,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_covenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pe_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ma_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_indicators ENABLE ROW LEVEL SECURITY;

-- RLS policies for portfolio_assets
CREATE POLICY "Users can view own portfolio assets" ON public.portfolio_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own portfolio assets" ON public.portfolio_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio assets" ON public.portfolio_assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolio assets" ON public.portfolio_assets FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for portfolio_covenants
CREATE POLICY "Users can view own covenants" ON public.portfolio_covenants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own covenants" ON public.portfolio_covenants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own covenants" ON public.portfolio_covenants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own covenants" ON public.portfolio_covenants FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for alerts
CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own alerts" ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON public.alerts FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for events
CREATE POLICY "Users can view own events" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.events FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for pe_funds
CREATE POLICY "Users can view own pe funds" ON public.pe_funds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own pe funds" ON public.pe_funds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pe funds" ON public.pe_funds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pe funds" ON public.pe_funds FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for deal_pipeline
CREATE POLICY "Users can view own deal pipeline" ON public.deal_pipeline FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own deal pipeline" ON public.deal_pipeline FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deal pipeline" ON public.deal_pipeline FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deal pipeline" ON public.deal_pipeline FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for ma_transactions
CREATE POLICY "Users can view own ma transactions" ON public.ma_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own ma transactions" ON public.ma_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ma transactions" ON public.ma_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ma transactions" ON public.ma_transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for economic_indicators
CREATE POLICY "Users can view own economic indicators" ON public.economic_indicators FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own economic indicators" ON public.economic_indicators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own economic indicators" ON public.economic_indicators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own economic indicators" ON public.economic_indicators FOR DELETE USING (auth.uid() = user_id);

-- Update triggers
CREATE TRIGGER update_portfolio_assets_updated_at BEFORE UPDATE ON public.portfolio_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_portfolio_covenants_updated_at BEFORE UPDATE ON public.portfolio_covenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deal_pipeline_updated_at BEFORE UPDATE ON public.deal_pipeline FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();