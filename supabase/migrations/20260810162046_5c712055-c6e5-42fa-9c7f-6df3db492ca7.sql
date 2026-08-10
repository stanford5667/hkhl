ALTER TABLE public.research_posts
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_at timestamptz;

CREATE INDEX IF NOT EXISTS research_posts_featured_idx
  ON public.research_posts (is_featured, featured_at DESC);