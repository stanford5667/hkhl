import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChatRoom as ChatRoomType } from '@/types/community';
import { useChatRooms } from '@/hooks/useChatRooms';
import { ChatRoomList } from './chat/ChatRoomList';
import { ChatRoomView } from './chat/ChatRoomView';
import { PostFeed } from './posts/PostFeed';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { CreateRoomDialog } from './chat/CreateRoomDialog';
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
  const { isAdmin } = useAdmin();
  const isPostsRoute = location.pathname.startsWith('/community/posts') || location.pathname === '/community/new-post';
  const [activeTab, setActiveTab] = useState<'chat' | 'posts'>(isPostsRoute ? 'posts' : defaultTab);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomType | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { rooms, loading: roomsLoading, createRoom } = useChatRooms();

  // Select initial room: URL param > localStorage > first room
  useEffect(() => {
    if (rooms.length === 0) return;

    if (initialRoomId) {
      const room = rooms.find(r => r.id === initialRoomId || r.slug === initialRoomId);
      if (room) {
        setSelectedRoom(room);
        localStorage.setItem('community_last_room', room.slug);
        return;
      }
    }

    if (!selectedRoom) {
      const savedSlug = localStorage.getItem('community_last_room');
      if (savedSlug) {
        const saved = rooms.find(r => r.slug === savedSlug);
        if (saved) {
          setSelectedRoom(saved);
          return;
        }
      }
      setSelectedRoom(rooms[0]);
    }
  }, [initialRoomId, rooms, selectedRoom]);

  const handleRoomSelect = (room: ChatRoomType) => {
    setSelectedRoom(room);
    setSidebarOpen(false);
    localStorage.setItem('community_last_room', room.slug);
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
      {isAdmin && (
        <div className="p-3 border-t">
          <CreateRoomDialog onCreateRoom={createRoom} />
        </div>
      )}
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

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={activeTab === 'chat' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setActiveTab('chat')}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </Button>
          <Button
            variant={activeTab === 'posts' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setActiveTab('posts')}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Research</span>
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          {!isAuthenticated ? (
            <Button size="sm" variant="default" className="gap-2" onClick={() => navigate('/auth', { state: { from: location.pathname } })}>
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          ) : (
            <>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="hidden sm:inline">
                🔥 {Math.max(rooms.reduce((sum, r) => sum + r.member_count, 0), 24).toLocaleString()} traders sharing ideas
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
            <div className="flex-1 min-w-0 h-full overflow-hidden">
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
