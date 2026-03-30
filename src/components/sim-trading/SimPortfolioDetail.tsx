import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { PositionsTable } from './PositionsTable';
import { TradeDialog } from './TradeDialog';
import { TradeHistory } from './TradeHistory';
import { SimChartSection } from './SimChartSection';
import { PendingOrdersTab } from './PendingOrdersTab';
import { SimWatchlist } from './SimWatchlist';
import { SimPortfolioAnalytics } from './SimPortfolioAnalytics';
import { BacktestComparisonOverlay } from './BacktestComparisonOverlay';
import { SimBacktestTab } from './SimBacktestTab';
import { StrategySignalBadge } from './StrategySignalBadge';
import { PortfolioJournal } from './PortfolioJournal';
import { TradingLearningHub } from './learning/TradingLearningHub';
import { PostTradeReflection } from './learning/PostTradeReflection';
import { PositionDetailDialog } from './PositionDetailDialog';
import { useOrderExecution } from '@/hooks/useOrderExecution';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SimPortfolio {
  id: string;
  name: string;
  initial_capital: number;
  cash_balance: number;
  status: string;
  created_at: string;
  strategy_name?: string | null;
  strategy_config?: any;
  backtest_results?: any;
  linked_ticker?: string | null;
}

export interface SimTrade {
  id: string;
  portfolio_id: string;
  ticker: string;
  instrument_type: string;
  action: string;
  quantity: number;
  price_at_execution: number;
  total_cost: number;
  option_type: string | null;
  strike_price: number | null;
  expiration_date: string | null;
  contract_multiplier: number;
  executed_at: string;
}

export interface Position {
  ticker: string;
  instrument_type: string;
  option_type: string | null;
  strike_price: number | null;
  expiration_date: string | null;
  quantity: number;
  avg_cost: number;
  total_cost: number;
  current_price: number | null;
  current_value: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  contract_multiplier: number;
}

interface Props {
  portfolioId: string;
  onBack: () => void;
}

export function SimPortfolioDetail({ portfolioId, onBack }: Props) {
  const { user } = useAuth();
  const { checkAndExecuteOrders } = useOrderExecution();
  const [portfolio, setPortfolio] = useState<SimPortfolio | null>(null);
  const [trades, setTrades] = useState<SimTrade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartTicker, setChartTicker] = useState('SPY');
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflectionData, setReflectionData] = useState<{ tradeId: string; ticker: string; pnl: number | null; pnlPct: number | null } | null>(null);
  const [goals, setGoals] = useState<any>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [positionDetailOpen, setPositionDetailOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [portfolioRes, tradesRes, ordersRes, goalsRes] = await Promise.all([
        supabase.from('sim_portfolios').select('*').eq('id', portfolioId).single(),
        supabase.from('sim_trades').select('*').eq('portfolio_id', portfolioId).order('executed_at', { ascending: true }),
        supabase.from('sim_pending_orders').select('*').eq('portfolio_id', portfolioId).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('sim_portfolio_goals').select('*').eq('portfolio_id', portfolioId).maybeSingle(),
      ]);

      if (portfolioRes.error) {
        toast.error('Failed to load portfolio');
        return;
      }
      if (portfolioRes.data) setPortfolio(portfolioRes.data as SimPortfolio);

      const tradeData = (tradesRes.data || []) as SimTrade[];
      setTrades([...tradeData].reverse());
      await calculatePositions(tradeData);

      setPendingOrders(ordersRes.data || []);
      if (goalsRes.data) setGoals(goalsRes.data);

      // Check pending orders against current prices
      if (portfolioRes.data && ordersRes.data && ordersRes.data.length > 0) {
        const executed = await checkAndExecuteOrders(portfolioId, portfolioRes.data.cash_balance);
        if (executed > 0) {
          // Refetch if orders were filled
          const [pRes, tRes, oRes] = await Promise.all([
            supabase.from('sim_portfolios').select('*').eq('id', portfolioId).single(),
            supabase.from('sim_trades').select('*').eq('portfolio_id', portfolioId).order('executed_at', { ascending: true }),
            supabase.from('sim_pending_orders').select('*').eq('portfolio_id', portfolioId).eq('status', 'pending').order('created_at', { ascending: false }),
          ]);
          if (pRes.data) setPortfolio(pRes.data as SimPortfolio);
          const newTrades = (tRes.data || []) as SimTrade[];
          setTrades([...newTrades].reverse());
          await calculatePositions(newTrades);
          setPendingOrders(oRes.data || []);
        }
      }
    } catch (e) {
      console.error('SimPortfolioDetail fetch error:', e);
      toast.error('Failed to load simulation data');
    }
    setLoading(false);
  }, [portfolioId, checkAndExecuteOrders]);

  const calculatePositions = async (chronologicalTrades: SimTrade[]) => {
    const posMap = new Map<string, Position>();

    for (const trade of chronologicalTrades) {
      const key = trade.instrument_type === 'option'
        ? `${trade.ticker}-${trade.option_type}-${trade.strike_price}-${trade.expiration_date}`
        : trade.ticker;

      const multiplier = trade.instrument_type === 'option' ? trade.contract_multiplier : 1;
      const existing = posMap.get(key);

      if (!existing) {
        const qty = trade.action === 'buy' ? trade.quantity : -trade.quantity;
        posMap.set(key, {
          ticker: trade.ticker,
          instrument_type: trade.instrument_type,
          option_type: trade.option_type,
          strike_price: trade.strike_price,
          expiration_date: trade.expiration_date,
          quantity: qty,
          avg_cost: trade.price_at_execution,
          total_cost: trade.price_at_execution * Math.abs(qty) * multiplier,
          current_price: null,
          current_value: null,
          pnl: null,
          pnl_pct: null,
          contract_multiplier: multiplier,
        });
      } else {
        if (trade.action === 'buy') {
          const oldTotal = existing.avg_cost * existing.quantity * multiplier;
          const newTotal = trade.price_at_execution * trade.quantity * multiplier;
          const newQty = existing.quantity + trade.quantity;
          if (newQty > 0) {
            existing.avg_cost = (oldTotal + newTotal) / (newQty * multiplier);
          }
          existing.quantity = newQty;
        } else {
          existing.quantity = Math.max(0, existing.quantity - trade.quantity);
        }
        existing.total_cost = existing.avg_cost * existing.quantity * multiplier;
      }
    }

    const openPositions = Array.from(posMap.values()).filter(p => p.quantity > 0);

    // Fetch live stock quotes
    const stockTickers = [...new Set(openPositions.filter(p => p.instrument_type === 'stock').map(p => p.ticker.toUpperCase()))];
    let quotes = new Map<string, any>();
    if (stockTickers.length > 0) {
      try {
        quotes = await getCachedQuotes(stockTickers);
      } catch (e) {
        console.error('Failed to fetch live quotes:', e);
      }
    }

    // Fetch live option prices from Tradier
    const optionPositions = openPositions.filter(p => p.instrument_type === 'option');
    const optionsByUnderlying = new Map<string, Position[]>();
    for (const pos of optionPositions) {
      const underlying = pos.ticker.toUpperCase();
      if (!optionsByUnderlying.has(underlying)) optionsByUnderlying.set(underlying, []);
      optionsByUnderlying.get(underlying)!.push(pos);
    }

    // Fetch option chains per underlying + expiration to get real prices
    const optionFetches = Array.from(optionsByUnderlying.entries()).flatMap(([underlying, positions]) => {
      const expirations = [...new Set(positions.map(p => p.expiration_date).filter(Boolean))];
      return expirations.map(async (exp) => {
        try {
          const { data } = await supabase.functions.invoke('yahoo-options-chain', {
            body: { ticker: underlying, expirationDate: exp },
          });
          if (data?.ok && data.contracts) {
            for (const pos of positions.filter(p => p.expiration_date === exp)) {
              const match = data.contracts.find((c: any) =>
                c.contract_type === pos.option_type &&
                Math.abs(c.strike_price - (pos.strike_price || 0)) < 0.01 &&
                c.expiration_date === pos.expiration_date
              );
              if (match) {
                pos.current_price = match.mid || match.last_price || pos.avg_cost;
              }
            }
          }
        } catch (e) {
          console.error(`Failed to fetch option prices for ${underlying} ${exp}:`, e);
        }
      });
    });

    await Promise.allSettled(optionFetches);

    for (const pos of openPositions) {
      if (pos.instrument_type === 'stock') {
        const quote = quotes.get(pos.ticker.toUpperCase());
        if (quote) {
          pos.current_price = quote.price ?? null;
          if (pos.current_price !== null) {
            pos.current_value = pos.current_price * pos.quantity;
            pos.pnl = pos.current_value - pos.total_cost;
            pos.pnl_pct = pos.total_cost > 0 ? (pos.pnl / pos.total_cost) * 100 : 0;
          }
        }
      } else {
        // Option: use fetched live price, or fall back to avg_cost
        if (pos.current_price == null) pos.current_price = pos.avg_cost;
        pos.current_value = pos.current_price * pos.quantity * pos.contract_multiplier;
        pos.pnl = pos.current_value - pos.total_cost;
        pos.pnl_pct = pos.total_cost > 0 ? (pos.pnl / pos.total_cost) * 100 : 0;
      }
    }

    setPositions(openPositions);

    // Set chart to first position ticker if available
    if (openPositions.length > 0) {
      setChartTicker(prev => {
        if (prev === 'SPY' || !prev) return openPositions[0].ticker.toUpperCase();
        return prev;
      });
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  // Record daily snapshot for historical tracking
  useEffect(() => {
    if (!portfolio || positions.length === 0 && portfolio.cash_balance === portfolio.initial_capital) return;
    const totalPosValue = positions.reduce((sum, p) => sum + (p.current_value || 0), 0);
    const totalVal = portfolio.cash_balance + totalPosValue;
    const today = new Date().toISOString().split('T')[0];

    const recordSnapshot = async () => {
      try {
        await supabase.from('sim_snapshots').upsert(
          {
            portfolio_id: portfolio.id,
            snapshot_date: today,
            total_value: totalVal,
            cash_balance: portfolio.cash_balance,
            positions_value: totalPosValue,
          },
          { onConflict: 'portfolio_id,snapshot_date' }
        );
      } catch (e) {
        console.warn('Failed to record snapshot:', e);
      }
    };
    recordSnapshot();
  }, [portfolio, positions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Prices refreshed');
  };

  const handleTradeComplete = () => {
    setTradeOpen(false);
    fetchData();
  };

  const handleClosePosition = async (pos: Position) => {
    if (!portfolio || !user) return;
    const multiplier = pos.instrument_type === 'option' ? pos.contract_multiplier : 1;
    const sellPrice = pos.current_price || pos.avg_cost;
    const totalProceeds = sellPrice * pos.quantity * multiplier;

    const { error: tradeErr } = await supabase.from('sim_trades').insert({
      portfolio_id: portfolio.id,
      ticker: pos.ticker,
      instrument_type: pos.instrument_type,
      action: 'sell',
      quantity: pos.quantity,
      price_at_execution: sellPrice,
      total_cost: totalProceeds,
      option_type: pos.option_type,
      strike_price: pos.strike_price,
      expiration_date: pos.expiration_date,
      contract_multiplier: multiplier,
    });

    if (tradeErr) {
      toast.error('Failed to close position: ' + tradeErr.message);
      return;
    }

    const { error: updateErr } = await supabase
      .from('sim_portfolios')
      .update({ cash_balance: portfolio.cash_balance + totalProceeds })
      .eq('id', portfolio.id);

    if (updateErr) {
      toast.error('Position closed but failed to update balance');
    } else {
      toast.success(`Closed ${pos.ticker} for $${totalProceeds.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);

      // Trigger post-trade reflection
      const latestTrades = await supabase.from('sim_trades').select('id').eq('portfolio_id', portfolio.id).order('executed_at', { ascending: false }).limit(1);
      const tradeId = latestTrades.data?.[0]?.id || '';
      setReflectionData({
        tradeId,
        ticker: pos.ticker,
        pnl: pos.pnl,
        pnlPct: pos.pnl_pct,
      });
      setReflectionOpen(true);

      fetchData();
    }
  };

  const handleDeletePortfolio = async () => {
    if (!portfolio) return;
    const { error } = await supabase.from('sim_portfolios').delete().eq('id', portfolio.id);
    if (error) {
      toast.error('Failed to delete portfolio');
    } else {
      toast.success('Portfolio deleted');
      onBack();
    }
  };

  const handlePositionClick = (pos: Position) => {
    setSelectedPosition(pos);
    setPositionDetailOpen(true);
    setChartTicker(pos.ticker.toUpperCase());
  };

  const handleSellPartial = async (pos: Position, qty: number) => {
    if (!portfolio || !user) return;
    const multiplier = pos.instrument_type === 'option' ? pos.contract_multiplier : 1;
    const sellPrice = pos.current_price || pos.avg_cost;
    const totalProceeds = sellPrice * qty * multiplier;

    const { error: tradeErr } = await supabase.from('sim_trades').insert({
      portfolio_id: portfolio.id,
      ticker: pos.ticker,
      instrument_type: pos.instrument_type,
      action: 'sell',
      quantity: qty,
      price_at_execution: sellPrice,
      total_cost: totalProceeds,
      option_type: pos.option_type,
      strike_price: pos.strike_price,
      expiration_date: pos.expiration_date,
      contract_multiplier: multiplier,
    });

    if (tradeErr) {
      toast.error('Failed to sell: ' + tradeErr.message);
      return;
    }

    await supabase.from('sim_portfolios').update({ cash_balance: portfolio.cash_balance + totalProceeds }).eq('id', portfolio.id);
    toast.success(`Sold ${qty} ${pos.ticker} for $${totalProceeds.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);

    const latestTrades = await supabase.from('sim_trades').select('id').eq('portfolio_id', portfolio.id).order('executed_at', { ascending: false }).limit(1);
    const tradeId = latestTrades.data?.[0]?.id || '';
    setReflectionData({ tradeId, ticker: pos.ticker, pnl: null, pnlPct: null });
    setReflectionOpen(true);
    fetchData();
  };

  if (loading || !portfolio) {
    return <div className="text-muted-foreground text-center py-12">Loading simulation...</div>;
  }

  const totalPositionsValue = positions.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalPortfolioValue = portfolio.cash_balance + totalPositionsValue;
  const totalPnL = totalPortfolioValue - portfolio.initial_capital;
  const totalPnLPct = portfolio.initial_capital > 0 ? (totalPnL / portfolio.initial_capital) * 100 : 0;
  const investedCapital = portfolio.initial_capital - portfolio.cash_balance;
  const investedPct = portfolio.initial_capital > 0 ? (investedCapital / portfolio.initial_capital) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{portfolio.name}</h1>
          <p className="text-sm text-muted-foreground">Paper Trading Simulation</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <TradeDialog
          open={tradeOpen}
          onOpenChange={setTradeOpen}
          portfolioId={portfolio.id}
          cashBalance={portfolio.cash_balance}
          currentPortfolioValue={totalPortfolioValue}
          positions={positions}
          onComplete={handleTradeComplete}
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this simulation?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete "{portfolio.name}" and all its trades. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePortfolio} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Portfolio Value</p>
            <p className="text-lg font-bold font-mono">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Cash</p>
            <p className="text-lg font-bold font-mono">${portfolio.cash_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Invested</p>
            <p className="text-lg font-bold font-mono">${investedCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">{investedPct.toFixed(1)}% deployed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Open Positions</p>
            <p className="text-lg font-bold">{positions.length}</p>
            <p className="text-xs text-muted-foreground">{trades.length} total trades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <p className={`text-lg font-bold font-mono ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Watchlist row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <SimChartSection
            defaultTicker={chartTicker}
            trades={trades}
            onTickerChange={setChartTicker}
          />
        </div>
        <div className="lg:col-span-1 space-y-4">
          <SimWatchlist onSelectTicker={(t) => setChartTicker(t)} />
          {/* Strategy comparison overlay for linked portfolios */}
          <BacktestComparisonOverlay
            backtestResults={portfolio.backtest_results}
            strategyName={portfolio.strategy_name || null}
            simStartDate={portfolio.created_at}
            simInitialCapital={portfolio.initial_capital}
            simCurrentValue={totalPortfolioValue}
          />
        </div>
      </div>

      {/* Strategy signal badge in header area */}
      {portfolio.strategy_name && (
        <div className="flex items-center gap-2 px-1">
          <StrategySignalBadge
            strategyName={portfolio.strategy_name}
            signal="hold"
          />
          <span className="text-xs text-muted-foreground">
            Linked to backtest: {portfolio.strategy_name} on {portfolio.linked_ticker}
          </span>
        </div>
      )}

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
          <TabsTrigger value="orders">
            Orders {pendingOrders.length > 0 && `(${pendingOrders.length})`}
          </TabsTrigger>
          <TabsTrigger value="history">History ({trades.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="backtest">Backtest</TabsTrigger>
        </TabsList>
        <TabsContent value="positions">
          <PositionsTable positions={positions} onClose={handleClosePosition} onRowClick={handlePositionClick} />
        </TabsContent>
        <TabsContent value="orders">
          <PendingOrdersTab orders={pendingOrders} onRefresh={fetchData} />
        </TabsContent>
        <TabsContent value="history">
          <TradeHistory trades={trades} />
        </TabsContent>
        <TabsContent value="performance">
          <SimPortfolioAnalytics portfolioId={portfolioId} initialCapital={portfolio.initial_capital} trades={trades} positions={positions} currentValue={totalPortfolioValue} cashBalance={portfolio.cash_balance} />
        </TabsContent>
        <TabsContent value="journal">
          <PortfolioJournal
            portfolioId={portfolioId}
            initialCapital={portfolio.initial_capital}
            currentValue={totalPortfolioValue}
            cashBalance={portfolio.cash_balance}
            trades={trades}
            positions={positions}
            backtestResults={portfolio.backtest_results}
            strategyName={portfolio.strategy_name}
          />
        </TabsContent>
        <TabsContent value="learning">
          <TradingLearningHub
            portfolioId={portfolioId}
            trades={trades}
            positions={positions}
            initialCapital={portfolio.initial_capital}
            currentValue={totalPortfolioValue}
            cashBalance={portfolio.cash_balance}
            goals={goals}
          />
        </TabsContent>
        <TabsContent value="backtest">
          <SimBacktestTab
            heldTickers={positions.map(p => p.ticker.toUpperCase())}
            activeTicker={chartTicker}
            portfolioName={portfolio.name}
          />
        </TabsContent>
      </Tabs>

      {/* Position detail dialog */}
      <PositionDetailDialog
        position={selectedPosition}
        open={positionDetailOpen}
        onOpenChange={setPositionDetailOpen}
        onSellFull={handleClosePosition}
        onSellPartial={handleSellPartial}
        portfolioValue={totalPortfolioValue}
        cashBalance={portfolio.cash_balance}
      />

      {/* Post-trade reflection dialog */}
      {reflectionData && (
        <PostTradeReflection
          open={reflectionOpen}
          onOpenChange={setReflectionOpen}
          portfolioId={portfolioId}
          tradeId={reflectionData.tradeId}
          ticker={reflectionData.ticker}
          action="sell"
          pnl={reflectionData.pnl}
          pnlPct={reflectionData.pnlPct}
        />
      )}
    </div>
  );
}
