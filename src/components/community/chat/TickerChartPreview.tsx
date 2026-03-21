import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
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

function MiniSparkline({ data, positive, id }: { data: number[]; positive: boolean; id: string }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 40;
  const w = 220;
  const step = w / (data.length - 1 || 1);

  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  const fillPoints = `0,${h} ${points} ${w},${h}`;
  const gradId = `spark-fill-${id}`;
  const strokeColor = positive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2 rounded-b-lg overflow-hidden">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
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

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('polygon-stock-quotes', {
          body: { symbols: displayTickers },
        });
        if (!mounted) return;
        if (error || !data?.quotes) {
          displayTickers.forEach(t => setTickerData(prev => ({ ...prev, [t]: { ...prev[t], loading: false } })));
          return;
        }
        const quotesMap: Record<string, any> = {};
        for (const q of data.quotes) quotesMap[q.symbol] = q;

        displayTickers.forEach(t => {
          const q = quotesMap[t];
          const info = TICKER_INFO[t] || { name: t, exchange: 'NYSE' };
          if (q && q.price > 0) {
            const base = q.previousClose || q.price;
            const sparkline = generateSparkline(base, q.price, 24);
            setTickerData(prev => ({
              ...prev,
              [t]: { price: q.price, change: q.change, changePercent: q.changePercent, name: q.name || info.name, exchange: info.exchange, sparkline, loading: false },
            }));
          } else {
            setTickerData(prev => ({ ...prev, [t]: { ...prev[t], loading: false } }));
          }
        });
      } catch {
        if (mounted) displayTickers.forEach(t => setTickerData(prev => ({ ...prev, [t]: { ...prev[t], loading: false } })));
      }
    })();

    return () => { mounted = false; };
  }, [tickers.join(',')]);

  const displayTickers = tickers.slice(0, 3);
  if (!displayTickers.length) return null;

  const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <div className="flex flex-col gap-2.5 mt-2.5">
      {displayTickers.map(ticker => {
        const td = tickerData[ticker];
        if (!td) return null;
        const isPositive = (td.changePercent ?? 0) >= 0;

        return (
          <button
            key={ticker}
            onClick={(e) => { e.stopPropagation(); navigate(`/stock/${ticker}`); }}
            className={cn(
              "w-full max-w-[300px] rounded-xl overflow-hidden transition-all text-left group/card",
              "bg-background/80 backdrop-blur-sm",
              "border border-border/40 hover:border-primary/40",
              "shadow-sm hover:shadow-md hover:shadow-primary/5",
              "cursor-pointer"
            )}
          >
            {td.loading ? (
              <div className="p-3.5 space-y-2 animate-pulse">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3 w-32 bg-muted rounded" />
                <div className="h-7 w-28 bg-muted rounded" />
                <div className="h-8 w-full bg-muted/50 rounded" />
              </div>
            ) : td.price > 0 ? (
              <>
                <div className="px-3.5 pt-3 pb-0">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-semibold tracking-wider text-primary/70 uppercase">
                      {ticker} <span className="text-muted-foreground/50 font-normal">•</span> <span className="text-muted-foreground/60 font-normal">{td.exchange}</span>
                    </span>
                    <span className="text-[9px] text-muted-foreground/40 tabular-nums">
                      {timeStr}
                    </span>
                  </div>

                  {/* Company name */}
                  <p className="text-[11px] text-muted-foreground/70 truncate mb-2 leading-tight">
                    {td.name}
                  </p>

                  {/* Price row */}
                  <div className="flex items-end justify-between">
                    <span className="text-[26px] font-bold text-foreground leading-none tabular-nums tracking-tight">
                      ${td.price.toFixed(2)}
                    </span>
                    <div className={cn(
                      "flex flex-col items-end text-[11px] font-mono leading-tight mb-0.5",
                      isPositive ? "text-chart-2" : "text-destructive"
                    )}>
                      <span>
                        {isPositive ? '+' : ''}{td.change.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-0.5 font-semibold">
                        {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {isPositive ? '+' : ''}{td.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Full-width sparkline bleeds to card edges */}
                {td.sparkline.length > 0 && (
                  <MiniSparkline data={td.sparkline} positive={isPositive} id={ticker} />
                )}

                {/* See more CTA */}
                <div className="px-3.5 pb-2.5 pt-1.5 flex items-center justify-end gap-1 opacity-60 group-hover/card:opacity-100 transition-opacity">
                  <span className="text-[10px] font-medium text-primary">View details</span>
                  <ChevronRight className="h-3 w-3 text-primary transition-transform group-hover/card:translate-x-0.5" />
                </div>
              </>
            ) : (
              <div className="p-3.5 flex items-center gap-2">
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

function generateSparkline(start: number, end: number, points: number): number[] {
  const result: number[] = [];
  const range = end - start;
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const noise = (Math.random() - 0.5) * Math.abs(range) * 0.35;
    result.push(start + range * progress + noise);
  }
  result[result.length - 1] = end;
  return result;
}
