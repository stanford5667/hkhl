import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface TickerChartPreviewProps {
  tickers: string[];
}

interface TickerData {
  price: number;
  change: number;
  changePercent: number;
  name: string;
  exchange: string;
  sparkline: number[];
  loading: boolean;
}

const TICKER_INFO: Record<string, { name: string; exchange: string }> = {
  SPY: { name: 'SPDR S&P 500 ETF Trust', exchange: 'ARCA' },
  QQQ: { name: 'Invesco QQQ Trust', exchange: 'NASDAQ' },
  DIA: { name: 'SPDR Dow Jones ETF', exchange: 'ARCA' },
  IWM: { name: 'iShares Russell 2000 ETF', exchange: 'ARCA' },
  VTI: { name: 'Vanguard Total Stock Market', exchange: 'ARCA' },
  AAPL: { name: 'Apple Inc.', exchange: 'NASDAQ' },
  MSFT: { name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  GOOGL: { name: 'Alphabet Inc.', exchange: 'NASDAQ' },
  AMZN: { name: 'Amazon.com, Inc.', exchange: 'NASDAQ' },
  NVDA: { name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
  META: { name: 'Meta Platforms, Inc.', exchange: 'NASDAQ' },
  TSLA: { name: 'Tesla, Inc.', exchange: 'NASDAQ' },
  USO: { name: 'United States Oil Fund, LP', exchange: 'ARCA' },
  GLD: { name: 'SPDR Gold Shares', exchange: 'ARCA' },
  TLT: { name: 'iShares 20+ Year Treasury', exchange: 'NASDAQ' },
  AMD: { name: 'Advanced Micro Devices', exchange: 'NASDAQ' },
  NFLX: { name: 'Netflix, Inc.', exchange: 'NASDAQ' },
  COIN: { name: 'Coinbase Global, Inc.', exchange: 'NASDAQ' },
  BA: { name: 'The Boeing Company', exchange: 'NYSE' },
  JPM: { name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
};

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 48;
  const w = 160;
  const step = w / (data.length - 1 || 1);

  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1">
      <defs>
        <linearGradient id={`grad-${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#grad-${positive ? 'up' : 'down'})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={positive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TickerChartPreview({ tickers }: TickerChartPreviewProps) {
  const navigate = useNavigate();
  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});

  useEffect(() => {
    if (!tickers.length) return;
    let mounted = true;

    const displayTickers = tickers.slice(0, 3);

    const initial: Record<string, TickerData> = {};
    displayTickers.forEach(t => {
      const info = TICKER_INFO[t] || { name: t, exchange: 'NYSE' };
      initial[t] = { price: 0, change: 0, changePercent: 0, name: info.name, exchange: info.exchange, sparkline: [], loading: true };
    });
    setTickerData(initial);

    // Fetch quotes from our edge function
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('polygon-stock-quotes', {
          body: { symbols: displayTickers },
        });

        if (!mounted) return;

        if (error || !data?.quotes) {
          displayTickers.forEach(t => {
            setTickerData(prev => ({ ...prev, [t]: { ...prev[t], loading: false } }));
          });
          return;
        }

        const quotesMap: Record<string, any> = {};
        for (const q of data.quotes) {
          quotesMap[q.symbol] = q;
        }

        displayTickers.forEach(t => {
          const q = quotesMap[t];
          const info = TICKER_INFO[t] || { name: t, exchange: 'NYSE' };
          if (q && q.price > 0) {
            // Generate a synthetic sparkline from the quote data
            const base = q.previousClose || q.price;
            const sparkline = generateSparkline(base, q.price, 20);
            setTickerData(prev => ({
              ...prev,
              [t]: {
                price: q.price,
                change: q.change,
                changePercent: q.changePercent,
                name: q.name || info.name,
                exchange: info.exchange,
                sparkline,
                loading: false,
              },
            }));
          } else {
            setTickerData(prev => ({ ...prev, [t]: { ...prev[t], loading: false } }));
          }
        });
      } catch {
        if (mounted) {
          displayTickers.forEach(t => {
            setTickerData(prev => ({ ...prev, [t]: { ...prev[t], loading: false } }));
          });
        }
      }
    })();

    return () => { mounted = false; };
  }, [tickers.join(',')]);

  const displayTickers = tickers.slice(0, 3);
  if (!displayTickers.length) return null;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <div className="flex flex-col gap-2 mt-2">
      {displayTickers.map(ticker => {
        const td = tickerData[ticker];
        if (!td) return null;
        const isPositive = (td.changePercent ?? 0) >= 0;

        return (
          <button
            key={ticker}
            onClick={(e) => { e.stopPropagation(); navigate(`/stock/${ticker}`); }}
            className={cn(
              "w-full max-w-[280px] rounded-xl border transition-all text-left",
              "bg-card hover:bg-accent/30 border-border/60 hover:border-border",
              "cursor-pointer p-3"
            )}
          >
            {td.loading ? (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-6 w-24 bg-muted rounded" />
              </div>
            ) : td.price > 0 ? (
              <>
                {/* Header: ticker • exchange + updated time */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">
                    {ticker} • {td.exchange}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60">
                    Updated {timeStr}
                  </span>
                </div>

                {/* Company name */}
                <div className="text-xs text-muted-foreground truncate mb-1.5">
                  {td.name}
                </div>

                {/* Price + change */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground tabular-nums">
                    ${td.price.toFixed(2)}
                  </span>
                  <div className={cn(
                    "flex flex-col text-[11px] font-mono leading-tight",
                    isPositive ? "text-chart-2" : "text-destructive"
                  )}>
                    <span className="flex items-center gap-0.5">
                      $ {isPositive ? '+' : ''}{td.change.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {isPositive ? '+' : ''}{td.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Sparkline */}
                {td.sparkline.length > 0 && (
                  <MiniSparkline data={td.sparkline} positive={isPositive} />
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">${ticker}</span>
                <span className="text-[10px] text-muted-foreground">No data available</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Generate a synthetic sparkline that trends from `start` to `end` with some noise */
function generateSparkline(start: number, end: number, points: number): number[] {
  const result: number[] = [];
  const range = end - start;
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const noise = (Math.random() - 0.5) * Math.abs(range) * 0.4;
    result.push(start + range * progress + noise);
  }
  result[result.length - 1] = end;
  return result;
}
