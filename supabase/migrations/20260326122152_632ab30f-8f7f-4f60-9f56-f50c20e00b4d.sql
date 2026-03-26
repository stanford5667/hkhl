
-- Create sim_portfolios table
CREATE TABLE public.sim_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  initial_capital NUMERIC NOT NULL DEFAULT 100000,
  cash_balance NUMERIC NOT NULL DEFAULT 100000,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Create sim_trades table
CREATE TABLE public.sim_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.sim_portfolios(id) ON DELETE CASCADE NOT NULL,
  ticker TEXT NOT NULL,
  instrument_type TEXT NOT NULL DEFAULT 'stock',
  action TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price_at_execution NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  option_type TEXT,
  strike_price NUMERIC,
  expiration_date DATE,
  contract_multiplier INTEGER NOT NULL DEFAULT 100,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sim_snapshots table
CREATE TABLE public.sim_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.sim_portfolios(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_value NUMERIC NOT NULL,
  cash_balance NUMERIC NOT NULL,
  positions_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sim_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sim_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for sim_portfolios
CREATE POLICY "Users can view own portfolios" ON public.sim_portfolios
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own portfolios" ON public.sim_portfolios
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON public.sim_portfolios
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON public.sim_portfolios
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS policies for sim_trades (via portfolio ownership)
CREATE POLICY "Users can view own trades" ON public.sim_trades
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sim_portfolios WHERE id = portfolio_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can create own trades" ON public.sim_trades
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.sim_portfolios WHERE id = portfolio_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete own trades" ON public.sim_trades
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sim_portfolios WHERE id = portfolio_id AND user_id = auth.uid())
  );

-- RLS policies for sim_snapshots (via portfolio ownership)
CREATE POLICY "Users can view own snapshots" ON public.sim_snapshots
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sim_portfolios WHERE id = portfolio_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can create own snapshots" ON public.sim_snapshots
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.sim_portfolios WHERE id = portfolio_id AND user_id = auth.uid())
  );
