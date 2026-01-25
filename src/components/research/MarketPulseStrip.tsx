import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sparklineData: number[];
}

const INDICES = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'NASDAQ' },
  { symbol: 'VIX', name: 'VIX' },
];

function MicroSparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  if (!data || data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const width = 48;
  const height = 20;
  const padding = 2;
  
  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (height - padding * 2) - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });
  
  const pathD = `M${points.join(' L')}`;
  
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <path
        d={pathD}
        fill="none"
        stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IndexPill({ data }: { data: IndexData }) {
  const isPositive = data.changePercent >= 0;
  const isVIX = data.symbol === 'VIX';
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg',
      'bg-slate-950/40 backdrop-blur-md border border-slate-800/50',
      'hover:border-primary/30 transition-all duration-200'
    )}>
      <div className="flex flex-col min-w-[52px]">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          {data.name}
        </span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {isVIX ? data.price.toFixed(2) : data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      
      <MicroSparkline data={data.sparklineData} isPositive={isPositive} />
      
      <div className={cn(
        'flex items-center gap-0.5 font-mono text-xs font-medium',
        isPositive ? 'text-success' : 'text-destructive'
      )}>
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>{isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%</span>
      </div>
    </div>
  );
}

export function MarketPulseStrip() {
  const { data: indicesData, isLoading } = useQuery({
    queryKey: ['market-pulse-indices'],
    queryFn: async (): Promise<IndexData[]> => {
      const results: IndexData[] = [];
      
      for (const index of INDICES) {
        try {
          // Fetch quote
          const { data: quoteData } = await supabase.functions.invoke('finnhub-proxy', {
            body: { action: 'quote', symbol: index.symbol }
          });
          
          if (quoteData?.ok && quoteData?.quote) {
            const quote = quoteData.quote;
            
            // Generate simple sparkline from change (we could fetch historical data)
            const basePrice = quote.previousClose || quote.price;
            const sparkline = Array.from({ length: 12 }, (_, i) => {
              const progress = i / 11;
              return basePrice + (quote.change || 0) * progress * (0.8 + Math.random() * 0.4);
            });
            
            results.push({
              symbol: index.symbol,
              name: index.name,
              price: quote.price || 0,
              change: quote.change || 0,
              changePercent: quote.changePercent || 0,
              sparklineData: sparkline,
            });
          }
        } catch (error) {
          console.error(`[MarketPulseStrip] Error fetching ${index.symbol}:`, error);
        }
      }
      
      return results;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 p-2 bg-slate-950/40 backdrop-blur-md border-b border-slate-800/50">
        {INDICES.map((index) => (
          <div key={index.symbol} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/50 animate-pulse">
            <div className="w-16 h-8 bg-slate-800 rounded" />
            <div className="w-12 h-5 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 p-2 bg-slate-950/40 backdrop-blur-md border-b border-slate-800/50 overflow-x-auto">
      <Activity className="h-4 w-4 text-primary flex-shrink-0 hidden sm:block" />
      {indicesData?.map((data) => (
        <IndexPill key={data.symbol} data={data} />
      ))}
    </div>
  );
}
