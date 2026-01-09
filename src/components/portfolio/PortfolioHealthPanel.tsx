// Portfolio Health Panel - Market Intel-style overview and health display
// Integrates health matrix, stats display, and allocation overview

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Target, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Percent,
  Shield,
  BarChart3,
  Gauge,
  LineChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AllocationItem {
  symbol: string;
  weight: number;
  name?: string;
}

interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
}

interface PortfolioMetricsData {
  cagr: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  sortinoRatio?: number;
  beta?: number;
  alpha?: number;
}

interface PortfolioHealthPanelProps {
  allocations: AllocationItem[];
  investableCapital: number;
  liveQuotes: Map<string, QuoteData>;
  metrics?: PortfolioMetricsData | null;
  className?: string;
  // Backtest-derived values (use these instead of calculating from scratch)
  backtestPortfolioValue?: number;
  backtestTodayChange?: number;
  backtestTodayChangePercent?: number;
  investmentHorizon?: number;
}

// Stat Card Component (matching Market Intel style)
function StatCard({ 
  label, 
  value, 
  change, 
  subtitle, 
  icon, 
  color = 'text-primary',
  onClick,
}: { 
  label: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className={cn(
        "bg-gradient-to-br from-card to-secondary/20 cursor-pointer hover:bg-secondary/30 transition-colors",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={color}>{icon}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
        {change !== undefined && (
          <p className={cn(
            "text-xs flex items-center gap-1",
            change >= 0 ? 'text-emerald-400' : 'text-rose-400'
          )}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(2)}%
          </p>
        )}
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// Health Score Card - individual holding
function HoldingHealthCard({
  symbol,
  name,
  weight,
  price,
  changePercent,
  investableCapital,
}: {
  symbol: string;
  name?: string;
  weight: number;
  price?: number;
  changePercent?: number;
  investableCapital: number;
}) {
  // Calculate health score based on performance and volatility
  const healthScore = useMemo(() => {
    if (changePercent === undefined) return 50;
    // Simple health calculation - can be enhanced with more factors
    const baseScore = 50 + changePercent * 2;
    return Math.max(0, Math.min(100, baseScore));
  }, [changePercent]);

  const colorClass = healthScore >= 70 ? 'border-emerald-500/50' : healthScore >= 50 ? 'border-amber-500/50' : 'border-rose-500/50';
  const textClass = healthScore >= 70 ? 'text-emerald-400' : healthScore >= 50 ? 'text-amber-400' : 'text-rose-400';

  const value = (weight / 100) * investableCapital;

  return (
    <Card className={cn("bg-card p-4 border", colorClass)}>
      <div className="flex justify-between mb-3">
        <div>
          <span className="font-medium text-sm">{symbol}</span>
          {name && <p className="text-xs text-muted-foreground truncate max-w-[120px]">{name}</p>}
        </div>
        <span className={cn("text-2xl font-bold", textClass)}>{Math.round(healthScore)}</span>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Weight</span>
          <span>{weight.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Value</span>
          <span>${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        {price !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price</span>
            <span>${price.toFixed(2)}</span>
          </div>
        )}
        {changePercent !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Today</span>
            <span className={changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function PortfolioHealthPanel({
  allocations,
  investableCapital,
  liveQuotes,
  metrics,
  className,
  backtestPortfolioValue,
  backtestTodayChange,
  backtestTodayChangePercent,
  investmentHorizon = 5,
}: PortfolioHealthPanelProps) {
  // Calculate portfolio stats - use backtest values when available
  const stats = useMemo(() => {
    let totalValue = backtestPortfolioValue || 0;
    let todayChange = 0;
    let todayChangePercent = 0;
    let gainersCount = 0;
    let losersCount = 0;
    let atRiskCount = 0;

    // If we have backtest values, use them for portfolio-level stats
    if (backtestPortfolioValue) {
      // Calculate today's change based on weighted average of quote percentages
      let weightedChangePercent = 0;
      let totalWeight = 0;
      
      allocations.forEach(alloc => {
        const quote = liveQuotes.get(alloc.symbol.toUpperCase());
        const weight = alloc.weight > 1 ? alloc.weight / 100 : alloc.weight;
        
        if (quote) {
          weightedChangePercent += weight * quote.changePercent;
          totalWeight += weight;
          
          if (quote.changePercent > 0) gainersCount++;
          else if (quote.changePercent < 0) losersCount++;
          if (quote.changePercent < -3) atRiskCount++;
        }
      });
      
      todayChangePercent = backtestTodayChangePercent ?? (totalWeight > 0 ? weightedChangePercent / totalWeight : 0);
      // Calculate dollar change based on backtest portfolio value
      todayChange = backtestTodayChange ?? (backtestPortfolioValue * todayChangePercent / 100);
    } else {
      // Fallback: calculate from scratch using investableCapital
      allocations.forEach(alloc => {
        const quote = liveQuotes.get(alloc.symbol.toUpperCase());
        const weight = alloc.weight > 1 ? alloc.weight / 100 : alloc.weight;
        const value = weight * investableCapital;
        
        totalValue += value;
        
        if (quote) {
          const dayChange = (quote.changePercent / 100) * value;
          todayChange += dayChange;
          
          if (quote.changePercent > 0) gainersCount++;
          else if (quote.changePercent < 0) losersCount++;
          if (quote.changePercent < -3) atRiskCount++;
        }
      });
      
      todayChangePercent = totalValue > 0 ? (todayChange / totalValue) * 100 : 0;
    }

    return {
      totalValue,
      todayChange,
      todayChangePercent,
      gainersCount,
      losersCount,
      atRiskCount,
      holdingsCount: allocations.length,
    };
  }, [allocations, investableCapital, liveQuotes, backtestPortfolioValue, backtestTodayChange, backtestTodayChangePercent]);

  // Calculate overall portfolio health
  const overallHealth = useMemo(() => {
    if (!metrics) return { score: 50, label: 'Unknown', color: 'text-muted-foreground' };
    
    let score = 50;
    
    // Add points for good Sharpe
    if (metrics.sharpeRatio >= 1) score += 15;
    else if (metrics.sharpeRatio >= 0.5) score += 10;
    else if (metrics.sharpeRatio >= 0) score += 5;
    else score -= 10;
    
    // Subtract for high volatility
    if (metrics.volatility < 15) score += 10;
    else if (metrics.volatility < 25) score += 5;
    else score -= 10;
    
    // Subtract for high drawdown
    if (Math.abs(metrics.maxDrawdown) < 10) score += 10;
    else if (Math.abs(metrics.maxDrawdown) < 20) score += 5;
    else score -= 10;
    
    // Add for positive returns
    if (metrics.cagr > 10) score += 15;
    else if (metrics.cagr > 5) score += 10;
    else if (metrics.cagr > 0) score += 5;
    else score -= 10;

    score = Math.max(0, Math.min(100, score));
    
    const label = score >= 70 ? 'Strong' : score >= 50 ? 'Monitor' : 'At Risk';
    const color = score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400';
    
    return { score, label, color };
  }, [metrics]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (allocations.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Quick Stats Row - Market Intel Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Portfolio Value"
          value={formatCurrency(stats.totalValue)}
          change={stats.todayChangePercent}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Today's P&L"
          value={formatCurrency(stats.todayChange)}
          change={stats.todayChangePercent}
          icon={stats.todayChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          color={stats.todayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        />
        <StatCard
          label="Sharpe Ratio"
          value={metrics?.sharpeRatio?.toFixed(2) || '--'}
          subtitle={metrics?.sharpeRatio && metrics.sharpeRatio >= 1 ? 'Excellent' : metrics?.sharpeRatio && metrics.sharpeRatio >= 0.5 ? 'Good' : 'Needs work'}
          icon={<Gauge className="h-4 w-4" />}
          color={metrics?.sharpeRatio && metrics.sharpeRatio >= 1 ? 'text-emerald-400' : metrics?.sharpeRatio && metrics.sharpeRatio >= 0.5 ? 'text-amber-400' : 'text-rose-400'}
        />
        <StatCard
          label="Volatility"
          value={metrics?.volatility ? `${metrics.volatility.toFixed(1)}%` : '--'}
          subtitle={metrics?.volatility && metrics.volatility < 15 ? 'Low' : metrics?.volatility && metrics.volatility < 25 ? 'Moderate' : 'High'}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Max Drawdown"
          value={metrics?.maxDrawdown ? `${metrics.maxDrawdown.toFixed(1)}%` : '--'}
          icon={<TrendingDown className="h-4 w-4" />}
          color="text-rose-400"
        />
        <StatCard
          label="Portfolio Health"
          value={`${overallHealth.score}`}
          subtitle={overallHealth.label}
          icon={<Shield className="h-4 w-4" />}
          color={overallHealth.color}
        />
      </div>

      {/* Health Matrix */}
      <Card className="bg-secondary/50 border-border">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Portfolio Health Matrix
            </CardTitle>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-emerald-500" />
                Strong
              </span>
              <span className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-amber-500" />
                Monitor
              </span>
              <span className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-rose-500" />
                At Risk
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allocations.map((alloc) => {
              const quote = liveQuotes.get(alloc.symbol.toUpperCase());
              return (
                <HoldingHealthCard
                  key={alloc.symbol}
                  symbol={alloc.symbol}
                  name={alloc.name}
                  weight={alloc.weight > 1 ? alloc.weight : alloc.weight * 100}
                  price={quote?.price}
                  changePercent={quote?.changePercent}
                  investableCapital={investableCapital}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Risk Signals */}
      {stats.atRiskCount > 0 && (
        <Card className="bg-rose-900/20 border border-rose-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <div>
              <p className="font-medium text-rose-400">
                {stats.atRiskCount} holding{stats.atRiskCount > 1 ? 's' : ''} down more than 3% today
              </p>
              <p className="text-sm text-muted-foreground">
                Consider reviewing your positions for potential action
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gainers vs Losers */}
        <Card className="bg-secondary/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Today's Movers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-emerald-400">Gainers</span>
                  <span className="font-bold text-emerald-400">{stats.gainersCount}</span>
                </div>
                <Progress 
                  value={(stats.gainersCount / Math.max(stats.holdingsCount, 1)) * 100} 
                  className="h-2 bg-muted" 
                />
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-rose-400">Losers</span>
                  <span className="font-bold text-rose-400">{stats.losersCount}</span>
                </div>
                <Progress 
                  value={(stats.losersCount / Math.max(stats.holdingsCount, 1)) * 100} 
                  className="h-2 bg-muted [&>div]:bg-rose-500" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Metrics Summary */}
        {metrics && (
          <Card className="bg-secondary/50 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <LineChart className="h-4 w-4 text-primary" />
                Key Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CAGR</span>
                  <span className={cn("font-medium", metrics.cagr >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {metrics.cagr >= 0 ? '+' : ''}{metrics.cagr.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sharpe</span>
                  <span className="font-medium">{metrics.sharpeRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Volatility</span>
                  <span className="font-medium">{metrics.volatility.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max DD</span>
                  <span className="font-medium text-rose-400">{metrics.maxDrawdown.toFixed(1)}%</span>
                </div>
                {metrics.sortinoRatio !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sortino</span>
                    <span className="font-medium">{metrics.sortinoRatio.toFixed(2)}</span>
                  </div>
                )}
                {metrics.beta !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Beta</span>
                    <span className="font-medium">{metrics.beta.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
