import { Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceDisclaimerProps {
  variant?: 'compact' | 'standard' | 'detailed';
  className?: string;
  type?: 'backtest' | 'projection' | 'historical' | 'general';
}

const disclaimerContent = {
  backtest: {
    compact: "Past performance does not guarantee future results.",
    standard: "Backtested results are hypothetical and do not represent actual trading. Past performance does not guarantee future results.",
    detailed: "Backtested performance is hypothetical and does not represent actual trading results. Past performance does not guarantee future results. Trading involves risk of loss. These results do not account for transaction costs, taxes, slippage, or other real-world factors that may affect returns."
  },
  projection: {
    compact: "Projections are estimates, not guarantees.",
    standard: "Forward-looking projections are based on historical averages and assumptions. Actual results may differ significantly.",
    detailed: "Forward-looking projections are based on historical averages and assumptions that may not reflect future market conditions. Actual results may differ significantly from projections. Market volatility, economic conditions, and individual circumstances can all impact investment outcomes. These projections are for illustrative purposes only."
  },
  historical: {
    compact: "Historical data is backward-looking.",
    standard: "Historical data reflects past market conditions. Past performance does not predict future results.",
    detailed: "Historical data and returns are backward-looking and reflect past market conditions that may not be repeated. Past performance does not guarantee or predict future results. Markets are subject to periods of extreme volatility and losses."
  },
  general: {
    compact: "For educational purposes only.",
    standard: "This information is for educational purposes only and does not constitute investment advice.",
    detailed: "This information is provided for educational and informational purposes only and does not constitute personalized investment advice. Consider consulting with a qualified financial advisor before making investment decisions. Investing involves risk, including the possible loss of principal."
  }
};

export function PerformanceDisclaimer({ 
  variant = 'standard', 
  className,
  type = 'general'
}: PerformanceDisclaimerProps) {
  const content = disclaimerContent[type][variant];
  
  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}>
        <Info className="h-3 w-3 shrink-0" />
        <span>{content}</span>
      </div>
    );
  }

  if (variant === 'standard') {
    return (
      <div className={cn(
        "flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20",
        className
      )}>
        <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/90">
          <strong>Important:</strong> {content}
        </p>
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn(
      "p-4 rounded-lg bg-amber-500/10 border border-amber-500/20",
      className
    )}>
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm font-medium text-amber-400">Important Disclosure</p>
      </div>
      <p className="text-xs text-amber-200/80 leading-relaxed">
        {content}
      </p>
    </div>
  );
}

export default PerformanceDisclaimer;
