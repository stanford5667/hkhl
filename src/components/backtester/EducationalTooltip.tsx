import { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const FINANCIAL_TERMS: Record<string, { title: string; definition: string; example?: string }> = {
  sharpeRatio: {
    title: 'Sharpe Ratio',
    definition: 'Risk-adjusted return. (Return - Risk-free) / Volatility',
    example: 'A Sharpe of 1.5 means 1.5% excess return per 1% of risk',
  },
  sortinoRatio: {
    title: 'Sortino Ratio',
    definition: 'Like Sharpe but only considers downside volatility',
    example: 'Higher is better - ignores upside "risk"',
  },
  maxDrawdown: {
    title: 'Maximum Drawdown',
    definition: 'Largest peak-to-trough decline in portfolio value',
    example: '-20% means the portfolio fell 20% from its peak',
  },
  beta: {
    title: 'Beta',
    definition: 'Volatility relative to market. 1.0 = same as market',
    example: 'Beta of 1.2 = 20% more volatile than market',
  },
  alpha: {
    title: 'Alpha',
    definition: 'Excess return over benchmark after adjusting for risk',
    example: 'Alpha of 3% means beating the benchmark by 3%',
  },
  cagr: {
    title: 'CAGR',
    definition: 'Compound Annual Growth Rate - smoothed annual return',
    example: '15% CAGR means your investment grew 15% per year on average',
  },
  calmarRatio: {
    title: 'Calmar Ratio',
    definition: 'CAGR divided by Maximum Drawdown',
    example: 'Higher ratio = better risk-adjusted returns',
  },
  volatility: {
    title: 'Volatility (Std Dev)',
    definition: 'Standard deviation of returns - measures price swings',
    example: '20% volatility means returns typically vary ±20%',
  },
  trackingError: {
    title: 'Tracking Error',
    definition: 'Deviation from benchmark returns',
    example: 'Low tracking error = closely follows benchmark',
  },
  totalReturn: {
    title: 'Total Return',
    definition: 'The complete return including price changes and dividends',
    example: '50% total return = your investment grew by half',
  },
  var: {
    title: 'Value at Risk (VaR)',
    definition: 'Maximum expected loss at a given confidence level',
    example: '95% VaR of -$10k means 5% chance of losing more than $10k',
  },
  treynorRatio: {
    title: 'Treynor Ratio',
    definition: 'Excess return per unit of systematic risk (beta)',
    example: 'Higher ratio = better compensation for market risk',
  },
  informationRatio: {
    title: 'Information Ratio',
    definition: 'Active return divided by tracking error',
    example: 'Measures skill of active management',
  },
  omegaRatio: {
    title: 'Omega Ratio',
    definition: 'Probability weighted ratio of gains vs losses',
    example: 'Omega > 1 means more probability-weighted gains than losses',
  },
};

interface EducationalTooltipProps {
  term: keyof typeof FINANCIAL_TERMS;
  children: ReactNode;
  className?: string;
}

export function EducationalTooltip({ term, children, className }: EducationalTooltipProps) {
  const termData = FINANCIAL_TERMS[term];
  
  if (!termData) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className={cn('cursor-help', className)}>{children}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3" side="top">
          <div className="space-y-1.5">
            <p className="font-semibold text-sm">{termData.title}</p>
            <p className="text-xs text-muted-foreground">{termData.definition}</p>
            {termData.example && (
              <p className="text-xs text-primary/80 italic">{termData.example}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface MetricWithTooltipProps {
  term: keyof typeof FINANCIAL_TERMS;
  label: string;
  value: string;
  change?: string;
  className?: string;
}

export function MetricWithTooltip({ term, label, value, change, className }: MetricWithTooltipProps) {
  const termData = FINANCIAL_TERMS[term];

  return (
    <div className={cn('space-y-1', className)}>
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <span className="text-sm text-muted-foreground">{label}</span>
              <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
            </div>
          </TooltipTrigger>
          {termData && (
            <TooltipContent className="max-w-xs p-3" side="top">
              <div className="space-y-1.5">
                <p className="font-semibold text-sm">{termData.title}</p>
                <p className="text-xs text-muted-foreground">{termData.definition}</p>
                {termData.example && (
                  <p className="text-xs text-primary/80 italic">{termData.example}</p>
                )}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <p className="text-2xl font-bold">{value}</p>
      {change && (
        <p className={cn(
          'text-xs',
          change.startsWith('+') ? 'text-emerald-500' : 'text-destructive'
        )}>
          {change} vs benchmark
        </p>
      )}
    </div>
  );
}
