-- Add is_premium to individual messages
ALTER TABLE chat_messages ADD COLUMN is_premium boolean DEFAULT false;

-- Create pinned_messages table
CREATE TABLE public.pinned_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id)
);

-- Create room_read_receipts for tracking unread messages
CREATE TABLE public.room_read_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create user_presence table for online/offline status
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'idle', 'offline')),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_room_id UUID REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message_threads table for threaded replies
CREATE TABLE public.message_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  reply_count INTEGER NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_message_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

-- RLS policies for pinned_messages (viewable by all, manageable by admins)
CREATE POLICY "Pinned messages are viewable by everyone" 
ON public.pinned_messages FOR SELECT USING (true);

CREATE POLICY "Authenticated users can pin messages" 
ON public.pinned_messages FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can unpin messages they pinned" 
ON public.pinned_messages FOR DELETE 
USING (auth.uid() = pinned_by);

-- RLS policies for room_read_receipts
CREATE POLICY "Users can view their own read receipts" 
ON public.room_read_receipts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read receipts" 
ON public.room_read_receipts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read receipts" 
ON public.room_read_receipts FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for user_presence
CREATE POLICY "User presence is viewable by everyone" 
ON public.user_presence FOR SELECT USING (true);

CREATE POLICY "Users can insert their own presence" 
ON public.user_presence FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence" 
ON public.user_presence FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for message_threads
CREATE POLICY "Message threads are viewable by everyone" 
ON public.message_threads FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create threads" 
ON public.message_threads FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update threads" 
ON public.message_threads FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Enable realtime for presence and read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;

-- Function to update thread reply count on new message
CREATE OR REPLACE FUNCTION public.update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reply_to IS NOT NULL THEN
    -- Upsert thread record
    INSERT INTO public.message_threads (parent_message_id, room_id, reply_count, last_reply_at)
    VALUES (NEW.reply_to, NEW.room_id, 1, now())
    ON CONFLICT (parent_message_id) 
    DO UPDATE SET 
      reply_count = message_threads.reply_count + 1,
      last_reply_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update thread count on new reply
CREATE TRIGGER on_message_reply
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_thread_reply_count();

-- Function to decrement thread reply count on message delete
CREATE OR REPLACE FUNCTION public.decrement_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.reply_to IS NOT NULL THEN
    UPDATE public.message_threads 
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE parent_message_id = OLD.reply_to;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to decrement thread count on reply delete
CREATE TRIGGER on_message_reply_delete
AFTER DELETE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.decrement_thread_reply_count();

-- Index for faster unread count queries
CREATE INDEX idx_chat_messages_room_created ON public.chat_messages(room_id, created_at DESC);
CREATE INDEX idx_room_read_receipts_user ON public.room_read_receipts(user_id);
CREATE INDEX idx_user_presence_status ON public.user_presence(status);
CREATE INDEX idx_pinned_messages_room ON public.pinned_messages(room_id);