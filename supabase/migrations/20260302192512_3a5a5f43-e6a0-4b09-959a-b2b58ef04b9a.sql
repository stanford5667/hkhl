
-- Create page_views table to track which pages users visit
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page_path text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient per-user queries
CREATE INDEX idx_page_views_user_id ON public.page_views (user_id, viewed_at DESC);
CREATE INDEX idx_page_views_viewed_at ON public.page_views (viewed_at DESC);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Users can insert their own page views
CREATE POLICY "Users can insert own page views"
ON public.page_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can read their own page views
CREATE POLICY "Users can read own page views"
ON public.page_views FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can read all page views
CREATE POLICY "Admins can read all page views"
ON public.page_views FOR SELECT
TO authenticated
USING (public.is_admin());
