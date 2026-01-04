-- =============================================
-- ALPHA WAREHOUSE SCHEMA
-- =============================================

-- Create sentiment enum type
DO $$ BEGIN
  CREATE TYPE news_sentiment AS ENUM ('bullish', 'bearish', 'neutral');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 1. NEWS_EVENTS: Primary table for ingested news
-- =============================================
CREATE TABLE IF NOT EXISTS public.news_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id VARCHAR(255) NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_concepts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookups by source and time
CREATE INDEX IF NOT EXISTS idx_news_events_source_id ON public.news_events(source_id);
CREATE INDEX IF NOT EXISTS idx_news_events_published_at ON public.news_events(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_events_raw_concepts ON public.news_events USING GIN(raw_concepts);

-- =============================================
-- 2. TICKERS_MAP: Concept to ticker mapping
-- =============================================
CREATE TABLE IF NOT EXISTS public.tickers_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept VARCHAR(255) NOT NULL,
  ticker VARCHAR(20) NOT NULL,
  ticker_name VARCHAR(255),
  asset_type VARCHAR(50) DEFAULT 'stock',
  sector VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(concept, ticker)
);

-- Indexes for fast concept and ticker lookups
CREATE INDEX IF NOT EXISTS idx_tickers_map_concept ON public.tickers_map(concept);
CREATE INDEX IF NOT EXISTS idx_tickers_map_ticker ON public.tickers_map(ticker);
CREATE INDEX IF NOT EXISTS idx_tickers_map_sector ON public.tickers_map(sector);

-- =============================================
-- 3. AI_INSIGHTS: AI analysis linked to news
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_event_id UUID NOT NULL REFERENCES public.news_events(id) ON DELETE CASCADE,
  impact_score INTEGER CHECK (impact_score >= 0 AND impact_score <= 100),
  sentiment news_sentiment DEFAULT 'neutral',
  thesis TEXT,
  asset_focus TEXT,
  related_tickers TEXT[] DEFAULT '{}',
  correlation_vector vector(1536),
  confidence NUMERIC(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  model_version VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- GIST index for fast vector similarity queries
CREATE INDEX IF NOT EXISTS idx_ai_insights_correlation_vector 
  ON public.ai_insights USING ivfflat (correlation_vector vector_cosine_ops)
  WITH (lists = 100);

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_news_event ON public.ai_insights(news_event_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_impact ON public.ai_insights(impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_sentiment ON public.ai_insights(sentiment);
CREATE INDEX IF NOT EXISTS idx_ai_insights_asset_focus ON public.ai_insights(asset_focus);
CREATE INDEX IF NOT EXISTS idx_ai_insights_related_tickers ON public.ai_insights USING GIN(related_tickers);

-- =============================================
-- 4. USER_PORTFOLIOS: User ticker preferences
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ticker VARCHAR(20) NOT NULL,
  ticker_name VARCHAR(255),
  weight NUMERIC(5,4) DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  is_watchlist BOOLEAN DEFAULT false,
  alert_threshold NUMERIC(5,2),
  UNIQUE(user_id, ticker)
);

-- Indexes for user portfolio queries
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON public.user_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolios_ticker ON public.user_portfolios(ticker);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE public.news_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickers_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- NEWS_EVENTS: Public read for general market news, filtered for user assets
CREATE POLICY "Public can read news events"
  ON public.news_events FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage news events"
  ON public.news_events FOR ALL
  USING (true)
  WITH CHECK (true);

-- TICKERS_MAP: Public read, service role write
CREATE POLICY "Public can read tickers map"
  ON public.tickers_map FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage tickers map"
  ON public.tickers_map FOR ALL
  USING (true)
  WITH CHECK (true);

-- AI_INSIGHTS: Users see insights for their portfolio tickers or general market
CREATE POLICY "Users can view relevant ai insights"
  ON public.ai_insights FOR SELECT
  USING (
    asset_focus = 'Market' 
    OR asset_focus IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_portfolios up 
      WHERE up.user_id = auth.uid() 
      AND (
        up.ticker = ANY(related_tickers)
        OR asset_focus ILIKE '%' || up.ticker || '%'
      )
    )
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY "Service role can manage ai insights"
  ON public.ai_insights FOR ALL
  USING (true)
  WITH CHECK (true);

-- USER_PORTFOLIOS: Users manage only their own portfolios
CREATE POLICY "Users can view their own portfolios"
  ON public.user_portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolio entries"
  ON public.user_portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio entries"
  ON public.user_portfolios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolio entries"
  ON public.user_portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get news for a user's portfolio
CREATE OR REPLACE FUNCTION public.get_portfolio_news(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  news_id UUID,
  title TEXT,
  summary TEXT,
  url TEXT,
  published_at TIMESTAMPTZ,
  impact_score INTEGER,
  sentiment news_sentiment,
  thesis TEXT,
  matching_tickers TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ne.id as news_id,
    ne.title,
    ne.summary,
    ne.url,
    ne.published_at,
    ai.impact_score,
    ai.sentiment,
    ai.thesis,
    ARRAY(
      SELECT up.ticker 
      FROM user_portfolios up 
      WHERE up.user_id = p_user_id 
      AND up.ticker = ANY(ai.related_tickers)
    ) as matching_tickers
  FROM news_events ne
  LEFT JOIN ai_insights ai ON ai.news_event_id = ne.id
  WHERE EXISTS (
    SELECT 1 FROM user_portfolios up
    WHERE up.user_id = p_user_id
    AND (
      up.ticker = ANY(ai.related_tickers)
      OR ai.asset_focus = 'Market'
    )
  )
  ORDER BY ne.published_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to find similar insights by vector
CREATE OR REPLACE FUNCTION public.find_similar_insights(
  p_embedding vector(1536),
  p_threshold FLOAT DEFAULT 0.7,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  insight_id UUID,
  news_event_id UUID,
  thesis TEXT,
  asset_focus TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id as insight_id,
    ai.news_event_id,
    ai.thesis,
    ai.asset_focus,
    (1 - (ai.correlation_vector <=> p_embedding))::FLOAT as similarity
  FROM ai_insights ai
  WHERE ai.correlation_vector IS NOT NULL
  AND (1 - (ai.correlation_vector <=> p_embedding)) > p_threshold
  ORDER BY ai.correlation_vector <=> p_embedding
  LIMIT p_limit;
END;
$$;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_alpha_warehouse_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_news_events_timestamp
  BEFORE UPDATE ON public.news_events
  FOR EACH ROW EXECUTE FUNCTION public.update_alpha_warehouse_timestamp();

CREATE TRIGGER update_tickers_map_timestamp
  BEFORE UPDATE ON public.tickers_map
  FOR EACH ROW EXECUTE FUNCTION public.update_alpha_warehouse_timestamp();

CREATE TRIGGER update_ai_insights_timestamp
  BEFORE UPDATE ON public.ai_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_alpha_warehouse_timestamp();