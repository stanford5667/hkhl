import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Shield } from 'lucide-react';
import { RoomType } from '@/types/community';
import { toast } from 'sonner';

interface CreateRoomDialogProps {
  onCreateRoom: (
    name: string,
    description: string,
    roomType: RoomType,
    ticker?: string,
    icon?: string,
    isAdminOnly?: boolean
  ) => Promise<any>;
}

const ROOM_ICONS = ['💬', '📈', '🔥', '💡', '🎯', '📊', '🏆', '⚡', '🌍', '🔒'];

export function CreateRoomDialog({ onCreateRoom }: CreateRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('public');
  const [ticker, setTicker] = useState('');
  const [icon, setIcon] = useState('💬');
  const [isAdminOnly, setIsAdminOnly] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Room name is required');
      return;
    }

    try {
      setCreating(true);
      await onCreateRoom(
        name.trim(),
        description.trim(),
        roomType,
        roomType === 'stock' ? ticker.trim().toUpperCase() : undefined,
        icon,
        isAdminOnly
      );
      toast.success(`Room "${name}" created!`);
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setRoomType('public');
    setTicker('');
    setIcon('💬');
    setIsAdminOnly(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <Plus className="h-4 w-4" />
          Create Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Chat Room</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Icon picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ROOM_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`text-xl p-1.5 rounded-md border transition-colors ${
                    icon === emoji
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent hover:bg-muted'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="room-name">Name</Label>
            <Input
              id="room-name"
              placeholder="e.g. Options Trading"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="room-desc">Description</Label>
            <Textarea
              id="room-desc"
              placeholder="What's this room about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Room Type */}
          <div className="space-y-2">
            <Label>Room Type</Label>
            <Select value={roomType} onValueChange={(v) => setRoomType(v as RoomType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="stock">Stock Ticker</SelectItem>
                <SelectItem value="private">Private (Invite Only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ticker (if stock type) */}
          {roomType === 'stock' && (
            <div className="space-y-2">
              <Label htmlFor="room-ticker">Ticker Symbol</Label>
              <Input
                id="room-ticker"
                placeholder="e.g. AAPL"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="uppercase"
              />
            </div>
          )}

          {/* Admin Only Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Admin Only</p>
                <p className="text-xs text-muted-foreground">Only admins can see this room</p>
              </div>
            </div>
            <Switch checked={isAdminOnly} onCheckedChange={setIsAdminOnly} />
          </div>

          <Button onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? 'Creating...' : 'Create Room'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
