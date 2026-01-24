import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Newspaper,
  BarChart3,
  Building2,
  Globe,
  Activity,
  Users,
  Scale,
  RefreshCw
} from 'lucide-react';
import { useStockCatalysts, Catalyst } from '@/hooks/useStockCatalysts';
import { cn } from '@/lib/utils';

interface KeyCatalystsSectionProps {
  ticker: string;
}

const categoryConfig: Record<string, { icon: typeof Zap; label: string; color: string }> = {
  earnings: { icon: BarChart3, label: 'Earnings', color: 'text-blue-400' },
  news: { icon: Newspaper, label: 'News', color: 'text-purple-400' },
  analyst: { icon: Users, label: 'Analyst', color: 'text-cyan-400' },
  macro: { icon: Globe, label: 'Macro', color: 'text-orange-400' },
  technical: { icon: Activity, label: 'Technical', color: 'text-pink-400' },
  insider: { icon: Building2, label: 'Insider', color: 'text-yellow-400' },
  regulatory: { icon: Scale, label: 'Regulatory', color: 'text-red-400' },
};

const sentimentConfig = {
  bullish: { icon: TrendingUp, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  bearish: { icon: TrendingDown, color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/30' },
  neutral: { icon: Minus, color: 'text-muted-foreground', bgColor: 'bg-secondary/50', borderColor: 'border-border' },
};

function ImpactBar({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 8) return 'bg-rose-500';
    if (s >= 6) return 'bg-orange-500';
    if (s >= 4) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1.5 h-3 rounded-sm',
              i < score ? getColor(score) : 'bg-muted/30'
            )}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium">{score}/10</span>
    </div>
  );
}

function CatalystCard({ catalyst, isExpanded, onToggle }: { 
  catalyst: Catalyst; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const category = categoryConfig[catalyst.category] || categoryConfig.news;
  const sentiment = sentimentConfig[catalyst.sentiment] || sentimentConfig.neutral;
  const CategoryIcon = category.icon;
  const SentimentIcon = sentiment.icon;

  return (
    <div 
      className={cn(
        'p-2.5 rounded border transition-all cursor-pointer',
        sentiment.bgColor,
        sentiment.borderColor,
        'hover:opacity-90'
      )}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <SentimentIcon className={cn('h-3.5 w-3.5 flex-shrink-0', sentiment.color)} />
          <span className="text-xs font-medium truncate">{catalyst.title}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', category.color, 'border-current/30')}>
            <CategoryIcon className="h-2.5 w-2.5 mr-0.5" />
            {category.label}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <ImpactBar score={catalyst.impactScore} />
        <span className="text-[9px] text-muted-foreground">{catalyst.date}</span>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {catalyst.summary}
      </p>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[10px] text-foreground leading-relaxed mb-2">
            {catalyst.details}
          </p>
          {catalyst.source && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground">Source:</span>
              {catalyst.sourceUrl ? (
                <a 
                  href={catalyst.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[9px] text-primary hover:underline flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {catalyst.source}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : (
                <span className="text-[9px] text-foreground">{catalyst.source}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function KeyCatalystsSection({ ticker }: KeyCatalystsSectionProps) {
  const { data, isLoading, error, refetch, isFetching } = useStockCatalysts(ticker);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="bg-card border-border p-2">
        <div className="flex items-center gap-1.5 mb-2">
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-border p-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Key Catalysts</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-[10px]"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Unable to load catalysts. Click retry to try again.
        </p>
      </Card>
    );
  }

  const catalysts = data?.catalysts || [];

  return (
    <Card className="bg-card border-border p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">Key Catalysts</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 text-primary border-primary/30">
            AI-Powered
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-[10px]"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-3 w-3 mr-1', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground mb-2">
        Real-time analysis of factors driving {ticker}'s price movement, ranked by impact.
      </p>

      {catalysts.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-4">
          No catalysts found for {ticker}.
        </p>
      ) : (
        <div className="space-y-2">
          {catalysts.map((catalyst) => (
            <CatalystCard
              key={catalyst.id}
              catalyst={catalyst}
              isExpanded={expandedId === catalyst.id}
              onToggle={() => setExpandedId(expandedId === catalyst.id ? null : catalyst.id)}
            />
          ))}
        </div>
      )}

      {data?.lastUpdated && (
        <p className="text-[9px] text-muted-foreground text-right mt-2">
          Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </Card>
  );
}
