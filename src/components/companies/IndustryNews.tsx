import { useState } from 'react';
import { 
  Newspaper, 
  ExternalLink, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface IndustryNewsProps {
  companyName: string;
  industry: string | null;
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  date: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
}

// Mock news data - in production this would come from an API
const generateMockNews = (companyName: string, industry: string | null): NewsItem[] => {
  const industryTerm = industry || 'business';
  return [
    {
      id: '1',
      title: `${industryTerm} Sector Shows Strong Q4 Growth`,
      source: 'Industry Weekly',
      url: '#',
      date: '2 hours ago',
      sentiment: 'positive',
      summary: `The ${industryTerm.toLowerCase()} industry continues to show resilience with strong quarterly results across major players.`
    },
    {
      id: '2',
      title: `M&A Activity Picks Up in ${industryTerm}`,
      source: 'Deal Journal',
      url: '#',
      date: '5 hours ago',
      sentiment: 'positive',
      summary: 'Private equity firms are increasingly targeting mid-market companies in the sector.'
    },
    {
      id: '3',
      title: `Supply Chain Challenges Persist for ${industryTerm} Companies`,
      source: 'Business Insider',
      url: '#',
      date: '1 day ago',
      sentiment: 'negative',
      summary: 'Industry leaders report ongoing supply chain disruptions affecting margins.'
    },
    {
      id: '4',
      title: `New Regulations Impact ${industryTerm} Sector`,
      source: 'Regulatory Watch',
      url: '#',
      date: '2 days ago',
      sentiment: 'neutral',
      summary: 'Recent policy changes may affect how companies operate in the coming quarters.'
    },
    {
      id: '5',
      title: `Technology Innovation Drives ${industryTerm} Transformation`,
      source: 'Tech Today',
      url: '#',
      date: '3 days ago',
      sentiment: 'positive',
      summary: 'Digital transformation initiatives are creating new opportunities for growth.'
    },
  ];
};

export function IndustryNews({ companyName, industry }: IndustryNewsProps) {
  const [news, setNews] = useState<NewsItem[]>(() => generateMockNews(companyName, industry));
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setNews(generateMockNews(companyName, industry));
      setLoading(false);
    }, 1500);
  };

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
            Relevant news for {industry || 'this industry'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

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

      {/* News List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item) => (
            <Card 
              key={item.id} 
              className="p-4 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => window.open(item.url, '_blank')}
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
                  <p className="text-muted-foreground text-sm mt-1">{item.summary}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{item.source}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.date}
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* AI Summary */}
      <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-lg">🤖</span>
            AI Industry Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Based on recent news, the {industry || 'industry'} sector shows mixed signals. 
            M&A activity remains strong with private equity showing continued interest in mid-market opportunities. 
            However, supply chain challenges persist as a key concern. 
            Technology adoption and digital transformation continue to be major themes driving competitive advantage.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
