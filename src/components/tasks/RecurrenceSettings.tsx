import { useState } from 'react';
import { format } from 'date-fns';
import { RepeatIcon, Calendar as CalendarIcon, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | null;

export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  interval: number;
  endDate: Date | null;
}

interface RecurrenceSettingsProps {
  value: RecurrenceConfig;
  onChange: (config: RecurrenceConfig) => void;
  disabled?: boolean;
}

const patternLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export function RecurrenceSettings({ value, onChange, disabled }: RecurrenceSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePatternChange = (pattern: string) => {
    if (pattern === 'none') {
      onChange({ pattern: null, interval: 1, endDate: null });
    } else {
      onChange({ ...value, pattern: pattern as RecurrencePattern });
    }
  };

  const handleClear = () => {
    onChange({ pattern: null, interval: 1, endDate: null });
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!value.pattern) return 'No repeat';
    let text = patternLabels[value.pattern] || value.pattern;
    if (value.interval > 1) {
      text = `Every ${value.interval} ${value.pattern.replace('ly', 's')}`;
    }
    if (value.endDate) {
      text += ` until ${format(value.endDate, 'MMM d, yyyy')}`;
    }
    return text;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start bg-slate-800 border-slate-700 text-left',
            !value.pattern && 'text-slate-500'
          )}
        >
          <RepeatIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-slate-900 border-slate-800" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-slate-300">Repeat Pattern</Label>
            {value.pattern && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 px-2 text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          <Select value={value.pattern || 'none'} onValueChange={handlePatternChange}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Select pattern" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="none" className="text-slate-400">No repeat</SelectItem>
              {Object.entries(patternLabels).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-slate-300">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {value.pattern && (
            <>
              <div className="space-y-2">
                <Label className="text-slate-300">Repeat every</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={value.interval}
                    onChange={(e) => onChange({ ...value, interval: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-20 bg-slate-800 border-slate-700 text-white"
                  />
                  <span className="text-slate-400">
                    {value.pattern === 'daily' && (value.interval === 1 ? 'day' : 'days')}
                    {value.pattern === 'weekly' && (value.interval === 1 ? 'week' : 'weeks')}
                    {value.pattern === 'biweekly' && 'weeks'}
                    {value.pattern === 'monthly' && (value.interval === 1 ? 'month' : 'months')}
                    {value.pattern === 'quarterly' && (value.interval === 1 ? 'quarter' : 'quarters')}
                    {value.pattern === 'yearly' && (value.interval === 1 ? 'year' : 'years')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">End Date (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start bg-slate-800 border-slate-700',
                        !value.endDate && 'text-slate-500'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {value.endDate ? format(value.endDate, 'PPP') : 'No end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start">
                    <Calendar
                      mode="single"
                      selected={value.endDate || undefined}
                      onSelect={(date) => onChange({ ...value, endDate: date || null })}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {value.endDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ ...value, endDate: null })}
                    className="text-slate-400 hover:text-white"
                  >
                    Remove end date
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
