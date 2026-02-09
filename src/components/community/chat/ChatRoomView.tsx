import { useState, useCallback, useMemo } from 'react';
import { ChatRoom } from '@/types/community';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useUserPresence } from '@/hooks/useUserPresence';
import { usePinnedMessages } from '@/hooks/usePinnedMessages';
import { useMessageThreads } from '@/hooks/useMessageThreads';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUsage } from '@/contexts/UsageContext';
import { useAdmin } from '@/hooks/useAdmin';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { RoomHeader } from './RoomHeader';
import { PremiumRoomGate } from './PremiumRoomGate';
import { TypingIndicator } from './TypingIndicator';
import { PinnedMessagesBar } from './PinnedMessagesBar';
import { ThreadPanel } from './ThreadPanel';
import { toast } from 'sonner';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

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

  const { isPro, showUpgradeModal } = useUsage();
  const { isAdmin } = useAdmin();

  // Full access if: not premium, OR user is pro, OR user is admin
  const canAccess = !room.is_premium || isPro || isAdmin;
  const canPin = isAdmin;

  // Core message functionality
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
    setMessagePremium,
    loadMoreMessages,
  } = useRealtimeMessages(room.id);

  // Discord-like features
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(room.id);
  const { getUserPresence } = useUserPresence(room.id);
  const { pinnedMessages, pinMessage, unpinMessage, isMessagePinned } = usePinnedMessages(room.id);
  const { markRoomAsRead } = useUnreadMessages();
  const {
    activeThread,
    threadReplies,
    threadInfo,
    loading: threadLoading,
    openThread,
    closeThread,
    sendThreadReply,
  } = useMessageThreads(room.id);

  // Pinned message IDs for quick lookup
  const pinnedMessageIds = useMemo(() => {
    return new Set(pinnedMessages.map(m => m.id));
  }, [pinnedMessages]);

  // Mark room as read when viewing
  useState(() => {
    if (canAccess && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      markRoomAsRead(room.id, lastMessage.id);
    }
  });

  const handleSendMessage = async (content: string) => {
    try {
      stopTyping();
      await sendMessage(content, replyingTo?.id);
      setReplyingTo(null);
    } catch (err: any) {
      toast.error('Failed to send message: ' + err.message);
      throw err;
    }
  };

  const handleTyping = useCallback(() => {
    startTyping();
  }, [startTyping]);

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

  const handlePinMessage = useCallback(async (messageId: string) => {
    try {
      await pinMessage(messageId);
      toast.success('Message pinned');
    } catch (err: any) {
      toast.error('Failed to pin message');
    }
  }, [pinMessage]);

  const handleUnpinMessage = useCallback(async (messageId: string) => {
    try {
      await unpinMessage(messageId);
      toast.success('Message unpinned');
    } catch (err: any) {
      toast.error('Failed to unpin message');
    }
  }, [unpinMessage]);

  const handleSetMessagePremium = useCallback(async (messageId: string, isPremium: boolean) => {
    try {
      await setMessagePremium(messageId, isPremium);
      toast.success(isPremium ? 'Message marked as premium' : 'Premium removed from message');
    } catch (err: any) {
      toast.error('Failed to update message');
    }
  }, [setMessagePremium]);

  const handleUpgradeClick = () => {
    showUpgradeModal('premiumChat');
  };

  const handleSendThreadReply = async (content: string) => {
    try {
      await sendThreadReply(content);
    } catch (err: any) {
      toast.error('Failed to send reply: ' + err.message);
      throw err;
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <RoomHeader room={room} onBack={onBack} />

      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          Error: {error}
        </div>
      )}

      {/* Pinned messages bar */}
      {pinnedMessages.length > 0 && canAccess && (
        <PinnedMessagesBar
          pinnedMessages={pinnedMessages}
          onUnpin={canPin ? handleUnpinMessage : undefined}
          canUnpin={canPin}
        />
      )}

      <div className="flex-1 relative overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={activeThread ? 60 : 100} minSize={40}>
            <div className="flex flex-col h-full">
              <MessageList
                messages={messages}
                loading={loading}
                hasMore={hasMore}
                blurred={!canAccess}
                onAddReaction={handleAddReaction}
                onRemoveReaction={handleRemoveReaction}
                onDelete={canAccess ? handleDeleteMessage : undefined}
                onReply={canAccess ? handleReply : undefined}
                onOpenThread={canAccess ? openThread : undefined}
                onPin={canPin ? handlePinMessage : undefined}
                onUnpin={canPin ? handleUnpinMessage : undefined}
                onSetPremium={isAdmin ? handleSetMessagePremium : undefined}
                onLoadMore={loadMoreMessages}
                pinnedMessageIds={pinnedMessageIds}
                canPin={canPin}
                getUserPresence={getUserPresence}
              />

              {/* Typing indicator */}
              {canAccess && <TypingIndicator typingUsers={typingUsers} />}
            </div>
          </ResizablePanel>

          {/* Thread panel */}
          {activeThread && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={30}>
                <ThreadPanel
                  parentMessage={activeThread}
                  replies={threadReplies}
                  replyCount={threadInfo?.reply_count || 0}
                  loading={threadLoading}
                  onClose={closeThread}
                  onSendReply={handleSendThreadReply}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Premium gate overlay */}
        {!canAccess && (
          <PremiumRoomGate 
            memberCount={room.member_count} 
            roomName={room.name} 
          />
        )}
      </div>

      <MessageInput
        onSend={handleSendMessage}
        onTyping={handleTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        placeholder={`Message #${room.name}...`}
        locked={!canAccess}
        onUpgradeClick={handleUpgradeClick}
      />
    </div>
  );
}
