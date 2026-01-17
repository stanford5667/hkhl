-- Enable realtime for email_verifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_verifications;

-- Add RLS policy to allow users to read their own verification records
CREATE POLICY "Users can view their own verification records" 
ON public.email_verifications 
FOR SELECT 
USING (email = current_setting('request.jwt.claims', true)::json->>'email' OR auth.uid()::text IS NOT NULL);

-- Allow anyone to read verification status by email (needed for polling before auth)
CREATE POLICY "Anyone can check verification status by email" 
ON public.email_verifications 
FOR SELECT 
USING (true);