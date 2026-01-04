-- Add AI processing columns to real_world_events table
ALTER TABLE real_world_events ADD COLUMN IF NOT EXISTS ai_extracted_entities JSONB;
ALTER TABLE real_world_events ADD COLUMN IF NOT EXISTS ai_classification JSONB;
ALTER TABLE real_world_events ADD COLUMN IF NOT EXISTS ai_sentiment JSONB;
ALTER TABLE real_world_events ADD COLUMN IF NOT EXISTS ai_market_links JSONB;
ALTER TABLE real_world_events ADD COLUMN IF NOT EXISTS processing_status VARCHAR DEFAULT 'pending';
ALTER TABLE real_world_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE real_world_events ADD COLUMN IF NOT EXISTS content_hash VARCHAR;
ALTER TABLE real_world_events ADD COLUMN IF NOT EXISTS full_content TEXT;
ALTER TABLE real_world_events ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;
ALTER TABLE real_world_events ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES real_world_events(id);

-- Index for processing status queries
CREATE INDEX IF NOT EXISTS idx_real_world_events_processing ON real_world_events(processing_status, detected_at DESC);

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_real_world_events_content_hash ON real_world_events(content_hash);

-- Index for high-impact article queries
CREATE INDEX IF NOT EXISTS idx_real_world_events_severity ON real_world_events(severity, detected_at DESC);