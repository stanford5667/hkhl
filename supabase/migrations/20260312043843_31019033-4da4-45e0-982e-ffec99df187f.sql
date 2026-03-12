ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT FALSE;