-- 1. email_verifications: remove public/any-authenticated read of tokens
DROP POLICY IF EXISTS "Anyone can check verification status by email" ON public.email_verifications;
DROP POLICY IF EXISTS "Users can view their own verification records" ON public.email_verifications;

-- Safe helper so the signup screen can poll verification status without reading tokens
CREATE OR REPLACE FUNCTION public.is_email_verified(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.email_verifications
    WHERE lower(email) = lower(_email) AND verified = true
  )
$$;
REVOKE ALL ON FUNCTION public.is_email_verified(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_email_verified(text) TO anon, authenticated;

-- 2. affiliate_referrals: only backend may insert
DROP POLICY IF EXISTS "Service can insert referrals" ON public.affiliate_referrals;

-- 3. generated_alerts: only backend may insert
DROP POLICY IF EXISTS "Service role can insert generated alerts" ON public.generated_alerts;

-- 4. user_notifications: only backend may insert
DROP POLICY IF EXISTS "System can insert notifications" ON public.user_notifications;

-- 5. trade_ideas / trade_idea_feedback: drop mislabelled wide-open ALL policies
DROP POLICY IF EXISTS "Service role full access trade ideas" ON public.trade_ideas;
DROP POLICY IF EXISTS "Service role full access feedback" ON public.trade_idea_feedback;

-- tighten owner update on trade_ideas (previously also matched orphaned NULL-owner rows)
DROP POLICY IF EXISTS "Users can update own trade ideas" ON public.trade_ideas;
CREATE POLICY "Users can update own trade ideas"
ON public.trade_ideas FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());