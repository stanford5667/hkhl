/**
 * FootballFieldChart - Triangulated Valuation Visual
 * Shows DCF, Justified P/E, and Market Comps ranges side-by-side
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FootballFieldRange } from './types';

interface FootballFieldChartProps {
  ranges: FootballFieldRange[];
  currentPrice: number | null;
  isLoading: boolean;
}

const METHODOLOGY_COLORS: Record<string, string> = {
  DCF: 'bg-primary/60',
  'Justified P/E': 'bg-emerald-500/60',
  'Market Comps': 'bg-amber-500/60',
};

const METHODOLOGY_BORDER: Record<string, string> = {
  DCF: 'border-primary/40',
  'Justified P/E': 'border-emerald-500/40',
  'Market Comps': 'border-amber-500/40',
};

export function FootballFieldChart({ ranges, currentPrice, isLoading }: FootballFieldChartProps) {
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Valuation Football Field
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter out ranges with no data
  const validRanges = ranges.filter(r => r.low != null && r.high != null);

  if (validRanges.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Valuation Football Field
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-xs text-muted-foreground">
            Syncing Institutional Data...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate global min/max for scale
  const allValues = validRanges.flatMap(r => [r.low!, r.high!]);
  if (currentPrice != null) allValues.push(currentPrice);
  const globalMin = Math.min(...allValues) * 0.85;
  const globalMax = Math.max(...allValues) * 1.15;
  const span = globalMax - globalMin;

  const pctCurrent = currentPrice != null ? ((currentPrice - globalMin) / span) * 100 : null;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Valuation Football Field
        </CardTitle>
        <p className="text-[10px] text-muted-foreground mt-1">
          Three methodologies triangulated to identify valuation confluence
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Scale header */}
        <div className="flex justify-between text-[10px] text-muted-foreground mb-2 px-[120px]">
          <span>${globalMin.toFixed(0)}</span>
          <span>${((globalMin + globalMax) / 2).toFixed(0)}</span>
          <span>${globalMax.toFixed(0)}</span>
        </div>

        {validRanges.map((range) => {
          const leftPct = ((range.low! - globalMin) / span) * 100;
          const widthPct = ((range.high! - range.low!) / span) * 100;
          const midPct = range.mid != null ? ((range.mid - globalMin) / span) * 100 : null;

          return (
            <div key={range.label} className="flex items-center gap-2 py-1.5">
              <div className="w-[110px] flex-shrink-0 text-right pr-2">
                <span className="text-[11px] font-medium">{range.label}</span>
              </div>
              <div className="relative flex-1 h-7 bg-secondary/20 rounded">
                {/* Range bar */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'absolute top-1 bottom-1 rounded border',
                          METHODOLOGY_COLORS[range.methodology],
                          METHODOLOGY_BORDER[range.methodology]
                        )}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold">{range.label}</p>
                        <p>Low: ${range.low!.toFixed(2)}</p>
                        {range.mid != null && <p>Mid: ${range.mid.toFixed(2)}</p>}
                        <p>High: ${range.high!.toFixed(2)}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Mid marker */}
                {midPct != null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground/40"
                    style={{ left: `${midPct}%` }}
                  />
                )}

                {/* Current price line */}
                {pctCurrent != null && (
                  <div
                    className="absolute top-[-2px] bottom-[-2px] w-px bg-foreground/80 z-10"
                    style={{ left: `${pctCurrent}%` }}
                  />
                )}

                {/* Low/High labels */}
                <span
                  className="absolute text-[9px] text-muted-foreground tabular-nums"
                  style={{ left: `${leftPct}%`, top: '-14px', transform: 'translateX(-50%)' }}
                >
                  ${range.low!.toFixed(0)}
                </span>
                <span
                  className="absolute text-[9px] text-muted-foreground tabular-nums"
                  style={{ left: `${leftPct + widthPct}%`, top: '-14px', transform: 'translateX(-50%)' }}
                >
                  ${range.high!.toFixed(0)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Current price legend */}
        {currentPrice != null && (
          <div className="flex items-center justify-center gap-2 pt-3 border-t border-border/30 mt-2">
            <div className="w-3 h-px bg-foreground/80" />
            <span className="text-[10px] text-muted-foreground">
              Current Price: <span className="font-semibold text-foreground">${currentPrice.toFixed(2)}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
