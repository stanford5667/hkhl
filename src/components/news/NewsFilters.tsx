import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface NewsFiltersProps {
  category: string;
  setCategory: (val: string) => void;
  severity: string;
  setSeverity: (val: string) => void;
  timeRange: string;
  setTimeRange: (val: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'politics', label: 'Politics' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'economics', label: 'Economics' },
  { value: 'tech', label: 'Technology' },
  { value: 'science', label: 'Science' },
  { value: 'sports', label: 'Sports' },
  { value: 'entertainment', label: 'Entertainment' },
];

const SEVERITIES = [
  { value: 'all', label: 'All Severity' },
  { value: 'critical', label: '🔴 Critical' },
  { value: 'high', label: '🟡 High' },
  { value: 'medium', label: '🔵 Medium' },
  { value: 'low', label: 'Low' },
];

const TIME_RANGES = [
  { value: '1h', label: '1 Hour' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: 'all', label: 'All Time' },
];

export function NewsFilters({
  category,
  setCategory,
  severity,
  setSeverity,
  timeRange,
  setTimeRange,
  onRefresh,
  isRefreshing,
}: NewsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Time Range */}
      <Select value={timeRange} onValueChange={setTimeRange}>
        <SelectTrigger className="w-28 bg-slate-900 border-slate-800 text-slate-300 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-800">
          {TIME_RANGES.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category Filter */}
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-36 bg-slate-900 border-slate-800 text-slate-300 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-800">
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Severity Filter */}
      <Select value={severity} onValueChange={setSeverity}>
        <SelectTrigger className="w-32 bg-slate-900 border-slate-800 text-slate-300 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-900 border-slate-800">
          {SEVERITIES.map((sev) => (
            <SelectItem key={sev.value} value={sev.value}>
              {sev.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Refresh Button */}
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 border-slate-800 bg-slate-900 hover:bg-slate-800"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={cn("h-4 w-4 text-slate-400", isRefreshing && "animate-spin")} />
      </Button>
    </div>
  );
}
