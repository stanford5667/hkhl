
CREATE TABLE public.heatmap_micro_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  source TEXT,
  source_url TEXT,
  published_at TIMESTAMPTZ,
  impact_score INTEGER NOT NULL DEFAULT 5,
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  category TEXT NOT NULL DEFAULT 'macro',
  affected_countries TEXT[] DEFAULT '{}',
  affected_tickers JSONB DEFAULT '[]',
  asset_class_impacts JSONB DEFAULT '{}',
  ai_analysis TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '6 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_heatmap_micro_themes_score ON public.heatmap_micro_themes (impact_score DESC, created_at DESC);

ALTER TABLE public.heatmap_micro_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read micro themes"
  ON public.heatmap_micro_themes FOR SELECT
  USING (true);

CREATE POLICY "Service role manages micro themes"
  ON public.heatmap_micro_themes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
