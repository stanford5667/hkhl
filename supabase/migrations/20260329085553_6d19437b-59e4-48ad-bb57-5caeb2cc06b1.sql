-- Add strategy link columns to sim_portfolios
ALTER TABLE public.sim_portfolios 
  ADD COLUMN IF NOT EXISTS strategy_config jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS strategy_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS backtest_results jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_ticker text DEFAULT NULL;