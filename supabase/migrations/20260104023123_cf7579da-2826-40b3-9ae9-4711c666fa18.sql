-- Add missing columns for Polymarket sync
ALTER TABLE public.prediction_markets 
ADD COLUMN IF NOT EXISTS total_volume NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS liquidity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Add unique constraint for upsert to work
ALTER TABLE public.prediction_markets 
DROP CONSTRAINT IF EXISTS prediction_markets_platform_platform_market_id_key;

ALTER TABLE public.prediction_markets 
ADD CONSTRAINT prediction_markets_platform_platform_market_id_key 
UNIQUE (platform, platform_market_id);

-- Add unique constraint on market_outcomes for upsert
ALTER TABLE public.market_outcomes 
DROP CONSTRAINT IF EXISTS market_outcomes_market_id_title_key;

ALTER TABLE public.market_outcomes 
ADD CONSTRAINT market_outcomes_market_id_title_key 
UNIQUE (market_id, title);