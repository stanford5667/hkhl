import { useState } from 'react';
import { Settings, Crown, Pencil, Trash2, ShieldCheck, MessageSquare } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useChatRooms } from '@/hooks/useChatRooms';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RoomSettingsProps {
  roomId: string;
  roomName: string;
  isPremium: boolean;
  postingMode: 'everyone' | 'admin_only';
  requiresApproval: boolean;
  onRoomRenamed?: () => void;
  onRoomDeleted?: () => void;
  onSettingsChanged?: () => void;
}

export function RoomSettings({ roomId, roomName, isPremium, postingMode, requiresApproval, onRoomRenamed, onRoomDeleted, onSettingsChanged }: RoomSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { setRoomPremium, updateRoomSettings, deleteRoom } = useChatRooms();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(roomName);

  const handleTogglePremium = async (checked: boolean) => {
    setLoading(true);
    try {
      await setRoomPremium(roomId, checked);
      toast.success(checked ? 'Room marked as premium' : 'Room is now public');
      onSettingsChanged?.();
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

  const handlePostingModeToggle = async (adminOnly: boolean) => {
    setLoading(true);
    try {
      await updateRoomSettings(roomId, { posting_mode: adminOnly ? 'admin_only' : 'everyone' });
      toast.success(adminOnly ? 'Only admins can post now' : 'Everyone can post now');
      onSettingsChanged?.();
    } catch (err) {
      toast.error('Failed to update posting mode');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      await updateRoomSettings(roomId, { requires_approval: checked });
      toast.success(checked ? 'Posts now require approval' : 'Posts no longer require approval');
      onSettingsChanged?.();
    } catch (err) {
      toast.error('Failed to update approval setting');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    setLoading(true);
    try {
      await deleteRoom(roomId);
      toast.success('Room deleted');
      setOpen(false);
      onRoomDeleted?.();
    } catch (err) {
      toast.error('Failed to delete room');
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

          {/* Posting mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              <Label htmlFor="posting-mode" className="text-sm">Admin-only posting</Label>
            </div>
            <Switch
              id="posting-mode"
              checked={postingMode === 'admin_only'}
              onCheckedChange={handlePostingModeToggle}
              disabled={loading}
            />
          </div>

          {/* Requires approval */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-orange-500" />
              <Label htmlFor="approval-toggle" className="text-sm">Require approval</Label>
            </div>
            <Switch
              id="approval-toggle"
              checked={requiresApproval}
              onCheckedChange={handleApprovalToggle}
              disabled={loading || postingMode === 'admin_only'}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {postingMode === 'admin_only' 
              ? 'Only admins can send messages in this room.'
              : requiresApproval 
                ? 'Messages require admin approval before appearing.'
                : 'Everyone can post freely in this room.'}
          </p>

          <Separator />

          {/* Delete room */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full gap-2" disabled={loading}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete Room
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{roomName}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this room and all its messages. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteRoom} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PopoverContent>
    </Popover>
  );
}
