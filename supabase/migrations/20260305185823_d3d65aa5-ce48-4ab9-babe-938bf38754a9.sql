DROP POLICY IF EXISTS "Users can update own usage" ON public.user_usage;
CREATE POLICY "Users can update own usage" ON public.user_usage
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);