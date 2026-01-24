/**
 * PerformanceMetricsSection - Compact metrics display for Overview tab
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity, 
  Shield, 
  Target,
  Gauge,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssetMetrics, AssetMetrics } from '@/hooks/useAssetMetrics';

interface PerformanceMetricsSectionProps {
  ticker: string;
}

type Period = '1Y' | '3Y' | '5Y' | 'MAX';

const PERIOD_OPTIONS = [
  { value: '1Y', label: '1 Year' },
  { value: '3Y', label: '3 Years' },
  { value: '5Y', label: '5 Years' },
  { value: 'MAX', label: 'Max' },
];

interface MetricBoxProps {
  label: string;
  value: string;
  subLabel?: string;
  variant?: 'primary' | 'blue' | 'purple' | 'amber' | 'default';
  trend?: 'good' | 'bad' | 'neutral';
}

function MetricBox({ label, value, subLabel, variant = 'default', trend }: MetricBoxProps) {
  const variantStyles = {
    primary: 'bg-primary/5 border-primary/20',
    blue: 'bg-blue-500/10 border-blue-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
    default: 'bg-secondary/50 border-border',
  };

  const trendStyles = {
    good: 'text-primary',
    bad: 'text-destructive',
    neutral: 'text-foreground',
  };

  return (
    <div className={cn(
      "rounded px-2 py-1.5 text-center border",
      variantStyles[variant]
    )}>
      <span className="text-[7px] text-muted-foreground block leading-tight uppercase">{label}</span>
      <p className={cn(
        "text-sm font-bold tabular-nums",
        trend ? trendStyles[trend] : 'text-foreground'
      )}>
        {value}
      </p>
      {subLabel && <span className="text-[7px] text-muted-foreground">{subLabel}</span>}
    </div>
  );
}

export function PerformanceMetricsSection({ ticker }: PerformanceMetricsSectionProps) {
  const [period, setPeriod] = useState<Period>('3Y');
  const { data: metrics, isLoading, isFetching } = useAssetMetrics(ticker, period);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const formatPercent = (val: number, includeSign = true) => {
    const sign = includeSign && val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  };

  const formatRatio = (val: number) => val.toFixed(2);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Performance Metrics</span>
            {isFetching && <RefreshCw className="h-2.5 w-2.5 animate-spin text-muted-foreground" />}
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-5 w-[70px] text-[8px] bg-secondary/50 border-border px-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-[10px]">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Primary Performance Row */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          <MetricBox
            label="Total Return"
            value={formatPercent(metrics.totalReturn)}
            subLabel={period}
            variant="primary"
            trend={metrics.totalReturn >= 0 ? 'good' : 'bad'}
          />
          <MetricBox
            label="CAGR"
            value={formatPercent(metrics.cagr)}
            subLabel="Annualized"
            variant="blue"
            trend={metrics.cagr >= 0 ? 'good' : 'bad'}
          />
          <MetricBox
            label="Sharpe"
            value={formatRatio(metrics.sharpeRatio)}
            subLabel="Risk-adj"
            variant="purple"
            trend={metrics.sharpeRatio >= 1 ? 'good' : metrics.sharpeRatio >= 0.5 ? 'neutral' : 'bad'}
          />
          <MetricBox
            label="Max DD"
            value={`-${metrics.maxDrawdown.toFixed(1)}%`}
            subLabel="Peak-trough"
            variant="amber"
            trend="bad"
          />
        </div>

        {/* Benchmark & Risk Row */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          <MetricBox
            label="Alpha"
            value={formatPercent(metrics.alpha)}
            trend={metrics.alpha > 0 ? 'good' : metrics.alpha < -2 ? 'bad' : 'neutral'}
          />
          <MetricBox
            label="Beta"
            value={formatRatio(metrics.beta)}
            trend={metrics.beta > 1.3 ? 'bad' : 'neutral'}
          />
          <MetricBox
            label="Sortino"
            value={formatRatio(metrics.sortinoRatio)}
            trend={metrics.sortinoRatio >= 1.5 ? 'good' : metrics.sortinoRatio >= 0.8 ? 'neutral' : 'bad'}
          />
          <MetricBox
            label="Volatility"
            value={`${metrics.volatility.toFixed(1)}%`}
            trend={metrics.volatility < 20 ? 'good' : metrics.volatility > 35 ? 'bad' : 'neutral'}
          />
        </div>

        {/* Tail Risk Row */}
        <div className="grid grid-cols-4 gap-1.5">
          <MetricBox
            label="VaR 95%"
            value={`-${metrics.var95.toFixed(2)}%`}
            trend="bad"
          />
          <MetricBox
            label="CVaR 95%"
            value={`-${metrics.cvar95.toFixed(2)}%`}
            trend="bad"
          />
          <MetricBox
            label="Best Month"
            value={formatPercent(metrics.bestMonth)}
            trend="good"
          />
          <MetricBox
            label="Worst Month"
            value={formatPercent(metrics.worstMonth, false)}
            trend="bad"
          />
        </div>
      </CardContent>
    </Card>
  );
}
