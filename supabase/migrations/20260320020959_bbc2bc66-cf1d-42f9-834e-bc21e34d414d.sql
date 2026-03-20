
-- Notifications table for lifecycle messages
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.user_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.user_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.user_notifications FOR INSERT
WITH CHECK (true);

-- Welcome message trigger on room_members INSERT
CREATE OR REPLACE FUNCTION public.send_room_welcome_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_name TEXT;
  room_name TEXT;
BEGIN
  SELECT COALESCE(full_name, 'New Member') INTO member_name
  FROM profiles WHERE user_id = NEW.user_id;
  
  SELECT name INTO room_name
  FROM chat_rooms WHERE id = NEW.room_id;
  
  INSERT INTO chat_messages (room_id, user_id, content)
  VALUES (
    NEW.room_id,
    NEW.user_id,
    '👋 **' || member_name || '** just joined ' || COALESCE(room_name, 'the chat') || '! Welcome!'
  );
  
  INSERT INTO user_notifications (user_id, type, title, message)
  VALUES (
    NEW.user_id,
    'welcome',
    'Welcome to ' || COALESCE(room_name, 'the chat') || '!',
    'You''ve joined ' || COALESCE(room_name, 'the community') || '. Start chatting and connect with fellow members!'
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_room_member_joined ON public.room_members;
CREATE TRIGGER on_room_member_joined
AFTER INSERT ON public.room_members
FOR EACH ROW
EXECUTE FUNCTION public.send_room_welcome_message();
