import { useState, useCallback } from 'react';
import { ChatRoom } from '@/types/community';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { RoomHeader } from './RoomHeader';
import { toast } from 'sonner';

interface ChatRoomViewProps {
  room: ChatRoom;
  onBack?: () => void;
}

export function ChatRoomView({ room, onBack }: ChatRoomViewProps) {
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    userName: string;
  } | null>(null);

  const {
    messages,
    loading,
    hasMore,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    loadMoreMessages,
  } = useRealtimeMessages(room.id);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content, replyingTo?.id);
      setReplyingTo(null);
    } catch (err: any) {
      toast.error('Failed to send message: ' + err.message);
      throw err;
    }
  };

  const handleAddReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji);
    } catch (err: any) {
      toast.error('Failed to add reaction');
    }
  }, [addReaction]);

  const handleRemoveReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await removeReaction(messageId, emoji);
    } catch (err: any) {
      toast.error('Failed to remove reaction');
    }
  }, [removeReaction]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      toast.success('Message deleted');
    } catch (err: any) {
      toast.error('Failed to delete message');
    }
  }, [deleteMessage]);

  const handleReply = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyingTo({
        id: messageId,
        content: message.content.slice(0, 100),
        userName: message.user_profile?.full_name || 'Anonymous',
      });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <RoomHeader room={room} onBack={onBack} />

      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          Error: {error}
        </div>
      )}

      <MessageList
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        onAddReaction={handleAddReaction}
        onRemoveReaction={handleRemoveReaction}
        onDelete={handleDeleteMessage}
        onReply={handleReply}
        onLoadMore={loadMoreMessages}
      />

      <MessageInput
        onSend={handleSendMessage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        placeholder={`Message #${room.name}...`}
      />
    </div>
  );
}
