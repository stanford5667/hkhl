-- Allow admins to see messages in any room (including admin-only rooms)
CREATE POLICY "Admins can view all messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (public.is_admin());
