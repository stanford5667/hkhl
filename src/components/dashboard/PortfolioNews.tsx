import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Minus, Crown } from 'lucide-react';
import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  source_id: string;
  published_at: string | null;
  created_at: string | null;
}

export function PortfolioNews() {
  const { data: news, isLoading } = useQuery({
    queryKey: ['portfolio-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_events')
        .select('id, title, summary, source_id, published_at, created_at')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(5);
      
      if (error) throw error;
      return data as NewsItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const getSentimentIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('surge') || lowerTitle.includes('gain') || lowerTitle.includes('rise') || lowerTitle.includes('up')) {
      return <TrendingUp className="h-3 w-3 text-emerald-400" />;
    }
    if (lowerTitle.includes('drop') || lowerTitle.includes('fall') || lowerTitle.includes('decline') || lowerTitle.includes('down')) {
      return <TrendingDown className="h-3 w-3 text-rose-400" />;
    }
    return <Minus className="h-3 w-3 text-slate-400" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Portfolio News</h3>
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-secondary/30">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Portfolio News</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            {news?.length || 0} stories
          </Badge>
        </div>
        
        <div className="space-y-3">
          {news?.map((item) => (
            <div 
              key={item.id} 
              className="group p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-2">
                {getSentimentIcon(item.title)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {item.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="truncate max-w-[120px]">{item.source_id}</span>
                    <span>•</span>
                    <span>
                      {item.published_at 
                        ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true })
                        : 'Recently'
                      }
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </div>
          ))}
          
          {(!news || news.length === 0) && (
            <div className="text-center py-8 flex flex-col items-center gap-2">
              <Crown className="h-8 w-8 text-amber-500/50" />
              <p className="text-sm font-medium">Premium Feature</p>
              <p className="text-xs text-muted-foreground">Real-time news requires premium</p>
              <PremiumBadge variant="inline" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
