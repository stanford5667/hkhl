
-- Affiliates table
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, suspended
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00, -- percentage
  commission_type VARCHAR(20) NOT NULL DEFAULT 'recurring', -- recurring, one_time
  attribution_days INTEGER NOT NULL DEFAULT 90,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  total_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_email VARCHAR(255),
  payment_method VARCHAR(50) DEFAULT 'paypal',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Affiliate referrals/clicks table
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id VARCHAR(100), -- anonymous tracking ID from cookie
  ip_address VARCHAR(45),
  user_agent TEXT,
  landing_page TEXT,
  click_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_up_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  conversion_amount DECIMAL(12,2),
  commission_amount DECIMAL(12,2),
  commission_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, rejected
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Affiliate payouts table
CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  notes TEXT,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Affiliates policies
CREATE POLICY "Users can view own affiliate record" ON public.affiliates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can insert own affiliate application" ON public.affiliates
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payment info" ON public.affiliates
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Referrals policies
CREATE POLICY "Affiliates can view own referrals" ON public.affiliate_referrals
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Service can insert referrals" ON public.affiliate_referrals
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Payouts policies
CREATE POLICY "Affiliates can view own payouts" ON public.affiliate_payouts
  FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Admins can manage payouts" ON public.affiliate_payouts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Index for fast lookups
CREATE INDEX idx_affiliates_code ON public.affiliates(affiliate_code);
CREATE INDEX idx_affiliates_user ON public.affiliates(user_id);
CREATE INDEX idx_referrals_affiliate ON public.affiliate_referrals(affiliate_id);
CREATE INDEX idx_referrals_visitor ON public.affiliate_referrals(visitor_id);
CREATE INDEX idx_referrals_referred_user ON public.affiliate_referrals(referred_user_id);

-- Generate unique affiliate code function
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS TEXT
LANGUAGE sql
SET search_path TO 'public'
AS $$
  SELECT upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
$$;
