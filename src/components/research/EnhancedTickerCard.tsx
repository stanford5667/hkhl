import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { MiniSparkline } from './MiniSparkline';
import { getCandlesForRange, CandleData } from '@/services/candleService';
import { cn } from '@/lib/utils';

type Period = '1W' | '1M' | '3M' | '1Y';

interface EnhancedTickerCardProps {
  symbol: string;
  name: string;
  price?: number;
  changePercent?: number;
  marketCap?: number;
  onClick: () => void;
}

const PERIODS: { label: string; value: Period }[] = [
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
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [periodChange, setPeriodChange] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function fetchSparkline() {
      setIsLoading(true);
      try {
        const candles = await getCandlesForRange(symbol, selectedPeriod);
        if (mounted && candles.length > 0) {
          const closes = candles.map((c: CandleData) => c.close);
          setSparklineData(closes);
          
          // Calculate period return
          const firstClose = closes[0];
          const lastClose = closes[closes.length - 1];
          if (firstClose && lastClose) {
            const change = ((lastClose - firstClose) / firstClose) * 100;
            setPeriodChange(change);
          }
        }
      } catch (err) {
        console.warn(`[Sparkline] Failed for ${symbol}:`, err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    
    fetchSparkline();
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
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  };

  const handlePeriodClick = (e: React.MouseEvent, period: Period) => {
    e.stopPropagation();
    setSelectedPeriod(period);
  };

  return (
    <div
      className={cn(
        "flex flex-col p-4 rounded-xl bg-card border border-border",
        "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
        "transition-all duration-300 group cursor-pointer",
        "min-w-[220px] sm:min-w-[260px]"
      )}
      onClick={onClick}
    >
      {/* Header: Symbol + Price */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
              {symbol}
            </span>
            {periodChange !== null && (
              <span className={cn(
                "flex items-center gap-0.5 text-sm font-semibold px-1.5 py-0.5 rounded",
                isPositive ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'
              )}>
                {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {isPositive ? '+' : ''}{periodChange.toFixed(2)}%
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground line-clamp-1">{name}</span>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg text-foreground">
            {formatPrice(price)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatMarketCap(marketCap)}
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1 mb-3">
        {PERIODS.map(({ label, value }) => (
          <button
            key={value}
            onClick={(e) => handlePeriodClick(e, value)}
            className={cn(
              "flex-1 text-[10px] font-medium py-1 rounded transition-all",
              selectedPeriod === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      
      {/* Sparkline Chart - Larger */}
      <div className="w-full h-16 mb-2">
        {isLoading ? (
          <div className="w-full h-full bg-muted/30 animate-pulse rounded" />
        ) : sparklineData.length > 0 ? (
          <MiniSparkline 
            data={sparklineData} 
            width={240} 
            height={64} 
            isPositive={isPositive}
            className="w-full"
          />
        ) : (
          <div className="w-full h-full bg-muted/20 rounded flex items-center justify-center text-xs text-muted-foreground">
            No data
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/50">
        <span>Market Cap</span>
        <span className="font-medium text-foreground">{formatMarketCap(marketCap)}</span>
      </div>
    </div>
  );
}
