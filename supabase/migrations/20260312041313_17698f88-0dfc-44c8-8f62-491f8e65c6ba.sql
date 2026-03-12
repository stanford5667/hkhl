ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS stripe_coupon_id TEXT;
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS stripe_promo_code_id TEXT;