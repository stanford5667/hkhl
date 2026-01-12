-- Create security definer function to check if user has a specific role
-- This avoids RLS recursion issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- Allow admins to view all user roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Allow admins to insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Allow admins to update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Allow admins to delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Create admin_activity_log table to track admin actions
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL,
  target_table text,
  target_id uuid,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all activity logs
CREATE POLICY "Admins can view activity logs"
ON public.admin_activity_log
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can insert activity logs
CREATE POLICY "Admins can insert activity logs"
ON public.admin_activity_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND auth.uid() = admin_user_id);

-- Create app_settings table for system configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read app settings
CREATE POLICY "Anyone can view app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify app settings
CREATE POLICY "Admins can update app settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert app settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete app settings"
ON public.app_settings
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Add admin read policies for key tables

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can update profiles
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Admins can view all organizations
CREATE POLICY "Admins can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can update organizations
CREATE POLICY "Admins can update organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Admins can view all organization members
CREATE POLICY "Admins can view all organization members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can view all companies
CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON public.documents
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can view all deals
CREATE POLICY "Admins can view all deals"
ON public.deals
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can view all tasks
CREATE POLICY "Admins can view all tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can view all activities
CREATE POLICY "Admins can view all activities"
ON public.activities
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can view all support tickets
CREATE POLICY "Admins can view all support tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can update support tickets
CREATE POLICY "Admins can update all support tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can view all user usage
CREATE POLICY "Admins can view all user usage"
ON public.user_usage
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can view all investment plans
CREATE POLICY "Admins can view all investment plans"
ON public.investment_plans
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value, description)
VALUES 
  ('maintenance_mode', '{"enabled": false, "message": ""}', 'Enable/disable maintenance mode'),
  ('feature_flags', '{"new_dashboard": true, "beta_features": false}', 'Feature flag settings'),
  ('signup_enabled', '{"enabled": true}', 'Allow new user signups')
ON CONFLICT (setting_key) DO NOTHING;