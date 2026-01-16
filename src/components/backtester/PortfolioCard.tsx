/**
 * Portfolio Card Component
 * Detailed, user-friendly card for portfolio list view
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Snowflake,
  Flame,
  ChevronRight,
  Star,
  BarChart3,
  Zap,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioMetrics {
  cagr: number;
  volatility: number;
  sharpe: number;
  maxDrawdown: number;
  sortino?: number;
  totalReturn?: number;
  periodTotalReturn?: number;
  returnPeriodYears?: number;
  dataPoints?: number;
}

interface PortfolioCardProps {
  name: string;
  tickers: string[];
  weights: number[];
  metrics: PortfolioMetrics;
  matchScore?: number;
  family?: string;
  onClick: () => void;
  rank?: number;
  screeningPeriod?: number; // The period user is screening for
}

const FAMILY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  conservative: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  moderate: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  balanced: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30' },
  growth: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  aggressive: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  diversified: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  sector: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  income: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
};

function getScoreIcon(score: number) {
  if (score >= 9) return Star;
  if (score >= 7) return TrendingUp;
  if (score >= 5) return Scale;
  return BarChart3;
}

function getScoreColor(score: number): string {
  if (score >= 9) return 'text-amber-400';
  if (score >= 7) return 'text-emerald-400';
  if (score >= 5) return 'text-blue-400';
  return 'text-muted-foreground';
}

function getScoreLabel(score: number): string {
  if (score >= 9) return 'Excellent';
  if (score >= 8) return 'Very Good';
  if (score >= 7) return 'Good';
  if (score >= 6) return 'Above Avg';
  if (score >= 5) return 'Average';
  if (score >= 4) return 'Below Avg';
  return 'Poor';
}

export function PortfolioCard({
  name,
  tickers,
  weights,
  metrics,
  matchScore,
  family,
  onClick,
  rank,
  screeningPeriod,
}: PortfolioCardProps) {
  // Convert matchScore (0-100) to 1-10 scale
  const score10 = matchScore !== undefined ? Math.round((matchScore / 100) * 10) : 0;
  const ScoreIcon = getScoreIcon(score10);
  const scoreColor = getScoreColor(score10);
  const familyStyle = family ? FAMILY_COLORS[family] || FAMILY_COLORS.moderate : FAMILY_COLORS.moderate;

  // Risk level based on volatility and drawdown
  const riskLevel = 
    metrics.volatility <= 10 && Math.abs(metrics.maxDrawdown) <= 15 ? 'Low' :
    metrics.volatility <= 18 && Math.abs(metrics.maxDrawdown) <= 30 ? 'Medium' :
    'High';

  const riskColor = riskLevel === 'Low' ? 'text-emerald-400' : riskLevel === 'Medium' ? 'text-amber-400' : 'text-rose-400';

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] border group",
        familyStyle.border,
        "bg-gradient-to-br from-card to-card/80"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {rank && (
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                  #{rank}
                </div>
              )}
              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {name}
              </h3>
            </div>
            
            {/* Tickers Row */}
            <div className="flex flex-wrap gap-1">
              {tickers.map((ticker, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[10px] font-mono h-5 px-1.5 bg-muted/70"
                >
                  {ticker} <span className="opacity-60 ml-0.5">{weights[i]}%</span>
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Score Badge */}
          <div className="flex flex-col items-center gap-0.5">
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 border",
              score10 >= 8 ? 'border-amber-500/30' : 'border-border/50'
            )}>
              <div className="text-center">
                <div className={cn("text-lg font-bold", scoreColor)}>{score10}</div>
                <div className="text-[8px] text-muted-foreground -mt-0.5">/10</div>
              </div>
            </div>
            <span className={cn("text-[9px] font-medium", scoreColor)}>
              {getScoreLabel(score10)}
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {/* Avg Returns */}
          <div className="p-2 rounded-lg bg-muted/40 text-center">
            <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <TrendingUp className="h-2.5 w-2.5" />
              Avg Returns
            </div>
            <div className={cn(
              "text-sm font-bold",
              metrics.cagr >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {metrics.cagr >= 0 ? '+' : ''}{metrics.cagr.toFixed(1)}%
            </div>
          </div>

          {/* Sharpe */}
          <div className="p-2 rounded-lg bg-muted/40 text-center">
            <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <Zap className="h-2.5 w-2.5" />
              Sharpe
            </div>
            <div className={cn(
              "text-sm font-bold",
              metrics.sharpe >= 1 ? 'text-emerald-400' : metrics.sharpe >= 0.5 ? 'text-amber-400' : 'text-muted-foreground'
            )}>
              {metrics.sharpe.toFixed(2)}
            </div>
          </div>

          {/* Max Loss */}
          <div className="p-2 rounded-lg bg-muted/40 text-center">
            <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <TrendingDown className="h-2.5 w-2.5" />
              Max Loss
            </div>
            <div className="text-sm font-bold text-red-400">
              -{Math.abs(metrics.maxDrawdown).toFixed(1)}%
            </div>
          </div>

          {/* Risk Level */}
          <div className="p-2 rounded-lg bg-muted/40 text-center">
            <div className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <Shield className="h-2.5 w-2.5" />
              Risk
            </div>
            <div className={cn("text-sm font-bold", riskColor)}>
              {riskLevel}
            </div>
          </div>
        </div>

        {/* Total Return Bar - show period-matched return if available */}
        {(metrics.periodTotalReturn !== undefined || metrics.totalReturn !== undefined) && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">
                Total Return ({metrics.returnPeriodYears || screeningPeriod || 1}Y)
              </span>
              <span className={cn(
                "font-bold text-base",
                (metrics.periodTotalReturn ?? metrics.totalReturn ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                {(metrics.periodTotalReturn ?? metrics.totalReturn ?? 0) >= 0 ? '+' : ''}
                {(metrics.periodTotalReturn ?? metrics.totalReturn ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  (metrics.periodTotalReturn ?? metrics.totalReturn ?? 0) >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                )}
                style={{ width: `${Math.min(Math.abs(metrics.periodTotalReturn ?? metrics.totalReturn ?? 0), 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {family && (
              <Badge variant="outline" className={cn("text-[9px] capitalize", familyStyle.text, familyStyle.border)}>
                {family}
              </Badge>
            )}
            {metrics.dataPoints && (
              <span className="text-[9px] text-muted-foreground">
                {Math.round(metrics.dataPoints / 252)}Y data
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
            <span>View Details</span>
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
