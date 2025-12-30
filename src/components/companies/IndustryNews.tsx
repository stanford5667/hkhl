import { 
  Newspaper, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertCircle,
  Zap,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CacheStatusBar } from '@/components/ui/CacheStatusBar';
import { useCachedIndustryIntel } from '@/hooks/useCachedIndustryIntel';
import { cn } from '@/lib/utils';

interface IndustryNewsProps {
  companyId: string;
  companyName: string;
  industry: string | null;
}

export function IndustryNews({ companyId, companyName, industry }: IndustryNewsProps) {
  const {
    data,
    isLoading,
    error,
    lastFetched,
    expiresAt,
    isStale,
    refresh
  } = useCachedIndustryIntel(companyId, companyName, industry);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-rose-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    const colors: Record<string, string> = {
      positive: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
      negative: 'bg-rose-600/20 text-rose-400 border-rose-600/30',
      neutral: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    };
    return colors[sentiment] || colors.neutral;
  };

  const news = data?.news || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Industry News & Intelligence
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered insights for {industry || 'this industry'}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <Zap className="h-3 w-3 mr-1" />
          Powered by Perplexity
        </Badge>
      </div>

      {/* Cache Status */}
      <CacheStatusBar
        lastFetched={lastFetched}
        expiresAt={expiresAt}
        isStale={isStale}
        isLoading={isLoading}
        onRefresh={refresh}
        source="industry intel"
      />

      {/* Key Market Metrics */}
      {data?.metrics && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-xl font-bold text-foreground">
                {data.metrics.marketSize || 'N/A'}
              </p>
              <p className="text-muted-foreground text-sm">Market Size</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-900/20 border-emerald-600/30">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-emerald-400">
                {data.metrics.growth || 'N/A'}
              </p>
              <p className="text-muted-foreground text-sm">Growth Rate</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-900/20 border-purple-600/30">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-purple-400">
                {data.metrics.avgMultiple || 'N/A'}
              </p>
              <p className="text-muted-foreground text-sm">Avg EV/EBITDA</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-900/20 border-blue-600/30">
            <CardContent className="p-4 text-center">
              <Newspaper className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <p className="text-xl font-bold text-blue-400">
                {data.metrics.dealVolume || 'N/A'}
              </p>
              <p className="text-muted-foreground text-sm">Deal Volume</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* News Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-emerald-900/20 border-emerald-600/30">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-400">
              {news.filter(n => n.sentiment === 'positive').length}
            </p>
            <p className="text-muted-foreground text-sm">Positive</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-900/20 border-yellow-600/30">
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-400">
              {news.filter(n => n.sentiment === 'neutral').length}
            </p>
            <p className="text-muted-foreground text-sm">Neutral</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-900/20 border-rose-600/30">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-6 w-6 text-rose-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-rose-400">
              {news.filter(n => n.sentiment === 'negative').length}
            </p>
            <p className="text-muted-foreground text-sm">Negative</p>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-6 border-destructive/50 bg-destructive/10">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Failed to load intelligence</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-4" onClick={refresh}>
            Try Again
          </Button>
        </Card>
      )}

      {/* News List */}
      {isLoading && !data ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </Card>
          ))}
        </div>
      ) : news.length > 0 ? (
        <div className="space-y-3">
          {news.map((item, index) => (
            <Card 
              key={index} 
              className="p-4 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => item.url && window.open(item.url, '_blank')}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {getSentimentIcon(item.sentiment)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-medium text-foreground">{item.title}</h4>
                    <Badge className={cn('shrink-0', getSentimentBadge(item.sentiment))}>
                      {item.sentiment}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{item.source}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.date}
                    </span>
                    {item.url && <ExternalLink className="h-3 w-3" />}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !error && !isLoading && (
        <Card className="p-8 text-center">
          <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No news available. Click Refresh to fetch latest intelligence.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={refresh}>
            Fetch Intel
          </Button>
        </Card>
      )}

      {/* AI Summary */}
      {data?.summary && (
        <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-lg">🤖</span>
              AI Industry Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {data.summary}
            </p>
            {data.sources && data.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                <div className="flex flex-wrap gap-2">
                  {data.sources.slice(0, 5).map((url, i) => {
                    try {
                      return (
                        <a 
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {new URL(url).hostname}
                        </a>
                      );
                    } catch {
                      return null;
                    }
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
