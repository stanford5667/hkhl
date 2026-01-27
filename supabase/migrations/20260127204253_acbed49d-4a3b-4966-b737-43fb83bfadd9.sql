-- Add market_cap column to earnings_calendar for sorting
ALTER TABLE public.earnings_calendar 
ADD COLUMN IF NOT EXISTS market_cap NUMERIC;