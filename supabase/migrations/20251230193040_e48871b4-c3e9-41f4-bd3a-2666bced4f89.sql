-- Fix organizations RLS: allow creator to read newly created org and fix delete policy bug

-- 1) Add created_by to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);

-- 2) Backfill created_by for existing orgs (best-effort: pick owner, else any member)
UPDATE public.organizations o
SET created_by = COALESCE(
  (
    SELECT om.user_id
    FROM public.organization_members om
    WHERE om.organization_id = o.id
      AND om.role = 'owner'
    ORDER BY om.joined_at NULLS LAST
    LIMIT 1
  ),
  (
    SELECT om.user_id
    FROM public.organization_members om
    WHERE om.organization_id = o.id
    ORDER BY om.joined_at NULLS LAST
    LIMIT 1
  )
)
WHERE o.created_by IS NULL;

-- 3) Update policies
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;

CREATE POLICY "Users can view their organizations" ON public.organizations
FOR SELECT
USING (
  public.is_org_member(id)
  OR is_public = true
  OR created_by = auth.uid()
);

-- Require created_by on insert so RETURNING works for creator before membership insert.
CREATE POLICY "Users can create organizations" ON public.organizations
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Fix delete policy (was incorrectly comparing organization_id to member row id)
CREATE POLICY "Owners can delete their organizations" ON public.organizations
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
  )
);
