import { AlertTriangle, Info, Scale } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface PreActionDisclaimerProps {
  variant?: 'backtest' | 'investment-plan' | 'projection' | 'analysis';
  className?: string;
  compact?: boolean;
}

const disclaimerContent = {
  backtest: {
    title: "Before You Run This Backtest",
    points: [
      "Past performance does not guarantee future results",
      "Backtested results are hypothetical and may not reflect actual trading",
      "Results do not account for transaction costs, taxes, or slippage"
    ]
  },
  'investment-plan': {
    title: "Before You Begin",
    points: [
      "This assessment provides educational guidance, not financial advice",
      "Results are based on general principles, not your complete financial situation",
      "Consider consulting a qualified financial advisor for personalized advice"
    ]
  },
  projection: {
    title: "About These Projections",
    points: [
      "Forward-looking projections are estimates, not guarantees",
      "Historical averages may not reflect future market conditions",
      "Actual results may differ significantly from projections"
    ]
  },
  analysis: {
    title: "Important Considerations",
    points: [
      "Analysis is based on historical data which may not predict future performance",
      "Market conditions can change rapidly and unexpectedly",
      "This information is for educational purposes only"
    ]
  }
};

export function PreActionDisclaimer({ 
  variant = 'analysis', 
  className,
  compact = false
}: PreActionDisclaimerProps) {
  const content = disclaimerContent[variant];
  
  if (compact) {
    return (
      <div className={cn(
        "flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20",
        className
      )}>
        <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80">
          <strong>Note:</strong> {content.points[0]}. Results are for educational purposes only.
        </p>
      </div>
    );
  }

  return (
    <Alert className={cn(
      "border-amber-500/30 bg-amber-500/5",
      className
    )}>
      <Scale className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-400 text-sm font-medium">
        {content.title}
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1">
          {content.points.map((point, i) => (
            <li key={i} className="text-xs text-amber-200/70 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export default PreActionDisclaimer;
