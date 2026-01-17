-- Create email_verifications table for custom email verification via Loops
CREATE TABLE public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token UUID NOT NULL UNIQUE,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast token lookups
CREATE INDEX idx_email_verifications_token ON public.email_verifications(token);
CREATE INDEX idx_email_verifications_user_id ON public.email_verifications(user_id);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (edge functions use service role)
-- No public access policies needed