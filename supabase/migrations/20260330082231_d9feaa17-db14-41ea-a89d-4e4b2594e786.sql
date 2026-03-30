
-- Post-trade reflections
CREATE TABLE public.sim_trade_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_id UUID NOT NULL REFERENCES public.sim_portfolios(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  action TEXT NOT NULL,
  thesis TEXT,
  emotion TEXT,
  would_repeat BOOLEAN,
  lesson_learned TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sim_trade_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reflections" ON public.sim_trade_reflections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trading achievements/badges
CREATE TABLE public.sim_trading_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_id UUID NOT NULL REFERENCES public.sim_portfolios(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, portfolio_id, achievement_id)
);

ALTER TABLE public.sim_trading_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own achievements" ON public.sim_trading_achievements
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Weekly report cards
CREATE TABLE public.sim_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_id UUID NOT NULL REFERENCES public.sim_portfolios(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  overall_grade TEXT NOT NULL,
  grades JSONB NOT NULL DEFAULT '{}'::jsonb,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  improvement_tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, week_start)
);

ALTER TABLE public.sim_weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reports" ON public.sim_weekly_reports
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
