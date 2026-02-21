/**
 * ETF Overview Tab - Shows ETF-specific metrics like holdings, expense ratio, AUM
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, PieChart, DollarSign, Percent, Activity, Layers, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IntegratedStockChart } from '@/components/research/IntegratedStockChart';
import { BacktestCTA } from './BacktestCTA';

interface ETFOverviewTabProps {
  ticker: string;
  companyName?: string;
  description?: string;
  quote?: {
    price: number;
    change: number;
    changePercent: number;
    open: number;
    high: number;
    low: number;
    previousClose?: number;
  } | null;
  etfData?: {
    expenseRatio?: number;
    aum?: number;
    holdings?: number;
    category?: string;
    inceptionDate?: string;
    issuer?: string;
    avgVolume?: number;
    beta?: number;
    dividendYield?: number;
    ytdReturn?: number;
    oneYearReturn?: number;
    threeYearReturn?: number;
    fiveYearReturn?: number;
    topHoldings?: Array<{
      symbol: string;
      name: string;
      weight: number;
    }>;
    sectorBreakdown?: Array<{
      sector: string;
      weight: number;
    }>;
  };
  isLoading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onNavigateToBacktest?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatAUM = (value: number | undefined) => {
  if (!value) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
};

const formatPercent = (value: number | undefined, decimals = 2) => {
  if (value === undefined || value === null) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

export function ETFOverviewTab({
  ticker,
  companyName,
  description,
  quote,
  etfData,
  isLoading = false,
  onRefresh,
  isRefreshing = false,
  onNavigateToBacktest,
}: ETFOverviewTabProps) {
  const isPositive = (quote?.change || 0) >= 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Main Grid: Chart + Stats Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Chart Column - 2/3 width */}
        <Card className="bg-card border-border lg:col-span-2">
          {/* Price Header */}
          <div className="px-3 pt-3 pb-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-semibold text-foreground truncate">
                {companyName || ticker}
              </h2>
              <Badge variant="secondary" className="text-[8px] px-1.5 py-0.5 h-4 bg-violet-500/20 text-violet-400 font-medium">
                ETF
              </Badge>
            </div>
            
            {/* Price and Change */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl md:text-3xl font-bold tabular-nums text-foreground">
                  {formatCurrency(quote?.price || 0)}
                </span>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold",
                  isPositive ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"
                )}>
                  {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  <span className="tabular-nums">
                    {isPositive ? '+' : ''}{(quote?.change || 0).toFixed(2)} ({isPositive ? '+' : ''}{(quote?.changePercent || 0).toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* OHLC */}
            <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="opacity-70">O:</span>
                <span className="font-medium tabular-nums text-foreground">{formatCurrency(quote?.open || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="opacity-70">H:</span>
                <span className="font-medium tabular-nums text-emerald-500">{formatCurrency(quote?.high || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="opacity-70">L:</span>
                <span className="font-medium tabular-nums text-destructive">{formatCurrency(quote?.low || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="opacity-70">Prev:</span>
                <span className="font-medium tabular-nums text-foreground">{quote?.previousClose ? formatCurrency(quote.previousClose) : '—'}</span>
              </div>
            </div>
            
            {/* Category */}
            {etfData?.category && (
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[8px] px-1.5 py-0.5 h-5 bg-secondary/50 font-medium">
                  {etfData.category}
                </Badge>
                {etfData.issuer && (
                  <Badge variant="outline" className="text-[8px] px-1.5 py-0.5 h-5 bg-secondary/50 font-medium">
                    {etfData.issuer}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {description && (
            <div className="px-3 pb-2">
              <p className="text-[9px] md:text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
            </div>
          )}

          {/* Chart */}
          <div className="w-full">
            <IntegratedStockChart 
              symbol={ticker} 
              height={320}
              defaultRange="3M"
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        </Card>

        {/* ETF Stats Column - 1/3 width */}
        <div className="space-y-2">
          {/* Key ETF Metrics Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Layers className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-xs font-semibold">ETF Overview</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <span className="text-[8px] text-muted-foreground uppercase block">AUM</span>
                  <span className="text-sm font-bold text-foreground">{formatAUM(etfData?.aum)}</span>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <span className="text-[8px] text-muted-foreground uppercase block">Expense Ratio</span>
                  <span className="text-sm font-bold text-foreground">
                    {etfData?.expenseRatio != null ? `${(etfData.expenseRatio * 100).toFixed(2)}%` : '—'}
                  </span>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <span className="text-[8px] text-muted-foreground uppercase block">Holdings</span>
                  <span className="text-sm font-bold text-foreground">{etfData?.holdings?.toLocaleString() || '—'}</span>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <span className="text-[8px] text-muted-foreground uppercase block">Div Yield</span>
                  <span className="text-sm font-bold text-foreground">
                    {etfData?.dividendYield != null ? `${etfData.dividendYield.toFixed(2)}%` : '—'}
                  </span>
                </div>
              </div>
              
              {/* Beta */}
              <div className="flex items-center justify-between py-1.5 border-t border-border">
                <span className="text-[10px] text-muted-foreground">Beta (vs SPY)</span>
                <span className="text-xs font-medium tabular-nums">{etfData?.beta?.toFixed(2) || '—'}</span>
              </div>
              
              {etfData?.inceptionDate && (
                <div className="flex items-center justify-between py-1.5 border-t border-border">
                  <span className="text-[10px] text-muted-foreground">Inception</span>
                  <span className="text-xs font-medium">{etfData.inceptionDate}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-semibold">Performance</span>
              </div>
              
              <div className="space-y-1.5">
                {[
                  { label: 'YTD', value: etfData?.ytdReturn },
                  { label: '1 Year', value: etfData?.oneYearReturn },
                  { label: '3 Year', value: etfData?.threeYearReturn },
                  { label: '5 Year', value: etfData?.fiveYearReturn },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                    <span className={cn(
                      "text-xs font-medium tabular-nums",
                      value !== undefined && value >= 0 ? "text-emerald-500" : "text-destructive"
                    )}>
                      {formatPercent(value)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Holdings Card */}
          {etfData?.topHoldings && etfData.topHoldings.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <PieChart className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-semibold">Top Holdings</span>
                </div>
                
                <div className="space-y-1.5">
                  {etfData.topHoldings.slice(0, 5).map((holding, i) => (
                    <div key={holding.symbol} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground w-3">{i + 1}.</span>
                        <span className="text-[10px] font-medium">{holding.symbol}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, holding.weight * 10)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
                          {holding.weight.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sector Breakdown Card */}
          {etfData?.sectorBreakdown && etfData.sectorBreakdown.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-semibold">Sector Breakdown</span>
                </div>
                
                <div className="space-y-1.5">
                  {etfData.sectorBreakdown.slice(0, 5).map((sector) => (
                    <div key={sector.sector} className="flex items-center justify-between py-1">
                      <span className="text-[10px] truncate max-w-[100px]">{sector.sector}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${Math.min(100, sector.weight * 2.5)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
                          {sector.weight.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Backtest CTA */}
      <BacktestCTA ticker={ticker} onNavigateToBacktest={onNavigateToBacktest} />
    </div>
  );
}
