import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');

// ═══════════════════════════════════════════════════════════════════════════════
// PING HANDLER - Fast response for edge function warm-up
// ═══════════════════════════════════════════════════════════════════════════════

async function handlePing(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, timestamp: Date.now() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET HOLIDAYS - US Market Holiday Validation
// ═══════════════════════════════════════════════════════════════════════════════

// Normalize incoming date strings to YYYY-MM-DD.
// Some sources can return ISO timestamps (e.g. "2024-09-08T00:00:00+00:00").
// If we don't normalize, weekend/holiday detection can silently fail.
function normalizeDate(dateLike: string): string {
  if (!dateLike) return dateLike;
  return dateLike.length >= 10 ? dateLike.slice(0, 10) : dateLike;
}

// Fixed US holidays (month, day) - 0-indexed months
const FIXED_HOLIDAYS = [
  { month: 0, day: 1 },   // New Year's Day
  { month: 6, day: 4 },   // Independence Day
  { month: 11, day: 25 }, // Christmas Day
];

// Get nth occurrence of a day in a month (e.g., 3rd Monday)
function getNthDayOfMonth(year: number, month: number, dayOfWeek: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  let dayOffset = dayOfWeek - firstDay.getDay();
  if (dayOffset < 0) dayOffset += 7;
  return new Date(year, month, 1 + dayOffset + (n - 1) * 7);
}

// Get last occurrence of a day in a month
function getLastDayOfMonth(year: number, month: number, dayOfWeek: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  let dayOffset = lastDay.getDay() - dayOfWeek;
  if (dayOffset < 0) dayOffset += 7;
  return new Date(year, month + 1, -dayOffset);
}

// Get observed holiday (Friday if Saturday, Monday if Sunday)
function getObservedHoliday(date: Date): Date {
  const day = date.getDay();
  if (day === 6) return new Date(date.getTime() - 24 * 60 * 60 * 1000);
  if (day === 0) return new Date(date.getTime() + 24 * 60 * 60 * 1000);
  return date;
}

// Easter Sunday calculation
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

// Get all US market holidays for a given year
function getMarketHolidays(year: number): string[] {
  const holidays: Date[] = [];
  
  // Fixed holidays with observed adjustments
  for (const { month, day } of FIXED_HOLIDAYS) {
    holidays.push(getObservedHoliday(new Date(year, month, day)));
  }
  
  // Juneteenth (observed)
  holidays.push(getObservedHoliday(new Date(year, 5, 19)));
  
  // Floating holidays
  holidays.push(getNthDayOfMonth(year, 0, 1, 3)); // MLK Day
  holidays.push(getNthDayOfMonth(year, 1, 1, 3)); // Presidents Day
  const easter = getEasterSunday(year);
  holidays.push(new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000)); // Good Friday
  holidays.push(getLastDayOfMonth(year, 4, 1)); // Memorial Day
  holidays.push(getNthDayOfMonth(year, 8, 1, 1)); // Labor Day
  holidays.push(getNthDayOfMonth(year, 10, 4, 4)); // Thanksgiving
  
  return holidays.map(d => d.toISOString().split('T')[0]);
}

// Check if date is a weekend
function isWeekend(dateStr: string): boolean {
  const d = new Date(normalizeDate(dateStr) + 'T12:00:00Z');
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

// Check if date is a valid trading day
function isTradingDay(dateStr: string): boolean {
  const normalized = normalizeDate(dateStr);
  if (isWeekend(normalized)) return false;
  const year = parseInt(normalized.split('-')[0]);
  const holidays = getMarketHolidays(year);
  return !holidays.includes(normalized);
}

// Get next valid trading day from a given date
function getNextTradingDay(dateStr: string): string {
  let date = new Date(normalizeDate(dateStr) + 'T12:00:00Z');
  let attempts = 0;
  const maxAttempts = 30; // Prevent infinite loop
  
  while (!isTradingDay(date.toISOString().split('T')[0]) && attempts < maxAttempts) {
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    attempts++;
  }
  
  return date.toISOString().split('T')[0];
}

// Count trading days between two dates (for accurate holding period calculation)
function countTradingDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(normalizeDate(startDate) + 'T12:00:00Z');
  const end = new Date(normalizeDate(endDate) + 'T12:00:00Z');
  let count = 0;
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (isTradingDay(dateStr)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Subtract 1 because we don't count entry day, only holding days
  return Math.max(0, count - 1);
}

// Calendar day difference (UTC noon anchor to avoid TZ rollover)
function countCalendarDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(normalizeDate(startDate) + 'T12:00:00Z');
  const end = new Date(normalizeDate(endDate) + 'T12:00:00Z');
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / msPerDay));
}

// Check if a date is in the future (beyond today)
function isFutureDate(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return normalizeDate(dateStr) > today;
}

// Execution realism configuration
interface ExecutionConfig {
  slippageBps: number;           // 10 = 0.10% (10 basis points)
  commissionPerTrade: number;    // $0.99 default
  applySlippage: boolean;
  applyCommission: boolean;
}

const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  slippageBps: 0,               // Disabled - focus on pure strategy performance
  commissionPerTrade: 0.99,     // $0.99 per trade
  applySlippage: false,         // Slippage disabled for now
  applyCommission: true,
};

// Apply slippage to price (direction: 'buy' = worse fill = higher, 'sell' = lower)
function applySlippageToPrice(price: number, direction: 'buy' | 'sell', slippageBps: number): number {
  const slippageMultiplier = slippageBps / 10000;
  if (direction === 'buy') {
    return price * (1 + slippageMultiplier);
  } else {
    return price * (1 - slippageMultiplier);
  }
}

// Single source of truth for fills + commissions.
// IMPORTANT: Any place we mutate cash/equity MUST use this exact model.
function getExecutionFill(
  basePrice: number,
  side: 'buy' | 'sell',
  config: ExecutionConfig
): { price: number; commission: number } {
  const price = config.applySlippage
    ? applySlippageToPrice(basePrice, side, config.slippageBps)
    : basePrice;
  const commission = config.applyCommission ? config.commissionPerTrade : 0;
  return { price, commission };
}

// Calculate execution costs and create trade with realism fields
function createTradeWithRealism(
  baseEntry: number,
  baseExit: number,
  shares: number,
  entryDate: string,
  exitDate: string,
  type: 'LONG' | 'SHORT',
  entryReason: string,
  exitReason: string,
  config: ExecutionConfig,
  extras?: {
    entryBarRaw?: Bar;
    exitBarRaw?: Bar;
    indicatorValueAtEntry?: number;
    indicatorValueAtExit?: number;
    indicatorName?: string;
    dataQualityFlag?: string;
  }
): Trade {
  const normalizedEntryDate = normalizeDate(entryDate);
  const normalizedExitDate = normalizeDate(exitDate);

  // CRITICAL: Validate that exit date is a valid trading day
  let validatedExitDate = normalizedExitDate;
  let qualityFlag = extras?.dataQualityFlag;
  
  if (!isTradingDay(validatedExitDate)) {
    const originalExit = validatedExitDate;
    validatedExitDate = getNextTradingDay(validatedExitDate);
    qualityFlag = qualityFlag 
      ? `${qualityFlag}; Exit date ${originalExit} was non-trading day, adjusted to ${validatedExitDate}`
      : `Exit date ${originalExit} was non-trading day, adjusted to ${validatedExitDate}`;
    console.log(`[strategy-backtest] WARNING: Exit date ${originalExit} is non-trading day, adjusted to ${validatedExitDate}`);
  }
  
  // CRITICAL: Validate that entry date is a valid trading day
  // NOTE: We do NOT auto-adjust entry dates because that would create a price/date mismatch.
  // If this ever triggers, it means upstream bars are corrupt or date conversion is wrong.
  if (!isTradingDay(normalizedEntryDate)) {
    console.error(`[strategy-backtest] ERROR: Invalid entry date ${normalizedEntryDate} (non-trading). Trade will be flagged.`);
    qualityFlag = qualityFlag
      ? `${qualityFlag}; Invalid entry date ${normalizedEntryDate} (non-trading)`
      : `Invalid entry date ${normalizedEntryDate} (non-trading)`;
  }
  
  // CRITICAL: Calculate holding periods
  const holdingDaysTrading = countTradingDaysBetween(normalizedEntryDate, validatedExitDate);
  const holdingDaysCalendar = countCalendarDaysBetween(normalizedEntryDate, validatedExitDate);
  // Backwards-compat: holdingDays remains the trading-day count
  const holdingDays = holdingDaysTrading;
  
  // CRITICAL: Check for future dates
  const today = new Date().toISOString().split('T')[0];
  if (validatedExitDate > today) {
    qualityFlag = qualityFlag
      ? `${qualityFlag}; Future date detected - data may be synthetic`
      : 'Future date detected - data may be synthetic';
  }
  
  // Calculate gross P&L (theoretical, no costs)
  const grossPnl = shares * (baseExit - baseEntry);
  const grossPnlPercent = ((baseExit - baseEntry) / baseEntry) * 100;
  
  // Apply execution model (must match cash-flow simulation)
  const entryFill = getExecutionFill(baseEntry, 'buy', config);
  const exitFill = getExecutionFill(baseExit, 'sell', config);
  const actualEntry = entryFill.price;
  const actualExit = exitFill.price;

  // Calculate slippage cost (dollar impact of worse prices)
  const slippageCost = config.applySlippage
    ? (actualEntry - baseEntry) * shares + (baseExit - actualExit) * shares
    : 0;

  // Calculate commission cost (round trip)
  const commissionCost = entryFill.commission + exitFill.commission;
  
  // Calculate net P&L (with all costs)
  const netPnl = shares * (actualExit - actualEntry) - commissionCost;
  // Use higher precision to avoid identical rounding across trades
  const netPnlPercent = ((actualExit - actualEntry) / actualEntry) * 100 - (commissionCost / (shares * actualEntry)) * 100;
  
  return {
    entryDate: normalizedEntryDate,
    exitDate: validatedExitDate,
    // Preserve 4 decimal places for prices to show real variance
    entryPrice: Math.round(actualEntry * 10000) / 10000,
    exitPrice: Math.round(actualExit * 10000) / 10000,
    shares,
    pnl: Math.round(netPnl * 100) / 100,
    // Preserve 4 decimal places for pnlPercent to show variance
    pnlPercent: Math.round(netPnlPercent * 10000) / 10000,
    type,
    entryReason,
    exitReason,
    holdingDays,
    holdingDaysTrading,
    holdingDaysCalendar,
    // Execution realism fields
    grossPnl: Math.round(grossPnl * 100) / 100,
    grossPnlPercent: Math.round(grossPnlPercent * 100) / 100,
    slippageCost: Math.round(slippageCost * 100) / 100,
    commissionCost: Math.round(commissionCost * 100) / 100,
    netPnl: Math.round(netPnl * 100) / 100,
    netPnlPercent: Math.round(netPnlPercent * 100) / 100,
    dataQualityFlag: qualityFlag,
    // Data inspector fields
    entryBarRaw: extras?.entryBarRaw,
    exitBarRaw: extras?.exitBarRaw,
    indicatorValueAtEntry: extras?.indicatorValueAtEntry,
    indicatorValueAtExit: extras?.indicatorValueAtExit,
    indicatorName: extras?.indicatorName,
  };
}

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
    const bars: Bar[] = data.results.map((r: { t: number; o: number; h: number; l: number; c: number; v: number }, idx: number, arr: { c: number }[]) => {
      // Polygon timestamps are in ms, representing start of day UTC
      // Use the timestamp directly without offset to get the actual trading day
      const dateObj = new Date(r.t);
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
    
    // Filter out any bars that landed on non-trading days (data quality check)
    const validBars = bars.filter(bar => isTradingDay(bar.date));
    
    if (validBars.length !== bars.length) {
      console.log(`[strategy-backtest] Filtered ${bars.length - validBars.length} non-trading day bars`);
    }
    
    return validBars;
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
  // Explicit holding period semantics
  holdingDaysTrading?: number;
  holdingDaysCalendar?: number;
  // Data Inspector fields
  entryBarRaw?: Bar;
  exitBarRaw?: Bar;
  indicatorValueAtEntry?: number;
  indicatorValueAtExit?: number;
  indicatorName?: string;
  // Execution realism fields
  grossPnl?: number;
  grossPnlPercent?: number;
  slippageCost?: number;
  commissionCost?: number;
  netPnl?: number;
  netPnlPercent?: number;
  dataQualityFlag?: string;
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
  // Execution realism fields
  executionConfig: ExecutionConfig;
  totalSlippageCost: number;
  totalCommissionCost: number;
  grossReturn: number;
  netReturn: number;
  // Note: All metrics now include execution costs (slippage + commission) by default.
  // There is no "theoretical" vs "realistic" split - we only report realistic results.

  // Integrity + labeling
  dataWindow?: {
    requestedStartDate: string;
    requestedEndDate: string;
    effectiveStartDate: string;
    effectiveEndDate: string;
    lastAvailableBarDate: string;
    wasEndDateClamped: boolean;
    isForwardSimulated: boolean;
  };
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
): { signal: StrategySignal; exitAtEntryPrice?: boolean } {
  if (index < 1) return { signal: { action: 'HOLD', reason: 'Need previous bar' } };
  
  const prevClose = bars[index - 1].close;
  const todayOpen = bars[index].open;
  const todayClose = bars[index].close;
  const todayHigh = bars[index].high;
  const threshold = params.gapThreshold ?? 2; // 2% gap
  const takeProfit = params.takeProfitPercent ?? null;
  
  // Log params on first call for debugging
  if (index === 1) {
    console.log('[Gap Strategy] Params received:', JSON.stringify(params));
    console.log('[Gap Strategy] Threshold:', threshold, '%, Take Profit:', takeProfit, '%');
  }
  
  const gapPercent = ((todayOpen - prevClose) / prevClose) * 100;
  
  // Gap down detected - only enter if not already in position
  if (!inPosition && gapPercent < -threshold) {
    return { signal: { action: 'BUY', reason: `Gap down of ${gapPercent.toFixed(2)}% (below -${threshold}%)` } };
  }
  
  // Exit conditions when in position
  if (inPosition && entryPrice !== null) {
    const currentReturn = ((todayClose - entryPrice) / entryPrice) * 100;
    
    // CRITICAL: When take profit is set, ONLY exit on take profit (or stop loss handled elsewhere)
    // Do NOT exit early on gap-fill completion
    if (takeProfit !== null) {
      if (currentReturn >= takeProfit) {
        console.log(`[Gap Strategy] Take profit HIT: target ${takeProfit}%, current ${currentReturn.toFixed(2)}%`);
        return { signal: { action: 'SELL', reason: `Take profit triggered at +${takeProfit}% (current: +${currentReturn.toFixed(2)}%)` } };
      }
      // Hold position - waiting for take profit target
      return { signal: { action: 'HOLD', reason: `Waiting for +${takeProfit}% target (current: +${currentReturn.toFixed(2)}%)` } };
    }
    
    // Default gap-fill exit ONLY when NO take profit is specified
    // CRITICAL FIX: Check if price touched entry level during the day (use high), and exit AT entry price
    if (todayHigh >= entryPrice) {
      // Price touched or exceeded entry - gap is filled, exit AT entry price (not at close)
      return { 
        signal: { action: 'SELL', reason: `Gap filled - price returned to entry ($${entryPrice.toFixed(2)})` },
        exitAtEntryPrice: true  // Signal to exit at entry price, not bar close
      };
    }
  }
  
  return { signal: { action: 'HOLD', reason: `Gap: ${gapPercent.toFixed(2)}%` } };
}

function consecutiveDaysStrategy(
  bars: Bar[],
  index: number,
  inPosition: boolean,
  entryDate: string | null,
  currentDate: string,
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
  
  // Exit after holding period - CRITICAL: Use actual trading days, not bar indices
  if (inPosition && entryDate !== null) {
    const tradingDaysHeld = countTradingDaysBetween(entryDate, currentDate);
    if (tradingDaysHeld >= holdingPeriod) {
      return { action: 'SELL', reason: `Holding period of ${holdingPeriod} trading days reached (actual: ${tradingDaysHeld})` };
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
  dataSourceUrl: string,
  dataWindow?: BacktestResult['dataWindow']
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

  // Execution realism used for portfolio NAV (single source of truth)
  const execConfig = DEFAULT_EXECUTION_CONFIG;
  
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

    // Absolute safety: never process signals on a closed-market day
    if (!isTradingDay(bar.date)) {
      console.warn(`[strategy-backtest] Skipping non-trading bar in simulation: ${bar.date}`);
      continue;
    }
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
        const trade = createTradeWithRealism(
          entryPrice,
          bar.close,
          shares,
          entryDate!,
          bar.date,
          'LONG',
          entryReason,
          `Stop loss triggered at -${stopLoss}%`,
          execConfig,
          {
            entryBarRaw: entryBarRaw || undefined,
            exitBarRaw: { ...bar },
            indicatorValueAtEntry: entryIndicatorValue ?? undefined,
            indicatorValueAtExit: getIndicatorValue(strategy, i) ?? undefined,
            indicatorName
          }
        );
        trades.push(trade);

        // Apply REALISTIC cash flow (sell fill minus commission)
        const sellFill = getExecutionFill(bar.close, 'sell', execConfig);
        cash += shares * sellFill.price - sellFill.commission;
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
        // Take profit triggered - cap the return at the take profit target
        const targetExitPrice = entryPrice * (1 + takeProfit / 100);
        const trade = createTradeWithRealism(
          entryPrice,
          targetExitPrice,
          shares,
          entryDate!,
          bar.date,
          'LONG',
          entryReason,
          `Take profit triggered at +${takeProfit}%`,
          execConfig,
          {
            entryBarRaw: entryBarRaw || undefined,
            exitBarRaw: { ...bar },
            indicatorValueAtEntry: entryIndicatorValue ?? undefined,
            indicatorValueAtExit: getIndicatorValue(strategy, i) ?? undefined,
            indicatorName
          }
        );
        trades.push(trade);

        // Apply REALISTIC cash flow (sell at target price with execution model)
        const sellFill = getExecutionFill(targetExitPrice, 'sell', execConfig);
        cash += shares * sellFill.price - sellFill.commission;
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
    let gapFillExitAtEntry = false;
    
    switch (strategy) {
      case 'rsi':
        signal = rsiStrategy(bars, i, rsiValues, inPosition, params);
        break;
      case 'ma-crossover':
        signal = maStrategy(bars, i, fastMa, slowMa, inPosition, params);
        break;
      case 'gap-fill': {
        const gapResult = gapFillStrategy(bars, i, inPosition, entryPrice, params);
        signal = gapResult.signal;
        gapFillExitAtEntry = gapResult.exitAtEntryPrice || false;
        break;
      }
      case 'consecutive-days':
        signal = consecutiveDaysStrategy(bars, i, inPosition, entryDate, bar.date, params);
        break;
      default:
        signal = { action: 'HOLD', reason: 'Unknown strategy' };
    }
    
    // Execute signal
    if (signal.action === 'BUY' && !inPosition) {
      // Hard rule: cannot open positions on non-trading sessions.
      if (!isTradingDay(bar.date)) continue;
      const amountToInvest = cash * positionSize;

      // Realistic entry: price includes slippage, and we must reserve commission.
      const buyFill = getExecutionFill(bar.close, 'buy', execConfig);
      const maxAffordableShares = Math.floor(
        Math.max(0, (amountToInvest - buyFill.commission) / buyFill.price)
      );
      shares = maxAffordableShares;
      if (shares > 0) {
        cash -= shares * buyFill.price + buyFill.commission;
        inPosition = true;
        // Store the *base* bar close as the strategy reference price.
        // Realized P&L is driven by fills + commissions via createTradeWithRealism.
        entryPrice = bar.close;
        entryDate = bar.date;
        entryIndex = i;
        entryReason = signal.reason;
        entryBarRaw = { ...bar };
        entryIndicatorValue = getIndicatorValue(strategy, i);
      }
    } else if (signal.action === 'SELL' && inPosition && entryPrice !== null) {
      // Hard rule: cannot close positions on non-trading sessions.
      if (!isTradingDay(bar.date)) continue;
      // CRITICAL: When take profit is set, ignore strategy-specific exits
      // Only TP/SL (checked above) should trigger exits to respect user's risk/reward settings
      if (takeProfit !== null) {
        // Skip this sell signal - wait for take profit or stop loss
        continue;
      }
      
      // CRITICAL FIX: For gap-fill strategy, exit at entry price when gap is filled
      const exitPrice = gapFillExitAtEntry ? entryPrice : bar.close;
      
      const trade = createTradeWithRealism(
        entryPrice,
        exitPrice,
        shares,
        entryDate!,
        bar.date,
        'LONG',
        entryReason,
        signal.reason,
        execConfig,
        {
          entryBarRaw: entryBarRaw || undefined,
          exitBarRaw: { ...bar },
          indicatorValueAtEntry: entryIndicatorValue ?? undefined,
          indicatorValueAtExit: getIndicatorValue(strategy, i) ?? undefined,
          indicatorName
        }
      );
      trades.push(trade);

      const sellFill = getExecutionFill(exitPrice, 'sell', execConfig);
      cash += shares * sellFill.price - sellFill.commission;
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
    const trade = createTradeWithRealism(
      entryPrice,
      lastBar.close,
      shares,
      entryDate!,
      lastBar.date,
      'LONG',
      entryReason,
      'End of backtest period',
      execConfig,
      {
        entryBarRaw: entryBarRaw || undefined,
        exitBarRaw: { ...lastBar },
        indicatorValueAtEntry: entryIndicatorValue ?? undefined,
        indicatorValueAtExit: getIndicatorValue(strategy, bars.length - 1) ?? undefined,
        indicatorName
      }
    );
    trades.push(trade);

    const sellFill = getExecutionFill(lastBar.close, 'sell', execConfig);
    cash += shares * sellFill.price - sellFill.commission;
  }
  
  // Calculate metrics
  const finalValue = cash;
  const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;
  const years = bars.length / 252;
  const annualizedReturn = years > 0 ? (Math.pow(finalValue / initialCapital, 1 / years) - 1) * 100 : 0;
  
  // Buy and hold comparison - simulate buying with full capital at start
  const firstClose = bars[0]?.close || 1;
  const lastClose = bars[bars.length - 1]?.close || firstClose;
  // Calculate how many shares we could buy with initial capital at first close
  const buyHoldShares = initialCapital / firstClose;
  // Final value if we held those shares
  const buyHoldFinalValue = buyHoldShares * lastClose;
  // Buy and hold return as percentage of initial capital
  const buyHoldReturn = ((buyHoldFinalValue - initialCapital) / initialCapital) * 100;
  
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
  
  // Calculate execution realism totals
  const totalSlippageCost = trades.reduce((sum, t) => sum + (t.slippageCost || 0), 0);
  const totalCommissionCost = trades.reduce((sum, t) => sum + (t.commissionCost || 0), 0);
  // IMPORTANT: use nullish coalescing so legitimate 0 values don't fall back.
  const grossReturnTotal = trades.reduce((sum, t) => sum + (t.grossPnl ?? t.pnl), 0);
  const netReturnTotal = trades.reduce((sum, t) => sum + (t.netPnl ?? t.pnl), 0);
  
  // Note: All metrics include execution costs (slippage + commission) by default.
  // We removed the theoretical vs realistic split - all reported numbers are realistic.
  
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
    rawBarsPreview: bars.slice(0, 10),
    // Execution costs (applied to all metrics)
    executionConfig: DEFAULT_EXECUTION_CONFIG,
    totalSlippageCost: Math.round(totalSlippageCost * 100) / 100,
    totalCommissionCost: Math.round(totalCommissionCost * 100) / 100,
    grossReturn: Math.round(grossReturnTotal * 100) / 100,
    netReturn: Math.round(netReturnTotal * 100) / 100,
    dataWindow,
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
    const body = await req.json();
    
    // Handle ping requests for edge function warm-up (fast response)
    if (body.ping === true) {
      console.log('[strategy-backtest] Ping received - function is warm');
      return handlePing();
    }
    
    const { ticker, strategy, startDate, initialCapital = 10000 } = body;
    let { endDate } = body;
    const requestedStartDate = normalizeDate(startDate);
    const requestedEndDateInitial = normalizeDate(endDate);
    
    // CRITICAL: Prevent backtesting on future dates - cap end date at today
    const today = new Date().toISOString().split('T')[0];
    endDate = normalizeDate(endDate);
    if (endDate > today) {
      console.log(`[strategy-backtest] WARNING: End date ${endDate} is in the future, capping to today (${today})`);
      endDate = today;
    }
    
    // Support both nested params object and flat parameters at root level
    const params: StrategyParams = body.params || {};
    
    // Merge root-level parameters into params (root level takes precedence for backwards compat)
    if (body.stopLossPercent !== undefined) params.stopLossPercent = body.stopLossPercent;
    if (body.takeProfitPercent !== undefined) params.takeProfitPercent = body.takeProfitPercent;
    if (body.rsiPeriod !== undefined) params.rsiPeriod = body.rsiPeriod;
    if (body.rsiOversold !== undefined) params.rsiOversold = body.rsiOversold;
    if (body.rsiOverbought !== undefined) params.rsiOverbought = body.rsiOverbought;
    if (body.fastMaPeriod !== undefined) params.fastMaPeriod = body.fastMaPeriod;
    if (body.slowMaPeriod !== undefined) params.slowMaPeriod = body.slowMaPeriod;
    if (body.gapThreshold !== undefined) params.gapThreshold = body.gapThreshold;
    if (body.consecutiveDays !== undefined) params.consecutiveDays = body.consecutiveDays;
    if (body.holdingPeriod !== undefined) params.holdingPeriod = body.holdingPeriod;
    if (body.positionSizePercent !== undefined) params.positionSizePercent = body.positionSizePercent;
    
    console.log('[strategy-backtest] Merged params:', JSON.stringify(params));

    if (!ticker || !strategy) {
      return new Response(
        JSON.stringify({ success: false, error: 'ticker and strategy are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[strategy-backtest] Running ${strategy} on ${ticker} from ${requestedStartDate} to ${endDate} (today: ${today})`);


    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedTicker = ticker.toUpperCase().trim();

    // Fetch OHLCV data from market_daily_bars first
    let bars: Bar[] = [];
    let dataSource: 'database' | 'polygon' = 'database';
    let dataSourceUrl = '';
    
    // Calculate expected bars for the date range (approx 252 trading days/year)
    const requestedStartMs = new Date(requestedStartDate).getTime();
    const requestedEndMs = new Date(endDate).getTime();
    const daysDiff = Math.floor((requestedEndMs - requestedStartMs) / (1000 * 60 * 60 * 24));
    const expectedBars = Math.floor(daysDiff * 0.7); // ~70% are trading days
    
    console.log(`[strategy-backtest] Date range: ${startDate} to ${endDate} (${daysDiff} days, expecting ~${expectedBars} bars)`);

    const { data: priceData, error } = await supabase
      .from('market_daily_bars')
      .select('bar_date, open, high, low, close, volume, daily_return')
      .eq('ticker', normalizedTicker)
      .gte('bar_date', requestedStartDate)
      .lte('bar_date', endDate)
      .order('bar_date', { ascending: true });

    if (error) {
      console.error('[strategy-backtest] Database error:', error);
    }

    // Check if database has enough coverage (at least 80% of expected data)
    const dbCoverage = priceData ? priceData.length / Math.max(expectedBars, 50) : 0;
    console.log(`[strategy-backtest] Database has ${priceData?.length || 0} bars, coverage: ${(dbCoverage * 100).toFixed(1)}%`);

    if (priceData && priceData.length >= 50 && dbCoverage >= 0.8) {
      console.log(`[strategy-backtest] Using ${priceData.length} bars from database for ${normalizedTicker}`);
      dataSourceUrl = `Cloud DB: market_daily_bars (ticker=${normalizedTicker})`;
       const rawBars = priceData.map(row => ({
         date: normalizeDate(row.bar_date),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        dailyReturn: row.daily_return
      }));
      // Filter out any weekend/holiday bars that may have been stored incorrectly
      bars = rawBars.filter(bar => isTradingDay(bar.date));
      if (bars.length !== rawBars.length) {
        console.log(`[strategy-backtest] Filtered ${rawBars.length - bars.length} non-trading day bars from database`);
      }
    } else {
      // Database doesn't have enough data - fetch from Polygon for full range
      console.log(`[strategy-backtest] Database coverage insufficient (${priceData?.length || 0} bars, ${(dbCoverage * 100).toFixed(1)}% coverage), fetching from Polygon...`);
      const polygonBars = await fetchPolygonBars(normalizedTicker, startDate, endDate);
      
      if (polygonBars && polygonBars.length >= 50) {
        bars = polygonBars;
        dataSource = 'polygon';
        dataSourceUrl = `https://api.polygon.io/v2/aggs/ticker/${normalizedTicker}/range/1/day/${startDate}/${endDate}`;
        console.log(`[strategy-backtest] Using ${bars.length} bars from Polygon for ${normalizedTicker}`);
      } else if (priceData && priceData.length >= 20) {
        // Fallback: use whatever database has even if incomplete
        console.log(`[strategy-backtest] Polygon failed, using limited database data (${priceData.length} bars)`);
        dataSourceUrl = `Cloud DB: market_daily_bars (ticker=${normalizedTicker}) [PARTIAL]`;
         const rawBars = priceData.map(row => ({
           date: normalizeDate(row.bar_date),
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume,
          dailyReturn: row.daily_return
        }));
        // Filter out any weekend/holiday bars
        bars = rawBars.filter(bar => isTradingDay(bar.date));
        if (bars.length !== rawBars.length) {
          console.log(`[strategy-backtest] Filtered ${rawBars.length - bars.length} non-trading day bars from fallback database data`);
        }
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

     // Final normalization/filter (defensive): guarantees we never run signals on
     // weekend/holiday rows even if upstream stored timestamps.
     const beforeFinalFilter = bars.length;
     bars = bars
       .map((b) => ({ ...b, date: normalizeDate(b.date) }))
       .filter((b) => isTradingDay(b.date));
     if (bars.length !== beforeFinalFilter) {
       console.log(`[strategy-backtest] Filtered ${beforeFinalFilter - bars.length} non-trading day bars after normalization`);
     }

     console.log(`[strategy-backtest] Proceeding with ${bars.length} bars from ${dataSource}`);

     // Determine effective date window and clamp labeling.
     const lastAvailableBarDate = normalizeDate(bars[bars.length - 1]?.date || endDate);
     const effectiveStartDate = normalizeDate(bars[0]?.date || requestedStartDate);
     const effectiveEndDate = lastAvailableBarDate;
     const wasEndDateClamped = requestedEndDateInitial !== effectiveEndDate;
     const isForwardSimulated = false; // by design: we never simulate beyond the last real bar
     const dataWindow: BacktestResult['dataWindow'] = {
       requestedStartDate,
       requestedEndDate: requestedEndDateInitial,
       effectiveStartDate,
       effectiveEndDate,
       lastAvailableBarDate,
       wasEndDateClamped,
       isForwardSimulated,
     };

    // Run backtest
    const result = runBacktest(bars, strategy, initialCapital, params, dataSource, dataSourceUrl, dataWindow);

    console.log(`[strategy-backtest] Complete: ${result.totalTrades} trades, ${result.totalReturn.toFixed(2)}% return`);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        ticker: normalizedTicker,
         startDate: normalizeDate(bars[0]?.date || requestedStartDate),
         endDate: normalizeDate(bars[bars.length - 1]?.date || endDate)
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
