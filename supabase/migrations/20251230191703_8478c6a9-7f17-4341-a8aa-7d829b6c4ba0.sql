-- Fix search_path for helper functions
CREATE OR REPLACE FUNCTION public.get_current_organization_id()
RETURNS UUID AS $$
  SELECT current_organization_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
  SELECT upper(substring(md5(random()::text) from 1 for 8));
$$ LANGUAGE SQL SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT)
RETURNS TEXT AS $$
  SELECT lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
$$ LANGUAGE SQL SET search_path = public;