import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage, MessageThread } from '@/types/community';
import { extractTickers } from '@/utils/tickerParser';

export function useMessageThreads(roomId: string | null) {
  const [activeThread, setActiveThread] = useState<ChatMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<ChatMessage[]>([]);
  const [threadInfo, setThreadInfo] = useState<MessageThread | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const profileCacheRef = useRef<Map<string, { full_name: string | null; avatar_url: string | null }>>(new Map());

  // Fetch user profile with caching
  const fetchUserProfile = useCallback(async (userId: string) => {
    if (profileCacheRef.current.has(userId)) {
      return profileCacheRef.current.get(userId)!;
    }

    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', userId)
      .single();

    const profile = data || { full_name: null, avatar_url: null };
    profileCacheRef.current.set(userId, profile);
    return profile;
  }, []);

  // Open a thread
  const openThread = useCallback(async (parentMessage: ChatMessage) => {
    if (!roomId) return;

    setActiveThread(parentMessage);
    setLoading(true);

    try {
      // Fetch thread info
      const { data: thread } = await supabase
        .from('message_threads')
        .select('*')
        .eq('parent_message_id', parentMessage.id)
        .single();

      setThreadInfo(thread as MessageThread | null);

      // Fetch replies
      const { data: replies } = await supabase
        .from('chat_messages')
        .select(`
          *,
          message_reactions(*)
        `)
        .eq('reply_to', parentMessage.id)
        .order('created_at', { ascending: true });

      if (replies) {
        // Fetch profiles for replies
        const userIds = [...new Set(replies.map(r => r.user_id))];
        const profiles = await Promise.all(userIds.map(id => fetchUserProfile(id)));
        const profileMap = new Map(userIds.map((id, i) => [id, profiles[i]]));

        const repliesWithProfiles = replies.map(r => ({
          ...r,
          reactions: r.message_reactions || [],
          user_profile: profileMap.get(r.user_id) || { full_name: null, avatar_url: null },
        })) as ChatMessage[];

        setThreadReplies(repliesWithProfiles);
      }
    } catch (err) {
      console.error('Error opening thread:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId, fetchUserProfile]);

  // Close thread
  const closeThread = useCallback(() => {
    setActiveThread(null);
    setThreadReplies([]);
    setThreadInfo(null);
  }, []);

  // Send reply in thread
  const sendThreadReply = useCallback(async (content: string) => {
    if (!user || !roomId || !activeThread) {
      throw new Error('Must be authenticated and have an active thread');
    }

    const detectedTickers = extractTickers(content);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
        content,
        detected_tickers: detectedTickers,
        reply_to: activeThread.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Add to local state immediately
    const profile = await fetchUserProfile(user.id);
    const newReply = {
      ...data,
      reactions: [],
      user_profile: profile,
    } as ChatMessage;

    setThreadReplies(prev => [...prev, newReply]);

    // Update thread info
    setThreadInfo(prev => prev ? {
      ...prev,
      reply_count: prev.reply_count + 1,
      last_reply_at: new Date().toISOString(),
    } : null);

    return newReply;
  }, [user, roomId, activeThread, fetchUserProfile]);

  // Get thread info for a message
  const getThreadInfo = useCallback(async (messageId: string): Promise<MessageThread | null> => {
    const { data } = await supabase
      .from('message_threads')
      .select('*')
      .eq('parent_message_id', messageId)
      .single();

    return data as MessageThread | null;
  }, []);

  return {
    activeThread,
    threadReplies,
    threadInfo,
    loading,
    openThread,
    closeThread,
    sendThreadReply,
    getThreadInfo,
  };
}
