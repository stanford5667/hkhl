import { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';
import type { ScreenerResult } from '@/services/polygonScreenerService';

interface TickerHoverPreviewProps {
  ticker: string;
  stock: ScreenerResult;
  children: ReactNode;
}

interface SparklinePoint {
  date: string;
  close: number;
}

interface NewsItem {
  title: string;
  shortTitle: string;
  source: string;
  publishedAt: string;
  url: string;
}

async function fetchSparklineData(ticker: string): Promise<SparklinePoint[]> {
  try {
    const { data, error } = await supabase.functions.invoke('polygon-ticker-chart', {
      body: { ticker, range: '1M', interval: '1d' },
    });
    if (error || !data?.bars) return [];
    return (data.bars as any[]).map((b: any) => ({ date: b.date || b.t, close: b.close || b.c }));
  } catch {
    return [];
  }
}

async function fetchCatalyst(ticker: string): Promise<NewsItem | null> {
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

function formatLargeNumber(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

export function TickerHoverPreview({ ticker, stock, children }: TickerHoverPreviewProps) {
  const queryClient = useQueryClient();

  const { data: sparkline, refetch: refetchSparkline } = useQuery({
    queryKey: ['sparkline', ticker],
    queryFn: () => fetchSparklineData(ticker),
    staleTime: 10 * 60 * 1000,
    enabled: false,
  });

  const { data: catalyst, refetch: refetchCatalyst } = useQuery({
    queryKey: ['catalyst', ticker],
    queryFn: () => fetchCatalyst(ticker),
    staleTime: 15 * 60 * 1000,
    enabled: false,
  });

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Only fetch if not already cached
      const sparklineCache = queryClient.getQueryData(['sparkline', ticker]);
      const catalystCache = queryClient.getQueryData(['catalyst', ticker]);
      if (!sparklineCache) refetchSparkline();
      if (!catalystCache) refetchCatalyst();
    }
  };

  const isPositive = stock.changePercent >= 0;
  const sparkColor = isPositive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
  const sparkFill = isPositive ? 'hsl(var(--chart-2) / 0.15)' : 'hsl(var(--destructive) / 0.15)';

  return (
    <HoverCard openDelay={250} closeDelay={100} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent side="right" className="w-80 p-0 overflow-hidden">
        {/* Chart header */}
        <div className="flex items-baseline justify-between px-3 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{ticker}</span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{stock.name}</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold tabular-nums text-foreground">${stock.price.toFixed(2)}</span>
            <span className={cn(
              'text-[11px] font-semibold tabular-nums ml-1.5',
              isPositive ? 'text-emerald-500' : 'text-destructive'
            )}>
              {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Sparkline area chart */}
        <div className="h-20 w-full px-1">
          {sparkline && sparkline.length > 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  fill={`url(#grad-${ticker})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-[10px] text-muted-foreground animate-pulse">Loading chart...</span>
            </div>
          )}
        </div>

        {/* Key Stats grid */}
        <div className="grid grid-cols-3 gap-x-3 gap-y-1 px-3 py-2 border-t border-border/50 text-[11px]">
          <div>
            <span className="text-muted-foreground block text-[9px]">Volume</span>
            <span className="font-medium tabular-nums">
              {stock.volume >= 1e6 ? `${(stock.volume / 1e6).toFixed(1)}M` : stock.volume.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[9px]">P/E</span>
            <span className="font-medium tabular-nums">{stock.pe != null ? stock.pe.toFixed(1) : '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[9px]">Mkt Cap</span>
            <span className="font-medium tabular-nums">{formatLargeNumber(stock.marketCap)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[9px]">Day Chg</span>
            <span className={cn('font-medium tabular-nums', isPositive ? 'text-emerald-500' : 'text-destructive')}>
              {isPositive ? '+' : ''}${stock.change.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[9px]">High</span>
            <span className="font-medium tabular-nums">${stock.high > 0 ? stock.high.toFixed(2) : '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[9px]">Low</span>
            <span className="font-medium tabular-nums">${stock.low > 0 ? stock.low.toFixed(2) : '—'}</span>
          </div>
        </div>

        {/* Key Catalyst */}
        <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
          <div className="flex items-center gap-1 mb-1">
            <Zap className="h-3 w-3 text-amber-500" />
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Key Catalyst</span>
          </div>
          {catalyst ? (
            <a
              href={catalyst.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug"
              onClick={(e) => e.stopPropagation()}
            >
              {catalyst.title}
              <span className="text-muted-foreground ml-1 text-[9px]">
                — {catalyst.source}
              </span>
            </a>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">
              {catalyst === null ? 'No recent catalysts' : 'Loading...'}
            </span>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
