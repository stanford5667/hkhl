-- Drop and recreate functions with SECURITY INVOKER instead of SECURITY DEFINER
-- These functions access market_daily_bars which has public read access (USING true)
-- so they can safely use SECURITY INVOKER

-- Drop existing functions
DROP FUNCTION IF EXISTS public.get_ticker_returns(character varying, date, date);
DROP FUNCTION IF EXISTS public.get_portfolio_returns(text[], numeric[], date, date);

-- Recreate get_ticker_returns with SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_ticker_returns(
  p_ticker character varying, 
  p_start_date date DEFAULT (CURRENT_DATE - '1 year'::interval), 
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(bar_date date, daily_return numeric)
LANGUAGE plpgsql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.bar_date, m.daily_return
  FROM market_daily_bars m
  WHERE m.ticker = p_ticker
    AND m.bar_date BETWEEN p_start_date AND p_end_date
    AND m.daily_return IS NOT NULL
  ORDER BY m.bar_date;
END;
$function$;

-- Recreate get_portfolio_returns with SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_portfolio_returns(
  p_tickers text[], 
  p_weights numeric[], 
  p_start_date date DEFAULT (CURRENT_DATE - '1 year'::interval), 
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(bar_date date, portfolio_return numeric)
LANGUAGE plpgsql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH ticker_returns AS (
    SELECT 
      m.bar_date,
      m.ticker,
      m.daily_return,
      p_weights[array_position(p_tickers, m.ticker)] as weight
    FROM market_daily_bars m
    WHERE m.ticker = ANY(p_tickers)
      AND m.bar_date BETWEEN p_start_date AND p_end_date
      AND m.daily_return IS NOT NULL
  )
  SELECT 
    tr.bar_date,
    SUM(tr.daily_return * tr.weight)::DECIMAL as portfolio_return
  FROM ticker_returns tr
  GROUP BY tr.bar_date
  HAVING COUNT(*) = array_length(p_tickers, 1)
  ORDER BY tr.bar_date;
END;
$function$;

-- Add explanatory comments
COMMENT ON FUNCTION public.get_ticker_returns IS 'Returns daily returns for a ticker. Uses SECURITY INVOKER since market_daily_bars has public read access.';
COMMENT ON FUNCTION public.get_portfolio_returns IS 'Calculates weighted portfolio returns. Uses SECURITY INVOKER since market_daily_bars has public read access.';