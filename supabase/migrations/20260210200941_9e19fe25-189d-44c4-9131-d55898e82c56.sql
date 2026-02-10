
-- Add posting_mode and requires_approval to chat_rooms
ALTER TABLE public.chat_rooms 
  ADD COLUMN posting_mode text NOT NULL DEFAULT 'everyone',
  ADD COLUMN requires_approval boolean NOT NULL DEFAULT false;

-- Allow admins to delete chat rooms
CREATE POLICY "Admins can delete chat rooms"
ON public.chat_rooms
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop the room_muted_users table (replaced by room-level posting_mode)
DROP TABLE IF EXISTS public.room_muted_users;
