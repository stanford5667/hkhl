
-- Add admin-only flag to chat_rooms
ALTER TABLE public.chat_rooms ADD COLUMN is_admin_only boolean NOT NULL DEFAULT false;

-- Drop existing SELECT policies to replace them
DROP POLICY IF EXISTS "Public rooms are viewable by everyone" ON public.chat_rooms;
DROP POLICY IF EXISTS "Private rooms viewable by members" ON public.chat_rooms;

-- Recreate: public/stock rooms visible to everyone UNLESS admin_only
CREATE POLICY "Public rooms visible to everyone"
ON public.chat_rooms FOR SELECT
USING (
  (room_type IN ('public', 'stock') AND is_admin_only = false)
);

-- Admin-only rooms visible only to admins
CREATE POLICY "Admin-only rooms visible to admins"
ON public.chat_rooms FOR SELECT
TO authenticated
USING (
  is_admin_only = true AND public.has_role(auth.uid(), 'admin')
);

-- Private rooms visible to members
CREATE POLICY "Private rooms viewable by members"
ON public.chat_rooms FOR SELECT
USING (
  room_type = 'private' AND is_admin_only = false AND public.is_room_member(id, auth.uid())
);

-- Restrict room creation to admins only
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.chat_rooms;
CREATE POLICY "Admins can create rooms"
ON public.chat_rooms FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
