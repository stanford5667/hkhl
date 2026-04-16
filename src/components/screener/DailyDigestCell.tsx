import { useState } from 'react';
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

async function fetchTickerNews(ticker: string): Promise<NewsItem | null> {
  try {
    const { data, error } = await supabase.functions.invoke('polygon-news', {
      body: { ticker },
    });
    if (error || !data?.article) return null;
    return data.article as NewsItem;
  } catch {
    return null;
  }
}

function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

interface DailyDigestCellProps {
  ticker: string;
}

export function DailyDigestCell({ ticker }: DailyDigestCellProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: newsItem, isLoading } = useQuery({
    queryKey: ['daily-digest', ticker],
    queryFn: () => fetchTickerNews(ticker),
    staleTime: 15 * 60 * 1000,
  });

  if (isLoading) {
    return <span className="text-[10px] text-muted-foreground animate-pulse">...</span>;
  }

  if (!newsItem) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }

  return (
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
  );
}
