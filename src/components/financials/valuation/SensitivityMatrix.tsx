/**
 * SensitivityMatrix - 5x5 grid showing Implied Share Price
 * Y-Axis: WACC steps, X-Axis: Terminal Growth Rate steps
 * Highlights cell closest to current market price
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Grid3X3, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SensitivityCell } from './types';

interface SensitivityMatrixProps {
  matrix: SensitivityCell[][];
  currentPrice: number | null;
  isLoading: boolean;
}

export function SensitivityMatrix({ matrix, currentPrice, isLoading }: SensitivityMatrixProps) {
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary" />
            Sensitivity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (matrix.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary" />
            Sensitivity Analysis
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

  // Extract unique TGR values from first row
  const tgrSteps = matrix[0].map(c => c.terminalGrowth);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary" />
            DCF Sensitivity Analysis
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Shows implied share price under different WACC and terminal growth rate assumptions.
                  The highlighted cell matches the current market price, revealing implied growth expectations.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Implied share price by WACC × Terminal Growth Rate
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-[10px] text-muted-foreground font-medium">
                  WACC \ TGR
                </th>
                {tgrSteps.map(tgr => (
                  <th
                    key={tgr}
                    className="px-2 py-2 text-center text-[10px] text-muted-foreground font-medium whitespace-nowrap"
                  >
                    {(tgr * 100).toFixed(1)}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, ri) => (
                <tr key={ri} className="border-t border-border/20">
                  <td className="px-2 py-2 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                    {(row[0].wacc * 100).toFixed(1)}%
                  </td>
                  {row.map((cell, ci) => {
                    const price = cell.impliedPrice;
                    const diff = price != null && currentPrice != null
                      ? ((price - currentPrice) / currentPrice) * 100
                      : null;
                    const isUpside = diff != null && diff > 0;

                    return (
                      <td
                        key={ci}
                        className={cn(
                          'px-2 py-2 text-center tabular-nums font-mono whitespace-nowrap transition-colors',
                          cell.isClosestToMarket && 'ring-2 ring-primary rounded bg-primary/10 font-bold',
                          !cell.isClosestToMarket && price != null && currentPrice != null && (
                            isUpside ? 'text-emerald-400' : 'text-destructive'
                          )
                        )}
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="cursor-default">
                              {price != null ? `$${price.toFixed(0)}` : '—'}
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-0.5">
                                <p>WACC: {(cell.wacc * 100).toFixed(1)}%</p>
                                <p>TGR: {(cell.terminalGrowth * 100).toFixed(1)}%</p>
                                <p>Implied: {price != null ? `$${price.toFixed(2)}` : '—'}</p>
                                {diff != null && (
                                  <p className={isUpside ? 'text-emerald-400' : 'text-destructive'}>
                                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}% vs market
                                  </p>
                                )}
                                {cell.isClosestToMarket && (
                                  <p className="text-primary font-semibold">← Implied Market Expectations</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {currentPrice != null && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
            <div className="w-3 h-3 rounded ring-2 ring-primary bg-primary/10" />
            <span className="text-[10px] text-muted-foreground">
              Highlighted cell = closest to current price (${currentPrice.toFixed(2)}) — shows market's implied growth expectations
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
