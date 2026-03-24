import { useState } from 'react';
import { Bell, BellOff, Mail, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useChatNotificationPreferences } from '@/hooks/useChatNotificationPreferences';
import { toast } from 'sonner';

interface RoomNotificationSettingsProps {
  roomId: string;
  roomName: string;
}

export function RoomNotificationSettings({ roomId, roomName }: RoomNotificationSettingsProps) {
  const { getPreference, upsertPreference } = useChatNotificationPreferences();
  const [open, setOpen] = useState(false);
  const pref = getPreference(roomId);

  const inApp = pref?.in_app ?? true;
  const email = pref?.email ?? false;
  const sms = pref?.sms ?? false;

  const handleToggle = async (field: 'in_app' | 'email' | 'sms', value: boolean) => {
    try {
      await upsertPreference(roomId, { [field]: value });
      toast.success(`${field === 'in_app' ? 'In-app' : field === 'email' ? 'Email' : 'SMS'} alerts ${value ? 'enabled' : 'disabled'} for ${roomName}`);
    } catch (err) {
      toast.error('Failed to update notification settings');
    }
  };

  const hasAnyActive = inApp || email || sms;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          {hasAnyActive ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-4">
        <h4 className="font-semibold text-sm mb-3">Notification Settings</h4>
        <p className="text-xs text-muted-foreground mb-4">Choose how you want to be notified for new messages in this room.</p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor={`inapp-${roomId}`} className="text-sm cursor-pointer">In-App</Label>
            </div>
            <Switch
              id={`inapp-${roomId}`}
              checked={inApp}
              onCheckedChange={(v) => handleToggle('in_app', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor={`email-${roomId}`} className="text-sm cursor-pointer">Email</Label>
            </div>
            <Switch
              id={`email-${roomId}`}
              checked={email}
              onCheckedChange={(v) => handleToggle('email', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor={`sms-${roomId}`} className="text-sm cursor-pointer">SMS</Label>
            </div>
            <Switch
              id={`sms-${roomId}`}
              checked={sms}
              onCheckedChange={(v) => handleToggle('sms', v)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
