import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');

// ═══════════════════════════════════════════════════════════════════════════════
// POLYGON API FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchPolygonBars(ticker: string, startDate: string, endDate: string): Promise<Bar[] | null> {
  if (!POLYGON_API_KEY) {
    console.log('[strategy-backtest] No POLYGON_API_KEY configured');
    return null;
  }
  
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`;
    console.log(`[strategy-backtest] Fetching from Polygon API for ${ticker}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[strategy-backtest] Polygon API error: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      console.log(`[strategy-backtest] No results from Polygon for ${ticker}`);
      return null;
    }
    
    console.log(`[strategy-backtest] Got ${data.results.length} bars from Polygon for ${ticker}`);
    
    // Convert Polygon format to Bar format
    // Polygon timestamps are midnight UTC of the trading day
    // We need to add a few hours to ensure we get the correct trading day
    const bars: Bar[] = data.results.map((r: { t: number; o: number; h: number; l: number; c: number; v: number }, idx: number, arr: { c: number }[]) => {
      // Polygon timestamps are in ms, representing start of day UTC
      // Add 12 hours to ensure we're firmly in the trading day regardless of timezone
      const adjustedTimestamp = r.t + (12 * 60 * 60 * 1000);
      const dateObj = new Date(adjustedTimestamp);
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      
      const prevClose = idx > 0 ? arr[idx - 1].c : r.o;
      const dailyReturn = prevClose ? ((r.c - prevClose) / prevClose) * 100 : 0;
      
      return {
        date,
        open: r.o,
        high: r.h,
        low: r.l,
        close: r.c,
        volume: r.v,
        dailyReturn
      };
    });
    
    return bars;
  } catch (error) {
    console.error('[strategy-backtest] Polygon fetch error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dailyReturn?: number;
}

interface Trade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  type: 'LONG' | 'SHORT';
  entryReason: string;
  exitReason: string;
  holdingDays: number;
  // Data Inspector fields
  entryBarRaw?: Bar;
  exitBarRaw?: Bar;
  indicatorValueAtEntry?: number;
  indicatorValueAtExit?: number;
  indicatorName?: string;
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
  // Data Inspector fields
  dataSource: 'database' | 'polygon';
  dataSourceUrl: string;
  barsCount: number;
  rawBarsPreview: Bar[];
}

interface StrategyParams {
  // RSI
  rsiPeriod?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
  // MA Crossover
  fastMaPeriod?: number;
  slowMaPeriod?: number;
  // Gap Fill
  gapThreshold?: number;
  // Consecutive Days
  consecutiveDays?: number;
  holdingPeriod?: number;
  // General
  stopLossPercent?: number;
  takeProfitPercent?: number;
  positionSizePercent?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNICAL INDICATORS
// ═══════════════════════════════════════════════════════════════════════════════

function calculateSMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

function calculateEMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // First EMA is SMA
      const sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    } else {
      const prevEma = result[i - 1]!;
      const ema = (prices[i] - prevEma) * multiplier + prevEma;
      result.push(ema);
    }
  }
  return result;
}

function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const changes: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      const relevantChanges = changes.slice(i - period, i);
      let avgGain = 0;
      let avgLoss = 0;
      
      for (const change of relevantChanges) {
        if (change > 0) avgGain += change;
        else avgLoss += Math.abs(change);
      }
      
      avgGain /= period;
      avgLoss /= period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface StrategySignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
}

function rsiStrategy(
  bars: Bar[],
  index: number,
  rsiValues: (number | null)[],
  inPosition: boolean,
  params: StrategyParams
): StrategySignal {
  const rsi = rsiValues[index];
  const oversold = params.rsiOversold ?? 30;
  const overbought = params.rsiOverbought ?? 70;
  
  if (rsi === null) return { action: 'HOLD', reason: 'Insufficient data for RSI' };
  
  if (!inPosition && rsi < oversold) {
    return { action: 'BUY', reason: `RSI (${rsi.toFixed(1)}) below ${oversold} - oversold` };
  }
  
  if (inPosition && rsi > overbought) {
    return { action: 'SELL', reason: `RSI (${rsi.toFixed(1)}) above ${overbought} - overbought` };
  }
  
  return { action: 'HOLD', reason: `RSI at ${rsi.toFixed(1)}` };
}

function maStrategy(
  bars: Bar[],
  index: number,
  fastMa: (number | null)[],
  slowMa: (number | null)[],
  inPosition: boolean,
  _params: StrategyParams
): StrategySignal {
  const fast = fastMa[index];
  const slow = slowMa[index];
  const prevFast = index > 0 ? fastMa[index - 1] : null;
  const prevSlow = index > 0 ? slowMa[index - 1] : null;
  
  if (fast === null || slow === null || prevFast === null || prevSlow === null) {
    return { action: 'HOLD', reason: 'Insufficient data for MA' };
  }
  
  // Golden cross: fast crosses above slow
  if (!inPosition && prevFast < prevSlow && fast > slow) {
    return { action: 'BUY', reason: `Golden Cross: Fast MA (${fast.toFixed(2)}) crossed above Slow MA (${slow.toFixed(2)})` };
  }
  
  // Death cross: fast crosses below slow
  if (inPosition && prevFast > prevSlow && fast < slow) {
    return { action: 'SELL', reason: `Death Cross: Fast MA (${fast.toFixed(2)}) crossed below Slow MA (${slow.toFixed(2)})` };
  }
  
  return { action: 'HOLD', reason: `Fast MA: ${fast.toFixed(2)}, Slow MA: ${slow.toFixed(2)}` };
}

function gapFillStrategy(
  bars: Bar[],
  index: number,
  inPosition: boolean,
  entryPrice: number | null,
  params: StrategyParams
): StrategySignal {
  if (index < 1) return { action: 'HOLD', reason: 'Need previous bar' };
  
  const prevClose = bars[index - 1].close;
  const todayOpen = bars[index].open;
  const todayClose = bars[index].close;
  const threshold = params.gapThreshold ?? 2; // 2% gap
  const takeProfit = params.takeProfitPercent ?? null;
  
  // Log params on first call for debugging
  if (index === 1) {
    console.log('[Gap Strategy] Params received:', JSON.stringify(params));
    console.log('[Gap Strategy] Threshold set to:', threshold, 'Take Profit:', takeProfit);
  }
  
  const gapPercent = ((todayOpen - prevClose) / prevClose) * 100;
  
  // Log significant gaps for debugging
  if (Math.abs(gapPercent) > threshold) {
    console.log(`[Gap Strategy] ${bars[index].date}: Gap ${gapPercent.toFixed(2)}%, threshold: ${threshold}%, inPosition: ${inPosition}`);
  }
  
  // Gap down detected - only enter if not already in position
  if (!inPosition && gapPercent < -threshold) {
    return { action: 'BUY', reason: `Gap down of ${gapPercent.toFixed(2)}% (below -${threshold}%)` };
  }
  
  // Exit conditions when in position
  if (inPosition && entryPrice !== null) {
    const currentReturn = ((todayClose - entryPrice) / entryPrice) * 100;
    
    // Take profit takes priority if set and reached
    if (takeProfit !== null && currentReturn >= takeProfit) {
      return { action: 'SELL', reason: `Take profit triggered at +${takeProfit}% (current: +${currentReturn.toFixed(2)}%)` };
    }
    
    // Default gap-fill exit: price returned to entry
    if (todayClose >= entryPrice) {
      return { action: 'SELL', reason: `Gap filled - price returned to entry ($${entryPrice.toFixed(2)})` };
    }
  }
  
  return { action: 'HOLD', reason: `Gap: ${gapPercent.toFixed(2)}%` };
}

function consecutiveDaysStrategy(
  bars: Bar[],
  index: number,
  inPosition: boolean,
  entryIndex: number | null,
  params: StrategyParams
): StrategySignal {
  const consecutiveDays = params.consecutiveDays ?? 3;
  const holdingPeriod = params.holdingPeriod ?? 5;
  
  if (index < consecutiveDays) return { action: 'HOLD', reason: 'Need more history' };
  
  // Check for consecutive down days
  if (!inPosition) {
    let downDays = 0;
    for (let i = 0; i < consecutiveDays; i++) {
      const dayReturn = (bars[index - i].close - bars[index - i].open) / bars[index - i].open;
      if (dayReturn < 0) downDays++;
    }
    
    if (downDays === consecutiveDays) {
      return { action: 'BUY', reason: `${consecutiveDays} consecutive down days - mean reversion expected` };
    }
  }
  
  // Exit after holding period
  if (inPosition && entryIndex !== null) {
    const daysHeld = index - entryIndex;
    if (daysHeld >= holdingPeriod) {
      return { action: 'SELL', reason: `Holding period of ${holdingPeriod} days reached` };
    }
  }
  
  return { action: 'HOLD', reason: 'Waiting for signal' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BACKTEST ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function runBacktest(
  bars: Bar[],
  strategy: string,
  initialCapital: number,
  params: StrategyParams,
  dataSource: 'database' | 'polygon',
  dataSourceUrl: string
): Omit<BacktestResult, 'success' | 'ticker' | 'startDate' | 'endDate'> {
  const trades: Trade[] = [];
  const portfolioHistory: PortfolioSnapshot[] = [];
  
  let cash = initialCapital;
  let shares = 0;
  let inPosition = false;
  let entryPrice: number | null = null;
  let entryDate: string | null = null;
  let entryIndex: number | null = null;
  let entryReason = '';
  let entryBarRaw: Bar | null = null;
  let entryIndicatorValue: number | null = null;
  
  const positionSize = (params.positionSizePercent ?? 100) / 100;
  const stopLoss = params.stopLossPercent ?? null;
  const takeProfit = params.takeProfitPercent ?? null;
  
  // Pre-calculate indicators
  const closes = bars.map(b => b.close);
  const rsiPeriod = params.rsiPeriod ?? 14;
  const fastPeriod = params.fastMaPeriod ?? 10;
  const slowPeriod = params.slowMaPeriod ?? 50;
  
  const rsiValues = calculateRSI(closes, rsiPeriod);
  const fastMa = calculateEMA(closes, fastPeriod);
  const slowMa = calculateSMA(closes, slowPeriod);
  
  // Determine indicator name based on strategy
  const getIndicatorName = (strat: string): string => {
    switch (strat) {
      case 'rsi': return 'RSI';
      case 'ma-crossover': return 'Fast EMA';
      case 'gap-fill': return 'Gap %';
      case 'consecutive-days': return 'Down Days';
      default: return 'Indicator';
    }
  };
  
  const getIndicatorValue = (strat: string, idx: number): number | null => {
    switch (strat) {
      case 'rsi': return rsiValues[idx];
      case 'ma-crossover': return fastMa[idx];
      case 'gap-fill': 
        if (idx < 1) return null;
        return ((bars[idx].open - bars[idx - 1].close) / bars[idx - 1].close) * 100;
      case 'consecutive-days':
        let count = 0;
        for (let j = 0; j < Math.min(idx + 1, 5); j++) {
          const dayRet = (bars[idx - j].close - bars[idx - j].open) / bars[idx - j].open;
          if (dayRet < 0) count++;
          else break;
        }
        return count;
      default: return null;
    }
  };
  
  const indicatorName = getIndicatorName(strategy);
  
  // Process each bar
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const positionValue = inPosition ? shares * bar.close : 0;
    const totalValue = cash + positionValue;
    
    portfolioHistory.push({
      date: bar.date,
      value: totalValue,
      cash,
      positionValue,
      inPosition
    });
    
    // Check stop loss / take profit first
    if (inPosition && entryPrice !== null) {
      const currentReturn = ((bar.close - entryPrice) / entryPrice) * 100;
      
      if (stopLoss !== null && currentReturn <= -stopLoss) {
        // Stop loss triggered
        const pnl = shares * (bar.close - entryPrice);
        trades.push({
          entryDate: entryDate!,
          exitDate: bar.date,
          entryPrice,
          exitPrice: bar.close,
          shares,
          pnl,
          pnlPercent: currentReturn,
          type: 'LONG',
          entryReason,
          exitReason: `Stop loss triggered at -${stopLoss}%`,
          holdingDays: i - entryIndex!,
          entryBarRaw: entryBarRaw || undefined,
          exitBarRaw: { ...bar },
          indicatorValueAtEntry: entryIndicatorValue ?? undefined,
          indicatorValueAtExit: getIndicatorValue(strategy, i) ?? undefined,
          indicatorName
        });
        
        cash += shares * bar.close;
        shares = 0;
        inPosition = false;
        entryPrice = null;
        entryDate = null;
        entryIndex = null;
        entryBarRaw = null;
        entryIndicatorValue = null;
        continue;
      }
      
      if (takeProfit !== null && currentReturn >= takeProfit) {
        // Take profit triggered
        const pnl = shares * (bar.close - entryPrice);
        trades.push({
          entryDate: entryDate!,
          exitDate: bar.date,
          entryPrice,
          exitPrice: bar.close,
          shares,
          pnl,
          pnlPercent: currentReturn,
          type: 'LONG',
          entryReason,
          exitReason: `Take profit triggered at +${takeProfit}%`,
          holdingDays: i - entryIndex!,
          entryBarRaw: entryBarRaw || undefined,
          exitBarRaw: { ...bar },
          indicatorValueAtEntry: entryIndicatorValue ?? undefined,
          indicatorValueAtExit: getIndicatorValue(strategy, i) ?? undefined,
          indicatorName
        });
        
        cash += shares * bar.close;
        shares = 0;
        inPosition = false;
        entryPrice = null;
        entryDate = null;
        entryIndex = null;
        entryBarRaw = null;
        entryIndicatorValue = null;
        continue;
      }
    }
    
    // Get strategy signal
    let signal: StrategySignal;
    
    switch (strategy) {
      case 'rsi':
        signal = rsiStrategy(bars, i, rsiValues, inPosition, params);
        break;
      case 'ma-crossover':
        signal = maStrategy(bars, i, fastMa, slowMa, inPosition, params);
        break;
      case 'gap-fill':
        signal = gapFillStrategy(bars, i, inPosition, entryPrice, params);
        break;
      case 'consecutive-days':
        signal = consecutiveDaysStrategy(bars, i, inPosition, entryIndex, params);
        break;
      default:
        signal = { action: 'HOLD', reason: 'Unknown strategy' };
    }
    
    // Execute signal
    if (signal.action === 'BUY' && !inPosition) {
      const amountToInvest = cash * positionSize;
      shares = Math.floor(amountToInvest / bar.close);
      if (shares > 0) {
        cash -= shares * bar.close;
        inPosition = true;
        entryPrice = bar.close;
        entryDate = bar.date;
        entryIndex = i;
        entryReason = signal.reason;
        entryBarRaw = { ...bar };
        entryIndicatorValue = getIndicatorValue(strategy, i);
      }
    } else if (signal.action === 'SELL' && inPosition && entryPrice !== null) {
      const pnl = shares * (bar.close - entryPrice);
      const pnlPercent = ((bar.close - entryPrice) / entryPrice) * 100;
      
      trades.push({
        entryDate: entryDate!,
        exitDate: bar.date,
        entryPrice,
        exitPrice: bar.close,
        shares,
        pnl,
        pnlPercent,
        type: 'LONG',
        entryReason,
        exitReason: signal.reason,
        holdingDays: i - entryIndex!,
        entryBarRaw: entryBarRaw || undefined,
        exitBarRaw: { ...bar },
        indicatorValueAtEntry: entryIndicatorValue ?? undefined,
        indicatorValueAtExit: getIndicatorValue(strategy, i) ?? undefined,
        indicatorName
      });
      
      cash += shares * bar.close;
      shares = 0;
      inPosition = false;
      entryPrice = null;
      entryDate = null;
      entryIndex = null;
      entryBarRaw = null;
      entryIndicatorValue = null;
    }
  }
  
  // Close any open position at end
  if (inPosition && entryPrice !== null && bars.length > 0) {
    const lastBar = bars[bars.length - 1];
    const pnl = shares * (lastBar.close - entryPrice);
    const pnlPercent = ((lastBar.close - entryPrice) / entryPrice) * 100;
    
    trades.push({
      entryDate: entryDate!,
      exitDate: lastBar.date,
      entryPrice,
      exitPrice: lastBar.close,
      shares,
      pnl,
      pnlPercent,
      type: 'LONG',
      entryReason,
      exitReason: 'End of backtest period',
      holdingDays: bars.length - 1 - entryIndex!,
      entryBarRaw: entryBarRaw || undefined,
      exitBarRaw: { ...lastBar },
      indicatorValueAtEntry: entryIndicatorValue ?? undefined,
      indicatorValueAtExit: getIndicatorValue(strategy, bars.length - 1) ?? undefined,
      indicatorName
    });
    
    cash += shares * lastBar.close;
  }
  
  // Calculate metrics
  const finalValue = cash;
  const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;
  const years = bars.length / 252;
  const annualizedReturn = years > 0 ? (Math.pow(finalValue / initialCapital, 1 / years) - 1) * 100 : 0;
  
  // Buy and hold comparison
  const firstClose = bars[0]?.close || 1;
  const lastClose = bars[bars.length - 1]?.close || firstClose;
  const buyHoldReturn = ((lastClose - firstClose) / firstClose) * 100;
  
  // Calculate daily returns for Sharpe/Sortino
  const dailyReturns: number[] = [];
  for (let i = 1; i < portfolioHistory.length; i++) {
    const prevValue = portfolioHistory[i - 1].value;
    if (prevValue > 0) {
      dailyReturns.push((portfolioHistory[i].value - prevValue) / prevValue);
    }
  }
  
  const avgDailyReturn = dailyReturns.length > 0 
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length 
    : 0;
  const dailyStdDev = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / (dailyReturns.length - 1))
    : 0;
  
  const annualizedVol = dailyStdDev * Math.sqrt(252) * 100;
  const riskFreeRate = 0.04;
  const sharpeRatio = annualizedVol > 0 ? (annualizedReturn - riskFreeRate * 100) / annualizedVol : 0;
  
  // Sortino (downside deviation only)
  const negativeReturns = dailyReturns.filter(r => r < 0);
  const downsideDeviation = negativeReturns.length > 0
    ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length) * Math.sqrt(252) * 100
    : 0.001;
  const sortinoRatio = downsideDeviation > 0 ? (annualizedReturn - riskFreeRate * 100) / downsideDeviation : 0;
  
  // Max drawdown
  let peak = initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownDate = '';
  
  for (const snapshot of portfolioHistory) {
    if (snapshot.value > peak) peak = snapshot.value;
    const drawdown = ((peak - snapshot.value) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownDate = snapshot.date;
    }
  }
  
  // Trade statistics
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  
  const avgWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / winningTrades.length 
    : 0;
  const avgLoss = losingTrades.length > 0 
    ? losingTrades.reduce((sum, t) => sum + Math.abs(t.pnlPercent), 0) / losingTrades.length 
    : 0;
  
  const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.pnlPercent)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.pnlPercent)) : 0;
  
  // Expected value per trade
  const expectedValue = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;
  
  // Profit factor
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  
  const avgHoldingDays = trades.length > 0 
    ? trades.reduce((sum, t) => sum + t.holdingDays, 0) / trades.length 
    : 0;
  
  return {
    strategy,
    initialCapital,
    finalValue: Math.round(finalValue * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    annualizedReturn: Math.round(annualizedReturn * 100) / 100,
    buyHoldReturn: Math.round(buyHoldReturn * 100) / 100,
    outperformance: Math.round((totalReturn - buyHoldReturn) * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sortinoRatio: Math.round(sortinoRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownDate,
    volatility: Math.round(annualizedVol * 100) / 100,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: Math.round(winRate * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    bestTrade: Math.round(bestTrade * 100) / 100,
    worstTrade: Math.round(worstTrade * 100) / 100,
    expectedValue: Math.round(expectedValue * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    avgHoldingDays: Math.round(avgHoldingDays * 10) / 10,
    trades,
    portfolioHistory,
    tradingDays: bars.length,
    // Data Inspector fields
    dataSource,
    dataSourceUrl,
    barsCount: bars.length,
    rawBarsPreview: bars.slice(0, 10) // First 10 bars for inspection
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker, strategy, startDate, endDate, initialCapital = 10000, params = {} } = await req.json();
    
    console.log('[strategy-backtest] Received params:', JSON.stringify(params));

    if (!ticker || !strategy) {
      return new Response(
        JSON.stringify({ success: false, error: 'ticker and strategy are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[strategy-backtest] Running ${strategy} on ${ticker} from ${startDate} to ${endDate}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedTicker = ticker.toUpperCase().trim();

    // Fetch OHLCV data from market_daily_bars first
    let bars: Bar[] = [];
    let dataSource: 'database' | 'polygon' = 'database';
    let dataSourceUrl = '';

    const { data: priceData, error } = await supabase
      .from('market_daily_bars')
      .select('bar_date, open, high, low, close, volume, daily_return')
      .eq('ticker', normalizedTicker)
      .gte('bar_date', startDate)
      .lte('bar_date', endDate)
      .order('bar_date', { ascending: true });

    if (error) {
      console.error('[strategy-backtest] Database error:', error);
    }

    if (priceData && priceData.length >= 50) {
      console.log(`[strategy-backtest] Using ${priceData.length} bars from database for ${normalizedTicker}`);
      dataSourceUrl = `Lovable Cloud DB: market_daily_bars (ticker=${normalizedTicker})`;
      bars = priceData.map(row => ({
        date: row.bar_date,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        dailyReturn: row.daily_return
      }));
    } else {
      // Fallback to Polygon API
      console.log(`[strategy-backtest] Insufficient database data (${priceData?.length || 0} bars), trying Polygon API...`);
      const polygonBars = await fetchPolygonBars(normalizedTicker, startDate, endDate);
      
      if (polygonBars && polygonBars.length >= 50) {
        bars = polygonBars;
        dataSource = 'polygon';
        dataSourceUrl = `https://api.polygon.io/v2/aggs/ticker/${normalizedTicker}/range/1/day/${startDate}/${endDate}`;
        console.log(`[strategy-backtest] Using ${bars.length} bars from Polygon for ${normalizedTicker}`);
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Insufficient data for ${normalizedTicker}. Database: ${priceData?.length || 0} bars, Polygon: ${polygonBars?.length || 0} bars. Need at least 50.`,
            availableBars: priceData?.length || 0,
            polygonBars: polygonBars?.length || 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    console.log(`[strategy-backtest] Proceeding with ${bars.length} bars from ${dataSource}`);

    // Run backtest
    const result = runBacktest(bars, strategy, initialCapital, params, dataSource, dataSourceUrl);

    console.log(`[strategy-backtest] Complete: ${result.totalTrades} trades, ${result.totalReturn.toFixed(2)}% return`);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        ticker: normalizedTicker,
        startDate: bars[0]?.date || startDate,
        endDate: bars[bars.length - 1]?.date || endDate
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[strategy-backtest] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
