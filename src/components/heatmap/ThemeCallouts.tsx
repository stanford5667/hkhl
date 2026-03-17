import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertTriangle,
  Bell,
  Eye,
  Flame,
  Megaphone,
  Pin,
  PinOff,
  Plus,
  X,
} from 'lucide-react';

export type CalloutSeverity = 'alert' | 'watch' | 'opportunity' | 'info';

export interface ThemeCallout {
  id: string;
  title: string;
  body: string;
  severity: CalloutSeverity;
  pinned: boolean;
  createdAt: number;
}

const severityConfig: Record<
  CalloutSeverity,
  { label: string; icon: React.ElementType; border: string; bg: string; badge: string; iconColor: string }
> = {
  alert: {
    label: 'Alert',
    icon: AlertTriangle,
    border: 'border-destructive/40',
    bg: 'bg-destructive/5',
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
    iconColor: 'text-destructive',
  },
  watch: {
    label: 'Watch',
    icon: Eye,
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    iconColor: 'text-amber-500',
  },
  opportunity: {
    label: 'Opportunity',
    icon: Flame,
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/5',
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    iconColor: 'text-emerald-500',
  },
  info: {
    label: 'Info',
    icon: Bell,
    border: 'border-primary/40',
    bg: 'bg-primary/5',
    badge: 'bg-primary/10 text-primary border-primary/20',
    iconColor: 'text-primary',
  },
};

interface Props {
  callouts: ThemeCallout[];
  onAdd: (callout: Omit<ThemeCallout, 'id' | 'createdAt'>) => void;
  onDismiss: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export function ThemeCallouts({ callouts, onAdd, onDismiss, onTogglePin }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<CalloutSeverity>('watch');

  const sorted = [...callouts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), body: body.trim(), severity, pinned: false });
    setTitle('');
    setBody('');
    setSeverity('watch');
    setOpen(false);
  };

  if (callouts.length === 0 && !open) {
    return (
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 border-dashed border-border/50 text-muted-foreground hover:text-foreground">
              <Megaphone className="h-3 w-3" />
              Add Callout
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-4 space-y-3">
            <CalloutForm
              title={title} setTitle={setTitle}
              body={body} setBody={setBody}
              severity={severity} setSeverity={setSeverity}
              onSubmit={handleSubmit}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Callouts</span>
          <Badge variant="secondary" className="text-[10px] h-5">{callouts.length}</Badge>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1 border-border/50">
              <Plus className="h-3 w-3" /> Add
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-4 space-y-3">
            <CalloutForm
              title={title} setTitle={setTitle}
              body={body} setBody={setBody}
              severity={severity} setSeverity={setSeverity}
              onSubmit={handleSubmit}
            />
          </PopoverContent>
        </Popover>
      </div>

      <AnimatePresence mode="popLayout">
        {sorted.map((callout) => {
          const cfg = severityConfig[callout.severity];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={callout.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'relative rounded-lg border p-3.5 transition-colors',
                cfg.border, cfg.bg,
                callout.pinned && 'ring-1 ring-primary/10',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5 shrink-0', cfg.iconColor)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border', cfg.badge)}>
                      {cfg.label}
                    </Badge>
                    {callout.pinned && (
                      <Pin className="h-2.5 w-2.5 text-primary fill-primary" />
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-foreground leading-snug">{callout.title}</h4>
                  {callout.body && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{callout.body}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => onTogglePin(callout.id)}
                    className="p-1 rounded hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
                    title={callout.pinned ? 'Unpin' : 'Pin'}
                  >
                    {callout.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => onDismiss(callout.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function CalloutForm({
  title, setTitle,
  body, setBody,
  severity, setSeverity,
  onSubmit,
}: {
  title: string; setTitle: (v: string) => void;
  body: string; setBody: (v: string) => void;
  severity: CalloutSeverity; setSeverity: (v: CalloutSeverity) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-foreground">New Callout</span>
        <Input
          placeholder="e.g. Watch: Fed meeting tomorrow"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="h-8 text-sm"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSubmit()}
        />
      </div>
      <Textarea
        placeholder="Optional details..."
        value={body}
        onChange={e => setBody(e.target.value)}
        className="text-sm min-h-[60px] resize-none"
        rows={2}
      />
      <div className="flex gap-1.5 flex-wrap">
        {(Object.keys(severityConfig) as CalloutSeverity[]).map(s => {
          const cfg = severityConfig[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={cn(
                'flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-colors',
                severity === s
                  ? cn(cfg.badge, 'font-medium')
                  : 'border-border/50 text-muted-foreground hover:border-border',
              )}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
            </button>
          );
        })}
      </div>
      <Button size="sm" onClick={onSubmit} disabled={!title.trim()} className="w-full text-xs h-8">
        Add Callout
      </Button>
    </>
  );
}
