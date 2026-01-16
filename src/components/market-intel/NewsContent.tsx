import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Newspaper, ExternalLink, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  source_id: string;
  published_at: string | null;
  url?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export function NewsContent() {
  const { data: newsItems, isLoading } = useQuery({
    queryKey: ['market-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_events')
        .select('id, title, summary, source_id, published_at, url')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(20);
      
      if (error) throw error;
      return data as NewsItem[];
    },
  });

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'negative': return <TrendingDown className="h-4 w-4 text-rose-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-primary" />
              Market News
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Live Feed
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-lg bg-secondary/30 animate-pulse">
                    <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                    <div className="h-3 bg-secondary rounded w-1/2" />
                  </div>
                ))
              ) : newsItems && newsItems.length > 0 ? (
                newsItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">
                          {item.title}
                        </h4>
                        {item.summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            {item.source_id}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(item.published_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSentimentIcon(item.sentiment)}
                        {item.url && (
                          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No news items available
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
