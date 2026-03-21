import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MiniSparkline } from '@/components/research/MiniSparkline';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TickerChartPreviewProps {
  tickers: string[];
}

interface TickerData {
  sparkline: number[];
  price: number;
  change: number;
  loading: boolean;
}

export function TickerChartPreview({ tickers }: TickerChartPreviewProps) {
  const navigate = useNavigate();
  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});

  useEffect(() => {
    if (!tickers.length) return;
    let mounted = true;

    // Initialize loading state
    const initial: Record<string, TickerData> = {};
    tickers.slice(0, 3).forEach(t => {
      initial[t] = { sparkline: [], price: 0, change: 0, loading: true };
    });
    setTickerData(initial);

    tickers.slice(0, 3).forEach(async (ticker) => {
      try {
        const { data, error } = await supabase.functions.invoke('polygon-daily-bars', {
          body: { ticker, range: '1M' },
        });

        if (!error && data?.ok && data?.bars?.length > 0 && mounted) {
          const bars = data.bars as Array<{ close: number }>;
          const closes = bars.map(b => b.close);
          const lastPrice = closes[closes.length - 1];
          const firstPrice = closes[0];
          const changePct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

          setTickerData(prev => ({
            ...prev,
            [ticker]: { sparkline: closes, price: lastPrice, change: changePct, loading: false },
          }));
        } else if (mounted) {
          setTickerData(prev => ({ ...prev, [ticker]: { ...prev[ticker], loading: false } }));
        }
      } catch {
        if (mounted) {
          setTickerData(prev => ({ ...prev, [ticker]: { ...prev[ticker], loading: false } }));
        }
      }
    });

    return () => { mounted = false; };
  }, [tickers.join(',')]);

  const displayTickers = tickers.slice(0, 3);
  if (!displayTickers.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {displayTickers.map(ticker => {
        const td = tickerData[ticker];
        if (!td) return null;
        const isPositive = (td?.change ?? 0) >= 0;

        return (
          <button
            key={ticker}
            onClick={(e) => { e.stopPropagation(); navigate(`/stock/${ticker}`); }}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all",
              "bg-card/50 hover:bg-card border-border/50 hover:border-border",
              "cursor-pointer group/chart"
            )}
          >
            <div className="flex flex-col items-start">
              <span className="text-xs font-semibold text-foreground">${ticker}</span>
              {td.loading ? (
                <span className="text-[10px] text-muted-foreground">Loading...</span>
              ) : td.price > 0 ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ${td.price.toFixed(2)}
                  </span>
                  <span className={cn(
                    "text-[10px] font-mono flex items-center gap-0.5",
                    isPositive ? "text-emerald-500" : "text-red-500"
                  )}>
                    {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {isPositive ? '+' : ''}{td.change.toFixed(1)}%
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground">No data</span>
              )}
            </div>

            <div className="w-[80px] h-[32px]">
              {td.loading ? (
                <div className="w-full h-full bg-muted/30 animate-pulse rounded" />
              ) : td.sparkline.length > 1 ? (
                <MiniSparkline
                  data={td.sparkline}
                  width={80}
                  height={32}
                  isPositive={isPositive}
                />
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
