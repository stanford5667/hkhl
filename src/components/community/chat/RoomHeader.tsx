import { ChatRoom } from '@/types/community';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, TrendingUp, ExternalLink, Crown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RoomSettings } from './RoomSettings';
import { useAdmin } from '@/hooks/useAdmin';

interface RoomHeaderProps {
  room: ChatRoom;
  onBack?: () => void;
}

export function RoomHeader({ room, onBack }: RoomHeaderProps) {
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

      <div className="ml-auto flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{room.member_count.toLocaleString()}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {room.member_count} {room.member_count === 1 ? 'member' : 'members'}
          </TooltipContent>
        </Tooltip>

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
          <RoomSettings roomId={room.id} isPremium={room.is_premium} />
        )}
      </div>
    </div>
  );
}
