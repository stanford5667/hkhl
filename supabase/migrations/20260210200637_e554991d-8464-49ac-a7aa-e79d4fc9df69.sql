
-- Allow admins to update chat room names and settings
CREATE POLICY "Admins can update chat rooms"
ON public.chat_rooms FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
