-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Raw Signals table - stores ingested context with embeddings
CREATE TABLE public.raw_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  source_url TEXT,
  source_type VARCHAR(50), -- 'news', 'social', 'kol', 'rss', etc.
  published_at TIMESTAMPTZ,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for similarity search on embeddings
CREATE INDEX idx_raw_signals_embedding ON public.raw_signals USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_raw_signals_published_at ON public.raw_signals (published_at DESC);
CREATE INDEX idx_raw_signals_source_type ON public.raw_signals (source_type);

-- RLS for raw_signals
ALTER TABLE public.raw_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read raw signals" ON public.raw_signals
  FOR SELECT USING (true);

CREATE POLICY "Service role write raw signals" ON public.raw_signals
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Market Drivers - join table linking markets to signals
CREATE TABLE public.market_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.raw_signals(id) ON DELETE CASCADE,
  impact_score INTEGER NOT NULL CHECK (impact_score >= 0 AND impact_score <= 100),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('bullish', 'bearish', 'neutral')),
  ai_reasoning TEXT,
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(market_id, signal_id)
);

CREATE INDEX idx_market_drivers_market_id ON public.market_drivers (market_id);
CREATE INDEX idx_market_drivers_signal_id ON public.market_drivers (signal_id);
CREATE INDEX idx_market_drivers_impact ON public.market_drivers (impact_score DESC);

-- RLS for market_drivers
ALTER TABLE public.market_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read market drivers" ON public.market_drivers
  FOR SELECT USING (true);

CREATE POLICY "Service role write market drivers" ON public.market_drivers
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Add divergence_score to trade_ideas
ALTER TABLE public.trade_ideas 
ADD COLUMN IF NOT EXISTS divergence_score NUMERIC;

-- 4. Add last_ai_analyzed_at to prediction_markets for cooldown
ALTER TABLE public.prediction_markets 
ADD COLUMN IF NOT EXISTS last_ai_analyzed_at TIMESTAMPTZ;

-- Create index for cooldown queries
CREATE INDEX IF NOT EXISTS idx_prediction_markets_last_analyzed 
ON public.prediction_markets (last_ai_analyzed_at);

-- Trigger to update updated_at on raw_signals
CREATE TRIGGER update_raw_signals_updated_at
  BEFORE UPDATE ON public.raw_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();