import { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useChatNotificationPreferences } from '@/hooks/useChatNotificationPreferences';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RoomNotificationSettingsProps {
  roomId: string;
  roomName: string;
}

export function RoomNotificationSettings({ roomId, roomName }: RoomNotificationSettingsProps) {
  const { getPreference, upsertPreference } = useChatNotificationPreferences();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneLoaded, setPhoneLoaded] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);

  const pref = getPreference(roomId);
  const inApp = pref?.in_app ?? true;
  const email = pref?.email ?? false;
  const sms = pref?.sms ?? false;

  // Load phone from profile when popover opens
  useEffect(() => {
    if (!open || !user || phoneLoaded) return;
    supabase
      .from('profiles')
      .select('phone')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setPhone(data?.phone || '');
        setPhoneLoaded(true);
      });
  }, [open, user, phoneLoaded]);

  const isValidE164 = (num: string) => /^\+[1-9]\d{7,14}$/.test(num);

  const formatToE164 = (raw: string): string => {
    const digits = raw.replace(/[^\d]/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (raw.startsWith('+')) return raw.replace(/[^\d+]/g, '');
    return `+${digits}`;
  };

  const savePhone = async () => {
    if (!user || !phone.trim()) return;
    const formatted = formatToE164(phone.trim());
    if (!isValidE164(formatted)) {
      setPhoneError('Enter a valid phone number (e.g. +14125551234)');
      return;
    }
    setPhoneError('');
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: formatted })
        .eq('user_id', user.id);
      if (error) throw error;
      setPhone(formatted);
      toast.success('Phone number saved');
      setShowPhoneInput(false);
      await upsertPreference(roomId, { sms: true });
      toast.success(`SMS alerts enabled for ${roomName}`);
    } catch {
      toast.error('Failed to save phone number');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleToggle = async (field: 'in_app' | 'email' | 'sms', value: boolean) => {
    try {
      // If enabling SMS, check for phone number first
      if (field === 'sms' && value) {
        if (!phone.trim()) {
          setShowPhoneInput(true);
          return;
        }
      }

      await upsertPreference(roomId, { [field]: value });
      const label = field === 'in_app' ? 'In-app' : field === 'email' ? 'Email' : 'SMS';
      toast.success(`${label} alerts ${value ? 'enabled' : 'disabled'} for ${roomName}`);
    } catch {
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
      <PopoverContent align="end" className="w-72 p-4">
        <h4 className="font-semibold text-sm mb-1">Notification Settings</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Get notified when admins post in this room.
        </p>
        
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

          <div className="space-y-2">
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

            {/* Phone number input shown when SMS is toggled on without a saved phone */}
            {showPhoneInput && (
              <div className="space-y-1.5 mt-2">
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="+14125551234"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                    className="h-8 text-xs"
                  />
                   <Button
                     size="sm"
                     className="h-8 text-xs shrink-0"
                     onClick={savePhone}
                     disabled={savingPhone || !phone.trim() || !consentChecked}
                   >
                     Save
                   </Button>
                 </div>
                 <p className="text-[10px] text-muted-foreground ml-1">
                   Enter with country code, e.g. +14125551234
                 </p>
                 {phoneError && (
                   <p className="text-[10px] text-destructive ml-1">{phoneError}</p>
                 )}
                 <div className="flex items-start gap-2 mt-2">
                   <Checkbox
                     id={`sms-consent-${roomId}`}
                     checked={consentChecked}
                     onCheckedChange={(v) => setConsentChecked(v === true)}
                     className="mt-0.5"
                   />
                   <label htmlFor={`sms-consent-${roomId}`} className="text-[10px] text-muted-foreground leading-tight cursor-pointer">
                     By enabling SMS, you agree to receive text message alerts for admin posts in this room. Msg &amp; data rates may apply. Reply STOP to unsubscribe.
                   </label>
                 </div>
               </div>
             )}

            {sms && phone && !showPhoneInput && (
               <div className="ml-6 space-y-0.5">
                 <p className="text-[10px] text-muted-foreground">
                   Sending to {phone}
                 </p>
                 <p className="text-[10px] text-muted-foreground">
                   SMS alerts active. Reply STOP to opt out.
                 </p>
               </div>
             )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
