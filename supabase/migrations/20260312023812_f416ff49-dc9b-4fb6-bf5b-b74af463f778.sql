
-- Helper functions for affiliate tracking
CREATE OR REPLACE FUNCTION public.increment_affiliate_clicks(aff_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.affiliates
  SET total_clicks = total_clicks + 1, updated_at = now()
  WHERE id = aff_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_affiliate_referrals(aff_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.affiliates
  SET total_referrals = total_referrals + 1, updated_at = now()
  WHERE id = aff_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_affiliate_earnings(aff_id UUID, earning_amount DECIMAL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.affiliates
  SET total_earnings = total_earnings + earning_amount, updated_at = now()
  WHERE id = aff_id;
END;
$$;
