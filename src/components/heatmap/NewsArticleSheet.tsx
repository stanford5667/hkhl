import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Clock, Globe, TrendingUp, TrendingDown, Minus,
  ExternalLink, Newspaper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getSentiment(title: string): 'positive' | 'negative' | 'neutral' {
  const lower = title.toLowerCase();
  if (/surge|rally|gain|rise|soar|jump|boost|record high|bull|upgrade/i.test(lower)) return 'positive';
  if (/drop|fall|crash|plunge|decline|loss|selloff|bear|slump|cut|warn|crisis/i.test(lower)) return 'negative';
  return 'neutral';
}

export function NewsArticleSheet({ eventId, open, onOpenChange }: Props) {
  const { data: article, isLoading } = useQuery({
    queryKey: ['news-article', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from('real_world_events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId && open,
  });

  const sentiment = article ? getSentiment(article.title) : 'neutral';
  const sentimentColor = sentiment === 'positive' ? 'text-emerald-500 bg-emerald-500/10'
    : sentiment === 'negative' ? 'text-rose-500 bg-rose-500/10'
    : 'text-amber-500 bg-amber-500/10';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg md:max-w-xl p-0 border-l border-border/50 bg-background z-[60]">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : article ? (
            <div className="p-5 sm:p-6 space-y-4">
              {/* Header */}
              <SheetHeader className="space-y-3 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={cn('text-[10px] gap-1', sentimentColor)}>
                    {sentiment === 'positive' && <TrendingUp className="h-3 w-3" />}
                    {sentiment === 'negative' && <TrendingDown className="h-3 w-3" />}
                    {sentiment === 'neutral' && <Minus className="h-3 w-3" />}
                    {sentiment.toUpperCase()}
                  </Badge>
                  {article.category && (
                    <Badge variant="outline" className="text-[10px]">{article.category}</Badge>
                  )}
                  {article.severity && (
                    <Badge variant={article.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {article.severity} impact
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-lg sm:text-xl font-bold text-foreground leading-snug">
                  {article.title}
                </SheetTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {article.source && (
                    <span className="flex items-center gap-1">
                      <Newspaper className="h-3 w-3" />
                      {article.source}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(article.detected_at), { addSuffix: true })}
                  </span>
                </div>
              </SheetHeader>

              <Separator className="opacity-50" />

              {/* Summary */}
              {article.description && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</h3>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {article.description}
                  </p>
                </div>
              )}

              {/* Full Content */}
              {article.full_content && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Full Story</h3>
                  <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line space-y-3">
                    {article.full_content.split('\n\n').map((paragraph: string, i: number) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* If no full content, show description more prominently */}
              {!article.full_content && !article.description && (
                <div className="py-8 text-center text-muted-foreground">
                  <Globe className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Full article content not available</p>
                </div>
              )}

              {/* Related entities/markets */}
              {((article.entities as string[] | null)?.length || (article.related_markets as string[] | null)?.length) ? (
                <>
                  <Separator className="opacity-50" />
                  <div className="flex flex-wrap gap-1.5">
                    {(article.related_markets as string[] | null)?.map((m: string) => (
                      <Badge key={m} variant="secondary" className="text-[10px] font-mono">{m}</Badge>
                    ))}
                    {(article.entities as string[] | null)?.map((e: string) => (
                      <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                    ))}
                  </div>
                </>
              ) : null}

              {/* Source link at bottom */}
              {article.source_url && article.source_url !== '#' && (
                <>
                  <Separator className="opacity-50" />
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View original source
                  </a>
                </>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <p className="text-sm">Article not found</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
