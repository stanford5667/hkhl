-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public read calc cache" ON calculation_cache;

-- Allow users to read their own cache entries
CREATE POLICY "Users read own calc cache" 
ON calculation_cache 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow reading NULL user_id entries (public/demo calculations)
CREATE POLICY "Public read demo calc cache" 
ON calculation_cache 
FOR SELECT 
USING (user_id IS NULL);