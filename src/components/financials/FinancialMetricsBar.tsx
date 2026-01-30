/**
 * FinancialMetricsBar - Display key margins and growth rates
 * Shows Gross Margin, Net Margin, Revenue Growth, Profit Change
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Percent, BarChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FinancialMetric {
  label: string;
  value: number | null;
  previousValue?: number | null;
  isPercentage?: boolean;
  tooltip: string;
  goodDirection?: 'up' | 'down';
}

interface FinancialMetricsBarProps {
  grossMargin?: number | null;
  netMargin?: number | null;
  operatingMargin?: number | null;
  revenueGrowth?: number | null;
  grossProfitChange?: number | null;
  netProfitChange?: number | null;
  isLoading?: boolean;
}

function MetricCard({ metric }: { metric: FinancialMetric }) {
  const { label, value, previousValue, isPercentage = true, tooltip, goodDirection = 'up' } = metric;
  
  const change = previousValue !== undefined && previousValue !== null && value !== null
    ? value - previousValue
    : null;
  
  const isPositiveChange = change !== null ? (goodDirection === 'up' ? change > 0 : change < 0) : null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-help min-w-[120px]">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              {label}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-semibold tabular-nums">
                {value !== null ? (isPercentage ? `${value.toFixed(1)}%` : value.toLocaleString()) : '—'}
              </span>
              {change !== null && (
                <span className={cn(
                  "flex items-center text-[10px] font-medium",
                  isPositiveChange ? "text-emerald-500" : "text-destructive"
                )}>
                  {isPositiveChange ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {Math.abs(change).toFixed(1)}pp
                </span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px]">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function FinancialMetricsBar({
  grossMargin,
  netMargin,
  operatingMargin,
  revenueGrowth,
  grossProfitChange,
  netProfitChange,
  isLoading = false,
}: FinancialMetricsBarProps) {
  const metrics: FinancialMetric[] = [
    {
      label: 'Gross Margin',
      value: grossMargin ?? null,
      tooltip: 'Gross Profit / Revenue. Measures production efficiency and pricing power.',
      goodDirection: 'up' as const,
    },
    {
      label: 'Net Margin',
      value: netMargin ?? null,
      tooltip: 'Net Income / Revenue. Overall profitability efficiency.',
      goodDirection: 'up' as const,
    },
    {
      label: 'Op. Margin',
      value: operatingMargin ?? null,
      tooltip: 'Operating Income / Revenue. Core business profitability.',
      goodDirection: 'up' as const,
    },
    {
      label: 'Revenue Growth',
      value: revenueGrowth ?? null,
      tooltip: 'Year-over-year revenue change. Indicates business expansion.',
      goodDirection: 'up' as const,
    },
    {
      label: 'Gross Profit Δ',
      value: grossProfitChange ?? null,
      tooltip: 'Year-over-year gross profit change. Shows margin improvement.',
      goodDirection: 'up' as const,
    },
    {
      label: 'Net Profit Δ',
      value: netProfitChange ?? null,
      tooltip: 'Year-over-year net income change. Bottom line growth.',
      goodDirection: 'up' as const,
    },
  ].filter(m => m.value !== null);

  if (isLoading) {
    return (
      <Card className="p-3 bg-card/50 border-border/50">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 w-28 bg-secondary/50 rounded-lg animate-pulse flex-shrink-0" />
          ))}
        </div>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return null;
  }

  return (
    <Card className="p-3 bg-card/50 border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Percent className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">Key Margins & Growth</span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </Card>
  );
}
