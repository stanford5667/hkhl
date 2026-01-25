import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getCandlesForRange, CandleData } from '@/services/candleService';
import { fetchTickerDetails, TickerDetails } from '@/services/tickerDetailsService';
import { cn } from '@/lib/utils';

type Period = '1D' | '1W' | '1M' | '3M' | '1Y';

interface EnhancedTickerCardProps {
  symbol: string;
  name: string;
  price?: number;
  changePercent?: number;
  marketCap?: number;
  onClick: () => void;
}

const PERIODS: { label: string; value: Period }[] = [
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '1Y', value: '1Y' },
];

export function EnhancedTickerCard({
  symbol,
  name,
  price,
  changePercent,
  marketCap,
  onClick,
}: EnhancedTickerCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1M');
  const [chartData, setChartData] = useState<{ time: number; price: number }[]>([]);
  const [periodChange, setPeriodChange] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [details, setDetails] = useState<TickerDetails | null>(null);

  // Fetch ticker details for sector/industry
  useEffect(() => {
    fetchTickerDetails(symbol).then(setDetails).catch(() => {});
  }, [symbol]);

  // Fetch price data for chart
  useEffect(() => {
    let mounted = true;
    
    async function fetchData() {
      setIsLoading(true);
      try {
        const candles = await getCandlesForRange(symbol, selectedPeriod);
        if (mounted && candles.length > 0) {
          const data = candles.map((c: CandleData) => ({
            time: c.time,
            price: c.close,
          }));
          setChartData(data);
          
          const firstClose = candles[0].close;
          const lastClose = candles[candles.length - 1].close;
          if (firstClose && lastClose) {
            const change = ((lastClose - firstClose) / firstClose) * 100;
            setPeriodChange(change);
          }
        }
      } catch (err) {
        console.warn(`[EnhancedCard] Failed for ${symbol}:`, err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    
    fetchData();
    return () => { mounted = false; };
  }, [symbol, selectedPeriod]);

  const isPositive = (periodChange ?? changePercent ?? 0) >= 0;

  const formatPrice = (p: number | undefined) => {
    if (!p) return '—';
    return p.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 2 
    });
  };

  const formatMarketCap = (cap: number | undefined) => {
    if (!cap) return '';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
    return `$${cap.toLocaleString()}`;
  };

  const formatPriceLabel = (p: number) => {
    if (p >= 1000) return `$${(p / 1000).toFixed(1)}k`;
    if (p >= 100) return `$${p.toFixed(0)}`;
    if (p >= 10) return `$${p.toFixed(1)}`;
    return `$${p.toFixed(2)}`;
  };

  const handlePeriodClick = (e: React.MouseEvent, period: Period) => {
    e.stopPropagation();
    setSelectedPeriod(period);
  };

  // Build SVG chart with price scale
  const renderChart = () => {
    if (chartData.length < 2) return null;

    const width = 200;
    const height = 80;
    const priceScaleWidth = 38;
    const padding = { top: 8, right: 4, bottom: 16, left: priceScaleWidth };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Add 5% padding to price range
    const paddedMin = minPrice - priceRange * 0.05;
    const paddedMax = maxPrice + priceRange * 0.05;
    const paddedRange = paddedMax - paddedMin;

    // Build line path
    const points = chartData.map((d, i) => {
      const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.price - paddedMin) / paddedRange) * chartHeight;
      return { x, y };
    });

    const pathD = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
    const areaD = pathD + ` L${points[points.length - 1].x},${height - padding.bottom} L${points[0].x},${height - padding.bottom} Z`;

    const lineColor = isPositive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
    const gradientId = `gradient-${symbol}-${selectedPeriod}`;

    // Time labels based on period
    const startTime = chartData[0]?.time;
    const endTime = chartData[chartData.length - 1]?.time;
    const formatLabel = (ts: number) => {
      const date = new Date(ts * 1000);
      if (selectedPeriod === '1D') {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Price ticks (3 levels: low, mid, high)
    const priceTicks = [paddedMin, paddedMin + paddedRange / 2, paddedMax];

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Price Scale (Y-axis) */}
        {priceTicks.map((tick, i) => {
          const y = padding.top + chartHeight - ((tick - paddedMin) / paddedRange) * chartHeight;
          return (
            <g key={i}>
              <text 
                x={padding.left - 4} 
                y={y + 3} 
                fontSize="7" 
                fill="hsl(var(--muted-foreground))" 
                textAnchor="end"
                opacity="0.7"
              >
                {formatPriceLabel(tick)}
              </text>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
                strokeDasharray="2,2"
                opacity="0.3"
              />
            </g>
          );
        })}
        
        <path d={areaD} fill={`url(#${gradientId})`} />
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Time axis labels */}
        <text x={padding.left} y={height - 2} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="start" opacity="0.7">
          {formatLabel(startTime)}
        </text>
        <text x={width - padding.right} y={height - 2} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="end" opacity="0.7">
          {formatLabel(endTime)}
        </text>
      </svg>
    );
  };

  const sectorDisplay = details?.sector || null;
  const effectiveMarketCap = details?.marketCap || marketCap;

  return (
    <div
      className={cn(
        "flex flex-col p-4 rounded-xl",
        "bg-gradient-to-br from-card to-card/80",
        "border border-border/60",
        "hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5",
        "transition-all duration-300 group cursor-pointer",
        "backdrop-blur-sm"
      )}
      onClick={onClick}
    >
      {/* Header: Symbol + Price */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex flex-col">
          <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors tracking-tight">
            {symbol}
          </span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{name}</span>
        </div>
        <div className="text-right">
          <span className="font-bold text-lg text-foreground tabular-nums">
            {formatPrice(price)}
          </span>
          {effectiveMarketCap && (
            <div className="text-[10px] text-muted-foreground">{formatMarketCap(effectiveMarketCap)}</div>
          )}
        </div>
      </div>

      {/* Period Selector - More compact */}
      <div className="flex gap-0.5 mb-2 bg-muted/30 rounded-lg p-0.5">
        {PERIODS.map(({ label, value }) => (
          <button
            key={value}
            onClick={(e) => handlePeriodClick(e, value)}
            className={cn(
              "flex-1 text-[9px] font-medium py-1 rounded-md transition-all",
              selectedPeriod === value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      
      {/* Chart Area */}
      <div className="h-[80px] min-h-0 mb-2">
        {isLoading ? (
          <div className="w-full h-full bg-muted/20 animate-pulse rounded-lg" />
        ) : chartData.length > 1 ? (
          renderChart()
        ) : (
          <div className="w-full h-full bg-muted/10 rounded-lg flex items-center justify-center text-[10px] text-muted-foreground">
            No data
          </div>
        )}
      </div>

      {/* Footer: Performance Badge + Sector */}
      <div className="flex items-center justify-between">
        {/* Period Performance */}
        {periodChange !== null ? (
          <div className={cn(
            "flex items-center gap-1.5 text-sm font-semibold px-2 py-1 rounded-lg",
            isPositive 
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
              : 'text-red-400 bg-red-500/10 border border-red-500/20'
          )}>
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span className="tabular-nums">{isPositive ? '+' : ''}{periodChange.toFixed(2)}%</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        
        {/* Sector Badge */}
        {sectorDisplay ? (
          <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full truncate max-w-[90px]" title={sectorDisplay}>
            {sectorDisplay}
          </span>
        ) : null}
      </div>
    </div>
  );
}
