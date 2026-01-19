-- First, enable RLS on email_verifications table if not already enabled
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.email_verifications;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.email_verifications;
DROP POLICY IF EXISTS "Enable update for all users" ON public.email_verifications;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.email_verifications;
DROP POLICY IF EXISTS "Anyone can read email verifications" ON public.email_verifications;
DROP POLICY IF EXISTS "Public read access" ON public.email_verifications;

-- Create secure policies: users can only access their own verification records
CREATE POLICY "Users can view their own verifications"
ON public.email_verifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verifications"
ON public.email_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verifications"
ON public.email_verifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own verifications"
ON public.email_verifications
FOR DELETE
USING (auth.uid() = user_id);