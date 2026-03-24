ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bio text DEFAULT null,
  ADD COLUMN IF NOT EXISTS location text DEFAULT null;