import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComprehensiveFundamentals } from '@/hooks/useComprehensiveFundamentals';

interface RiskPerformanceCardProps {
  data: ComprehensiveFundamentals;
  isLoading?: boolean;
}

const RETURN_PERIODS = [
  { key: 'day1', label: '1D' },
  { key: 'week1', label: '1W' },
  { key: 'month1', label: '1M' },
  { key: 'month3', label: '3M' },
  { key: 'month6', label: '6M' },
  { key: 'year1', label: '1Y' },
  { key: 'year3', label: '3Y' },
  { key: 'year5', label: '5Y' },
] as const;

function MetricCell({ 
  label, 
  value, 
  suffix = '', 
  isPositive,
}: { 
  label: string; 
  value: number | null; 
  suffix?: string;
  isPositive?: boolean;
}) {
  const displayValue = value === null || value === undefined 
    ? '—' 
    : `${value.toFixed(value < 10 && value > -10 ? 2 : 1)}${suffix}`;
  
  return (
    <div className="p-1.5 bg-secondary/30 rounded text-center">
      <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">{label}</p>
      <p className={cn(
        "text-[10px] md:text-xs font-bold tabular-nums",
        isPositive === true && "text-emerald-500",
        isPositive === false && "text-destructive"
      )}>
        {displayValue}
      </p>
    </div>
  );
}

function formatVolume(value: number | null): string {
  if (!value) return '—';
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
}

export function RiskPerformanceCard({ data, isLoading }: RiskPerformanceCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<typeof RETURN_PERIODS[number]['key']>('year1');

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-2 space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-2 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-primary" />
          <span className="text-[10px] md:text-xs font-medium">Risk & Performance</span>
        </div>
        
        {/* Risk Metrics Row */}
        <div className="grid grid-cols-4 gap-1.5">
          <MetricCell 
            label="Volatility" 
            value={data.volatility} 
            suffix="%"
          />
          <MetricCell 
            label="Max DD" 
            value={data.maxDrawdown ? -data.maxDrawdown : null} 
            suffix="%"
            isPositive={false}
          />
          <MetricCell 
            label="Sharpe" 
            value={data.sharpeRatio}
            isPositive={data.sharpeRatio ? data.sharpeRatio > 1 : undefined}
          />
          <MetricCell 
            label="Sortino" 
            value={data.sortinoRatio}
            isPositive={data.sortinoRatio ? data.sortinoRatio > 1.5 : undefined}
          />
        </div>
        
        {/* Additional Metrics */}
        <div className="grid grid-cols-3 gap-1.5">
          <MetricCell 
            label="EPS StdDev" 
            value={data.epsStdDev} 
            suffix=""
          />
          <MetricCell 
            label="Avg Vol" 
            value={null}
            suffix=""
          />
          <div className="p-1.5 bg-secondary/30 rounded text-center">
            <p className="text-[7px] md:text-[8px] text-muted-foreground uppercase">Avg Vol</p>
            <p className="text-[10px] md:text-xs font-bold tabular-nums">
              {formatVolume(data.avgVolume20D)}
            </p>
          </div>
        </div>
        
        {/* Period Returns */}
        <div className="space-y-1">
          <p className="text-[8px] text-muted-foreground uppercase font-medium">Returns</p>
          <div className="flex flex-wrap gap-1">
            {RETURN_PERIODS.map((period) => {
              const value = data.returns[period.key];
              const isPositive = value !== null && value > 0;
              const isNegative = value !== null && value < 0;
              
              return (
                <button
                  key={period.key}
                  onClick={() => setSelectedPeriod(period.key)}
                  className={cn(
                    "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors",
                    selectedPeriod === period.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 hover:bg-secondary"
                  )}
                >
                  <span>{period.label}</span>
                  {value !== null && (
                    <span className={cn(
                      "tabular-nums",
                      selectedPeriod !== period.key && isPositive && "text-emerald-500",
                      selectedPeriod !== period.key && isNegative && "text-destructive"
                    )}>
                      {isPositive ? '+' : ''}{value.toFixed(1)}%
                    </span>
                  )}
                  {value === null && <span className="text-muted-foreground">—</span>}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
