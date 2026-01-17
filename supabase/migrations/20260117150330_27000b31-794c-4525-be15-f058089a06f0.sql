-- Add age verification flag to profiles (data minimization - we don't store DOB)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_age_verified boolean DEFAULT false;

-- Add age_verified_at timestamp for audit purposes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age_verified_at timestamp with time zone;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.profiles.is_age_verified IS 'Stores whether user confirmed they are 18+ during signup. DOB is not stored for privacy/data minimization.';
COMMENT ON COLUMN public.profiles.age_verified_at IS 'Timestamp when user verified their age during signup.';