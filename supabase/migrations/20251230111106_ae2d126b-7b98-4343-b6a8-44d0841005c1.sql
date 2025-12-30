-- Create the cache table for API responses
CREATE TABLE cached_api_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  cache_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  data JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL
);

-- Indexes for fast lookups
CREATE INDEX idx_cache_key ON cached_api_data(cache_key);
CREATE INDEX idx_cache_expires ON cached_api_data(expires_at);
CREATE INDEX idx_cache_entity ON cached_api_data(entity_type, entity_id);
CREATE INDEX idx_cache_user ON cached_api_data(user_id);

-- Auto-update timestamp trigger
CREATE TRIGGER update_cached_api_data_updated_at
  BEFORE UPDATE ON cached_api_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE cached_api_data ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own cache
CREATE POLICY "Users can view own cache"
  ON cached_api_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cache"
  ON cached_api_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cache"
  ON cached_api_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cache"
  ON cached_api_data FOR DELETE
  USING (auth.uid() = user_id);