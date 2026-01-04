-- Create news_clusters table for storing narrative clusters
CREATE TABLE public.news_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_date DATE NOT NULL DEFAULT CURRENT_DATE,
  narrative_title TEXT NOT NULL,
  narrative_summary TEXT,
  key_developments JSONB DEFAULT '[]'::jsonb,
  main_entities TEXT[] DEFAULT '{}',
  sentiment_arc VARCHAR(20) CHECK (sentiment_arc IN ('improving', 'worsening', 'stable', 'volatile')),
  article_ids UUID[] DEFAULT '{}',
  article_count INTEGER DEFAULT 0,
  related_market_ids UUID[] DEFAULT '{}',
  market_correlation JSONB DEFAULT '{}'::jsonb,
  momentum_score DECIMAL(5,2) DEFAULT 0, -- -100 to +100
  is_emerging BOOLEAN DEFAULT false,
  first_detected TIMESTAMPTZ DEFAULT now(),
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create narrative_timeline table for tracking developments
CREATE TABLE public.narrative_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES public.news_clusters(id) ON DELETE CASCADE,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  development TEXT NOT NULL,
  significance VARCHAR(20) CHECK (significance IN ('high', 'medium', 'low')),
  sentiment_change DECIMAL(5,2) DEFAULT 0,
  related_article_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_timeline ENABLE ROW LEVEL SECURITY;

-- Public read access for news clusters
CREATE POLICY "Public read news clusters"
  ON public.news_clusters FOR SELECT
  USING (true);

-- Public read access for narrative timeline  
CREATE POLICY "Public read narrative timeline"
  ON public.narrative_timeline FOR SELECT
  USING (true);

-- Service role write access
CREATE POLICY "Service role write news clusters"
  ON public.news_clusters FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role write narrative timeline"
  ON public.narrative_timeline FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for efficient queries
CREATE INDEX idx_news_clusters_date ON public.news_clusters(cluster_date DESC);
CREATE INDEX idx_news_clusters_emerging ON public.news_clusters(is_emerging, momentum_score DESC);
CREATE INDEX idx_news_clusters_entities ON public.news_clusters USING GIN(main_entities);
CREATE INDEX idx_narrative_timeline_cluster ON public.narrative_timeline(cluster_id, event_date DESC);

-- Trigger for updating last_updated
CREATE TRIGGER update_news_clusters_timestamp
  BEFORE UPDATE ON public.news_clusters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();