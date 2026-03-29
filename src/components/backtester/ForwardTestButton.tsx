/**
 * "Forward Test This" Button
 * 
 * Appears on backtest results. Creates a linked sim portfolio
 * that carries the strategy config + backtest results for comparison.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlayCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { BacktestResultData } from './BacktestResultsDashboard';

interface ForwardTestButtonProps {
  result: BacktestResultData;
  className?: string;
}

export function ForwardTestButton({ result, className }: ForwardTestButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [capital, setCapital] = useState(String(result.initialCapital || 10000));
  const [name, setName] = useState(`${result.strategy} — ${result.ticker}`);

  const handleCreate = async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    setCreating(true);
    const capitalNum = Math.max(1000, parseFloat(capital) || 10000);

    // Store key backtest metrics for comparison overlay
    const backtestSummary = {
      totalReturn: result.totalReturn,
      annualizedReturn: result.annualizedReturn,
      sharpeRatio: result.sharpeRatio,
      maxDrawdown: result.maxDrawdown,
      winRate: result.winRate,
      profitFactor: result.profitFactor,
      totalTrades: result.totalTrades,
      avgHoldingDays: result.avgHoldingDays,
      buyHoldReturn: result.buyHoldReturn,
      startDate: result.startDate,
      endDate: result.endDate,
      portfolioHistory: result.portfolioHistory?.slice(-252) || [], // Last year of equity curve
    };

    // Store the strategy config for signal generation
    const strategyConfig = {
      strategy: result.strategy,
      ticker: result.ticker,
      dataSource: result.dataSource,
    };

    const { data, error } = await supabase.from('sim_portfolios').insert({
      user_id: user.id,
      name: name.trim() || `${result.strategy} — ${result.ticker}`,
      initial_capital: capitalNum,
      cash_balance: capitalNum,
      strategy_name: result.strategy,
      strategy_config: strategyConfig as any,
      backtest_results: backtestSummary as any,
      linked_ticker: result.ticker,
    }).select('id').single();

    if (error) {
      console.error('Forward test creation error:', error);
      toast.error('Failed to create forward test: ' + error.message);
    } else {
      toast.success('Forward test created! Redirecting to sim trading...');
      setOpen(false);
      navigate('/sim-trading');
    }
    setCreating(false);
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <PlayCircle className="w-4 h-4 mr-2" />
        Forward Test This
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forward Test Strategy</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create a paper trading portfolio linked to this backtest. Your sim performance will be compared against the backtest's predicted returns.
          </p>

          <div className="space-y-4 mt-2">
            {/* Strategy summary */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Strategy</span>
                <span className="font-medium">{result.strategy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticker</span>
                <span className="font-mono">{result.ticker}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Backtest Return</span>
                <span className={`font-mono ${result.totalReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-mono">{result.winRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sharpe</span>
                <span className="font-mono">{result.sharpeRatio.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <Label>Portfolio Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. RSI Oversold — SPY"
              />
            </div>

            <div>
              <Label>Starting Capital ($)</Label>
              <Input
                type="number"
                value={capital}
                onChange={e => setCapital(e.target.value)}
                min="1000"
                step="1000"
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum $1,000</p>
            </div>

            <Button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="w-full"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                <><PlayCircle className="w-4 h-4 mr-2" /> Create Forward Test</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
