-- Create dedicated stock price cache table for backtester
CREATE TABLE IF NOT EXISTS public.stock_price_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker text NOT NULL,
  trade_date date NOT NULL,
  open_price numeric,
  high_price numeric,
  low_price numeric,
  close_price numeric,
  adjusted_close numeric,
  volume bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(ticker, trade_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_price_cache_ticker ON public.stock_price_cache(ticker);
CREATE INDEX IF NOT EXISTS idx_stock_price_cache_date ON public.stock_price_cache(trade_date);
CREATE INDEX IF NOT EXISTS idx_stock_price_cache_ticker_date ON public.stock_price_cache(ticker, trade_date);

-- Enable RLS
ALTER TABLE public.stock_price_cache ENABLE ROW LEVEL SECURITY;

-- Public read access (stock prices are public data)
CREATE POLICY "Anyone can view stock price cache" 
ON public.stock_price_cache 
FOR SELECT 
USING (true);

-- Service role can insert/update (edge functions use service role)
CREATE POLICY "Service role can manage stock price cache" 
ON public.stock_price_cache 
FOR ALL 
USING (true)
WITH CHECK (true);