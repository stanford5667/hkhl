/**
 * FairValueRange - Horizontal bar showing Bear/Base/Bull price targets
 * with current market price position indicator
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Target, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValuationScenarios } from './types';

interface FairValueRangeProps {
  scenarios: ValuationScenarios;
  currentPrice: number | null;
  isLoading: boolean;
}

export function FairValueRange({ scenarios, currentPrice, isLoading }: FairValueRangeProps) {
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Fair Value Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const bear = scenarios.bear.output.priceTarget;
  const base = scenarios.base.output.priceTarget;
  const bull = scenarios.bull.output.priceTarget;

  if (bear == null || base == null || bull == null || currentPrice == null) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Fair Value Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-xs text-muted-foreground">
            Syncing Institutional Data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const rangeMin = Math.min(bear, currentPrice) * 0.9;
  const rangeMax = Math.max(bull, currentPrice) * 1.1;
  const span = rangeMax - rangeMin;

  const pctBear = ((bear - rangeMin) / span) * 100;
  const pctBase = ((base - rangeMin) / span) * 100;
  const pctBull = ((bull - rangeMin) / span) * 100;
  const pctCurrent = ((currentPrice - rangeMin) / span) * 100;

  const baseReturn = scenarios.base.output.impliedReturn;
  const isUndervalued = baseReturn != null && baseReturn > 0;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Fair Value Range
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px]',
              isUndervalued
                ? 'border-emerald-500/50 text-emerald-500'
                : 'border-destructive/50 text-destructive'
            )}
          >
            {isUndervalued ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {baseReturn != null ? `${baseReturn >= 0 ? '+' : ''}${baseReturn.toFixed(1)}% implied` : '—'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Price labels */}
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Bear: ${bear.toFixed(2)}</span>
          <span>Base: ${base.toFixed(2)}</span>
          <span>Bull: ${bull.toFixed(2)}</span>
        </div>

        {/* Range bar */}
        <div className="relative h-8 rounded-md overflow-hidden bg-secondary/30">
          {/* Gradient fill from bear to bull */}
          <div
            className="absolute top-0 bottom-0 rounded-md"
            style={{
              left: `${pctBear}%`,
              width: `${pctBull - pctBear}%`,
              background: 'linear-gradient(90deg, hsl(var(--destructive) / 0.3), hsl(var(--primary) / 0.4), hsl(142 76% 36% / 0.3))',
            }}
          />

          {/* Bear marker */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-destructive/70"
                  style={{ left: `${pctBear}%` }}
                />
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Bear: ${bear.toFixed(2)}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Base marker */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary"
                  style={{ left: `${pctBase}%` }}
                />
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Base: ${base.toFixed(2)}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Bull marker */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-emerald-500/70"
                  style={{ left: `${pctBull}%` }}
                />
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Bull: ${bull.toFixed(2)}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Current price marker */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-[-4px] bottom-[-4px] flex flex-col items-center z-10"
                  style={{ left: `${pctCurrent}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-3 h-3 rounded-full bg-foreground border-2 border-background shadow-lg" />
                  <div className="w-0.5 flex-1 bg-foreground/60" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-semibold">Current: ${currentPrice.toFixed(2)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="text-center mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            Current Price: <span className="font-semibold text-foreground">${currentPrice.toFixed(2)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
