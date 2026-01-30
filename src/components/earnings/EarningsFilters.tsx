// src/components/earnings/EarningsFilters.tsx

import { Filter, CalendarDays } from 'lucide-react';
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
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
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
                <SelectItem value="quarter">Next 3 Months</SelectItem>
                <SelectItem value="year">Next 12 Months</SelectItem>
                <SelectItem value="custom">Select Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Specific Date Selector */}
          {filters.dateRange === 'custom' && (
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" />
                Select Date
              </Label>
              <Input
                type="date"
                className="h-9"
                value={filters.customStart || ''}
                onChange={(e) => {
                  updateFilter('customStart', e.target.value);
                  updateFilter('customEnd', e.target.value);
                }}
              />
            </div>
          )}

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
        </div>
      </CardContent>
    </Card>
  );
};
