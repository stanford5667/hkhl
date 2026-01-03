import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StockData {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  date: string;
  ticker: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price: number;
}

interface PortfolioSnapshot {
  date: string;
  value: number;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getStockData(supabase: any, ticker: string, startDate: string, endDate: string): Promise<StockData[]> {
  const cacheKey = `stock_${ticker}_${startDate}_${endDate}`;
  
  console.log(`[run-backtest] Looking for cache key: ${cacheKey}`);
  
  const { data: cachedData, error } = await supabase
    .from('cached_api_data')
    .select('data')
    .eq('cache_key', cacheKey)
    .eq('cache_type', 'stock_historical')
    .maybeSingle();

  if (error) {
    console.error(`[run-backtest] Cache lookup error:`, error);
    return [];
  }

  if (cachedData?.data) {
    console.log(`[run-backtest] Found cached data for ${ticker}`);
    return cachedData.data as StockData[];
  }
  
  console.log(`[run-backtest] No cached data found for ${ticker}`);
  return [];
}

function calculateMetrics(
  portfolioHistory: PortfolioSnapshot[],
  initialCapital: number,
  trades: Trade[]
): Record<string, number> {
  if (portfolioHistory.length === 0) {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      initialCapital,
      finalValue: initialCapital,
      tradingDays: 0,
      totalTrades: 0,
      volatility: 0,
    };
  }

  const finalValue = portfolioHistory[portfolioHistory.length - 1].value;
  const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;

  // Calculate daily returns
  const dailyReturns: number[] = [];
  for (let i = 1; i < portfolioHistory.length; i++) {
    const ret = (portfolioHistory[i].value - portfolioHistory[i - 1].value) / portfolioHistory[i - 1].value;
    dailyReturns.push(ret);
  }

  // Annualized return
  const tradingDays = portfolioHistory.length;
  const years = tradingDays / 252;
  const annualizedReturn = years > 0 ? (Math.pow(finalValue / initialCapital, 1 / years) - 1) * 100 : 0;

  // Volatility (annualized)
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length || 0;
  const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length || 0;
  const dailyVolatility = Math.sqrt(variance);
  const annualizedVolatility = dailyVolatility * Math.sqrt(252) * 100;

  // Sharpe Ratio (assuming risk-free rate of 4%)
  const riskFreeRate = 0.04;
  const excessReturn = annualizedReturn / 100 - riskFreeRate;
  const sharpeRatio = annualizedVolatility > 0 ? excessReturn / (annualizedVolatility / 100) : 0;

  // Max Drawdown
  let maxDrawdown = 0;
  let peak = portfolioHistory[0].value;
  for (const snapshot of portfolioHistory) {
    if (snapshot.value > peak) {
      peak = snapshot.value;
    }
    const drawdown = (peak - snapshot.value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return {
    totalReturn: Math.round(totalReturn * 100) / 100,
    annualizedReturn: Math.round(annualizedReturn * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
    initialCapital,
    finalValue: Math.round(finalValue * 100) / 100,
    tradingDays,
    totalTrades: trades.length,
    volatility: Math.round(annualizedVolatility * 100) / 100,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers, startDate, endDate, initialCapital, strategy, rebalanceFrequency } = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'tickers array is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[run-backtest] Running backtest for ${tickers.join(', ')} from ${startDate} to ${endDate}`);
    console.log(`[run-backtest] Strategy: ${strategy}, Capital: ${initialCapital}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all stock data
    const stockDataMap: Record<string, StockData[]> = {};
    for (const ticker of tickers) {
      stockDataMap[ticker] = await getStockData(supabase, ticker, startDate, endDate);
      console.log(`[run-backtest] Got ${stockDataMap[ticker].length} bars for ${ticker}`);
    }

    // Check if we have data
    const hasData = Object.values(stockDataMap).some(data => data.length > 0);
    if (!hasData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No stock data available. Please run fetch-stock-batch first.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build a unified timeline
    const allDates = new Set<string>();
    for (const data of Object.values(stockDataMap)) {
      for (const bar of data) {
        allDates.add(bar.date);
      }
    }
    const sortedDates = Array.from(allDates).sort();

    // Build price maps
    const priceMaps: Record<string, Record<string, number>> = {};
    for (const ticker of tickers) {
      priceMaps[ticker] = {};
      for (const bar of stockDataMap[ticker]) {
        priceMaps[ticker][bar.date] = bar.close;
      }
    }

    // Initialize portfolio
    const trades: Trade[] = [];
    const portfolioHistory: PortfolioSnapshot[] = [];
    const holdings: Record<string, number> = {};
    let cash = initialCapital;
    const allocationPerStock = initialCapital / tickers.length;

    // Buy initial positions on first day
    const firstDate = sortedDates[0];
    for (const ticker of tickers) {
      const price = priceMaps[ticker][firstDate];
      if (price && price > 0) {
        const shares = Math.floor(allocationPerStock / price);
        if (shares > 0) {
          holdings[ticker] = shares;
          cash -= shares * price;
          trades.push({
            date: firstDate,
            ticker,
            action: 'BUY',
            shares,
            price,
          });
        }
      }
    }

    // Track portfolio value over time
    let lastRebalanceMonth = new Date(firstDate).getMonth();
    let lastRebalanceQuarter = Math.floor(new Date(firstDate).getMonth() / 3);

    for (const date of sortedDates) {
      // Calculate current portfolio value
      let portfolioValue = cash;
      for (const ticker of tickers) {
        const shares = holdings[ticker] || 0;
        const price = priceMaps[ticker][date];
        if (price && shares > 0) {
          portfolioValue += shares * price;
        }
      }

      portfolioHistory.push({ date, value: Math.round(portfolioValue * 100) / 100 });

      // Rebalancing logic for equal_weight strategy
      if (strategy === 'equal_weight' && date !== firstDate) {
        const currentDate = new Date(date);
        const currentMonth = currentDate.getMonth();
        const currentQuarter = Math.floor(currentMonth / 3);

        let shouldRebalance = false;
        if (rebalanceFrequency === 'monthly' && currentMonth !== lastRebalanceMonth) {
          shouldRebalance = true;
          lastRebalanceMonth = currentMonth;
        } else if (rebalanceFrequency === 'quarterly' && currentQuarter !== lastRebalanceQuarter) {
          shouldRebalance = true;
          lastRebalanceQuarter = currentQuarter;
        }

        if (shouldRebalance) {
          // Sell all positions
          for (const ticker of tickers) {
            const shares = holdings[ticker] || 0;
            const price = priceMaps[ticker][date];
            if (price && shares > 0) {
              cash += shares * price;
              trades.push({
                date,
                ticker,
                action: 'SELL',
                shares,
                price,
              });
              holdings[ticker] = 0;
            }
          }

          // Buy equal weight
          const perStockAllocation = cash / tickers.length;
          for (const ticker of tickers) {
            const price = priceMaps[ticker][date];
            if (price && price > 0) {
              const shares = Math.floor(perStockAllocation / price);
              if (shares > 0) {
                holdings[ticker] = shares;
                cash -= shares * price;
                trades.push({
                  date,
                  ticker,
                  action: 'BUY',
                  shares,
                  price,
                });
              }
            }
          }
        }
      }
    }

    // Calculate final holdings
    const finalHoldings: Record<string, number> = {};
    for (const ticker of tickers) {
      if (holdings[ticker] && holdings[ticker] > 0) {
        finalHoldings[ticker] = holdings[ticker];
      }
    }

    // Calculate metrics
    const metrics = calculateMetrics(portfolioHistory, initialCapital, trades);

    console.log(`[run-backtest] Backtest complete. Final value: $${metrics.finalValue}, Return: ${metrics.totalReturn}%`);

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        portfolioHistory,
        finalHoldings,
        trades,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[run-backtest] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
