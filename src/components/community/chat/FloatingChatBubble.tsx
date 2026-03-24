import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useChatRooms } from '@/hooks/useChatRooms';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';

interface MiniMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user_name?: string;
}

export function FloatingChatBubble() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { rooms } = useChatRooms();
  const { getTotalUnreadCount, getUnreadCount } = useUnreadMessages();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MiniMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const totalUnread = getTotalUnreadCount();
  const selectedRoom = useMemo(() => rooms.find(r => r.id === selectedRoomId), [rooms, selectedRoomId]);

  // Fetch messages when a room is selected
  useEffect(() => {
    if (!selectedRoomId || !user) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, content, user_id, created_at')
        .eq('room_id', selectedRoomId)
        .is('reply_to', null)
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        const userIds = [...new Set(data.map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        
        setMessages(data.reverse().map(m => ({
          ...m,
          user_name: nameMap.get(m.user_id) || 'User',
        })));
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`mini-chat-${selectedRoomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${selectedRoomId}`,
      }, async (payload) => {
        const msg = payload.new as any;
        if (msg.reply_to) return;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', msg.user_id)
          .single();

        setMessages(prev => [...prev.slice(-29), {
          id: msg.id,
          content: msg.content,
          user_id: msg.user_id,
          created_at: msg.created_at,
          user_name: profile?.full_name || 'User',
        }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedRoomId, user]);

  // Hide on community/chat pages or when not authenticated
  const isChatPage = location.pathname.startsWith('/community');
  if (!user || isChatPage) return null;

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedRoomId || !user || sending) return;
    setSending(true);
    try {
      const { data } = await supabase.from('chat_messages').insert({
        room_id: selectedRoomId,
        user_id: user.id,
        content: newMessage.trim(),
      }).select().single();
      
      if (data) {
        supabase.functions.invoke('notify-chat-message', {
          body: { messageId: data.id, roomId: selectedRoomId, senderId: user.id, content: newMessage.trim().substring(0, 200) },
        }).catch(() => {});
      }
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed right-6 bottom-20 md:bottom-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 w-80 h-[420px] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-card">
              {selectedRoom && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedRoomId(null)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {selectedRoom ? `${selectedRoom.icon} ${selectedRoom.name}` : 'Chat Rooms'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  navigate(selectedRoom ? `/community/chat/${selectedRoom.slug}` : '/community');
                  setIsOpen(false);
                }}
              >
                Open Full
              </Button>
            </div>

            {/* Content */}
            {!selectedRoom ? (
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-0.5">
                  {rooms.map(room => {
                    const unread = getUnreadCount(room.id);
                    return (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoomId(room.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <span className="text-base">{room.icon}</span>
                        <span className="flex-1 text-sm font-medium truncate">{room.name}</span>
                        {unread > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 min-w-[18px] justify-center">
                            {unread > 99 ? '99+' : unread}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id} className={cn("flex flex-col", msg.user_id === user.id ? "items-end" : "items-start")}>
                        <p className="text-[10px] text-muted-foreground mb-0.5">
                          {msg.user_id === user.id ? 'You' : msg.user_name}
                        </p>
                        <div className={cn(
                          "px-3 py-1.5 rounded-xl text-xs max-w-[85%] break-words",
                          msg.user_id === user.id
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-2 border-t flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Type a message..."
                    className="h-8 text-xs"
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble button */}
      <Button
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-all duration-200",
          "bg-primary hover:bg-primary/90 hover:scale-105",
          isOpen && "bg-muted hover:bg-muted/90"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </div>
        )}
      </Button>
    </div>
  );
}
