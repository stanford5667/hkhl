CREATE POLICY "Admins can update any post"
ON public.research_posts
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());