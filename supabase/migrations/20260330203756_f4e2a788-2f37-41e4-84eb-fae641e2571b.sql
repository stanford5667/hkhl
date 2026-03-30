CREATE POLICY "Admins can delete any post"
ON public.research_posts
FOR DELETE
TO authenticated
USING (public.is_admin());