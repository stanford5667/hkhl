import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCandlesForRange, CandleData, TimeRange } from '@/services/candleService';
import { fetchTickerDetails, TickerDetails } from '@/services/tickerDetailsService';
import { cn } from '@/lib/utils';
import { HoverActionOverlay } from '@/components/ui/HoverActionOverlay';

type Period = '1D' | '1W' | '1M' | '3M' | '1Y';

interface EnhancedTickerCardProps {
  symbol: string;
  name: string;
  price?: number;
  changePercent?: number;
  marketCap?: number;
  onClick: () => void;
  compact?: boolean;
}

const PERIODS: { label: string; value: Period }[] = [
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '1Y', value: '1Y' },
];

const PERIOD_DAYS: Record<Period, number> = {
  '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365,
};

export function EnhancedTickerCard({
  symbol, name, price, changePercent, marketCap, onClick, compact = false,
}: EnhancedTickerCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1D');
  const [chartData, setChartData] = useState<{ time: number; price: number }[]>([]);
  const [periodChange, setPeriodChange] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [details, setDetails] = useState<TickerDetails | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Defer data fetching until card is visible
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    fetchTickerDetails(symbol).then(setDetails).catch(() => {});
  }, [symbol, isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    let mounted = true;
    async function fetchData() {
      setIsLoading(true);
      try {
        if (selectedPeriod === '1D') {
          setPeriodChange(changePercent ?? null);
          try {
            const candles = await getCandlesForRange(symbol, '1D' as TimeRange);
            if (mounted && candles.length > 1) {
              setChartData(candles.map((c: CandleData) => ({ time: c.time, price: c.close })));
            }
          } catch {
            if (mounted && price) {
              const now = Math.floor(Date.now() / 1000);
              setChartData([
                { time: now - 86400, price: price / (1 + (changePercent || 0) / 100) },
                { time: now, price },
              ]);
            }
          }
          setIsLoading(false);
          return;
        }
        const days = PERIOD_DAYS[selectedPeriod];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const { data: dbBars, error } = await supabase
          .from('market_daily_bars')
          .select('bar_date, close')
          .eq('ticker', symbol.toUpperCase())
          .gte('bar_date', startDate.toISOString().split('T')[0])
          .order('bar_date', { ascending: true });
        if (!error && dbBars && dbBars.length > 1 && mounted) {
          setChartData(dbBars.map((bar) => ({ time: new Date(bar.bar_date).getTime() / 1000, price: bar.close })));
          const firstClose = dbBars[0].close;
          const lastClose = dbBars[dbBars.length - 1].close;
          if (firstClose && lastClose && firstClose > 0) {
            setPeriodChange(((lastClose - firstClose) / firstClose) * 100);
          } else { setPeriodChange(null); }
          setIsLoading(false);
          return;
        }
        const candles = await getCandlesForRange(symbol, selectedPeriod as TimeRange);
        if (mounted && candles.length > 1) {
          setChartData(candles.map((c: CandleData) => ({ time: c.time, price: c.close })));
          const firstClose = candles[0].close;
          const lastClose = candles[candles.length - 1].close;
          if (firstClose && lastClose && firstClose > 0) {
            setPeriodChange(((lastClose - firstClose) / firstClose) * 100);
          } else { setPeriodChange(null); }
        } else if (mounted) {
          setChartData([]);
          setPeriodChange(null);
        }
      } catch (err) {
        console.warn(`[EnhancedCard] Failed for ${symbol}:`, err);
        if (mounted) {
          setChartData([]);
          if (selectedPeriod === '1D') { setPeriodChange(changePercent ?? null); }
          else { setPeriodChange(null); }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchData();
    return () => { mounted = false; };
  }, [symbol, selectedPeriod, changePercent, price, isVisible]);

  const isPositive = (periodChange ?? changePercent ?? 0) >= 0;

  const formatPrice = (p: number | undefined) => {
    if (!p) return '—';
    return p.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  };

  const formatMarketCap = (cap: number | undefined) => {
    if (!cap) return '';
    if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `${(cap / 1e6).toFixed(0)}M`;
    return cap.toLocaleString();
  };

  const handlePeriodClick = (e: React.MouseEvent, period: Period) => {
    e.stopPropagation();
    setSelectedPeriod(period);
  };

  const renderChart = () => {
    if (chartData.length < 2) return null;
    const width = compact ? 150 : 220;
    const height = compact ? 44 : 70;
    const padding = { top: 4, right: 2, bottom: 4, left: 2 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const paddedMin = minPrice - priceRange * 0.05;
    const paddedMax = maxPrice + priceRange * 0.05;
    const paddedRange = paddedMax - paddedMin;

    const points = chartData.map((d, i) => {
      const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.price - paddedMin) / paddedRange) * chartHeight;
      return { x, y };
    });

    const pathD = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
    const areaD = pathD + ` L${points[points.length - 1].x},${height - padding.bottom} L${points[0].x},${height - padding.bottom} Z`;

    const lineColor = isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
    const gradientId = `gradient-${symbol}-${selectedPeriod}`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradientId})`} />
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" />
        {/* Current price dot */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="2.5"
          fill={lineColor}
          className="animate-pulse"
        />
      </svg>
    );
  };

  const sectorDisplay = details?.sector || null;
  const effectiveMarketCap = details?.marketCap || marketCap;
  const displayChange = periodChange ?? changePercent ?? null;

  // Compact mobile layout — Bloomberg style
  if (compact) {
    return (
      <div
        ref={cardRef}
        className={cn(
          "relative flex flex-col p-2.5 rounded-lg cursor-pointer h-[160px]",
          "bg-card/60 backdrop-blur-sm",
          "border transition-all duration-200 group",
          isPositive
            ? "border-success/20 hover:border-success/40"
            : "border-destructive/20 hover:border-destructive/40",
          "active:scale-[0.98]"
        )}
        onClick={onClick}
      >
        <HoverActionOverlay symbol={symbol} />
        {/* Top row: symbol + change */}
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-mono font-extrabold text-sm text-white">{symbol}</span>
          {displayChange !== null && (
            <span className={cn(
              "font-mono text-[11px] font-bold tabular-nums",
              isPositive ? 'text-[hsl(142_76%_55%)]' : 'text-[hsl(0_84%_60%)]'
            )}>
              {isPositive ? '+' : ''}{displayChange.toFixed(2)}%
            </span>
          )}
        </div>
        {/* Price */}
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{formatPrice(price)}</span>
        {/* Sparkline */}
        <div className="h-[44px] mt-1.5 -mx-1 flex-1 min-h-0">
          {isLoading ? (
            <div className="w-full h-full bg-muted/10 animate-pulse rounded" />
          ) : chartData.length > 1 ? renderChart() : (
            <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground font-mono">—</div>
          )}
        </div>
        {/* CTA */}
        <div className="mt-1.5 pt-1.5 border-t border-border/20">
          <span className="inline-flex items-center gap-1 font-mono font-bold uppercase tracking-wide rounded-md text-[8px] px-2 py-0.5 bg-[hsl(175_80%_45%)] text-background shadow-[0_0_8px_hsl(175_80%_45%/0.3)] group-hover:shadow-[0_0_14px_hsl(175_80%_45%/0.5)] transition-all">
            Analyze <ArrowRight className="h-2 w-2" />
          </span>
        </div>
      </div>
    );
  }

  // Full desktop layout — Bloomberg terminal card
  return (
    <div
      ref={cardRef}
      className={cn(
        "relative flex flex-col rounded-xl cursor-pointer h-[280px]",
        "bg-card/60 backdrop-blur-sm",
        "border transition-all duration-300 group",
        isPositive
          ? "border-success/15 hover:border-success/40 hover:shadow-[0_0_20px_hsl(var(--success)/0.08)]"
          : "border-destructive/15 hover:border-destructive/40 hover:shadow-[0_0_20px_hsl(var(--destructive)/0.08)]"
      )}
      onClick={onClick}
    >
      <HoverActionOverlay symbol={symbol} />
      {/* Top accent line */}
      <div className={cn(
        "h-[2px] w-full",
        isPositive ? "bg-gradient-to-r from-success/60 via-success/30 to-transparent" : "bg-gradient-to-r from-destructive/60 via-destructive/30 to-transparent"
      )} />

      <div className="p-3.5 flex flex-col flex-1 min-h-0">
        {/* Header: Symbol + Price + Change */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-base text-white group-hover:text-primary transition-colors">
                {symbol}
              </span>
              {sectorDisplay && (
                <span className="text-[9px] font-mono text-muted-foreground/60 border border-border/40 px-1.5 py-0.5 rounded">
                  {sectorDisplay}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground truncate block max-w-[120px]">{name}</span>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-base text-foreground tabular-nums block">
              {formatPrice(price)}
            </span>
            {effectiveMarketCap && (
              <span className="text-[9px] font-mono text-muted-foreground/60 tabular-nums">
                MCap {formatMarketCap(effectiveMarketCap)}
              </span>
            )}
          </div>
        </div>

        {/* Period Selector — terminal buttons */}
        <div className="flex gap-px mb-2 bg-muted/20 rounded-md p-px">
          {PERIODS.map(({ label, value }) => (
            <button
              key={value}
              onClick={(e) => handlePeriodClick(e, value)}
              className={cn(
                "flex-1 text-[9px] font-mono font-medium py-1 rounded-sm transition-all",
                selectedPeriod === value
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sparkline Chart */}
        <div className="flex-1 min-h-[50px] -mx-1.5 mb-2">
          {isLoading ? (
            <div className="w-full h-full bg-muted/10 animate-pulse rounded" />
          ) : chartData.length > 1 ? renderChart() : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground">
              NO DATA
            </div>
          )}
        </div>

        {/* Footer: Performance Badge */}
        <div className="flex items-center justify-between">
          {displayChange !== null ? (
            <div className={cn(
              "inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded border tabular-nums",
              isPositive
                ? 'text-[hsl(142_76%_55%)] bg-[hsl(142_76%_55%/0.1)] border-[hsl(142_76%_55%/0.2)]'
                : 'text-[hsl(0_84%_60%)] bg-[hsl(0_84%_60%/0.1)] border-[hsl(0_84%_60%/0.2)]'
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? '+' : ''}{displayChange.toFixed(2)}%
            </div>
          ) : (
            <span className="text-[10px] font-mono text-muted-foreground">—</span>
          )}
          <span className="inline-flex items-center gap-1 font-mono font-bold uppercase tracking-wide rounded-md text-[9px] px-2.5 py-1 bg-[hsl(175_80%_45%)] text-background shadow-[0_0_10px_hsl(175_80%_45%/0.3)] group-hover:shadow-[0_0_16px_hsl(175_80%_45%/0.5)] transition-all">
            Analyze <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
