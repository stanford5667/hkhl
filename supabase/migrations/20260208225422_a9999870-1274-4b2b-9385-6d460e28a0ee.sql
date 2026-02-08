-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Private rooms viewable by members" ON chat_rooms;
DROP POLICY IF EXISTS "Members list viewable by room members" ON room_members;

-- Create a security definer function to check room membership without RLS
CREATE OR REPLACE FUNCTION public.is_room_member(check_room_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM room_members
    WHERE room_id = check_room_id AND user_id = check_user_id
  );
$$;

-- Create a security definer function to get room type without RLS  
CREATE OR REPLACE FUNCTION public.get_room_type(check_room_id uuid)
RETURNS room_type
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT room_type FROM chat_rooms WHERE id = check_room_id;
$$;

-- Recreate chat_rooms policy for private rooms using the function
CREATE POLICY "Private rooms viewable by members"
  ON chat_rooms FOR SELECT
  USING (
    room_type = 'private'::room_type 
    AND is_room_member(id, auth.uid())
  );

-- Recreate room_members policy using the function
CREATE POLICY "Members list viewable by room members"
  ON room_members FOR SELECT
  USING (
    get_room_type(room_id) IN ('public'::room_type, 'stock'::room_type)
    OR user_id = auth.uid()
  );