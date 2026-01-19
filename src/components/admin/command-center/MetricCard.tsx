import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Minus } from 'lucide-react';
import { MetricWithTrend } from '@/hooks/useCommandCenterMetrics';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  metric: MetricWithTrend;
  icon: React.ReactNode;
  format?: 'number' | 'percent' | 'ms';
  invertTrend?: boolean; // For metrics where lower is better (e.g., error rate, response time)
}

export function MetricCard({ title, metric, icon, format = 'number', invertTrend = false }: MetricCardProps) {
  const formatValue = (value: number) => {
    switch (format) {
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'ms':
        return `${Math.round(value)}ms`;
      default:
        return value.toLocaleString();
    }
  };

  const isPositive = invertTrend ? !metric.isPositive : metric.isPositive;
  const percentChange = Math.abs(metric.percentChange);
  const showTrend = metric.previousValue > 0 || metric.percentChange !== 0;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-md",
      metric.isAnomaly && "ring-2 ring-amber-500/50"
    )}>
      {metric.isAnomaly && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Anomaly
          </Badge>
        </div>
      )}
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-bold mt-1">{formatValue(metric.value)}</p>
            
            {showTrend && (
              <div className="flex items-center gap-2 mt-2">
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}>
                  {percentChange === 0 ? (
                    <Minus className="h-4 w-4" />
                  ) : isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{percentChange.toFixed(1)}%</span>
                </div>
                <span className="text-xs text-muted-foreground">vs last week</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
