import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
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

function formatLargeNumber(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

export function TickerHoverPreview({ ticker, stock, children }: TickerHoverPreviewProps) {
  const { data: sparkline } = useQuery({
    queryKey: ['sparkline', ticker],
    queryFn: () => fetchSparklineData(ticker),
    staleTime: 10 * 60 * 1000,
    enabled: false, // fetched on hover via openChange
  });

  const isPositive = stock.changePercent >= 0;
  const sparkColor = isPositive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent side="right" className="w-72 p-3 space-y-3">
        {/* Header */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-foreground">{ticker}</span>
          <span className={cn(
            'text-xs font-semibold tabular-nums',
            isPositive ? 'text-emerald-500' : 'text-destructive'
          )}>
            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
          </span>
        </div>

        {/* Sparkline */}
        {sparkline && sparkline.length > 2 && (
          <div className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline}>
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price</span>
            <span className="font-medium tabular-nums">${stock.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Change</span>
            <span className={cn('font-medium tabular-nums', isPositive ? 'text-emerald-500' : 'text-destructive')}>
              {isPositive ? '+' : ''}${stock.change.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Volume</span>
            <span className="font-medium tabular-nums">{stock.volume >= 1e6 ? `${(stock.volume / 1e6).toFixed(1)}M` : stock.volume.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">P/E Ratio</span>
            <span className="font-medium tabular-nums">{stock.pe != null ? stock.pe.toFixed(1) : '—'}</span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="text-muted-foreground">Market Cap</span>
            <span className="font-medium tabular-nums">{formatLargeNumber(stock.marketCap)}</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
