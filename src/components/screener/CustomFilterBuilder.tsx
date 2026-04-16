import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type CustomFilterOperator = '<' | '>' | '<=' | '>=' | '=' | 'between';
export type CustomFilterMetric = 'peg' | 'drawdown' | 'stdDev';

export interface CustomFilterEntry {
  id: string;
  metric: CustomFilterMetric;
  operator: CustomFilterOperator;
  value: number;
  value2?: number;
}

export interface CustomFiltersPayload {
  [key: string]: {
    operator: CustomFilterOperator;
    value: number;
    value2?: number;
  };
}

const METRIC_OPTIONS: { value: CustomFilterMetric; label: string; placeholder: string }[] = [
  { value: 'peg', label: 'PEG Ratio', placeholder: 'e.g. 1.5' },
  { value: 'drawdown', label: 'Max Drawdown 1Y', placeholder: 'e.g. -0.20' },
  { value: 'stdDev', label: 'Std Dev (20d)', placeholder: 'e.g. 0.05' },
];

const OPERATOR_OPTIONS: { value: CustomFilterOperator; label: string }[] = [
  { value: '<', label: '<' },
  { value: '>', label: '>' },
  { value: '<=', label: '≤' },
  { value: '>=', label: '≥' },
  { value: '=', label: '=' },
  { value: 'between', label: 'Between' },
];

interface CustomFilterBuilderProps {
  onChange: (filters: CustomFiltersPayload) => void;
}

let nextId = 0;

export function CustomFilterBuilder({ onChange }: CustomFilterBuilderProps) {
  const [entries, setEntries] = useState<CustomFilterEntry[]>([]);

  const emitChange = useCallback((updated: CustomFilterEntry[]) => {
    const payload: CustomFiltersPayload = {};
    for (const e of updated) {
      if (e.value !== undefined && !isNaN(e.value)) {
        payload[e.metric] = {
          operator: e.operator,
          value: e.value,
          ...(e.operator === 'between' && e.value2 !== undefined ? { value2: e.value2 } : {}),
        };
      }
    }
    onChange(payload);
  }, [onChange]);

  const addFilter = () => {
    const usedMetrics = new Set(entries.map(e => e.metric));
    const available = METRIC_OPTIONS.find(m => !usedMetrics.has(m.value));
    if (!available) return;

    const newEntries = [
      ...entries,
      { id: `cf-${nextId++}`, metric: available.value, operator: '<' as CustomFilterOperator, value: 0 },
    ];
    setEntries(newEntries);
    emitChange(newEntries);
  };

  const removeFilter = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    emitChange(updated);
  };

  const updateEntry = (id: string, patch: Partial<CustomFilterEntry>) => {
    const updated = entries.map(e => (e.id === id ? { ...e, ...patch } : e));
    setEntries(updated);
    emitChange(updated);
  };

  return (
    <div className="space-y-2" data-testid="custom-filter-builder">
      {entries.map((entry) => {
        const metricMeta = METRIC_OPTIONS.find(m => m.value === entry.metric);
        return (
          <div key={entry.id} className="flex items-center gap-2 flex-wrap" data-testid="custom-filter-row">
            {/* Metric */}
            <Select
              value={entry.metric}
              onValueChange={(v) => updateEntry(entry.id, { metric: v as CustomFilterMetric })}
            >
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator */}
            <Select
              value={entry.operator}
              onValueChange={(v) => updateEntry(entry.id, { operator: v as CustomFilterOperator })}
            >
              <SelectTrigger className="h-8 text-xs w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATOR_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value */}
            <Input
              type="number"
              step="any"
              placeholder={metricMeta?.placeholder}
              value={entry.value}
              onChange={(e) => updateEntry(entry.id, { value: parseFloat(e.target.value) || 0 })}
              className="h-8 text-xs w-[90px]"
              data-testid="custom-filter-value"
            />

            {entry.operator === 'between' && (
              <>
                <span className="text-xs text-muted-foreground">and</span>
                <Input
                  type="number"
                  step="any"
                  placeholder="Max"
                  value={entry.value2 ?? ''}
                  onChange={(e) => updateEntry(entry.id, { value2: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs w-[90px]"
                  data-testid="custom-filter-value2"
                />
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => removeFilter(entry.id)}
              data-testid="custom-filter-remove"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}

      {entries.length < METRIC_OPTIONS.length && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={addFilter}
          data-testid="add-custom-filter"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Custom Filter
        </Button>
      )}
    </div>
  );
}
