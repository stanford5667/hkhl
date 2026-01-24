import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ALAStockInfoCardProps {
  ticker: string;
  companyName?: string;
  exchange?: string;
  sector?: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose?: number;
  marketCap?: number;
  volume?: number;
  beta?: number;
  peRatio?: number;
  forwardPE?: number;
  eps?: number;
  dividend?: number;
  analystRating?: 'Buy' | 'Hold' | 'Sell' | 'Strong Buy';
  priceTarget?: number;
  nextEarnings?: string;
  week52High?: number;
  week52Low?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ALAStockInfoCard({
  ticker,
  companyName,
  exchange,
  sector,
  price,
  change,
  changePercent,
  open,
  high,
  low,
  previousClose,
  marketCap,
  volume,
  beta = 1.0,
  peRatio,
  forwardPE,
  eps,
  dividend,
  analystRating = 'Buy',
  priceTarget,
  nextEarnings,
  week52High,
  week52Low,
  isLoading = false,
  onRefresh,
  isRefreshing = false,
}: ALAStockInfoCardProps) {
  const isPositive = change >= 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatMarketCap = (value: number | undefined) => {
    if (!value) return '—';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatVolume = (value: number | undefined) => {
    if (!value) return '—';
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  // Calculate 52-week range position
  const rangePosition = week52High && week52Low && price
    ? ((price - week52Low) / (week52High - week52Low)) * 100
    : 50;

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-40" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const ratingColors = {
    'Strong Buy': 'bg-emerald-500/20 text-emerald-400',
    'Buy': 'bg-emerald-500/20 text-emerald-400',
    'Hold': 'bg-amber-500/20 text-amber-400',
    'Sell': 'bg-rose-500/20 text-rose-400',
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3 md:p-5 space-y-3 md:space-y-5">
        {/* Company Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm md:text-lg font-semibold text-foreground line-clamp-1">{companyName || ticker}</h2>
            <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
              {exchange && (
                <Badge variant="secondary" className="text-[10px] md:text-xs font-normal px-1.5 py-0">
                  {exchange}
                </Badge>
              )}
              {sector && (
                <Badge variant="outline" className="text-[10px] md:text-xs font-normal px-1.5 py-0 hidden sm:inline-flex">
                  {sector}
                </Badge>
              )}
            </div>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-7 w-7 md:h-8 md:w-8"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 md:h-4 md:w-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
        </div>

        {/* Current Price */}
        <div>
          <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Current Price</p>
          <div className="flex items-baseline gap-2 md:gap-3">
            <span className="text-2xl md:text-3xl font-bold tabular-nums text-foreground">
              {formatCurrency(price)}
            </span>
            <span className={cn(
              "flex items-center gap-0.5 md:gap-1 text-xs md:text-sm font-medium",
              isPositive ? "text-emerald-400" : "text-rose-400"
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3 md:h-4 md:w-4" /> : <TrendingDown className="h-3 w-3 md:h-4 md:w-4" />}
              <span className="tabular-nums">
                {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
              </span>
            </span>
          </div>
        </div>

        {/* OHLC Grid */}
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          <div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">OPEN</p>
            <p className="text-xs md:text-sm font-semibold tabular-nums">{formatCurrency(open)}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">HIGH</p>
            <p className="text-xs md:text-sm font-semibold tabular-nums text-emerald-400">{formatCurrency(high)}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">LOW</p>
            <p className="text-xs md:text-sm font-semibold tabular-nums text-rose-400">{formatCurrency(low)}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">PREV</p>
            <p className="text-xs md:text-sm font-semibold tabular-nums">{previousClose ? formatCurrency(previousClose) : '—'}</p>
          </div>
        </div>

        {/* 52-Week Range */}
        <div className="space-y-1 md:space-y-2">
          <p className="text-[10px] md:text-xs text-muted-foreground">52 Week Range</p>
          <div className="relative h-1.5 md:h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full"
              style={{ width: '100%' }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 md:w-2.5 md:h-2.5 bg-white rounded-full border-2 border-primary shadow-md"
              style={{ left: `calc(${Math.min(100, Math.max(0, rangePosition))}% - 4px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
            <span>{week52Low ? formatCurrency(week52Low) : '—'}</span>
            <span>{week52High ? formatCurrency(week52High) : '—'}</span>
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 pt-2 border-t border-border">
          <div className="p-1.5 md:p-2 bg-secondary/30 rounded-md">
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">Mkt Cap</p>
            <p className="text-xs md:text-sm font-semibold">{formatMarketCap(marketCap)}</p>
          </div>
          <div className="p-1.5 md:p-2 bg-secondary/30 rounded-md">
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">Volume</p>
            <p className="text-xs md:text-sm font-semibold">{formatVolume(volume)}</p>
          </div>
          <div className="p-1.5 md:p-2 bg-secondary/30 rounded-md">
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">Beta</p>
            <p className="text-xs md:text-sm font-semibold">{beta?.toFixed(2) || '—'}</p>
          </div>
        </div>

        {/* Financial Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 md:gap-3 pt-2 border-t border-border">
          <div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">P/E</p>
            <p className="text-xs md:text-sm font-semibold">{peRatio?.toFixed(1) || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">Fwd P/E</p>
            <p className="text-xs md:text-sm font-semibold">{forwardPE?.toFixed(1) || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">EPS</p>
            <p className="text-xs md:text-sm font-semibold">{eps ? `$${eps.toFixed(2)}` : '—'}</p>
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">Div</p>
            <p className="text-xs md:text-sm font-semibold">{dividend ? `${dividend.toFixed(1)}%` : '—'}</p>
          </div>
        </div>

        {/* Analyst & Earnings Row */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 pt-2 border-t border-border">
          <div className="flex flex-col">
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">Rating</p>
            <Badge className={cn("w-fit mt-0.5 text-[10px] md:text-xs px-1.5 py-0", ratingColors[analystRating])}>
              {analystRating}
            </Badge>
          </div>
          <div className="flex flex-col">
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">Target</p>
            {priceTarget ? (
              <>
                <p className="text-xs md:text-sm font-semibold">{formatCurrency(priceTarget)}</p>
                <p className={cn(
                  "text-[9px] md:text-[10px]",
                  priceTarget > price ? "text-emerald-400" : "text-rose-400"
                )}>
                  ({priceTarget > price ? '+' : ''}{(((priceTarget - price) / price) * 100).toFixed(0)}%)
                </p>
              </>
            ) : <p className="text-xs font-semibold">—</p>}
          </div>
          <div className="flex flex-col">
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">Earnings</p>
            <p className="text-xs md:text-sm font-semibold">{nextEarnings || '—'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
