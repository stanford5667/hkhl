import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radio, Camera, Monitor, Link } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface StartLivestreamDialogProps {
  onStartStream: (url: string) => Promise<void>;
}

export function StartLivestreamDialog({ onStartStream }: StartLivestreamDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartEmbed = async () => {
    if (!url.trim()) {
      toast.error('Please enter a stream URL');
      return;
    }
    try {
      setLoading(true);
      await onStartStream(url.trim());
      setOpen(false);
      setUrl('');
      toast.success('Livestream started!');
    } catch {
      toast.error('Failed to start livestream');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLiveKit = async () => {
    try {
      setLoading(true);
      await onStartStream('__livekit__');
      setOpen(false);
      toast.success('LiveKit room created — start broadcasting!');
    } catch {
      toast.error('Failed to start LiveKit stream');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Radio className="h-4 w-4" />
          Go Live
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Livestream</DialogTitle>
          <DialogDescription>
            Choose how to broadcast to your room members.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="livekit">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="livekit" className="gap-1">
              <Camera className="h-3.5 w-3.5" />
              Go Live (WebRTC)
            </TabsTrigger>
            <TabsTrigger value="embed" className="gap-1">
              <Link className="h-3.5 w-3.5" />
              Embed URL
            </TabsTrigger>
          </TabsList>
          <TabsContent value="livekit" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Broadcast directly from your browser using camera or screen share. Ultra-low latency via LiveKit WebRTC.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleStartLiveKit} disabled={loading} className="gap-1">
                <Camera className="h-4 w-4" />
                {loading ? 'Starting...' : 'Start Broadcasting'}
              </Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="embed" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Paste a YouTube Live or Twitch stream URL. All room members will see the embedded player.
            </p>
            <Input
              placeholder="https://youtube.com/live/... or https://twitch.tv/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartEmbed()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleStartEmbed} disabled={loading} className="gap-1">
                <Radio className="h-4 w-4" />
                {loading ? 'Starting...' : 'Go Live'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
