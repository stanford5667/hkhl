import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { PositionsTable } from './PositionsTable';
import { TradeDialog } from './TradeDialog';
import { TradeHistory } from './TradeHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface SimPortfolio {
  id: string;
  name: string;
  initial_capital: number;
  cash_balance: number;
  status: string;
  created_at: string;
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
  const [portfolio, setPortfolio] = useState<SimPortfolio | null>(null);
  const [trades, setTrades] = useState<SimTrade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [portfolioRes, tradesRes] = await Promise.all([
      supabase.from('sim_portfolios').select('*').eq('id', portfolioId).single(),
      supabase.from('sim_trades').select('*').eq('portfolio_id', portfolioId).order('executed_at', { ascending: false }),
    ]);

    if (portfolioRes.data) setPortfolio(portfolioRes.data as SimPortfolio);
    if (tradesRes.data) {
      setTrades(tradesRes.data as SimTrade[]);
      await calculatePositions(tradesRes.data as SimTrade[]);
    }
    setLoading(false);
  }, [portfolioId]);

  const calculatePositions = async (allTrades: SimTrade[]) => {
    // Aggregate trades into positions
    const posMap = new Map<string, Position>();

    for (const trade of allTrades) {
      // Create a unique key per position
      const key = trade.instrument_type === 'option'
        ? `${trade.ticker}-${trade.option_type}-${trade.strike_price}-${trade.expiration_date}`
        : trade.ticker;

      const existing = posMap.get(key);
      const multiplier = trade.instrument_type === 'option' ? trade.contract_multiplier : 1;

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
          const newQty = existing.quantity + trade.quantity;
          if (newQty !== 0) {
            existing.avg_cost = ((existing.avg_cost * existing.quantity * multiplier) + (trade.price_at_execution * trade.quantity * multiplier)) / (newQty * multiplier);
          }
          existing.quantity = newQty;
        } else {
          existing.quantity -= trade.quantity;
        }
        existing.total_cost = existing.avg_cost * Math.abs(existing.quantity) * multiplier;
      }
    }

    // Filter out closed positions (quantity = 0)
    const openPositions = Array.from(posMap.values()).filter(p => p.quantity > 0);

    // Fetch live quotes for stock positions
    const stockTickers = [...new Set(openPositions.filter(p => p.instrument_type === 'stock').map(p => p.ticker))];
    let quotes = new Map<string, any>();
    if (stockTickers.length > 0) {
      try {
        quotes = await getCachedQuotes(stockTickers);
      } catch (e) {
        console.error('Failed to fetch quotes', e);
      }
    }

    // Update positions with live prices
    for (const pos of openPositions) {
      if (pos.instrument_type === 'stock') {
        const quote = quotes.get(pos.ticker.toUpperCase());
        if (quote) {
          pos.current_price = quote.price ?? null;
          if (pos.current_price) {
            pos.current_value = pos.current_price * pos.quantity;
            pos.pnl = pos.current_value - pos.total_cost;
            pos.pnl_pct = (pos.pnl / pos.total_cost) * 100;
          }
        }
      } else {
        // Options: we don't have live option prices, show cost basis only
        pos.current_price = pos.avg_cost; // last known price
        pos.current_value = pos.avg_cost * pos.quantity * pos.contract_multiplier;
        pos.pnl = 0;
        pos.pnl_pct = 0;
      }
    }

    setPositions(openPositions);
  };

  useEffect(() => { fetchData(); }, [fetchData]);

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
      toast.error('Failed to close position');
      return;
    }

    const { error: updateErr } = await supabase
      .from('sim_portfolios')
      .update({ cash_balance: portfolio.cash_balance + totalProceeds })
      .eq('id', portfolio.id);

    if (!updateErr) {
      toast.success(`Closed ${pos.ticker} position`);
      fetchData();
    }
  };

  if (loading || !portfolio) {
    return <div className="text-muted-foreground text-center py-12">Loading...</div>;
  }

  const totalPositionsValue = positions.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalPortfolioValue = portfolio.cash_balance + totalPositionsValue;
  const totalPnL = totalPortfolioValue - portfolio.initial_capital;
  const totalPnLPct = (totalPnL / portfolio.initial_capital) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{portfolio.name}</h1>
          <p className="text-sm text-muted-foreground">Simulation Trading</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <TradeDialog
          open={tradeOpen}
          onOpenChange={setTradeOpen}
          portfolioId={portfolio.id}
          cashBalance={portfolio.cash_balance}
          onComplete={handleTradeComplete}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-xl font-bold font-mono">${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Cash Balance</p>
            <p className="text-xl font-bold font-mono">${portfolio.cash_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Positions Value</p>
            <p className="text-xl font-bold font-mono">${totalPositionsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <p className={`text-xl font-bold font-mono ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm ml-1">({totalPnLPct.toFixed(2)}%)</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>
        <TabsContent value="positions">
          <PositionsTable positions={positions} onClose={handleClosePosition} />
        </TabsContent>
        <TabsContent value="history">
          <TradeHistory trades={trades} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
