/**
 * Backtest CTA Banner - Encourages users to try the backtesting feature
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Beaker, ArrowRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BacktestCTAProps {
  ticker: string;
  onNavigateToBacktest?: () => void;
  className?: string;
}

export function BacktestCTA({ ticker, onNavigateToBacktest, className }: BacktestCTAProps) {
  if (!onNavigateToBacktest) return null;

  return (
    <Card className={cn(
      "bg-gradient-to-r from-primary/5 via-primary/10 to-violet-500/5 border-primary/20 overflow-hidden relative group cursor-pointer hover:border-primary/40 transition-colors",
      className
    )} onClick={onNavigateToBacktest}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/15 shrink-0">
              <Beaker className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-xs flex items-center gap-1.5">
                Test a strategy on {ticker}
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Backtest RSI, Moving Average, and more strategies with real historical data
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            className="shrink-0 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToBacktest();
            }}
          >
            Try it
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
