import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radio } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface StartLivestreamDialogProps {
  onStartStream: (url: string) => Promise<void>;
}

export function StartLivestreamDialog({ onStartStream }: StartLivestreamDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
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
            Paste a YouTube Live or Twitch stream URL. All room members will see the embedded player.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="https://youtube.com/live/... or https://twitch.tv/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleStart} disabled={loading} className="gap-1">
            <Radio className="h-4 w-4" />
            {loading ? 'Starting...' : 'Go Live'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
