/**
 * Strategy Backtester Component
 * 
 * Unified backtesting interface with the visual strategy builder,
 * real historical data, institutional-grade metrics, and Data Inspector.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { VisualStrategyBuilder } from '@/components/builder/VisualStrategyBuilder';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { retryWithBackoff } from '@/utils/retryWithBackoff';
import {
  InspectModeToggle,
  TradeSourceModal,
  Trade,
} from './DataInspector';
import { BacktestResultsDashboard } from './BacktestResultsDashboard';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface StrategyBacktesterProps {
  ticker: string;
  companyName: string;
}

interface PortfolioSnapshot {
  date: string;
  value: number;
  cash: number;
  positionValue: number;
  inPosition: boolean;
}

interface BacktestResult {
  success: boolean;
  strategy: string;
  ticker: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalValue: number;
  totalReturn: number;
  annualizedReturn: number;
  buyHoldReturn: number;
  outperformance: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDate: string;
  volatility: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  expectedValue: number;
  profitFactor: number;
  avgHoldingDays: number;
  trades: Trade[];
  portfolioHistory: PortfolioSnapshot[];
  tradingDays: number;
  dataSource: 'database' | 'polygon';
  dataSourceUrl: string;
  barsCount: number;
}

// Strategy definitions for mapping signal IDs to backend strategy names
const STRATEGY_MAP: Record<string, string> = {
  'rsi': 'rsi',
  'rsi-oversold': 'rsi',
  'rsi-overbought': 'rsi',
  'ma-crossover': 'ma-crossover',
  'price-above-sma': 'ma-crossover',
  'price-below-sma': 'ma-crossover',
  'ema-crossover': 'ma-crossover',
  'gap-fill': 'gap-fill',
  'gap-down': 'gap-fill',
  'consecutive-days': 'consecutive-days',
  'consecutive-down': 'consecutive-days',
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function StrategyBacktester({ ticker, companyName }: StrategyBacktesterProps) {
  const [period] = useState<'1Y' | '3Y' | '5Y'>('3Y');
  const [initialCapital] = useState(10000);
  
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  
  // Data Inspector state
  const [inspectMode, setInspectMode] = useState(false);
  const [viewSourceTrade, setViewSourceTrade] = useState<Trade | null>(null);

  // Handle backtest from Visual Strategy Builder
  const handleVisualBuilderBacktest = useCallback(async (serialized: { 
    strategy: string; 
    ticker: string; 
    params: Record<string, number | string | undefined> 
  }) => {
    // Map the strategy ID to backend strategy name
    const strategyId = STRATEGY_MAP[serialized.strategy] || serialized.strategy;
    
    // Run the backtest with the visual builder's config
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const endDate = new Date();
      const startDate = new Date();
      switch (period) {
        case '1Y': startDate.setFullYear(endDate.getFullYear() - 1); break;
        case '3Y': startDate.setFullYear(endDate.getFullYear() - 3); break;
        case '5Y': startDate.setFullYear(endDate.getFullYear() - 5); break;
      }

      // Wrap in retry logic to handle edge function cold starts
      const data = await retryWithBackoff(
        async () => {
          const response = await supabase.functions.invoke('strategy-backtest', {
            body: {
              ticker,
              strategy: strategyId,
              startDate: format(startDate, 'yyyy-MM-dd'),
              endDate: format(endDate, 'yyyy-MM-dd'),
              initialCapital,
              params: serialized.params,
            }
          });

          if (response.error) throw response.error;
          if (!response.data.success) {
            throw new Error(response.data.error || 'Backtest failed');
          }
          
          return response.data;
        },
        {
          maxAttempts: 3,
          initialDelayMs: 200,
          onRetry: (attempt) => {
            console.log(`[Visual Builder Backtest] Retry attempt ${attempt + 1}...`);
          }
        }
      );

      setResult(data as BacktestResult);
      toast.success(`Backtest complete: ${data.totalTrades} trades, ${data.totalReturn.toFixed(2)}% return`);

      // Return metrics for embedded builder results view
      return {
        totalReturn: data.totalReturn || 0,
        winRate: data.winRate || 0,
        totalTrades: data.totalTrades || 0,
        sharpeRatio: data.sharpeRatio || 0,
        maxDrawdown: data.maxDrawdown || 0,
        avgWin: data.avgWin || 0,
        avgLoss: data.avgLoss || 0,
        profitFactor: data.profitFactor || 0,
        avgHoldingDays: data.avgHoldingDays || 0,
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Backtest failed';
      setError(message);
      toast.error(message);
      return undefined;
    } finally {
      setIsRunning(false);
    }
  }, [ticker, period, initialCapital]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Strategy Backtester</h2>
          <p className="text-sm text-muted-foreground">
            Test trading strategies on {companyName} ({ticker}) with real historical data
          </p>
        </div>
        {result && <InspectModeToggle inspectMode={inspectMode} onToggle={setInspectMode} />}
      </div>

      {/* Unified Strategy Builder - contains presets + custom building */}
      <Card>
        <CardContent className="p-0">
          <VisualStrategyBuilder 
            embedded 
            initialTicker={ticker}
            onRunBacktest={handleVisualBuilderBacktest}
          />
        </CardContent>
      </Card>
      
      {/* Error Display */}
      {error && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isRunning && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-muted-foreground">Running backtest on {ticker}...</p>
            <p className="text-xs text-muted-foreground mt-1">Analyzing historical data</p>
          </CardContent>
        </Card>
      )}

      {/* Results Dashboard */}
      {result && !isRunning && (
        <BacktestResultsDashboard result={result} />
      )}

      {/* Trade Detail Modal */}
      <Dialog open={!!selectedTrade} onOpenChange={() => setSelectedTrade(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trade Details</DialogTitle>
            <DialogDescription>
              {selectedTrade?.entryDate} → {selectedTrade?.exitDate}
            </DialogDescription>
          </DialogHeader>
          {selectedTrade && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Entry</p>
                  <p className="font-semibold">${selectedTrade.entryPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(selectedTrade.entryDate), 'MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Exit</p>
                  <p className="font-semibold">${selectedTrade.exitPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(selectedTrade.exitDate), 'MMMM dd, yyyy')}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Shares</p>
                  <p className="font-semibold">{selectedTrade.shares}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Duration</p>
                  <p className="font-semibold">{selectedTrade.holdingDays} days</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Return</p>
                  <p className={cn(
                    "font-semibold",
                    selectedTrade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {selectedTrade.pnlPercent >= 0 ? '+' : ''}{selectedTrade.pnlPercent.toFixed(2)}% (${selectedTrade.pnl.toFixed(2)})
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-1 text-sm">Entry Signal</p>
                <p className="text-sm bg-secondary/50 p-2 rounded">{selectedTrade.entryReason}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-sm">Exit Signal</p>
                <p className="text-sm bg-secondary/50 p-2 rounded">{selectedTrade.exitReason}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Trade Source Modal (Data Inspector) */}
      <TradeSourceModal
        trade={viewSourceTrade}
        ticker={ticker}
        dataSource={result?.dataSource || 'database'}
        onClose={() => setViewSourceTrade(null)}
      />
    </div>
  );
}
