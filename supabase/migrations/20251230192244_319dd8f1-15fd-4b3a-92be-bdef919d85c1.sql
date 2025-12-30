-- Fix infinite recursion in organization_members RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view members of their orgs" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.organization_members;

-- Create a security definer function to check org membership (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Recreate policies using the security definer functions
CREATE POLICY "Users can view members of their orgs" ON public.organization_members
FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "Users can add themselves as members" ON public.organization_members
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update members" ON public.organization_members
FOR UPDATE USING (public.is_org_admin(organization_id));

CREATE POLICY "Users can remove themselves or admins can remove others" ON public.organization_members
FOR DELETE USING (user_id = auth.uid() OR public.is_org_admin(organization_id));

-- Also fix organizations policies to avoid recursion
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners/admins can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;

CREATE POLICY "Users can view their organizations" ON public.organizations
FOR SELECT USING (public.is_org_member(id) OR is_public = true);

CREATE POLICY "Admins can update their organizations" ON public.organizations
FOR UPDATE USING (public.is_org_admin(id));

CREATE POLICY "Owners can delete their organizations" ON public.organizations
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = id AND user_id = auth.uid() AND role = 'owner'
  )
);

-- Fix organization_invites policies
DROP POLICY IF EXISTS "Users can view invites for their orgs" ON public.organization_invites;
DROP POLICY IF EXISTS "Admins can create invites" ON public.organization_invites;
DROP POLICY IF EXISTS "Admins can update invites" ON public.organization_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON public.organization_invites;

CREATE POLICY "Users can view invites for their orgs" ON public.organization_invites
FOR SELECT USING (
  public.is_org_member(organization_id)
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Admins can create invites" ON public.organization_invites
FOR INSERT WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Admins can update invites" ON public.organization_invites
FOR UPDATE USING (public.is_org_admin(organization_id));

CREATE POLICY "Admins can delete invites" ON public.organization_invites
FOR DELETE USING (public.is_org_admin(organization_id));