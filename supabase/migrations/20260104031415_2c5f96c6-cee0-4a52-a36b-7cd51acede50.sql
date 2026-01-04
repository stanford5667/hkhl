-- Add embedding column to prediction_markets for semantic search
ALTER TABLE public.prediction_markets 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for fast similarity search on prediction_markets
CREATE INDEX IF NOT EXISTS idx_prediction_markets_embedding 
ON public.prediction_markets 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create index for fast similarity search on raw_signals (if not exists)
CREATE INDEX IF NOT EXISTS idx_raw_signals_embedding 
ON public.raw_signals 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create semantic search function for markets
CREATE OR REPLACE FUNCTION public.search_markets_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  platform varchar,
  category varchar,
  total_volume numeric,
  similarity float
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id,
    pm.title,
    pm.platform,
    pm.category,
    pm.total_volume,
    (1 - (pm.embedding <=> query_embedding))::float as similarity
  FROM prediction_markets pm
  WHERE pm.status = 'active'
    AND pm.embedding IS NOT NULL
    AND (1 - (pm.embedding <=> query_embedding)) > match_threshold
  ORDER BY pm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create semantic search function for raw signals
CREATE OR REPLACE FUNCTION public.search_signals_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  source_url text,
  source_type varchar,
  published_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.id,
    rs.content,
    rs.source_url,
    rs.source_type,
    rs.published_at,
    (1 - (rs.embedding <=> query_embedding))::float as similarity
  FROM raw_signals rs
  WHERE rs.embedding IS NOT NULL
    AND (1 - (rs.embedding <=> query_embedding)) > match_threshold
  ORDER BY rs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;