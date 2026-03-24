import { ChatRoom } from '@/types/community';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, ExternalLink, Crown } from 'lucide-react';
import { RoomSettings } from './RoomSettings';
import { useAdmin } from '@/hooks/useAdmin';

interface RoomHeaderProps {
  room: ChatRoom;
  onBack?: () => void;
  onRoomRenamed?: () => void;
  onRoomDeleted?: () => void;
  onSettingsChanged?: () => void;
}

export function RoomHeader({ room, onBack, onRoomRenamed, onRoomDeleted, onSettingsChanged }: RoomHeaderProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
      {onBack && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xl">{room.icon}</span>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{room.name}</h2>
            {room.is_premium && (
              <Badge 
                variant="outline" 
                className="border-amber-500/50 bg-amber-500/10 text-amber-600"
              >
                <Crown className="h-3 w-3 mr-1" />
                PRO
              </Badge>
            )}
            {room.ticker && (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => navigate(`/stock/${room.ticker}`)}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                ${room.ticker}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Badge>
            )}
          </div>
          {room.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {room.description}
            </p>
          )}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <RoomNotificationSettings roomId={room.id} roomName={room.name} />
        {room.ticker && (
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex gap-1"
            onClick={() => navigate(`/stock/${room.ticker}`)}
          >
            <TrendingUp className="h-4 w-4" />
            View Research
          </Button>
        )}

        {isAdmin && (
          <RoomSettings
            roomId={room.id}
            roomName={room.name}
            isPremium={room.is_premium}
            postingMode={room.posting_mode}
            requiresApproval={room.requires_approval}
            onRoomRenamed={onRoomRenamed}
            onRoomDeleted={onRoomDeleted}
            onSettingsChanged={onSettingsChanged}
          />
        )}
      </div>
    </div>
  );
}
