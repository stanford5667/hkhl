import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatRoom, RoomType } from '@/types/community';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Hash, TrendingUp, Lock, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatRoomListProps {
  rooms: ChatRoom[];
  loading: boolean;
  activeRoomId?: string;
  onRoomSelect: (room: ChatRoom) => void;
  onCreateRoom?: () => void;
}

export function ChatRoomList({
  rooms,
  loading,
  activeRoomId,
  onRoomSelect,
  onCreateRoom,
}: ChatRoomListProps) {
  const navigate = useNavigate();

  // Group rooms by type
  const groupedRooms = useMemo(() => {
    const groups: Record<RoomType, ChatRoom[]> = {
      public: [],
      stock: [],
      private: [],
    };

    rooms.forEach(room => {
      groups[room.room_type].push(room);
    });

    return groups;
  }, [rooms]);

  const getRoomIcon = (room: ChatRoom) => {
    if (room.room_type === 'private') {
      return <Lock className="h-4 w-4" />;
    }
    if (room.room_type === 'stock') {
      return <TrendingUp className="h-4 w-4" />;
    }
    return <Hash className="h-4 w-4" />;
  };

  const RoomItem = ({ room }: { room: ChatRoom }) => {
    const isActive = room.id === activeRoomId;

    return (
      <button
        onClick={() => onRoomSelect(room)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left",
          "transition-colors hover:bg-muted",
          isActive && "bg-primary/10 text-primary"
        )}
      >
        <span className="text-lg">{room.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium text-sm truncate",
              isActive && "text-primary"
            )}>
              {room.name}
            </span>
            {room.ticker && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                ${room.ticker}
              </Badge>
            )}
          </div>
          {room.member_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{room.member_count.toLocaleString()}</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-5 w-24" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
        <Skeleton className="h-5 w-24 mt-6" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Public Rooms */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Public Rooms
            </h3>
          </div>
          <div className="space-y-1">
            {groupedRooms.public.map(room => (
              <RoomItem key={room.id} room={room} />
            ))}
          </div>
        </div>

        {/* Stock Rooms */}
        {groupedRooms.stock.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Stock Discussions
              </h3>
            </div>
            <div className="space-y-1">
              {groupedRooms.stock.map(room => (
                <RoomItem key={room.id} room={room} />
              ))}
            </div>
          </div>
        )}

        {/* Private Rooms */}
        {groupedRooms.private.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Private Rooms
              </h3>
            </div>
            <div className="space-y-1">
              {groupedRooms.private.map(room => (
                <RoomItem key={room.id} room={room} />
              ))}
            </div>
          </div>
        )}

        {/* Create Room Button */}
        {onCreateRoom && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onCreateRoom}
          >
            <Plus className="h-4 w-4" />
            Create Room
          </Button>
        )}
      </div>
    </ScrollArea>
  );
}
