-- Add 1-day and 5-day return columns to earnings_history
ALTER TABLE public.earnings_history
ADD COLUMN IF NOT EXISTS return_1d numeric,
ADD COLUMN IF NOT EXISTS return_5d numeric;