-- FIX: Remove SECURITY DEFINER from views (use SECURITY INVOKER instead)
-- ===========================================

-- Drop the problematic views
DROP VIEW IF EXISTS public.brokerage_connections_secure;
DROP VIEW IF EXISTS public.profiles_secure;
DROP VIEW IF EXISTS public.organizations_public;
DROP VIEW IF EXISTS public.current_user_context;

-- Recreate with SECURITY INVOKER (default, but explicit for clarity)
-- This ensures RLS policies apply to the querying user

-- 1. Secure brokerage connections view (excludes access_token)
CREATE VIEW public.brokerage_connections_secure
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  brokerage_name,
  account_name,
  account_mask,
  connection_status,
  last_sync_at,
  sync_error,
  portfolio_id,
  created_at,
  updated_at
  -- access_token is INTENTIONALLY EXCLUDED for security
FROM public.brokerage_connections;

-- 2. Secure profiles view (masks phone for non-owners)
CREATE VIEW public.profiles_secure
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  company,
  job_title,
  linkedin_url,
  current_organization_id,
  created_at,
  updated_at,
  onboarding_completed,
  onboarding_step,
  preferences,
  -- Mask phone number for non-owners
  CASE 
    WHEN auth.uid() = user_id OR is_admin() 
    THEN phone 
    ELSE CASE 
      WHEN phone IS NOT NULL 
      THEN '***-***-' || RIGHT(phone, 4)
      ELSE NULL 
    END
  END as phone
FROM public.profiles;

-- 3. Public organizations view (limited fields)
CREATE VIEW public.organizations_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  website,
  type,
  is_public,
  allow_join_requests,
  created_at
  -- EXCLUDED: settings, max_members, max_companies, plan, enabled_asset_types
FROM public.organizations
WHERE is_public = true;

-- 4. Current user context view
CREATE VIEW public.current_user_context
WITH (security_invoker = true)
AS
SELECT 
  p.user_id,
  p.full_name,
  p.current_organization_id,
  o.name as organization_name,
  om.role as organization_role,
  COALESCE(ur.role::text, 'user') as app_role,
  p.onboarding_completed
FROM profiles p
LEFT JOIN organizations o ON o.id = p.current_organization_id
LEFT JOIN organization_members om ON om.organization_id = p.current_organization_id AND om.user_id = p.user_id
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
WHERE p.user_id = auth.uid();

-- Grant proper permissions
GRANT SELECT ON public.brokerage_connections_secure TO authenticated;
GRANT SELECT ON public.profiles_secure TO authenticated;
GRANT SELECT ON public.organizations_public TO authenticated, anon;
GRANT SELECT ON public.current_user_context TO authenticated;