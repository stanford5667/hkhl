import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { toast } from 'sonner';

interface PendingOrder {
  id: string;
  portfolio_id: string;
  ticker: string;
  instrument_type: string;
  order_type: string;
  side: string;
  quantity: number;
  limit_price: number | null;
  stop_price: number | null;
  option_type: string | null;
  strike_price: number | null;
  expiration_date: string | null;
  contract_multiplier: number;
}

export function useOrderExecution() {
  const checkAndExecuteOrders = useCallback(async (portfolioId: string, cashBalance: number) => {
    // Fetch pending orders
    const { data: orders, error } = await supabase
      .from('sim_pending_orders')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('status', 'pending');

    if (error || !orders || orders.length === 0) return 0;

    // Get unique stock tickers
    const tickers = [...new Set(orders.filter(o => o.instrument_type === 'stock').map(o => o.ticker.toUpperCase()))];
    let quotes = new Map<string, any>();
    if (tickers.length > 0) {
      try {
        quotes = await getCachedQuotes(tickers);
      } catch (e) {
        console.error('Order execution: failed to fetch quotes', e);
        return 0;
      }
    }

    let executed = 0;
    let currentCash = cashBalance;

    for (const order of orders as PendingOrder[]) {
      const quote = quotes.get(order.ticker.toUpperCase());
      if (!quote || !quote.price || quote.price <= 0) continue;

      const currentPrice = quote.price;
      let shouldExecute = false;

      if (order.order_type === 'limit') {
        if (order.side === 'buy' && order.limit_price && currentPrice <= order.limit_price) {
          shouldExecute = true;
        } else if (order.side === 'sell' && order.limit_price && currentPrice >= order.limit_price) {
          shouldExecute = true;
        }
      } else if (order.order_type === 'stop') {
        if (order.side === 'buy' && order.stop_price && currentPrice >= order.stop_price) {
          shouldExecute = true;
        } else if (order.side === 'sell' && order.stop_price && currentPrice <= order.stop_price) {
          shouldExecute = true;
        }
      }

      if (!shouldExecute) continue;

      const multiplier = order.instrument_type === 'option' ? (order.contract_multiplier || 100) : 1;
      const totalCost = currentPrice * order.quantity * multiplier;

      if (order.side === 'buy' && totalCost > currentCash) continue;

      // Execute: insert trade
      const { error: tradeErr } = await supabase.from('sim_trades').insert({
        portfolio_id: order.portfolio_id,
        ticker: order.ticker,
        instrument_type: order.instrument_type,
        action: order.side,
        quantity: order.quantity,
        price_at_execution: currentPrice,
        total_cost: totalCost,
        option_type: order.option_type,
        strike_price: order.strike_price,
        expiration_date: order.expiration_date,
        contract_multiplier: multiplier,
      });

      if (tradeErr) {
        console.error('Order execution failed:', tradeErr);
        continue;
      }

      // Mark order as filled
      await supabase
        .from('sim_pending_orders')
        .update({ status: 'filled', filled_at: new Date().toISOString() })
        .eq('id', order.id);

      // Update cash
      currentCash = order.side === 'buy' ? currentCash - totalCost : currentCash + totalCost;
      executed++;

      toast.success(`${order.order_type.toUpperCase()} order filled: ${order.side.toUpperCase()} ${order.quantity} ${order.ticker} @ $${currentPrice.toFixed(2)}`);
    }

    // Update portfolio cash if any orders were executed
    if (executed > 0) {
      await supabase
        .from('sim_portfolios')
        .update({ cash_balance: currentCash })
        .eq('id', portfolioId);
    }

    return executed;
  }, []);

  return { checkAndExecuteOrders };
}
