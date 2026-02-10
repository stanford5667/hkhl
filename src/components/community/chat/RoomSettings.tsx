import { useState } from 'react';
import { Settings, Crown, Pencil, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useChatRooms } from '@/hooks/useChatRooms';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MutedUser {
  id: string;
  user_id: string;
  reason: string | null;
  created_at: string;
}

interface RoomSettingsProps {
  roomId: string;
  roomName: string;
  isPremium: boolean;
  mutedUsers?: MutedUser[];
  onMuteUser?: (userId: string) => Promise<void>;
  onUnmuteUser?: (userId: string) => Promise<void>;
  onRoomRenamed?: () => void;
}

export function RoomSettings({ roomId, roomName, isPremium, mutedUsers = [], onMuteUser, onUnmuteUser, onRoomRenamed }: RoomSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { setRoomPremium } = useChatRooms();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(roomName);
  const [muteUserId, setMuteUserId] = useState('');

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

  const handleRename = async () => {
    if (!newName.trim() || newName === roomName) {
      setEditingName(false);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ name: newName.trim() })
        .eq('id', roomId);
      if (error) throw error;
      toast.success('Room renamed');
      setEditingName(false);
      onRoomRenamed?.();
    } catch (err) {
      toast.error('Failed to rename room');
    } finally {
      setLoading(false);
    }
  };

  const handleMuteUser = async () => {
    if (!muteUserId.trim() || !onMuteUser) return;
    setLoading(true);
    try {
      await onMuteUser(muteUserId.trim());
      toast.success('User muted');
      setMuteUserId('');
    } catch (err) {
      toast.error('Failed to mute user');
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
      <PopoverContent align="end" className="w-72">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Room Settings</h4>

          {/* Rename */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Room Name</Label>
            {editingName ? (
              <div className="flex gap-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                />
                <Button size="sm" className="h-8" onClick={handleRename} disabled={loading}>
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm truncate">{roomName}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setNewName(roomName); setEditingName(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <Separator />
          
          {/* Premium toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <Label htmlFor="premium-toggle" className="text-sm">Premium Room</Label>
            </div>
            <Switch
              id="premium-toggle"
              checked={isPremium}
              onCheckedChange={handleTogglePremium}
              disabled={loading}
            />
          </div>

          <Separator />

          {/* Mute user */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <UserX className="h-3.5 w-3.5" />
              Mute User (by ID)
            </Label>
            <div className="flex gap-1">
              <Input
                value={muteUserId}
                onChange={(e) => setMuteUserId(e.target.value)}
                placeholder="User ID..."
                className="h-8 text-xs"
              />
              <Button size="sm" className="h-8 text-xs" onClick={handleMuteUser} disabled={loading || !muteUserId.trim()}>
                Mute
              </Button>
            </div>
          </div>

          {/* Muted users list */}
          {mutedUsers.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Muted Users</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {mutedUsers.map((mu) => (
                  <div key={mu.id} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1">
                    <span className="truncate font-mono">{mu.user_id.slice(0, 8)}...</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onUnmuteUser?.(mu.user_id)}
                    >
                      <UserCheck className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Muted users cannot send messages in this room.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
