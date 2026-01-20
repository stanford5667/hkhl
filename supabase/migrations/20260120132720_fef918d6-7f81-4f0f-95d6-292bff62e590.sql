-- Create helper function to get distinct tickers from market_daily_bars
CREATE OR REPLACE FUNCTION public.get_distinct_bar_tickers(limit_count integer DEFAULT 100)
RETURNS TABLE(ticker text, bar_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ticker, COUNT(*) as bar_count
  FROM market_daily_bars
  GROUP BY ticker
  ORDER BY bar_count DESC
  LIMIT limit_count;
$$;