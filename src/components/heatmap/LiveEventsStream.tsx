import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Radio, TrendingUp, TrendingDown, Minus, Clock, AlertTriangle,
  Globe, Zap, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface LiveEvent {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
  source_url: string | null;
  category: string | null;
  detected_at: string;
  entities: string[] | null;
  related_markets: string[] | null;
}

function getSentimentFromTitle(title: string): 'positive' | 'negative' | 'neutral' {
  const lower = title.toLowerCase();
  if (/surge|rally|gain|rise|soar|jump|boost|record high|bull/i.test(lower)) return 'positive';
  if (/drop|fall|crash|plunge|decline|loss|selloff|bear|slump|cut/i.test(lower)) return 'negative';
  return 'neutral';
}

function SentimentDot({ sentiment }: { sentiment: 'positive' | 'negative' | 'neutral' }) {
  return (
    <span className={cn(
      'relative flex h-2 w-2 shrink-0',
    )}>
      <span className={cn(
        'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
        sentiment === 'positive' && 'bg-emerald-400',
        sentiment === 'negative' && 'bg-rose-400',
        sentiment === 'neutral' && 'bg-amber-400',
      )} />
      <span className={cn(
        'relative inline-flex rounded-full h-2 w-2',
        sentiment === 'positive' && 'bg-emerald-500',
        sentiment === 'negative' && 'bg-rose-500',
        sentiment === 'neutral' && 'bg-amber-500',
      )} />
    </span>
  );
}

function SentimentIcon({ sentiment }: { sentiment: 'positive' | 'negative' | 'neutral' }) {
  if (sentiment === 'positive') return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (sentiment === 'negative') return <TrendingDown className="h-3.5 w-3.5 text-rose-400" />;
  return <Minus className="h-3.5 w-3.5 text-amber-400" />;
}

function EventItem({ event, isNew, onSelect }: { event: LiveEvent; isNew: boolean; onSelect: (id: string) => void }) {
  const sentiment = getSentimentFromTitle(event.title);
  const tickers = (event.related_markets || event.entities?.filter(e => /^[A-Z]{1,5}$/.test(e)) || []).slice(0, 4);

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -20, height: 0 } : false}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="group"
    >
      <div className={cn(
        'flex gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-default',
        'hover:bg-muted/40',
        isNew && 'bg-primary/5 border border-primary/10',
      )}>
        <div className="flex flex-col items-center gap-1 pt-1">
          <SentimentDot sentiment={sentiment} />
          <div className="w-px flex-1 bg-border/40" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              'text-sm font-medium leading-snug line-clamp-2',
              isNew && 'text-foreground',
              !isNew && 'text-foreground/80',
            )}>
              {event.title}
            </p>
            <SentimentIcon sentiment={sentiment} />
          </div>

          {event.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {tickers.map(t => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono bg-muted/60">
                {t}
              </Badge>
            ))}

            <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
              <Clock className="h-2.5 w-2.5" />
              {formatDistanceToNow(new Date(event.detected_at), { addSuffix: true })}
            </span>

            {event.category && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border/40">
                {event.category}
              </Badge>
            )}

            {event.source_url && event.source_url !== '#' && (
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LiveEventsStream() {
  const [expanded, setExpanded] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const prevDataRef = useRef<LiveEvent[]>([]);

  const { data: events, isLoading } = useQuery({
    queryKey: ['live-events-stream'],
    queryFn: async (): Promise<LiveEvent[]> => {
      const { data, error } = await supabase
        .from('real_world_events')
        .select('id, title, description, source, source_url, category, detected_at, entities, related_markets')
        .order('detected_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('[LiveEventsStream] Error:', error);
        return [];
      }
      return (data || []) as LiveEvent[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Track which events are "new" (appeared since last render)
  useEffect(() => {
    if (!events) return;
    const prevIds = new Set(prevDataRef.current.map(e => e.id));
    prevDataRef.current = events;
    if (prevIds.size > 0) {
      setSeenIds(prevIds);
    }
  }, [events]);

  const displayEvents = events || [];
  const positiveCount = displayEvents.filter(e => getSentimentFromTitle(e.title) === 'positive').length;
  const negativeCount = displayEvents.filter(e => getSentimentFromTitle(e.title) === 'negative').length;

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className="h-4 w-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full animate-pulse" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Live Events Stream</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {displayEvents.length} events
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <TrendingUp className="h-3 w-3" />{positiveCount}
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <TrendingDown className="h-3 w-3" />{negativeCount}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Event List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Zap className="h-4 w-4 animate-pulse mr-2" />
                  <span className="text-sm">Loading live events...</span>
                </div>
              ) : displayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Globe className="h-6 w-6 mb-2 opacity-40" />
                  <span className="text-sm">No events detected yet</span>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="p-2 space-y-0.5">
                    {displayEvents.map((event) => (
                      <EventItem
                        key={event.id}
                        event={event}
                        isNew={seenIds.size > 0 && !seenIds.has(event.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
