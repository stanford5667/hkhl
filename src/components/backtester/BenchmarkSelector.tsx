import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export const BENCHMARK_INDICES = [
  { id: 'spy', label: 'S&P 500 (SPY)' },
  { id: 'qqq', label: 'NASDAQ (QQQ)' },
  { id: 'iwm', label: 'Russell 2000' },
  { id: 'vti', label: 'VTI' },
];

export const BENCHMARK_HEDGE_FUNDS = [
  { id: 'brk', label: 'Berkshire Hathaway' },
  { id: 'bridgewater', label: 'Bridgewater Associates' },
  { id: 'renaissance', label: 'Renaissance Technologies' },
  { id: 'citadel', label: 'Citadel Advisors' },
  { id: 'twoSigma', label: 'Two Sigma' },
  { id: 'millennium', label: 'Millennium' },
  { id: 'aqr', label: 'AQR Capital' },
  { id: 'deshaw', label: 'D.E. Shaw' },
];

interface BenchmarkSelectorProps {
  selected: string[];
  onChange: (benchmarks: string[]) => void;
}

export function BenchmarkSelector({ selected, onChange }: BenchmarkSelectorProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((b) => b !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAllIndices = () => {
    const indicesIds = BENCHMARK_INDICES.map((b) => b.id);
    const newSelected = [...new Set([...selected, ...indicesIds])];
    onChange(newSelected);
  };

  const selectAllHedgeFunds = () => {
    const hedgeFundIds = BENCHMARK_HEDGE_FUNDS.map((b) => b.id);
    const newSelected = [...new Set([...selected, ...hedgeFundIds])];
    onChange(newSelected);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <TrendingUp className="h-4 w-4 mr-2" />
          Benchmarks
          {selected.length > 0 && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-popover" align="end">
        <div className="space-y-4">
          {/* Indices Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Indices
              </h4>
              <button onClick={selectAllIndices} className="text-xs text-primary hover:underline">
                Select all
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {BENCHMARK_INDICES.map((benchmark) => (
                <div key={benchmark.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`bench-${benchmark.id}`}
                    checked={selected.includes(benchmark.id)}
                    onCheckedChange={() => toggle(benchmark.id)}
                  />
                  <Label htmlFor={`bench-${benchmark.id}`} className="text-sm cursor-pointer">
                    {benchmark.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t" />

          {/* Hedge Funds Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Hedge Funds
              </h4>
              <button onClick={selectAllHedgeFunds} className="text-xs text-primary hover:underline">
                Select all
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {BENCHMARK_HEDGE_FUNDS.map((benchmark) => (
                <div key={benchmark.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`bench-${benchmark.id}`}
                    checked={selected.includes(benchmark.id)}
                    onCheckedChange={() => toggle(benchmark.id)}
                  />
                  <Label htmlFor={`bench-${benchmark.id}`} className="text-sm cursor-pointer">
                    {benchmark.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
