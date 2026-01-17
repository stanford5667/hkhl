-- Add screener_searches_today column to user_usage table
ALTER TABLE public.user_usage 
ADD COLUMN IF NOT EXISTS screener_searches_today integer NOT NULL DEFAULT 0;