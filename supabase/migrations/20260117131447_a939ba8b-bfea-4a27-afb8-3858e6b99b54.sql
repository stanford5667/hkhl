-- Add quant_studies_today column to user_usage table
ALTER TABLE public.user_usage
ADD COLUMN quant_studies_today integer DEFAULT 0;