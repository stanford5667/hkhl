
-- Portfolio journal for automated self-directed performance notes
CREATE TABLE public.sim_portfolio_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.sim_portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'auto',
  category TEXT NOT NULL DEFAULT 'performance',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metrics JSONB DEFAULT '{}',
  benchmark_comparison JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goals & constraints table
CREATE TABLE public.sim_portfolio_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.sim_portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  max_drawdown_pct NUMERIC DEFAULT 20,
  target_annual_return_pct NUMERIC DEFAULT 10,
  benchmark_ticker TEXT DEFAULT 'SPY',
  risk_budget_pct NUMERIC DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id)
);

-- RLS
ALTER TABLE public.sim_portfolio_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_portfolio_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own journal" ON public.sim_portfolio_journal
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own goals" ON public.sim_portfolio_goals
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_journal_portfolio ON public.sim_portfolio_journal(portfolio_id, created_at DESC);
CREATE INDEX idx_goals_portfolio ON public.sim_portfolio_goals(portfolio_id);
