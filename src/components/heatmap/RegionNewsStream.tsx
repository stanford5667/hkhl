import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Radio, TrendingUp, TrendingDown, Minus, Clock,
  Zap, ExternalLink, Globe,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRegionNews } from '@/hooks/useRegionNews';
import { Skeleton } from '@/components/ui/skeleton';

function getSentiment(title: string): 'positive' | 'negative' | 'neutral' {
  const lower = title.toLowerCase();
  if (/surge|rally|gain|rise|soar|jump|boost|record high|bull|upgrade/i.test(lower)) return 'positive';
  if (/drop|fall|crash|plunge|decline|loss|selloff|bear|slump|cut|warn|crisis/i.test(lower)) return 'negative';
  return 'neutral';
}

function SentimentDot({ sentiment }: { sentiment: 'positive' | 'negative' | 'neutral' }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
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

interface Props {
  countryCode: string;
  countryName: string;
}

export function RegionNewsStream({ countryCode, countryName }: Props) {
  const { data: events, isLoading } = useRegionNews(countryCode, 20);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
        <Globe className="h-5 w-5 mb-2 opacity-40" />
        <p className="text-xs">No recent news events for {countryName}</p>
        <p className="text-[10px] mt-1 opacity-60">Events are matched by region keywords</p>
      </div>
    );
  }

  const positiveCount = events.filter(e => getSentiment(e.title) === 'positive').length;
  const negativeCount = events.filter(e => getSentiment(e.title) === 'negative').length;

  return (
    <div className="space-y-2.5">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="h-3.5 w-3.5 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-medium text-foreground">{events.length} events</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <TrendingUp className="h-2.5 w-2.5" />{positiveCount}
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <TrendingDown className="h-2.5 w-2.5" />{negativeCount}
          </span>
        </div>
      </div>

      {/* Events */}
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {events.map((event) => {
              const sentiment = getSentiment(event.title);
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex flex-col items-center gap-1 pt-1.5">
                    <SentimentDot sentiment={sentiment} />
                    <div className="w-px flex-1 bg-border/30" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="text-xs font-medium leading-snug line-clamp-2 text-foreground/90">
                        {event.title}
                      </p>
                      {sentiment === 'positive' && <TrendingUp className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />}
                      {sentiment === 'negative' && <TrendingDown className="h-3 w-3 text-rose-400 shrink-0 mt-0.5" />}
                      {sentiment === 'neutral' && <Minus className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />}
                    </div>

                    {event.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{event.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {event.source && <span className="truncate max-w-[100px]">{event.source}</span>}
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDistanceToNow(new Date(event.detected_at), { addSuffix: true })}
                      </span>
                      {event.category && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-border/40">
                          {event.category}
                        </Badge>
                      )}
                      {event.source_url && event.source_url !== '#' && (
                        <a
                          href={event.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors ml-auto opacity-0 group-hover:opacity-100"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
