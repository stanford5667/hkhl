-- Add multiple return period columns to earnings_history
ALTER TABLE public.earnings_history
ADD COLUMN IF NOT EXISTS return_1w numeric,
ADD COLUMN IF NOT EXISTS return_2w numeric,
ADD COLUMN IF NOT EXISTS return_1m numeric,
ADD COLUMN IF NOT EXISTS return_3m numeric;

-- Add comment for documentation
COMMENT ON COLUMN public.earnings_history.return_1w IS 'Price return 1 week (5 trading days) after earnings';
COMMENT ON COLUMN public.earnings_history.return_2w IS 'Price return 2 weeks (10 trading days) after earnings';
COMMENT ON COLUMN public.earnings_history.return_1m IS 'Price return 1 month (21 trading days) after earnings';
COMMENT ON COLUMN public.earnings_history.return_3m IS 'Price return 3 months (63 trading days) after earnings';

-- Migrate existing price_change_pct data to return_1w
UPDATE public.earnings_history
SET return_1w = price_change_pct
WHERE price_change_pct IS NOT NULL AND return_1w IS NULL;