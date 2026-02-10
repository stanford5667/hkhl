
-- Table to store AI-generated market themes
CREATE TABLE public.market_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  detailed_summary TEXT NOT NULL,
  impact_percent NUMERIC DEFAULT 0,
  sentiment_score NUMERIC DEFAULT 0.5,
  category TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'Sparkles',
  tickers JSONB NOT NULL DEFAULT '[]'::jsonb,
  headlines JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Index for fast daily lookups
CREATE INDEX idx_market_themes_date ON public.market_themes (generated_date DESC);
CREATE UNIQUE INDEX idx_market_themes_unique ON public.market_themes (theme_id, generated_date);

-- Enable RLS
ALTER TABLE public.market_themes ENABLE ROW LEVEL SECURITY;

-- Public read access (themes are public content)
CREATE POLICY "Market themes are publicly readable"
  ON public.market_themes FOR SELECT
  USING (true);

-- Only service role can insert/update (edge function uses service role)
CREATE POLICY "Service role can manage themes"
  ON public.market_themes FOR ALL
  USING (auth.role() = 'service_role');
