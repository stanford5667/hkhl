import { forwardRef, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface NewsItem {
  title: string;
  shortTitle: string;
  source: string;
  publishedAt: string;
  url: string;
}

function safeStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

async function fetchTickerNews(ticker: string): Promise<NewsItem | null> {
  try {
    const { data, error } = await supabase.functions.invoke('polygon-news', {
      body: { ticker },
    });
    if (error || !data?.article) return null;
    const a = data.article;
    return {
      title: safeStr(a.title),
      shortTitle: safeStr(a.shortTitle),
      source: safeStr(a.source),
      publishedAt: safeStr(a.publishedAt),
      url: safeStr(a.url),
    };
  } catch {
    return null;
  }
}

function truncateToWords(text: string, maxWords: number): string {
  if (typeof text !== 'string') return '';
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

interface DailyDigestCellProps {
  ticker: string;
}

export function DailyDigestCell({ ticker }: DailyDigestCellProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible]);

  const { data: newsItem, isLoading } = useQuery({
    queryKey: ['daily-digest', ticker],
    queryFn: () => fetchTickerNews(ticker),
    staleTime: 15 * 60 * 1000,
    enabled: isVisible,
  });

  return (
    <div ref={containerRef} className="min-h-[14px]">
      {isVisible && isLoading ? (
        <span className="text-[10px] text-muted-foreground animate-pulse">...</span>
      ) : newsItem ? (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
            className="text-[10px] text-primary hover:underline truncate block max-w-[140px] text-left"
            data-testid="daily-digest-headline"
            title={newsItem.title}
          >
            {truncateToWords(newsItem.shortTitle || newsItem.title, 7)}
          </button>

          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle className="text-sm leading-snug">{newsItem.title}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {newsItem.source} · {new Date(newsItem.publishedAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  asChild
                >
                  <a href={newsItem.url} target="_blank" rel="noopener noreferrer">
                    Read More <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <span className="text-[10px] text-muted-foreground">—</span>
      )}
    </div>
  );
}

export const DailyDigestCellTrigger = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function DailyDigestCellTrigger(props, ref) {
    return <button ref={ref} {...props} />;
  }
);
