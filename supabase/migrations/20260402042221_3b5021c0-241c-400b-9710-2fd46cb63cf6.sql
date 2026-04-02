
ALTER TABLE public.research_posts 
ADD COLUMN share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Update existing posts to have tokens
UPDATE public.research_posts SET share_token = encode(gen_random_bytes(16), 'hex') WHERE share_token IS NULL;

-- Make share_token NOT NULL after backfill
ALTER TABLE public.research_posts ALTER COLUMN share_token SET NOT NULL;

-- Create index for fast lookups
CREATE INDEX idx_research_posts_share_token ON public.research_posts(share_token);
