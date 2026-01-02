import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export const METRICS = [
  { id: 'cagr', label: 'CAGR' },
  { id: 'totalReturn', label: 'Total Return' },
  { id: 'sharpeRatio', label: 'Sharpe Ratio' },
  { id: 'sortinoRatio', label: 'Sortino Ratio' },
  { id: 'maxDrawdown', label: 'Max Drawdown' },
  { id: 'calmarRatio', label: 'Calmar Ratio' },
  { id: 'alpha', label: 'Alpha' },
  { id: 'beta', label: 'Beta' },
  { id: 'volatility', label: 'Std Dev' },
  { id: 'trackingError', label: 'Tracking Error' },
];

interface MetricsSelectorProps {
  selected: string[];
  onChange: (metrics: string[]) => void;
}

export function MetricsSelector({ selected, onChange }: MetricsSelectorProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((m) => m !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => onChange(METRICS.map((m) => m.id));
  const clearAll = () => onChange([]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <BarChart3 className="h-4 w-4 mr-2" />
          Metrics
          {selected.length > 0 && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-popover" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Select Metrics</h4>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-primary hover:underline">
                All
              </button>
              <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {METRICS.map((metric) => (
              <div key={metric.id} className="flex items-center gap-2">
                <Checkbox
                  id={`metric-${metric.id}`}
                  checked={selected.includes(metric.id)}
                  onCheckedChange={() => toggle(metric.id)}
                />
                <Label htmlFor={`metric-${metric.id}`} className="text-sm cursor-pointer">
                  {metric.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
