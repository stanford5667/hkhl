import { ReactNode, memo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Zap, Sparkles } from 'lucide-react';
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

interface CatalystData {
  title: string;
  source: string;
  url: string;
  isAI?: boolean;
}

const SPARKLINE_LOOKBACK_DAYS = 45;
const SPARKLINE_POINT_LIMIT = 30;

function getSparklineQueryOptions(ticker: string) {
  return {
    queryKey: ['sparkline', ticker],
    queryFn: () => fetchSparklineData(ticker),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  };
}

function getCatalystQueryOptions(ticker: string, sector: string) {
  return {
    queryKey: ['catalyst', ticker],
    queryFn: () => fetchCatalyst(ticker, sector),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  };
}

async function fetchSparklineData(ticker: string): Promise<SparklinePoint[]> {
  try {
    const normalizedTicker = ticker.toUpperCase();
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - SPARKLINE_LOOKBACK_DAYS);
    const startDate = lookbackDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('market_daily_bars')
      .select('bar_date, close')
      .eq('ticker', normalizedTicker)
      .gte('bar_date', startDate)
      .order('bar_date', { ascending: false })
      .limit(SPARKLINE_POINT_LIMIT);
    
    if (!error && data && data.length > 0) {
      return [...data]
        .reverse()
        .map((bar: { bar_date: string; close: number }) => ({ date: bar.bar_date, close: bar.close }));
    }

    const { data: polygonData, error: polygonError } = await supabase.functions.invoke('polygon-daily-bars', {
      body: { ticker: normalizedTicker, days: SPARKLINE_LOOKBACK_DAYS }
    });

    if (polygonError || !polygonData?.ok || !polygonData?.bars?.length) return [];

    return polygonData.bars
      .slice(-SPARKLINE_POINT_LIMIT)
      .map((bar: { date: string; close: number }) => ({ date: bar.date, close: bar.close }));
  } catch {
    return [];
  }
}

async function fetchCatalyst(ticker: string, sector: string): Promise<CatalystData | null> {
  try {
    // Try real news first
    const { data, error } = await supabase.functions.invoke('polygon-news', {
      body: { ticker },
    });
    if (!error && data?.article) {
      return { ...data.article, isAI: false } as CatalystData;
    }
    
    // Fall back to AI-generated catalyst
    const { data: aiData } = await supabase.functions.invoke('generate-catalyst', {
      body: { ticker, sector },
    });
    if (aiData?.catalyst) {
      return {
        title: aiData.catalyst,
        source: 'AI Analysis',
        url: '',
        isAI: true,
      };
    }
    return null;
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

function formatPerfChange(val: number | null): string {
  if (val == null) return '—';
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

export const TickerHoverPreview = memo(function TickerHoverPreview({ ticker, stock, children }: TickerHoverPreviewProps) {
  const queryClient = useQueryClient();
  const normalizedTicker = ticker.toUpperCase();

  const { data: sparkline, isFetching: sparklineFetching } = useQuery({
    ...getSparklineQueryOptions(normalizedTicker),
    enabled: false,
  });

  const { data: catalyst, isFetching: catalystFetching } = useQuery({
    ...getCatalystQueryOptions(normalizedTicker, stock.sector || ''),
    enabled: false,
  });

  const prefetchPreviewData = useCallback(() => {
    void queryClient.prefetchQuery(getSparklineQueryOptions(normalizedTicker));
    void queryClient.prefetchQuery(getCatalystQueryOptions(normalizedTicker, stock.sector || ''));
  }, [normalizedTicker, queryClient, stock.sector]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      prefetchPreviewData();
    }
  };

  const isPositive = stock.changePercent >= 0;
  const sparkColor = isPositive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
  const hasSparkline = (sparkline?.length ?? 0) > 2;
  const sparklineLoading = sparklineFetching && !sparkline;
  const catalystLoading = catalystFetching && catalyst === undefined;

  return (
    <HoverCard openDelay={300} closeDelay={150} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <span className="inline-flex" onMouseEnter={prefetchPreviewData} onFocus={prefetchPreviewData}>
          {children}
        </span>
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

        {/* Company Description */}
        {(stock.shortDescription || stock.sicDescription) && (
          <div className="px-3 pb-1.5">
            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
              {stock.shortDescription || stock.sicDescription}
            </p>
          </div>
        )}

        {/* Sparkline area chart */}
        <div className="h-20 w-full px-1">
          {hasSparkline ? (
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
          ) : sparklineLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-[10px] text-muted-foreground animate-pulse">Loading chart...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-[10px] text-muted-foreground">No chart data</span>
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
            <span className="text-muted-foreground block text-[9px]">PEG</span>
            <span className="font-medium tabular-nums">{stock.peg != null ? stock.peg.toFixed(2) : '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[9px]">Mkt Cap</span>
            <span className="font-medium tabular-nums">{formatLargeNumber(stock.marketCap)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[9px]">Sector</span>
            <span className="font-medium truncate block">{stock.sector || '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[9px]">Beta</span>
            <span className="font-medium tabular-nums">{stock.beta != null ? stock.beta.toFixed(2) : '—'}</span>
          </div>
        </div>

        {/* Multi-period Performance */}
        <div className="grid grid-cols-4 gap-1 px-3 py-2 border-t border-border/50 text-[10px]">
          <div className="text-center">
            <span className="text-muted-foreground block text-[8px]">1D</span>
            <span className={cn('font-semibold tabular-nums', stock.changePercent >= 0 ? 'text-emerald-500' : 'text-destructive')}>
              {formatPerfChange(stock.changePercent)}
            </span>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground block text-[8px]">1W</span>
            <span className={cn('font-semibold tabular-nums', (stock.changePercent1W ?? 0) >= 0 ? 'text-emerald-500' : 'text-destructive')}>
              {formatPerfChange(stock.changePercent1W)}
            </span>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground block text-[8px]">1M</span>
            <span className={cn('font-semibold tabular-nums', (stock.changePercent1M ?? 0) >= 0 ? 'text-emerald-500' : 'text-destructive')}>
              {formatPerfChange(stock.changePercent1M)}
            </span>
          </div>
          <div className="text-center">
            <span className="text-muted-foreground block text-[8px]">YTD</span>
            <span className={cn('font-semibold tabular-nums', (stock.changePercentYTD ?? 0) >= 0 ? 'text-emerald-500' : 'text-destructive')}>
              {formatPerfChange(stock.changePercentYTD)}
            </span>
          </div>
        </div>

        {/* Key Catalyst */}
        <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
          <div className="flex items-center gap-1 mb-1">
            {catalyst?.isAI ? (
              <Sparkles className="h-3 w-3 text-purple-500" />
            ) : (
              <Zap className="h-3 w-3 text-amber-500" />
            )}
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
              {catalyst?.isAI ? 'AI Catalyst' : 'Key Catalyst'}
            </span>
          </div>
          {catalyst ? (
            catalyst.url ? (
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
              <p className="text-[11px] text-foreground line-clamp-2 leading-snug">
                {catalyst.title}
              </p>
            )
          ) : (
            <span className="text-[10px] text-muted-foreground italic">
              {catalystLoading ? 'Loading...' : 'No recent catalysts'}
            </span>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
});
