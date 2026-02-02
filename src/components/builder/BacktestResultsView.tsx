/**
 * Backtest Results View
 * 
 * Compact results display for embedded strategy builder.
 * Shows key metrics, allows going back to edit, and re-running.
 */

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Target,
  Percent,
  BarChart3,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BacktestParams {
  strategy: string;
  ticker: string;
  params: Record<string, number | string | undefined>;
}

interface BacktestMetrics {
  totalReturn?: number;
  winRate?: number;
  totalTrades?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  avgWin?: number;
  avgLoss?: number;
  profitFactor?: number;
  avgHoldingDays?: number;
}

interface BacktestResultsViewProps {
  params: BacktestParams;
  metrics: BacktestMetrics;
  isLoading?: boolean;
  onBack: () => void;
  onRerun: () => void;
  className?: string;
}

function MetricCard({ 
  label, 
  value, 
  subValue,
  icon: Icon,
  variant = 'default',
}: {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ElementType;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-emerald-400',
    danger: 'text-red-400',
    warning: 'text-amber-400',
  };

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className={cn("text-lg font-mono font-bold", variantStyles[variant])}>
        {value}
      </div>
      {subValue && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{subValue}</div>
      )}
    </div>
  );
}

export function BacktestResultsView({
  params,
  metrics,
  isLoading = false,
  onBack,
  onRerun,
  className,
}: BacktestResultsViewProps) {
  const totalReturn = metrics.totalReturn ?? 0;
  const winRate = metrics.winRate ?? 0;
  const totalTrades = metrics.totalTrades ?? 0;
  const sharpe = metrics.sharpeRatio ?? 0;
  const maxDD = metrics.maxDrawdown ?? 0;
  const avgWin = metrics.avgWin ?? 0;
  const avgLoss = metrics.avgLoss ?? 0;
  const profitFactor = metrics.profitFactor ?? 0;
  const avgHoldingDays = metrics.avgHoldingDays ?? 0;

  // Format strategy name
  const strategyName = params.strategy
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  // Format params for display
  const paramEntries = Object.entries(params.params).filter(([_, v]) => v !== undefined);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with back button */}
      <div className="flex-shrink-0 p-3 border-b border-border bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Edit Strategy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRerun}
            disabled={isLoading}
            className="h-8"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Re-run
          </Button>
        </div>

        {/* Strategy summary */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-1 text-xs font-mono font-bold bg-primary/10 text-primary rounded">
            {params.ticker}
          </span>
          <span className="text-sm font-medium">{strategyName}</span>
          {paramEntries.slice(0, 3).map(([key, val]) => (
            <span 
              key={key}
              className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded text-muted-foreground"
            >
              {key.replace(/([A-Z])/g, ' $1').trim()}: {val}
            </span>
          ))}
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Primary metrics */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Performance
            </p>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="Total Return"
                value={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%`}
                icon={totalReturn >= 0 ? TrendingUp : TrendingDown}
                variant={totalReturn >= 0 ? 'success' : 'danger'}
              />
              <MetricCard
                label="Win Rate"
                value={`${winRate.toFixed(1)}%`}
                icon={Target}
                variant={winRate >= 50 ? 'success' : winRate >= 40 ? 'warning' : 'danger'}
              />
            </div>
          </div>

          {/* Secondary metrics */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Risk Metrics
            </p>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="Sharpe Ratio"
                value={sharpe.toFixed(2)}
                icon={BarChart3}
                variant={sharpe >= 1 ? 'success' : sharpe >= 0.5 ? 'warning' : 'danger'}
              />
              <MetricCard
                label="Max Drawdown"
                value={`-${maxDD.toFixed(1)}%`}
                icon={Percent}
                variant={maxDD <= 10 ? 'success' : maxDD <= 20 ? 'warning' : 'danger'}
              />
            </div>
          </div>

          {/* Trade stats */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Trade Statistics
            </p>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="Total Trades"
                value={totalTrades.toString()}
                subValue={`${avgHoldingDays.toFixed(1)} avg days held`}
                icon={Clock}
              />
              <MetricCard
                label="Profit Factor"
                value={profitFactor.toFixed(2)}
                subValue={`W: ${avgWin.toFixed(1)}% / L: ${avgLoss.toFixed(1)}%`}
                variant={profitFactor >= 1.5 ? 'success' : profitFactor >= 1 ? 'warning' : 'danger'}
              />
            </div>
          </div>

          {/* Quick actions */}
          <div className="pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onBack}
            >
              Adjust Parameters & Test Again
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
