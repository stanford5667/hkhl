/**
 * JustifiedMultipleBridge - CFA Level II "White Box" Transparency
 * Shows Justified Forward P/E via Gordon Growth Model: P/E = Payout / (r - g)
 * With CAPM cost of equity and sustainable growth calculations
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Calculator, HelpCircle, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JustifiedPEResult } from './types';

interface JustifiedMultipleBridgeProps {
  result: JustifiedPEResult;
  beta: number | null;
  roe: number | null;
  isLoading: boolean;
  onOverride?: (overrides: { beta?: number; roe?: number; payoutRatio?: number }) => void;
}

const CFA_TOOLTIPS: Record<string, string> = {
  costOfEquity:
    'Cost of Equity (r) via CAPM: r = Risk-Free Rate + β × Equity Risk Premium. Represents the minimum return equity investors require. CFA Level II, Equity Valuation.',
  sustainableGrowth:
    'Sustainable Growth Rate (g) = ROE × (1 − Payout Ratio). The maximum rate a firm can grow without external financing. CFA Level II, Corporate Finance.',
  justifiedPE:
    'Justified Forward P/E = Payout Ratio ÷ (r − g). Derived from the Gordon Growth Model dividend discount framework. If Market P/E > Justified P/E, the stock is overvalued.',
  payoutRatio:
    'Payout Ratio = Dividends Per Share ÷ EPS. The fraction of earnings distributed to shareholders. CFA Level I, Equity Valuation.',
  beta:
    'Beta (β) measures systematic risk relative to the market. β > 1 = more volatile than market. Used in CAPM to determine required return.',
  roe:
    'Return on Equity (ROE) = Net Income ÷ Shareholders\' Equity. Measures profitability per dollar of equity capital. Key DuPont Analysis input.',
};

function StepCard({
  label,
  formula,
  value,
  tooltipKey,
  color = 'text-foreground',
}: {
  label: string;
  formula: string;
  value: string;
  tooltipKey: string;
  color?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/30 hover:border-primary/30 transition-colors cursor-help">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
              <HelpCircle className="h-3 w-3 text-muted-foreground/50" />
            </div>
            <div className={cn('text-lg font-bold tabular-nums', color)}>{value}</div>
            <div className="text-[10px] text-muted-foreground font-mono mt-1">{formula}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs leading-relaxed">{CFA_TOOLTIPS[tooltipKey]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function JustifiedMultipleBridge({
  result,
  beta,
  roe,
  isLoading,
  onOverride,
}: JustifiedMultipleBridgeProps) {
  const [localBeta, setLocalBeta] = useState<number | null>(null);
  const [localROE, setLocalROE] = useState<number | null>(null);
  const [localPayout, setLocalPayout] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Justified P/E Bridge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { payoutRatio, costOfEquity, sustainableGrowth, justifiedPE, marketPE, isOvervalued } = result;

  const hasData = costOfEquity != null && sustainableGrowth != null;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Justified P/E Bridge
          </CardTitle>
          {isOvervalued != null && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px]',
                isOvervalued
                  ? 'border-destructive/50 text-destructive'
                  : 'border-emerald-500/50 text-emerald-500'
              )}
            >
              {isOvervalued ? (
                <TrendingDown className="h-3 w-3 mr-1" />
              ) : (
                <TrendingUp className="h-3 w-3 mr-1" />
              )}
              {isOvervalued ? 'Overvalued' : 'Undervalued'} vs Justified
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Gordon Growth Model: P/E = Payout Ratio ÷ (r − g)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Syncing Institutional Data...
          </div>
        ) : (
          <>
            {/* Calculation Steps */}
            <div className="grid grid-cols-2 gap-3">
              <StepCard
                label="Cost of Equity (r)"
                formula={`CAPM: ${(0.043 * 100).toFixed(1)}% + ${(beta ?? 0).toFixed(2)} × ${(0.055 * 100).toFixed(1)}%`}
                value={costOfEquity != null ? `${(costOfEquity * 100).toFixed(2)}%` : '—'}
                tooltipKey="costOfEquity"
                color="text-primary"
              />
              <StepCard
                label="Sustainable Growth (g)"
                formula={`ROE × (1 − Payout): ${(roe ?? 0).toFixed(1)}% × ${((1 - (payoutRatio ?? 0)) * 100).toFixed(0)}%`}
                value={sustainableGrowth != null ? `${(sustainableGrowth * 100).toFixed(2)}%` : '—'}
                tooltipKey="sustainableGrowth"
                color="text-emerald-500"
              />
              <StepCard
                label="Payout Ratio"
                formula="DPS ÷ EPS"
                value={payoutRatio != null ? `${(payoutRatio * 100).toFixed(1)}%` : '—'}
                tooltipKey="payoutRatio"
              />
              <StepCard
                label="Justified Forward P/E"
                formula={`${((payoutRatio ?? 0) * 100).toFixed(0)}% ÷ (${((costOfEquity ?? 0) * 100).toFixed(1)}% − ${((sustainableGrowth ?? 0) * 100).toFixed(1)}%)`}
                value={justifiedPE != null ? `${justifiedPE.toFixed(1)}x` : '—'}
                tooltipKey="justifiedPE"
                color="text-primary"
              />
            </div>

            {/* Justified vs Market comparison */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/30">
              <div className="flex-1 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Justified P/E</div>
                <div className="text-xl font-bold text-primary tabular-nums">
                  {justifiedPE != null ? `${justifiedPE.toFixed(1)}x` : '—'}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Market P/E</div>
                <div className={cn(
                  'text-xl font-bold tabular-nums',
                  isOvervalued ? 'text-destructive' : 'text-emerald-500'
                )}>
                  {marketPE != null ? `${marketPE.toFixed(1)}x` : '—'}
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Gap</div>
                <div className={cn(
                  'text-xl font-bold tabular-nums',
                  isOvervalued ? 'text-destructive' : 'text-emerald-500'
                )}>
                  {justifiedPE != null && marketPE != null
                    ? `${((marketPE - justifiedPE) / justifiedPE * 100).toFixed(0)}%`
                    : '—'}
                </div>
              </div>
            </div>

            {/* Interactive toggles */}
            <div className="space-y-3 pt-2 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Toggle Variables — See Real-Time Impact
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 cursor-help">
                        <span>Beta (β)</span>
                        <HelpCircle className="h-3 w-3 text-muted-foreground/50" />
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">{CFA_TOOLTIPS.beta}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-mono tabular-nums">{(localBeta ?? beta ?? 1).toFixed(2)}</span>
                </div>
                <Slider
                  value={[localBeta ?? beta ?? 1]}
                  min={0.3}
                  max={2.5}
                  step={0.05}
                  onValueChange={([v]) => {
                    setLocalBeta(v);
                    onOverride?.({ beta: v });
                  }}
                  className="py-1"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 cursor-help">
                        <span>ROE (%)</span>
                        <HelpCircle className="h-3 w-3 text-muted-foreground/50" />
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">{CFA_TOOLTIPS.roe}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="font-mono tabular-nums">{(localROE ?? roe ?? 15).toFixed(1)}%</span>
                </div>
                <Slider
                  value={[localROE ?? roe ?? 15]}
                  min={1}
                  max={60}
                  step={0.5}
                  onValueChange={([v]) => {
                    setLocalROE(v);
                    onOverride?.({ roe: v });
                  }}
                  className="py-1"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
