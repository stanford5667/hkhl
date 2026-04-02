// Community feature types

export type RoomType = 'public' | 'stock' | 'private';

export interface ChatRoom {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  room_type: RoomType;
  ticker: string | null;
  icon: string;
  member_count: number;
  is_premium: boolean;
  posting_mode: 'everyone' | 'admin_only';
  requires_approval: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_live: boolean;
  live_stream_url: string | null;
  live_started_by: string | null;
  live_started_at: string | null;
  is_admin_only: boolean;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  mentioned_users: string[];
  detected_tickers: string[];
  reply_to: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  is_edited: boolean;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    is_anonymous?: boolean;
    is_admin?: boolean;
    bio?: string | null;
  };
  reactions?: MessageReaction[];
  thread?: MessageThread;
  isPinned?: boolean;
}

export interface MessageThread {
  id: string;
  parent_message_id: string;
  room_id: string;
  reply_count: number;
  last_reply_at: string | null;
  created_at: string;
}

export interface PinnedMessage {
  id: string;
  message_id: string;
  room_id: string;
  pinned_by: string;
  pinned_at: string;
}

export interface RoomReadReceipt {
  id: string;
  room_id: string;
  user_id: string;
  last_read_message_id: string | null;
  last_read_at: string;
}

export type UserPresenceStatus = 'online' | 'idle' | 'offline';

export interface UserPresence {
  id: string;
  user_id: string;
  status: UserPresenceStatus;
  last_seen_at: string;
  current_room_id: string | null;
  updated_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ResearchPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  thumbnail_url: string | null;
  detected_tickers: string[];
  upvotes: number;
  downvotes: number;
  comment_count: number;
  is_pinned: boolean;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  user_vote?: number | null; // 1, -1, or null
}

export interface PostVote {
  id: string;
  post_id: string;
  user_id: string;
  vote_type: number; // 1 or -1
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  detected_tickers: string[];
  upvotes: number;
  created_at: string;
  updated_at: string;
  // Joined data
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  replies?: PostComment[];
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  role: 'member' | 'moderator';
  // Joined data
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Realtime event types
export type RealtimeMessageEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: ChatMessage;
  old: ChatMessage | null;
};

export type RealtimeReactionEvent = {
  eventType: 'INSERT' | 'DELETE';
  new: MessageReaction;
  old: MessageReaction | null;
};

// Sort options for posts
export type PostSortOption = 'hot' | 'new' | 'top';
export type PostTimeFilter = 'day' | 'week' | 'month' | 'year' | 'all';
