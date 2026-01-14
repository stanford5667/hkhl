-- Fix the new functions to have proper search_path
-- ===========================================

-- Drop and recreate can_view_profile with proper search_path
DROP FUNCTION IF EXISTS public.can_view_profile(uuid);

CREATE OR REPLACE FUNCTION public.can_view_profile(profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  viewer_org uuid;
  profile_org uuid;
BEGIN
  -- Users can always view their own profile
  IF auth.uid() = profile_user_id THEN
    RETURN true;
  END IF;
  
  -- Admins can view profiles
  IF is_admin() THEN
    RETURN true;
  END IF;
  
  -- Get viewer's current organization
  SELECT current_organization_id INTO viewer_org 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  -- Get profile's current organization
  SELECT current_organization_id INTO profile_org 
  FROM profiles 
  WHERE user_id = profile_user_id;
  
  -- Users in same org can view limited profile info
  IF viewer_org IS NOT NULL AND viewer_org = profile_org THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Drop and recreate log_sensitive_data_access with proper search_path
DROP FUNCTION IF EXISTS public.log_sensitive_data_access();

CREATE OR REPLACE FUNCTION public.log_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when someone views another user's profile
  IF TG_TABLE_NAME = 'profiles' AND auth.uid() IS NOT NULL AND auth.uid() != NEW.user_id THEN
    INSERT INTO admin_activity_log (
      admin_user_id,
      action_type,
      target_table,
      target_id,
      description,
      metadata
    ) VALUES (
      auth.uid(),
      'view_profile',
      'profiles',
      NEW.id,
      'Viewed profile of another user',
      jsonb_build_object('viewed_user_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate validate_strong_password with proper search_path
DROP FUNCTION IF EXISTS public.validate_strong_password();

CREATE OR REPLACE FUNCTION public.validate_strong_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This is a placeholder for password strength validation
  -- Actual password validation happens at Supabase Auth level
  RETURN NEW;
END;
$$;