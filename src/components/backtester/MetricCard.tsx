/**
 * Metric Card Component
 * Displays a metric with inline educational popover
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HelpCircle, 
  BookOpen,
  Lightbulb,
  Target,
  BarChart3,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { financialTerms } from '@/data/financialTerms';

// Local type to avoid stale type issues
interface TermData {
  term: string;
  category?: string;
  definition: string;
  impact: string;
  howToUse?: string;
  typicalRanges?: { label: string; range: string; description?: string }[];
  example?: string;
  learnMoreUrl?: string;
}

interface MetricCardProps {
  label: string;
  displayLabel?: string;
  termKey: string;
  value: number;
  format?: 'percent' | 'decimal' | 'ratio';
  colorize?: boolean;
  prefix?: string;
  suffix?: string;
  calculationPeriod?: string;
  className?: string;
}

const categoryColors: Record<string, string> = {
  RISK: 'bg-red-500/10 text-red-500 border-red-500/30',
  RETURN: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  EFFICIENCY: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  GROWTH: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  INCOME: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  VALUATION: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
};

export function MetricCard({
  label,
  displayLabel,
  termKey,
  value,
  format = 'percent',
  colorize = false,
  prefix = '',
  suffix = '',
  calculationPeriod,
  className,
}: MetricCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const term = financialTerms[termKey] as any;

  const formattedValue = (() => {
    if (format === 'percent') {
      return `${prefix}${value.toFixed(1)}%${suffix}`;
    } else if (format === 'decimal' || format === 'ratio') {
      return `${prefix}${value.toFixed(2)}${suffix}`;
    }
    return `${prefix}${value}${suffix}`;
  })();

  const valueColor = colorize
    ? value >= 0
      ? 'text-emerald-500'
      : 'text-red-500'
    : termKey === 'maxDrawdown' || termKey === 'drawdown'
      ? 'text-red-400'
      : '';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div 
          className={cn(
            "p-2 sm:p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors",
            "border border-transparent hover:border-border/50 min-w-0",
            className
          )}
        >
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <span className="truncate">{displayLabel || label}</span>
            <HelpCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-50 shrink-0" />
          </div>
          <div className={cn("text-sm sm:text-lg font-bold font-mono truncate", valueColor)}>
            {formattedValue}
          </div>
          {calculationPeriod && (
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">
              {calculationPeriod}
            </div>
          )}
        </div>
      </PopoverTrigger>
      
      {term && (
        <PopoverContent 
          className="w-[360px] p-0 overflow-hidden bg-card border border-border shadow-xl z-[100]"
          sideOffset={8}
          align="start"
        >
          <Tabs defaultValue="definition" className="w-full">
            <div className="p-3 pb-2 border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground">{term.term}</h4>
                </div>
                {term.category && (
                  <Badge variant="outline" className={cn("text-[10px]", categoryColors[term.category])}>
                    {term.category}
                  </Badge>
                )}
              </div>
              <TabsList className="grid w-full grid-cols-3 h-7">
                <TabsTrigger value="definition" className="text-[10px]">Definition</TabsTrigger>
                <TabsTrigger value="calculation" className="text-[10px]">Calculation</TabsTrigger>
                <TabsTrigger value="ranges" className="text-[10px]">Ranges</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-3 max-h-[280px] overflow-y-auto">
              <TabsContent value="definition" className="mt-0 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    <span>What is {term.term}?</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-5">
                    {term.definition}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                    <span>Why It Matters</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-5">
                    {term.impact}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="calculation" className="mt-0 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Calculator className="h-3.5 w-3.5 text-blue-400" />
                    <span>How It's Calculated</span>
                  </div>
                  <div className="p-2 rounded bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {getCalculationExplanation(termKey, calculationPeriod)}
                    </p>
                  </div>
                </div>

                {term.example && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Target className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Example</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-5">
                      {term.example}
                    </p>
                  </div>
                )}

                {term.howToUse && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Target className="h-3.5 w-3.5 text-emerald-400" />
                      <span>How To Use This</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-5">
                      {term.howToUse}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ranges" className="mt-0 space-y-3">
                {term.typicalRanges && term.typicalRanges.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
                      <span>Typical Ranges</span>
                    </div>
                    <div className="space-y-1.5">
                      {term.typicalRanges.map((range, index) => (
                        <div 
                          key={index}
                          className="flex items-start gap-2 p-2 rounded bg-muted/30 text-xs"
                        >
                          <span className="font-mono text-muted-foreground w-16 shrink-0">
                            {range.label}
                          </span>
                          <div className="flex-1">
                            <span className="font-medium text-foreground">{range.range}</span>
                            {range.description && (
                              <p className="text-muted-foreground text-[11px] mt-0.5">
                                {range.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No typical ranges defined for this metric.
                  </p>
                )}

                {/* Show current value interpretation */}
                <div className="p-2 rounded bg-primary/5 border border-primary/20">
                  <div className="text-xs font-medium text-primary mb-1">Your Portfolio</div>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold", valueColor)}>{formattedValue}</span>
                    <span className="text-xs text-muted-foreground">
                      {getValueInterpretation(termKey, value)}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </PopoverContent>
      )}
    </Popover>
  );
}

function getCalculationExplanation(termKey: string, period?: string): string {
  const periodText = period || '1 year of daily data';
  
  const explanations: Record<string, string> = {
    cagr: `Compound Annual Growth Rate is calculated using ${periodText}. It shows the smoothed annual return as if growth was steady: ((Ending Value / Starting Value)^(1/years)) - 1. This normalizes returns for fair comparison across different time periods.`,
    totalReturn: `Total Return is the complete gain/loss over ${periodText}: ((Ending Value - Starting Value) / Starting Value) × 100. It includes all price changes and assumes dividends are reinvested.`,
    volatility: `Annualized volatility is calculated from ${periodText} of daily returns. We compute the standard deviation of daily returns, then multiply by √252 (trading days per year) to annualize.`,
    sharpeRatio: `Sharpe Ratio measures risk-adjusted return: (Portfolio Return - Risk-Free Rate) / Portfolio Volatility. Calculated over ${periodText}. Higher means better return per unit of risk.`,
    maxDrawdown: `Maximum Drawdown is the largest peak-to-trough decline during ${periodText}. We track the running maximum and measure every drop from that peak to find the worst one.`,
    sortino: `Sortino Ratio is like Sharpe but only penalizes downside volatility: (Portfolio Return - Risk-Free Rate) / Downside Deviation. Uses ${periodText} data.`,
  };
  
  return explanations[termKey] || `Calculated using ${periodText} of historical data.`;
}

function getValueInterpretation(termKey: string, value: number): string {
  switch (termKey) {
    case 'cagr':
      if (value >= 12) return '— Excellent growth';
      if (value >= 8) return '— Above average';
      if (value >= 4) return '— Moderate growth';
      return '— Below average';
    case 'sharpeRatio':
      if (value >= 2) return '— Excellent efficiency';
      if (value >= 1) return '— Good risk-adjusted return';
      if (value >= 0.5) return '— Acceptable';
      return '— Poor risk compensation';
    case 'maxDrawdown':
      if (value <= 10) return '— Conservative risk';
      if (value <= 20) return '— Moderate risk';
      if (value <= 35) return '— Higher risk';
      return '— Aggressive risk';
    case 'volatility':
      if (value <= 10) return '— Low volatility';
      if (value <= 18) return '— Moderate volatility';
      return '— High volatility';
    default:
      return '';
  }
}
