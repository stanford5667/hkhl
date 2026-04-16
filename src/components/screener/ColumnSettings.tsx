import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Can't be hidden (e.g. symbol)
}

const STORAGE_KEY = 'screener-visible-columns';

// All possible column keys with their default visibility
const ALL_COLUMNS: ColumnConfig[] = [
  { key: 'symbol', label: 'Symbol', visible: true, locked: true },
  { key: 'name', label: 'Name', visible: true, locked: true },
  { key: 'price', label: 'Price', visible: true },
  { key: 'change', label: '% Change', visible: true },
  { key: 'marketCap', label: 'Market Cap', visible: true },
  { key: 'volume', label: 'Volume', visible: false },
  { key: 'pe', label: 'P/E Ratio', visible: false },
  { key: 'forwardPE', label: 'Forward P/E', visible: false },
  { key: 'peg', label: 'PEG', visible: false },
  { key: 'pb', label: 'P/B', visible: false },
  { key: 'evEbitda', label: 'EV/EBITDA', visible: false },
  { key: 'opMargin', label: 'Op Margin', visible: false },
  { key: 'epsGrowth', label: 'EPS Growth', visible: false },
  { key: 'revenueGrowth', label: 'Rev Growth', visible: false },
  { key: 'debtEquity', label: 'D/E Ratio', visible: false },
  { key: 'quickRatio', label: 'Quick Ratio', visible: false },
  { key: 'volatility', label: 'Volatility', visible: false },
  { key: 'beta', label: 'Beta', visible: false },
  { key: 'maxDrawdown', label: 'Max Drawdown', visible: false },
  { key: 'stdDev', label: 'Std Dev (20d)', visible: false },
];

function loadSavedColumns(): Set<string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved));
  } catch {}
  // Default: show locked + default visible columns
  return new Set(ALL_COLUMNS.filter(c => c.visible).map(c => c.key));
}

function saveColumns(visibleKeys: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visibleKeys]));
  } catch {}
}

interface ColumnSettingsProps {
  onChange: (visibleKeys: Set<string>) => void;
}

export function ColumnSettings({ onChange }: ColumnSettingsProps) {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(loadSavedColumns);

  useEffect(() => {
    onChange(visibleKeys);
  }, []);

  const toggle = (key: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveColumns(next);
      onChange(next);
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set(ALL_COLUMNS.map(c => c.key));
    setVisibleKeys(all);
    saveColumns(all);
    onChange(all);
  };

  const resetDefaults = () => {
    const defaults = new Set(ALL_COLUMNS.filter(c => c.visible).map(c => c.key));
    setVisibleKeys(defaults);
    saveColumns(defaults);
    onChange(defaults);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Show Columns</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={selectAll}>All</Button>
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={resetDefaults}>Reset</Button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {ALL_COLUMNS.map(col => (
              <div key={col.key} className="flex items-center gap-2">
                <Checkbox
                  id={`col-${col.key}`}
                  checked={visibleKeys.has(col.key)}
                  onCheckedChange={() => !col.locked && toggle(col.key)}
                  disabled={col.locked}
                  className="h-3.5 w-3.5"
                />
                <Label
                  htmlFor={`col-${col.key}`}
                  className="text-[11px] cursor-pointer text-foreground"
                >
                  {col.label}
                  {col.locked && <span className="text-muted-foreground ml-1">(fixed)</span>}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { ALL_COLUMNS, loadSavedColumns };
