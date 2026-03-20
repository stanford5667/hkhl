import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChatRoom as ChatRoomType } from '@/types/community';
import { useChatRooms } from '@/hooks/useChatRooms';
import { ChatRoomList } from './chat/ChatRoomList';
import { ChatRoomView } from './chat/ChatRoomView';
import { PostFeed } from './posts/PostFeed';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageCircle, 
  FileText, 
  Menu, 
  Users,
  TrendingUp,
  LogIn
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationBell } from './NotificationBell';

interface CommunityHubProps {
  defaultTab?: 'chat' | 'posts';
  initialRoomId?: string;
}

export function CommunityHub({ defaultTab = 'chat', initialRoomId }: CommunityHubProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'posts'>(defaultTab);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomType | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { rooms, loading: roomsLoading } = useChatRooms();

  // Select initial room if provided or default to first room
  useEffect(() => {
    if (initialRoomId) {
      const room = rooms.find(r => r.id === initialRoomId || r.slug === initialRoomId);
      if (room) setSelectedRoom(room);
    } else if (rooms.length > 0 && !selectedRoom) {
      setSelectedRoom(rooms[0]);
    }
  }, [initialRoomId, rooms, selectedRoom]);

  const handleRoomSelect = (room: ChatRoomType) => {
    setSelectedRoom(room);
    setSidebarOpen(false);
    navigate(`/community/chat/${room.slug}`, { replace: true });
  };

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-card">
      <div className="p-4 border-b">
        <h2 className="font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Chat Rooms
        </h2>
      </div>
      <ChatRoomList
        rooms={rooms}
        loading={roomsLoading}
        activeRoomId={selectedRoom?.id}
        onRoomSelect={handleRoomSelect}
      />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Sign-in banner for logged-out users */}
      {!isAuthenticated && (
        <div className="px-4 py-3 bg-primary/10 border-b flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Join the conversation — sign in to chat and post research.</p>
          <Button size="sm" className="gap-2 shrink-0" onClick={() => navigate('/auth', { state: { from: location.pathname } })}>
            <LogIn className="h-4 w-4" />
            Sign In / Sign Up
          </Button>
        </div>
      )}
      {/* Tab navigation */}
      <div className="border-b px-4 py-2 flex items-center gap-4">
        {isMobile && activeTab === 'chat' && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'posts')}>
          <TabsList>
            <TabsTrigger value="chat" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Research</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          {!isAuthenticated ? (
            <Button size="sm" variant="default" className="gap-2" onClick={() => navigate('/auth', { state: { from: location.pathname } })}>
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          ) : (
            <>
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">
                {rooms.reduce((sum, r) => sum + r.member_count, 0).toLocaleString()} members online
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex min-h-0">
        {activeTab === 'chat' ? (
          <>
            {/* Desktop sidebar */}
            <div className="hidden md:block w-64 border-r shrink-0">
              <Sidebar />
            </div>

            {/* Chat room view */}
            <div className="flex-1 min-w-0">
              {selectedRoom ? (
                <ChatRoomView 
                  room={selectedRoom} 
                  onBack={() => setSidebarOpen(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a room to start chatting</p>
                  <p className="text-sm">Choose a room from the sidebar</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 p-4 overflow-auto">
            <PostFeed />
          </div>
        )}
      </div>
    </div>
  );
}
