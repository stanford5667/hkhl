import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TickerChartPreviewProps {
  tickers: string[];
}

interface TickerData {
  price: number;
  change: number;
  changePercent: number;
  loading: boolean;
}

const FINNHUB_TOKEN = 'd5bjvopr01qnaidu4a30d5bjvopr01qnaidu4a3g';

export function TickerChartPreview({ tickers }: TickerChartPreviewProps) {
  const navigate = useNavigate();
  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});

  useEffect(() => {
    if (!tickers.length) return;
    let mounted = true;

    const initial: Record<string, TickerData> = {};
    tickers.slice(0, 3).forEach(t => {
      initial[t] = { price: 0, change: 0, changePercent: 0, loading: true };
    });
    setTickerData(initial);

    tickers.slice(0, 3).forEach(async (ticker) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_TOKEN}`
        );
        const data = await res.json();

        if (mounted && data?.c && data.c > 0) {
          setTickerData(prev => ({
            ...prev,
            [ticker]: {
              price: data.c,
              change: data.d ?? 0,
              changePercent: data.dp ?? 0,
              loading: false,
            },
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
        const isPositive = (td?.changePercent ?? 0) >= 0;

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
            <span className="text-xs font-bold text-foreground">${ticker}</span>
            {td.loading ? (
              <span className="text-[10px] text-muted-foreground animate-pulse">…</span>
            ) : td.price > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-muted-foreground">
                  ${td.price.toFixed(2)}
                </span>
                <span className={cn(
                  "text-[10px] font-mono flex items-center gap-0.5",
                  isPositive ? "text-chart-2" : "text-destructive"
                )}>
                  {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {isPositive ? '+' : ''}{td.changePercent.toFixed(2)}%
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground">No data</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
