-- Create enum for room types
CREATE TYPE public.room_type AS ENUM ('public', 'stock', 'private');

-- 1. Chat Rooms table
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  room_type public.room_type NOT NULL DEFAULT 'public',
  ticker TEXT,
  icon TEXT DEFAULT '💬',
  member_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Chat Messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  mentioned_users UUID[] DEFAULT '{}',
  detected_tickers TEXT[] DEFAULT '{}',
  reply_to UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Message Reactions table
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- 4. Research Posts table
CREATE TABLE public.research_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  detected_tickers TEXT[] DEFAULT '{}',
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Post Votes table
CREATE TABLE public.post_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.research_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 6. Post Comments table
CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.research_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  detected_tickers TEXT[] DEFAULT '{}',
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Room Members table
CREATE TABLE public.room_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator')),
  UNIQUE(room_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX idx_research_posts_user_id ON public.research_posts(user_id);
CREATE INDEX idx_research_posts_created_at ON public.research_posts(created_at DESC);
CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_votes_post_id ON public.post_votes(post_id);
CREATE INDEX idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX idx_chat_rooms_ticker ON public.chat_rooms(ticker) WHERE ticker IS NOT NULL;

-- Enable RLS on all tables
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Chat Rooms RLS Policies
CREATE POLICY "Public rooms are viewable by everyone"
  ON public.chat_rooms FOR SELECT
  USING (room_type IN ('public', 'stock'));

CREATE POLICY "Private rooms viewable by members"
  ON public.chat_rooms FOR SELECT
  USING (
    room_type = 'private' AND 
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = chat_rooms.id AND user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Room creators can update their rooms"
  ON public.chat_rooms FOR UPDATE
  USING (created_by = auth.uid());

-- Chat Messages RLS Policies
CREATE POLICY "Messages in public rooms are viewable by everyone"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms 
      WHERE id = chat_messages.room_id 
      AND room_type IN ('public', 'stock')
    )
  );

CREATE POLICY "Messages in private rooms viewable by members"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_members 
      WHERE room_id = chat_messages.room_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update their own messages"
  ON public.chat_messages FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE
  USING (user_id = auth.uid());

-- Message Reactions RLS Policies
CREATE POLICY "Reactions are viewable by everyone"
  ON public.message_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can remove their own reactions"
  ON public.message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- Research Posts RLS Policies
CREATE POLICY "Posts are viewable by everyone"
  ON public.research_posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.research_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update their own posts"
  ON public.research_posts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts"
  ON public.research_posts FOR DELETE
  USING (user_id = auth.uid());

-- Post Votes RLS Policies
CREATE POLICY "Votes are viewable by everyone"
  ON public.post_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.post_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update their own votes"
  ON public.post_votes FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own votes"
  ON public.post_votes FOR DELETE
  USING (user_id = auth.uid());

-- Post Comments RLS Policies
CREATE POLICY "Comments are viewable by everyone"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can comment"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update their own comments"
  ON public.post_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.post_comments FOR DELETE
  USING (user_id = auth.uid());

-- Room Members RLS Policies
CREATE POLICY "Members list viewable by room members"
  ON public.room_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms 
      WHERE id = room_members.room_id 
      AND room_type IN ('public', 'stock')
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can join public rooms"
  ON public.room_members FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chat_rooms 
      WHERE id = room_members.room_id 
      AND room_type IN ('public', 'stock')
    )
  );

CREATE POLICY "Users can leave rooms"
  ON public.room_members FOR DELETE
  USING (user_id = auth.uid());

-- Function to update post vote counts
CREATE OR REPLACE FUNCTION public.update_post_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.research_posts
    SET 
      upvotes = upvotes + CASE WHEN NEW.vote_type = 1 THEN 1 ELSE 0 END,
      downvotes = downvotes + CASE WHEN NEW.vote_type = -1 THEN 1 ELSE 0 END
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.research_posts
    SET 
      upvotes = upvotes + CASE WHEN NEW.vote_type = 1 THEN 1 ELSE 0 END - CASE WHEN OLD.vote_type = 1 THEN 1 ELSE 0 END,
      downvotes = downvotes + CASE WHEN NEW.vote_type = -1 THEN 1 ELSE 0 END - CASE WHEN OLD.vote_type = -1 THEN 1 ELSE 0 END
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.research_posts
    SET 
      upvotes = upvotes - CASE WHEN OLD.vote_type = 1 THEN 1 ELSE 0 END,
      downvotes = downvotes - CASE WHEN OLD.vote_type = -1 THEN 1 ELSE 0 END
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_post_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.post_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_vote_counts();

-- Function to update post comment count
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.research_posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.research_posts
    SET comment_count = comment_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_post_comment_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();

-- Function to update room member count
CREATE OR REPLACE FUNCTION public.update_room_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.chat_rooms
    SET member_count = member_count + 1
    WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.chat_rooms
    SET member_count = member_count - 1
    WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_room_member_count
  AFTER INSERT OR DELETE ON public.room_members
  FOR EACH ROW EXECUTE FUNCTION public.update_room_member_count();

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER set_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_research_posts_updated_at
  BEFORE UPDATE ON public.research_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.research_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat attachments
CREATE POLICY "Authenticated users can upload chat attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view chat attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete their own attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert default public chat rooms
INSERT INTO public.chat_rooms (name, slug, description, room_type, icon, created_by)
VALUES 
  ('General', 'general', 'General discussion about markets and trading', 'public', '💬', '00000000-0000-0000-0000-000000000000'),
  ('Day Trading', 'day-trading', 'Fast-paced discussion for day traders', 'public', '⚡', '00000000-0000-0000-0000-000000000000'),
  ('Swing Trading', 'swing-trading', 'Multi-day trade setups and analysis', 'public', '📊', '00000000-0000-0000-0000-000000000000'),
  ('Options', 'options', 'Options strategies and plays', 'public', '🎯', '00000000-0000-0000-0000-000000000000'),
  ('Crypto', 'crypto', 'Cryptocurrency discussion', 'public', '₿', '00000000-0000-0000-0000-000000000000'),
  ('Earnings Plays', 'earnings', 'Earnings season strategies', 'public', '📈', '00000000-0000-0000-0000-000000000000');