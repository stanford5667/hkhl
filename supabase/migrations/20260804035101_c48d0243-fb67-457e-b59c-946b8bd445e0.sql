-- 1) PROFILES: remove full-directory exposure
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view permitted profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.can_view_profile(user_id));

-- Public-safe directory for community features (no PII columns)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT user_id, full_name, avatar_url, company, is_anonymous, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 2) ORGANIZATIONS
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;
CREATE POLICY "Owners can delete their organizations"
ON public.organizations FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members om
  WHERE om.organization_id = organizations.id
    AND om.user_id = auth.uid()
    AND om.role = 'owner'
));

DROP POLICY IF EXISTS "Public can view public org basics" ON public.organizations;

-- 3) USER PRESENCE: signed-in users only
DROP POLICY IF EXISTS "User presence is viewable by everyone" ON public.user_presence;
CREATE POLICY "Authenticated users can view presence"
ON public.user_presence FOR SELECT TO authenticated
USING (true);

-- 4) BROKERAGE TOKENS: never readable by browser clients
REVOKE SELECT (access_token) ON public.brokerage_connections FROM anon, authenticated;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='brokerage_connections' AND column_name='refresh_token'
  ) THEN
    EXECUTE 'REVOKE SELECT (refresh_token) ON public.brokerage_connections FROM anon, authenticated';
  END IF;
END $$;

-- 5) EMAIL VERIFICATIONS: stop realtime streaming of tokens
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='email_verifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.email_verifications';
  END IF;
END $$;

-- 6) SECURITY DEFINER FUNCTIONS: revoke public/authenticated EXECUTE except access-rule helpers
DO $$
DECLARE
  r record;
  keep text[] := ARRAY[
    'is_admin','has_role','is_org_member','is_org_admin','can_view_profile',
    'is_room_member','get_room_type','get_current_organization_id','is_email_verified'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF NOT (r.proname = ANY(keep)) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', r.sig);
    END IF;
  END LOOP;
END $$;

-- 7) STORAGE: keep public downloads, stop bucket listing
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view course videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view research thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view recordings" ON storage.objects;

CREATE POLICY "Owners can list their public bucket files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('avatars','chat-attachments','research-thumbnails','course-videos','stream-recordings')
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);