import { useState } from 'react';
import { Settings, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useChatRooms } from '@/hooks/useChatRooms';
import { toast } from 'sonner';

interface RoomSettingsProps {
  roomId: string;
  isPremium: boolean;
}

export function RoomSettings({ roomId, isPremium }: RoomSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { setRoomPremium } = useChatRooms();

  const handleTogglePremium = async (checked: boolean) => {
    setLoading(true);
    try {
      await setRoomPremium(roomId, checked);
      toast.success(checked ? 'Room marked as premium' : 'Room is now public');
    } catch (err) {
      toast.error('Failed to update room settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Room Settings</h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <Label htmlFor="premium-toggle" className="text-sm">
                Premium Room
              </Label>
            </div>
            <Switch
              id="premium-toggle"
              checked={isPremium}
              onCheckedChange={handleTogglePremium}
              disabled={loading}
            />
          </div>
          
          <p className="text-xs text-muted-foreground">
            Premium rooms are only accessible to Pro subscribers
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
