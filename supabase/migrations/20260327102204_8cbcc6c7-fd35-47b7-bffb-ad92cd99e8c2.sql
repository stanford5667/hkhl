
-- Pending orders table for limit/stop orders
CREATE TABLE public.sim_pending_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.sim_portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  instrument_type TEXT NOT NULL DEFAULT 'stock',
  order_type TEXT NOT NULL CHECK (order_type IN ('limit', 'stop')),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity NUMERIC NOT NULL,
  limit_price NUMERIC,
  stop_price NUMERIC,
  time_in_force TEXT NOT NULL DEFAULT 'gtc' CHECK (time_in_force IN ('day', 'gtc')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled')),
  option_type TEXT,
  strike_price NUMERIC,
  expiration_date DATE,
  contract_multiplier INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  filled_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.sim_pending_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own pending orders"
ON public.sim_pending_orders
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Watchlist table
CREATE TABLE public.sim_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, ticker)
);

ALTER TABLE public.sim_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own watchlist"
ON public.sim_watchlist
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
