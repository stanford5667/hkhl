// src/components/earnings/EarningsFilters.tsx

import { Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { EarningsCalendarFilters } from '@/types/earnings';

interface Props {
  filters: EarningsCalendarFilters;
  onFiltersChange: (filters: EarningsCalendarFilters) => void;
}

export const EarningsFilters = ({ filters, onFiltersChange }: Props) => {
  const updateFilter = <K extends keyof EarningsCalendarFilters>(
    key: K,
    value: EarningsCalendarFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-xs">Time Period</Label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => updateFilter('dateRange', value as EarningsCalendarFilters['dateRange'])}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Next 7 Days</SelectItem>
                <SelectItem value="month">Next 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time of Day */}
          <div className="space-y-2">
            <Label className="text-xs">Report Time</Label>
            <Select
              value={filters.timeOfDay || 'all'}
              onValueChange={(value) => updateFilter('timeOfDay', value as EarningsCalendarFilters['timeOfDay'])}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Times</SelectItem>
                <SelectItem value="BMO">Before Market</SelectItem>
                <SelectItem value="AMC">After Market</SelectItem>
                <SelectItem value="DMT">During Market</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Symbols Filter */}
          <div className="space-y-2">
            <Label className="text-xs">Symbols (comma-separated)</Label>
            <Input
              className="h-9"
              placeholder="AAPL, MSFT, GOOGL"
              value={filters.symbols?.join(', ') || ''}
              onChange={(e) => {
                const symbols = e.target.value
                  .split(',')
                  .map(s => s.trim().toUpperCase())
                  .filter(Boolean);
                updateFilter('symbols', symbols.length > 0 ? symbols : undefined);
              }}
            />
          </div>

          {/* Show Only With Predictions */}
          <div className="space-y-2">
            <Label className="text-xs">Has Prediction</Label>
            <div className="flex items-center h-9">
              <Switch
                checked={filters.hasPrediction || false}
                onCheckedChange={(checked) => updateFilter('hasPrediction', checked ? true : undefined)}
              />
              <span className="ml-2 text-xs text-muted-foreground">
                Only predictions
              </span>
            </div>
          </div>
        </div>

        {/* Custom Date Range */}
        {filters.dateRange === 'custom' && (
          <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-border/50">
            <div className="space-y-2">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                className="h-9"
                value={filters.customStart || ''}
                onChange={(e) => updateFilter('customStart', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                className="h-9"
                value={filters.customEnd || ''}
                onChange={(e) => updateFilter('customEnd', e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
