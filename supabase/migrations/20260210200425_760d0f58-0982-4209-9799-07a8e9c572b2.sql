
-- Table for muting users in specific rooms (admin controls who can post)
CREATE TABLE public.room_muted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  muted_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

ALTER TABLE public.room_muted_users ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read mute status (needed to check if they're muted)
CREATE POLICY "Authenticated users can view mute status"
ON public.room_muted_users FOR SELECT TO authenticated
USING (true);

-- Only admins can insert/delete muted users
CREATE POLICY "Admins can mute users"
ON public.room_muted_users FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can unmute users"
ON public.room_muted_users FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete ANY chat message (not just their own)
CREATE POLICY "Admins can delete any message"
ON public.chat_messages FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
