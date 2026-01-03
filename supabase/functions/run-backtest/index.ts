import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers, startDate, endDate, initialCapital = 100000, strategy = 'buy_hold', rebalanceFrequency = 'monthly' } = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'tickers array is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[run-backtest] Running backtest for ${tickers.join(', ')} from ${startDate} to ${endDate}`);
    console.log(`[run-backtest] Strategy: ${strategy}, Capital: ${initialCapital}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedTickers = tickers.map((t: string) => t.toUpperCase().trim());

    // Fetch price data from stock_price_cache table
    const { data: priceData, error } = await supabase
      .from('stock_price_cache')
      .select('ticker, trade_date, open_price, close_price, adjusted_close, volume')
      .in('ticker', normalizedTickers)
      .gte('trade_date', startDate)
      .lte('trade_date', endDate)
      .order('trade_date', { ascending: true });

    if (error) {
      console.error('[run-backtest] Database error:', error);
      return new Response(
        JSON.stringify({ success: false, error: `Database error: ${error.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!priceData || priceData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No price data found. The data will be fetched automatically - please try again.',
          hint: 'The fetch-stock-batch function should populate the cache first.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[run-backtest] Retrieved ${priceData.length} total price rows from stock_price_cache`);

    // Organize data by date
    const pricesByDate: Record<string, Record<string, number>> = {};
    const allDatesSet = new Set<string>();
    const tickerCounts: Record<string, number> = {};
    
    priceData.forEach(row => {
      const price = row.adjusted_close || row.close_price;
      if (!price || price <= 0) return;
      
      if (!pricesByDate[row.trade_date]) {
        pricesByDate[row.trade_date] = {};
      }
      pricesByDate[row.trade_date][row.ticker] = price;
      allDatesSet.add(row.trade_date);
      tickerCounts[row.ticker] = (tickerCounts[row.ticker] || 0) + 1;
    });

    const allDates = Array.from(allDatesSet).sort();
    
    console.log(`[run-backtest] Unique trading dates: ${allDates.length}`);
    console.log(`[run-backtest] Date range: ${allDates[0]} to ${allDates[allDates.length - 1]}`);
    console.log(`[run-backtest] Rows per ticker:`, tickerCounts);

    // Calculate expected trading days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const expectedTradingDays = Math.floor(totalDays * 252 / 365);
    
    const warnings: string[] = [];
    if (allDates.length < expectedTradingDays * 0.8) {
      warnings.push(`Data may be incomplete: ${allDates.length} trading days found, expected ~${expectedTradingDays}`);
    }

    for (const ticker of normalizedTickers) {
      if (!tickerCounts[ticker]) {
        warnings.push(`No data found for ${ticker}`);
      } else if (tickerCounts[ticker] < expectedTradingDays * 0.8) {
        warnings.push(`${ticker} has only ${tickerCounts[ticker]} days of data (expected ~${expectedTradingDays})`);
      }
    }

    if (allDates.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid trading days found in data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Run backtest
    const portfolioHistory: PortfolioSnapshot[] = [];
    const trades: Trade[] = [];
    
    let cash = initialCapital;
    const holdings: Record<string, number> = {};
    
    // Get first date prices
    const firstDate = allDates[0];
    const firstPrices = pricesByDate[firstDate];
    
    // Initial allocation - only use tickers that have prices on first date
    const availableTickers = normalizedTickers.filter(t => firstPrices[t] && firstPrices[t] > 0);
    
    if (availableTickers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No tickers have valid prices on the start date',
          firstDate,
          requestedTickers: normalizedTickers,
          availablePrices: firstPrices
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[run-backtest] Available tickers on ${firstDate}: ${availableTickers.join(', ')}`);

    // Buy initial positions
    const perStock = initialCapital / availableTickers.length;
    
    for (const ticker of availableTickers) {
      const price = firstPrices[ticker];
      const shares = Math.floor(perStock / price);
      
      if (shares > 0) {
        holdings[ticker] = shares;
        const cost = shares * price;
        cash -= cost;
        
        trades.push({
          date: firstDate,
          ticker,
          action: 'BUY',
          shares,
          price: Math.round(price * 100) / 100,
        });
        
        console.log(`[run-backtest] Initial buy: ${shares} ${ticker} @ $${price.toFixed(2)}`);
      }
    }

    // Track portfolio daily
    let lastRebalanceMonth = new Date(firstDate).getMonth();
    let lastRebalanceQuarter = Math.floor(new Date(firstDate).getMonth() / 3);
    
    for (const date of allDates) {
      const prices = pricesByDate[date];
      
      // Calculate portfolio value
      let stockValue = 0;
      for (const [ticker, shares] of Object.entries(holdings)) {
        if (prices[ticker]) {
          stockValue += shares * prices[ticker];
        }
      }
      const portfolioValue = cash + stockValue;
      
      portfolioHistory.push({ 
        date, 
        value: Math.round(portfolioValue * 100) / 100 
      });

      // Rebalancing for equal weight strategy
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
          // Sell all holdings
          for (const [ticker, shares] of Object.entries(holdings)) {
            if (prices[ticker] && shares > 0) {
              const value = shares * prices[ticker];
              cash += value;
              trades.push({
                date,
                ticker,
                action: 'SELL',
                shares,
                price: Math.round(prices[ticker] * 100) / 100,
              });
              holdings[ticker] = 0;
            }
          }

          // Rebuy equal weight
          const tickersWithPrices = availableTickers.filter(t => prices[t] && prices[t] > 0);
          const newPerStock = cash / tickersWithPrices.length;
          
          for (const ticker of tickersWithPrices) {
            const price = prices[ticker];
            const shares = Math.floor(newPerStock / price);
            if (shares > 0) {
              holdings[ticker] = shares;
              const cost = shares * price;
              cash -= cost;
              trades.push({
                date,
                ticker,
                action: 'BUY',
                shares,
                price: Math.round(price * 100) / 100,
              });
            }
          }
        }
      }
    }

    // Calculate metrics
    const finalValue = portfolioHistory[portfolioHistory.length - 1]?.value || initialCapital;
    const totalReturn = (finalValue - initialCapital) / initialCapital;
    
    // Use actual trading days for annualization
    const years = allDates.length / 252;
    const annualizedReturn = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;

    // Calculate daily returns
    const dailyReturns: number[] = [];
    for (let i = 1; i < portfolioHistory.length; i++) {
      const prevValue = portfolioHistory[i-1].value;
      if (prevValue > 0) {
        dailyReturns.push((portfolioHistory[i].value - prevValue) / prevValue);
      }
    }

    // Sharpe ratio and volatility
    let sharpeRatio = 0;
    let annualizedVol = 0;
    
    if (dailyReturns.length > 1) {
      const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (dailyReturns.length - 1);
      const dailyVol = Math.sqrt(variance);
      annualizedVol = dailyVol * Math.sqrt(252);
      
      // Sharpe = (Return - Risk-free) / Volatility, using 4% risk-free rate
      sharpeRatio = annualizedVol > 0 ? (annualizedReturn - 0.04) / annualizedVol : 0;
    }

    // Max drawdown
    let peak = initialCapital;
    let maxDrawdown = 0;
    
    for (const point of portfolioHistory) {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = (peak - point.value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate final holdings values
    const lastDate = allDates[allDates.length - 1];
    const lastPrices = pricesByDate[lastDate];
    const finalHoldings: Record<string, number> = {};
    
    for (const [ticker, shares] of Object.entries(holdings)) {
      if (shares > 0) {
        finalHoldings[ticker] = shares;
      }
    }

    const metrics = {
      totalReturn: Math.round(totalReturn * 10000) / 100,
      annualizedReturn: Math.round(annualizedReturn * 10000) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      volatility: Math.round(annualizedVol * 10000) / 100,
      initialCapital,
      finalValue: Math.round(finalValue * 100) / 100,
      tradingDays: allDates.length,
      years: Math.round(years * 100) / 100,
      totalTrades: trades.length
    };

    const dataQuality = {
      totalRows: priceData.length,
      tradingDays: allDates.length,
      expectedDays: expectedTradingDays,
      completeness: Math.round((allDates.length / expectedTradingDays) * 100),
      dateRange: {
        requested: { start: startDate, end: endDate },
        actual: { start: allDates[0], end: allDates[allDates.length - 1] }
      },
      rowsPerTicker: tickerCounts
    };

    console.log('[run-backtest] Complete:', {
      tradingDays: allDates.length,
      years: metrics.years,
      totalReturn: metrics.totalReturn,
      annualizedReturn: metrics.annualizedReturn
    });

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        dataQuality,
        warnings: warnings.length > 0 ? warnings : undefined,
        portfolioHistory,
        finalHoldings,
        trades,
        cashRemaining: Math.round(cash * 100) / 100
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
