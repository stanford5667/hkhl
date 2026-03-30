import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatRoom } from '@/types/community';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useUserPresence } from '@/hooks/useUserPresence';
import { usePinnedMessages } from '@/hooks/usePinnedMessages';
import { useMessageThreads } from '@/hooks/useMessageThreads';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useChatRooms } from '@/hooks/useChatRooms';
import { LivestreamPlayer } from './LivestreamPlayer';
import { LiveKitBroadcaster } from './LiveKitBroadcaster';
import { LiveKitViewer } from './LiveKitViewer';
import { useStreamRecordings } from '@/hooks/useStreamRecordings';
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
  const [livekitMode, setLivekitMode] = useState(false);

  const navigate = useNavigate();
  const { isPro, showUpgradeModal } = useUsage();
  const { isAdmin } = useAdmin();

  const canAccess = isPro || isAdmin;
  const canPost = isAdmin || room.posting_mode === 'everyone';
  const canPin = isAdmin;

  const {
    messages, loading, hasMore, error,
    sendMessage, editMessage, deleteMessage,
    addReaction, removeReaction, setMessagePremium, loadMoreMessages,
  } = useRealtimeMessages(room.id);

  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(room.id);
  const { getUserPresence } = useUserPresence(room.id);
  const { pinnedMessages, pinMessage, unpinMessage, isMessagePinned } = usePinnedMessages(room.id);
  const { markRoomAsRead } = useUnreadMessages();
  const { fetchRooms, startLivestream, stopLivestream } = useChatRooms();
  const { recordings, loading: recordingsLoading, saveRecording, deleteRecording } = useStreamRecordings(room.id);
  const {
    activeThread, threadReplies, threadInfo,
    loading: threadLoading, openThread, closeThread, sendThreadReply,
  } = useMessageThreads(room.id);

  const pinnedMessageIds = useMemo(() => new Set(pinnedMessages.map(m => m.id)), [pinnedMessages]);

  useEffect(() => {
    if (canAccess && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      markRoomAsRead(room.id, lastMessage.id);
    }
  }, [canAccess, messages, room.id, markRoomAsRead]);

  const handleSendMessage = async (content: string, attachmentUrl?: string, attachmentType?: string) => {
    try {
      stopTyping();
      await sendMessage(content, replyingTo?.id, attachmentUrl, attachmentType);
      setReplyingTo(null);
    } catch (err: any) {
      toast.error('Failed to send message: ' + err.message);
      throw err;
    }
  };

  const handleTyping = useCallback(() => { startTyping(); }, [startTyping]);

  const handleAddReaction = useCallback(async (messageId: string, emoji: string) => {
    try { await addReaction(messageId, emoji); } catch { toast.error('Failed to add reaction'); }
  }, [addReaction]);

  const handleRemoveReaction = useCallback(async (messageId: string, emoji: string) => {
    try { await removeReaction(messageId, emoji); } catch { toast.error('Failed to remove reaction'); }
  }, [removeReaction]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try { await deleteMessage(messageId, isAdmin); toast.success('Message deleted'); } catch { toast.error('Failed to delete message'); }
  }, [deleteMessage, isAdmin]);

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
    try { await pinMessage(messageId); toast.success('Message pinned'); } catch { toast.error('Failed to pin message'); }
  }, [pinMessage]);

  const handleUnpinMessage = useCallback(async (messageId: string) => {
    try { await unpinMessage(messageId); toast.success('Message unpinned'); } catch { toast.error('Failed to unpin message'); }
  }, [unpinMessage]);

  const handleSetMessagePremium = useCallback(async (messageId: string, isPremium: boolean) => {
    try { await setMessagePremium(messageId, isPremium); toast.success(isPremium ? 'Message marked as premium' : 'Premium removed'); } catch { toast.error('Failed to update message'); }
  }, [setMessagePremium]);

  const handleUpgradeClick = () => { showUpgradeModal('premiumChat'); };

  const handleSendThreadReply = async (content: string, attachmentUrl?: string, attachmentType?: string) => {
    try { await sendThreadReply(content, attachmentUrl, attachmentType); } catch (err: any) { toast.error('Failed to send reply: ' + err.message); throw err; }
  };

  const handleRoomDeleted = () => {
    navigate('/community');
  };

  const handleStartLivestream = async (url: string) => {
    if (url === '__livekit__') {
      // LiveKit native mode
      await startLivestream(room.id, '__livekit__');
      setLivekitMode(true);
    } else {
      await startLivestream(room.id, url);
      setLivekitMode(false);
    }
    // Refresh rooms so room.is_live updates
    await fetchRooms();
  };

  const handleStopLivestream = async () => {
    setLivekitMode(false);
    await stopLivestream(room.id);
  };

  const getInputPlaceholder = () => {
    if (!canPost) return 'Only admins can post in this room';
    if (room.requires_approval) return `Message #${room.name}... (requires approval)`;
    return `Message #${room.name}...`;
  };

  return (
    <div className="flex flex-col h-full relative">
      <RoomHeader
        room={room}
        onBack={onBack}
        onRoomRenamed={fetchRooms}
        onRoomDeleted={handleRoomDeleted}
        onSettingsChanged={fetchRooms}
        onStartLivestream={handleStartLivestream}
        onStopLivestream={handleStopLivestream}
      />

      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          Error: {error}
        </div>
      )}

      {pinnedMessages.length > 0 && canAccess && (
        <PinnedMessagesBar
          pinnedMessages={pinnedMessages}
          onUnpin={canPin ? handleUnpinMessage : undefined}
          canUnpin={canPin}
        />
      )}

      <div className="flex-1 relative overflow-hidden">
      {(room.is_live || livekitMode) && canAccess && (
          room.live_stream_url === '__livekit__' || livekitMode ? (
            isAdmin ? (
              <LiveKitBroadcaster
                roomId={room.id}
                onStopStream={handleStopLivestream}
                onRecordingSaved={(blob, duration) => saveRecording(blob, duration)}
              />
            ) : (
              <LiveKitViewer roomId={room.id} />
            )
          ) : room.live_stream_url ? (
            <LivestreamPlayer
              streamUrl={room.live_stream_url}
              isAdmin={isAdmin}
              onStopStream={handleStopLivestream}
            />
          ) : null
        )}

        {canAccess && !room.is_live && !livekitMode && (
          <StreamRecordingsList
            recordings={recordings}
            loading={recordingsLoading}
            isAdmin={isAdmin}
            onDelete={isAdmin ? deleteRecording : undefined}
          />
        )}
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
              {canAccess && <TypingIndicator typingUsers={typingUsers} />}
            </div>
          </ResizablePanel>

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
        placeholder={getInputPlaceholder()}
        locked={!canAccess}
        disabled={!canPost}
        onUpgradeClick={handleUpgradeClick}
      />
    </div>
  );
}
