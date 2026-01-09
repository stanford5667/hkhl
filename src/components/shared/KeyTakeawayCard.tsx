import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb,
  ArrowRight,
  Shield,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TakeawayData {
  // Metric values for analysis
  cagr?: number;
  volatility?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  alpha?: number;
  beta?: number;
  sortinoRatio?: number;
  totalReturn?: number;
}

interface KeyTakeawayCardProps {
  data: TakeawayData;
  chartType?: 'performance' | 'allocation' | 'risk' | 'general';
  className?: string;
}

interface Takeaway {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  headline: string;
  explanation: string;
  action: string;
}

function generateTakeaway(data: TakeawayData, chartType: string): Takeaway {
  const { cagr, volatility, sharpeRatio, maxDrawdown, alpha, beta, totalReturn } = data;

  // Sharpe-based analysis
  if (sharpeRatio !== undefined) {
    if (sharpeRatio >= 1.5) {
      return {
        type: 'positive',
        headline: 'Excellent Risk-Adjusted Returns',
        explanation: `Your Sharpe ratio of ${sharpeRatio.toFixed(2)} means you're earning strong returns relative to the risk you're taking. This is above the 1.0 threshold that professionals consider "good."`,
        action: 'Consider maintaining your current allocation. Your portfolio is efficiently balanced.'
      };
    } else if (sharpeRatio >= 1) {
      return {
        type: 'positive',
        headline: 'Solid Risk-Adjusted Performance',
        explanation: `A Sharpe ratio of ${sharpeRatio.toFixed(2)} indicates you're being reasonably compensated for risk. Your portfolio is performing above average.`,
        action: 'Monitor quarterly and consider minor rebalancing if individual holdings drift more than 5%.'
      };
    } else if (sharpeRatio >= 0.5) {
      return {
        type: 'neutral',
        headline: 'Room for Optimization',
        explanation: `Your Sharpe ratio of ${sharpeRatio.toFixed(2)} suggests moderate risk-adjusted returns. You may be taking on more risk than necessary for your returns.`,
        action: 'Review your highest-volatility holdings and consider if they warrant their risk.'
      };
    } else {
      return {
        type: 'warning',
        headline: 'Risk-Return Imbalance Detected',
        explanation: `A Sharpe ratio of ${sharpeRatio.toFixed(2)} means you're taking significant risk without proportional returns. This could hurt long-term wealth building.`,
        action: 'Consider adding bonds or low-correlation assets to improve your risk-adjusted returns.'
      };
    }
  }

  // Drawdown-based analysis
  if (maxDrawdown !== undefined) {
    const ddValue = Math.abs(maxDrawdown);
    if (ddValue > 30) {
      return {
        type: 'warning',
        headline: 'High Drawdown Risk',
        explanation: `A ${ddValue.toFixed(1)}% maximum drawdown means your portfolio could lose nearly a third of its value during market stress. This tests even experienced investors patience.`,
        action: 'If you would panic-sell during a 30%+ drop, reduce equity exposure or add hedging strategies.'
      };
    } else if (ddValue > 20) {
      return {
        type: 'neutral',
        headline: 'Moderate Volatility Exposure',
        explanation: `A ${ddValue.toFixed(1)}% max drawdown is typical for equity-heavy portfolios. Make sure you can stomach this level of decline without selling.`,
        action: 'Set price alerts at -15% to evaluate your holdings before emotions take over.'
      };
    }
  }

  // Total return analysis
  if (totalReturn !== undefined) {
    if (totalReturn > 50) {
      return {
        type: 'positive',
        headline: 'Strong Growth Achieved',
        explanation: 'Your ' + totalReturn.toFixed(1) + '% total return represents significant wealth creation. Compound growth is working in your favor.',
        action: 'Consider taking some profits to lock in gains and rebalance to your target allocation.'
      };
    } else if (totalReturn < 0) {
      return {
        type: 'negative',
        headline: 'Portfolio in Drawdown',
        explanation: `Your portfolio is down ${Math.abs(totalReturn).toFixed(1)}%. While uncomfortable, staying invested through downturns has historically paid off.`,
        action: 'Avoid panic selling. Consider dollar-cost averaging if you have cash to deploy.'
      };
    }
  }

  // CAGR analysis
  if (cagr !== undefined) {
    if (cagr >= 12) {
      return {
        type: 'positive',
        headline: 'Above-Market Returns',
        explanation: 'A ' + cagr.toFixed(1) + '% CAGR exceeds the historical S&P 500 average of about 10%. Your portfolio is outperforming.',
        action: 'Verify this is not due to excessive risk. Check your Sharpe ratio for confirmation.'
      };
    } else if (cagr >= 7) {
      return {
        type: 'neutral',
        headline: 'Market-Like Performance',
        explanation: `Your ${cagr.toFixed(1)}% CAGR is in line with long-term market averages. Steady growth builds wealth over time.`,
        action: 'Consider if you could achieve similar returns with lower-cost index funds.'
      };
    }
  }

  // Default fallback
  return {
    type: 'neutral',
    headline: 'Portfolio Under Review',
    explanation: 'Analyzing your portfolio metrics to identify trends and opportunities.',
    action: 'Continue monitoring your key metrics and rebalance quarterly.'
  };
}

const typeStyles = {
  positive: {
    bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
  },
  negative: {
    bg: 'bg-gradient-to-br from-rose-500/10 to-rose-500/5',
    border: 'border-rose-500/30',
    icon: TrendingDown,
    iconColor: 'text-rose-500',
    badge: 'bg-rose-500/10 text-rose-600 border-rose-500/30'
  },
  neutral: {
    bg: 'bg-gradient-to-br from-blue-500/10 to-blue-500/5',
    border: 'border-blue-500/30',
    icon: Target,
    iconColor: 'text-blue-500',
    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/30'
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-500/10 to-amber-500/5',
    border: 'border-amber-500/30',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/30'
  }
};

export function KeyTakeawayCard({ data, chartType = 'general', className }: KeyTakeawayCardProps) {
  const takeaway = useMemo(() => generateTakeaway(data, chartType), [data, chartType]);
  const style = typeStyles[takeaway.type];
  const Icon = style.icon;

  return (
    <Card className={cn(style.bg, style.border, 'border', className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", style.bg)}>
            <Icon className={cn("h-5 w-5", style.iconColor)} />
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">{takeaway.headline}</span>
              <Badge variant="outline" className={cn("text-xs", style.badge)}>
                Key Takeaway
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              {takeaway.explanation}
            </p>
            
            <div className="flex items-start gap-2 pt-1">
              <div className="p-1 rounded bg-primary/10 shrink-0 mt-0.5">
                <Lightbulb className="h-3 w-3 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {takeaway.action}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default KeyTakeawayCard;
