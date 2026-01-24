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
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1D');
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
    if (!cap) return '—';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
    return `$${cap.toLocaleString()}`;
  };

  const handlePeriodClick = (e: React.MouseEvent, period: Period) => {
    e.stopPropagation();
    setSelectedPeriod(period);
  };

  // Build SVG chart with proper axes
  const renderChart = () => {
    if (chartData.length < 2) return null;

    const width = 200;
    const height = 60;
    const padding = { top: 4, right: 4, bottom: 14, left: 4 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Build line path
    const points = chartData.map((d, i) => {
      const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.price - minPrice) / priceRange) * chartHeight;
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
        {/* Time axis labels */}
        <text x={padding.left} y={height - 2} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="start">
          {formatLabel(startTime)}
        </text>
        <text x={width - padding.right} y={height - 2} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="end">
          {formatLabel(endTime)}
        </text>
      </svg>
    );
  };

  const sectorDisplay = details?.industry || details?.sector || null;
  const effectiveMarketCap = details?.marketCap || marketCap;

  return (
    <div
      className={cn(
        "flex flex-col p-3 rounded-xl bg-card border border-border",
        "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
        "transition-all duration-300 group cursor-pointer",
        "w-[220px] h-[200px]"
      )}
      onClick={onClick}
    >
      {/* Row 1: Symbol + Price */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
          {symbol}
        </span>
        <span className="font-bold text-base text-foreground">
          {formatPrice(price)}
        </span>
      </div>

      {/* Row 2: Name + Market Cap */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">{name}</span>
        <span className="text-[10px] text-muted-foreground">{formatMarketCap(effectiveMarketCap)}</span>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1 mb-2">
        {PERIODS.map(({ label, value }) => (
          <button
            key={value}
            onClick={(e) => handlePeriodClick(e, value)}
            className={cn(
              "flex-1 text-[9px] font-medium py-0.5 rounded transition-all",
              selectedPeriod === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      
      {/* Chart Area */}
      <div className="flex-1 min-h-0 mb-2">
        {isLoading ? (
          <div className="w-full h-full bg-muted/30 animate-pulse rounded" />
        ) : chartData.length > 1 ? (
          renderChart()
        ) : (
          <div className="w-full h-full bg-muted/20 rounded flex items-center justify-center text-[10px] text-muted-foreground">
            No data
          </div>
        )}
      </div>

      {/* Footer: Performance + Sector */}
      <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
        {/* Period Performance */}
        {periodChange !== null ? (
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded",
            isPositive ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{isPositive ? '+' : ''}{periodChange.toFixed(2)}%</span>
            <span className="text-[9px] text-muted-foreground font-normal ml-0.5">{selectedPeriod}</span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
        
        {/* Sector/Industry */}
        {sectorDisplay ? (
          <span className="text-[9px] text-muted-foreground truncate max-w-[80px]" title={sectorDisplay}>
            {sectorDisplay}
          </span>
        ) : (
          <span className="text-[9px] text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}
