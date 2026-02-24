import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');

// ═══════════════════════════════════════════════════════════════════════════════
// PING HANDLER
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

function normalizeDate(dateLike: string): string {
  if (!dateLike) return dateLike;
  return dateLike.length >= 10 ? dateLike.slice(0, 10) : dateLike;
}

const FIXED_HOLIDAYS = [
  { month: 0, day: 1 },
  { month: 6, day: 4 },
  { month: 11, day: 25 },
];

function getNthDayOfMonth(year: number, month: number, dayOfWeek: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  let dayOffset = dayOfWeek - firstDay.getDay();
  if (dayOffset < 0) dayOffset += 7;
  return new Date(year, month, 1 + dayOffset + (n - 1) * 7);
}

function getLastDayOfMonth(year: number, month: number, dayOfWeek: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  let dayOffset = lastDay.getDay() - dayOfWeek;
  if (dayOffset < 0) dayOffset += 7;
  return new Date(year, month + 1, -dayOffset);
}

function getObservedHoliday(date: Date): Date {
  const day = date.getDay();
  if (day === 6) return new Date(date.getTime() - 24 * 60 * 60 * 1000);
  if (day === 0) return new Date(date.getTime() + 24 * 60 * 60 * 1000);
  return date;
}

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
  const day2 = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day2);
}

function getMarketHolidays(year: number): string[] {
  const holidays: Date[] = [];
  for (const { month, day } of FIXED_HOLIDAYS) {
    holidays.push(getObservedHoliday(new Date(year, month, day)));
  }
  holidays.push(getObservedHoliday(new Date(year, 5, 19)));
  holidays.push(getNthDayOfMonth(year, 0, 1, 3));
  holidays.push(getNthDayOfMonth(year, 1, 1, 3));
  const easter = getEasterSunday(year);
  holidays.push(new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000));
  holidays.push(getLastDayOfMonth(year, 4, 1));
  holidays.push(getNthDayOfMonth(year, 8, 1, 1));
  holidays.push(getNthDayOfMonth(year, 10, 4, 4));
  return holidays.map(d => d.toISOString().split('T')[0]);
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(normalizeDate(dateStr) + 'T12:00:00Z');
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function isTradingDay(dateStr: string): boolean {
  const normalized = normalizeDate(dateStr);
  if (isWeekend(normalized)) return false;
  const year = parseInt(normalized.split('-')[0]);
  const holidays = getMarketHolidays(year);
  return !holidays.includes(normalized);
}

function getNextTradingDay(dateStr: string): string {
  let date = new Date(normalizeDate(dateStr) + 'T12:00:00Z');
  let attempts = 0;
  while (!isTradingDay(date.toISOString().split('T')[0]) && attempts < 30) {
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    attempts++;
  }
  return date.toISOString().split('T')[0];
}

function countTradingDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(normalizeDate(startDate) + 'T12:00:00Z');
  const end = new Date(normalizeDate(endDate) + 'T12:00:00Z');
  let count = 0;
  const currentDate = new Date(start);
  while (currentDate <= end) {
    if (isTradingDay(currentDate.toISOString().split('T')[0])) count++;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return Math.max(0, count - 1);
}

function countCalendarDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(normalizeDate(startDate) + 'T12:00:00Z');
  const end = new Date(normalizeDate(endDate) + 'T12:00:00Z');
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
}

function isFutureDate(dateStr: string): boolean {
  return normalizeDate(dateStr) > new Date().toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED PARAMS
// ═══════════════════════════════════════════════════════════════════════════════

interface AdvancedParams {
  entryOrderType: 'market' | 'limit' | 'stop' | 'stop-limit';
  entryLimitOffset?: number;
  entryStopOffset?: number;
  takeProfitEnabled: boolean;
  takeProfitType: 'percent' | 'fixed';
  takeProfitValue: number;
  takeProfitPartial: boolean;
  takeProfitPartialPercent: number;
  stopLossEnabled: boolean;
  stopLossType: 'percent' | 'fixed' | 'atr';
  stopLossValue: number;
  stopLossAtrPeriod?: number;
  breakEvenEnabled: boolean;
  breakEvenTrigger?: number;
  trailingStopEnabled: boolean;
  trailingStopPercent: number;
  trailingStopActivation: 'immediate' | 'after-profit';
  trailingStopActivationPercent?: number;
  timeExitEnabled: boolean;
  timeExitBars?: number;
  timeExitOnSessionClose: boolean;
  exitTiers: Array<{ profitPercent: number; closePercent: number }>;
  commissionType: 'percent' | 'fixed-per-order' | 'fixed-per-contract';
  commissionValue: number;
  slippageTicks: number;
  executeOnBarClose: boolean;
  positionSizingMethod: 'percent-equity' | 'fixed-dollar' | 'fixed-shares' | 'risk-based';
  positionSizingValue: number;
  pyramiding: number;
  marginLong: number;
  marginShort: number;
}

const DEFAULT_ADVANCED_PARAMS: AdvancedParams = {
  entryOrderType: 'market',
  takeProfitEnabled: false,
  takeProfitType: 'percent',
  takeProfitValue: 8,
  takeProfitPartial: false,
  takeProfitPartialPercent: 50,
  stopLossEnabled: false,
  stopLossType: 'percent',
  stopLossValue: 4,
  stopLossAtrPeriod: 14,
  breakEvenEnabled: false,
  breakEvenTrigger: 3,
  trailingStopEnabled: false,
  trailingStopPercent: 2,
  trailingStopActivation: 'immediate',
  trailingStopActivationPercent: 3,
  timeExitEnabled: false,
  timeExitBars: 10,
  timeExitOnSessionClose: false,
  exitTiers: [],
  commissionType: 'percent',
  commissionValue: 0.1,
  slippageTicks: 1,
  executeOnBarClose: false,
  positionSizingMethod: 'percent-equity',
  positionSizingValue: 10,
  pyramiding: 1,
  marginLong: 100,
  marginShort: 100,
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION REALISM
// ═══════════════════════════════════════════════════════════════════════════════

interface ExecutionConfig {
  slippageBps: number;
  commissionPerTrade: number;
  applySlippage: boolean;
  applyCommission: boolean;
  commissionType: 'percent' | 'fixed-per-order' | 'fixed-per-contract';
  commissionValue: number;
}

function buildExecutionConfig(adv: AdvancedParams): ExecutionConfig {
  return {
    slippageBps: adv.slippageTicks * 1,
    commissionPerTrade: adv.commissionType === 'fixed-per-order' ? adv.commissionValue : 0.99,
    applySlippage: adv.slippageTicks > 0,
    applyCommission: true,
    commissionType: adv.commissionType,
    commissionValue: adv.commissionValue,
  };
}

function applySlippageToPrice(price: number, direction: 'buy' | 'sell', slippageBps: number): number {
  const m = slippageBps / 10000;
  return direction === 'buy' ? price * (1 + m) : price * (1 - m);
}

function getExecutionFill(
  basePrice: number,
  side: 'buy' | 'sell',
  config: ExecutionConfig,
  shares?: number
): { price: number; commission: number } {
  const price = config.applySlippage ? applySlippageToPrice(basePrice, side, config.slippageBps) : basePrice;
  let commission = 0;
  if (config.applyCommission) {
    switch (config.commissionType) {
      case 'percent': commission = (price * (shares || 1)) * (config.commissionValue / 100); break;
      case 'fixed-per-order': commission = config.commissionValue; break;
      case 'fixed-per-contract': commission = (shares || 1) * config.commissionValue; break;
    }
  }
  return { price, commission };
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
  holdingDaysTrading?: number;
  holdingDaysCalendar?: number;
  entryBarRaw?: Bar;
  exitBarRaw?: Bar;
  indicatorValueAtEntry?: number;
  indicatorValueAtExit?: number;
  indicatorName?: string;
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
  dataSource: 'database' | 'polygon';
  dataSourceUrl: string;
  barsCount: number;
  rawBarsPreview: Bar[];
  executionConfig: ExecutionConfig;
  totalSlippageCost: number;
  totalCommissionCost: number;
  grossReturn: number;
  netReturn: number;
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
  rsiPeriod?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
  fastMaPeriod?: number;
  slowMaPeriod?: number;
  gapThreshold?: number;
  consecutiveDays?: number;
  holdingPeriod?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  positionSizePercent?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADE CREATION HELPER
// ═══════════════════════════════════════════════════════════════════════════════

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

  let validatedExitDate = normalizedExitDate;
  let qualityFlag = extras?.dataQualityFlag;

  if (!isTradingDay(validatedExitDate)) {
    const originalExit = validatedExitDate;
    validatedExitDate = getNextTradingDay(validatedExitDate);
    qualityFlag = qualityFlag
      ? `${qualityFlag}; Exit date ${originalExit} adjusted to ${validatedExitDate}`
      : `Exit date ${originalExit} adjusted to ${validatedExitDate}`;
  }

  if (!isTradingDay(normalizedEntryDate)) {
    qualityFlag = qualityFlag
      ? `${qualityFlag}; Invalid entry date ${normalizedEntryDate}`
      : `Invalid entry date ${normalizedEntryDate}`;
  }

  const holdingDaysTrading = countTradingDaysBetween(normalizedEntryDate, validatedExitDate);
  const holdingDaysCalendar = countCalendarDaysBetween(normalizedEntryDate, validatedExitDate);
  const holdingDays = holdingDaysTrading;

  if (isFutureDate(validatedExitDate)) {
    qualityFlag = qualityFlag
      ? `${qualityFlag}; Future date - data may be synthetic`
      : 'Future date - data may be synthetic';
  }

  // For SHORT positions, P&L is inverted
  const direction = type === 'LONG' ? 1 : -1;
  const grossPnl = direction * shares * (baseExit - baseEntry);
  const grossPnlPercent = direction * ((baseExit - baseEntry) / baseEntry) * 100;

  const entrySide: 'buy' | 'sell' = type === 'LONG' ? 'buy' : 'sell';
  const exitSide: 'buy' | 'sell' = type === 'LONG' ? 'sell' : 'buy';
  const entryFill = getExecutionFill(baseEntry, entrySide, config, shares);
  const exitFill = getExecutionFill(baseExit, exitSide, config, shares);
  const actualEntry = entryFill.price;
  const actualExit = exitFill.price;

  const slippageCost = config.applySlippage
    ? Math.abs(actualEntry - baseEntry) * shares + Math.abs(baseExit - actualExit) * shares
    : 0;
  const commissionCost = entryFill.commission + exitFill.commission;

  const netPnl = direction * shares * (actualExit - actualEntry) - commissionCost;
  const netPnlPercent = ((direction * (actualExit - actualEntry)) / actualEntry) * 100 - (commissionCost / (shares * actualEntry)) * 100;

  return {
    entryDate: normalizedEntryDate,
    exitDate: validatedExitDate,
    entryPrice: Math.round(actualEntry * 10000) / 10000,
    exitPrice: Math.round(actualExit * 10000) / 10000,
    shares,
    pnl: Math.round(netPnl * 100) / 100,
    pnlPercent: Math.round(netPnlPercent * 10000) / 10000,
    type,
    entryReason,
    exitReason,
    holdingDays,
    holdingDaysTrading,
    holdingDaysCalendar,
    grossPnl: Math.round(grossPnl * 100) / 100,
    grossPnlPercent: Math.round(grossPnlPercent * 100) / 100,
    slippageCost: Math.round(slippageCost * 100) / 100,
    commissionCost: Math.round(commissionCost * 100) / 100,
    netPnl: Math.round(netPnl * 100) / 100,
    netPnlPercent: Math.round(netPnlPercent * 100) / 100,
    dataQualityFlag: qualityFlag,
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
  if (!POLYGON_API_KEY) return null;
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${startDate}/${endDate}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;

    const bars: Bar[] = data.results.map((r: { t: number; o: number; h: number; l: number; c: number; v: number }, idx: number, arr: { c: number }[]) => {
      const dateObj = new Date(r.t);
      const date = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(dateObj.getUTCDate()).padStart(2, '0')}`;
      const prevClose = idx > 0 ? arr[idx - 1].c : r.o;
      return { date, open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v, dailyReturn: prevClose ? ((r.c - prevClose) / prevClose) * 100 : 0 };
    });
    return bars.filter(bar => isTradingDay(bar.date));
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNICAL INDICATORS
// ═══════════════════════════════════════════════════════════════════════════════

function calculateSMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { result.push(null); }
    else { result.push(prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period); }
  }
  return result;
}

function calculateEMA(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { result.push(null); }
    else if (i === period - 1) { result.push(prices.slice(0, period).reduce((a, b) => a + b, 0) / period); }
    else { result.push((prices[i] - result[i - 1]!) * multiplier + result[i - 1]!); }
  }
  return result;
}

function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) changes.push(prices[i] - prices[i - 1]);
  for (let i = 0; i < prices.length; i++) {
    if (i < period) { result.push(null); }
    else {
      const rel = changes.slice(i - period, i);
      let avgGain = 0, avgLoss = 0;
      for (const c of rel) { if (c > 0) avgGain += c; else avgLoss += Math.abs(c); }
      avgGain /= period; avgLoss /= period;
      result.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
    }
  }
  return result;
}

function calculateATR(bars: Bar[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const prev = j > 0 ? bars[j - 1].close : bars[j].open;
      const tr = Math.max(bars[j].high - bars[j].low, Math.abs(bars[j].high - prev), Math.abs(bars[j].low - prev));
      sum += tr;
    }
    result.push(sum / period);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY SIGNAL IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface StrategySignal {
  action: 'BUY' | 'SELL' | 'SHORT' | 'HOLD';
  reason: string;
}

function rsiStrategy(bars: Bar[], index: number, rsiValues: (number | null)[], inPosition: boolean, params: StrategyParams): StrategySignal {
  const rsi = rsiValues[index];
  if (rsi === null) return { action: 'HOLD', reason: 'Insufficient data for RSI' };
  const oversold = params.rsiOversold ?? 30;
  const overbought = params.rsiOverbought ?? 70;
  if (!inPosition && rsi < oversold) return { action: 'BUY', reason: `RSI (${rsi.toFixed(1)}) below ${oversold} - oversold` };
  if (inPosition && rsi > overbought) return { action: 'SELL', reason: `RSI (${rsi.toFixed(1)}) above ${overbought} - overbought` };
  return { action: 'HOLD', reason: `RSI at ${rsi.toFixed(1)}` };
}

function maStrategy(bars: Bar[], index: number, fastMa: (number | null)[], slowMa: (number | null)[], inPosition: boolean, _params: StrategyParams): StrategySignal {
  const fast = fastMa[index], slow = slowMa[index];
  const prevFast = index > 0 ? fastMa[index - 1] : null;
  const prevSlow = index > 0 ? slowMa[index - 1] : null;
  if (fast === null || slow === null || prevFast === null || prevSlow === null) return { action: 'HOLD', reason: 'Insufficient data for MA' };
  if (!inPosition && prevFast < prevSlow && fast > slow) return { action: 'BUY', reason: `Golden Cross: Fast MA (${fast.toFixed(2)}) crossed above Slow MA (${slow.toFixed(2)})` };
  if (inPosition && prevFast > prevSlow && fast < slow) return { action: 'SELL', reason: `Death Cross: Fast MA (${fast.toFixed(2)}) crossed below Slow MA (${slow.toFixed(2)})` };
  return { action: 'HOLD', reason: `Fast MA: ${fast.toFixed(2)}, Slow MA: ${slow.toFixed(2)}` };
}

function macdStrategy(bars: Bar[], index: number, macdHist: (number | null)[], inPosition: boolean, params: StrategyParams): StrategySignal {
  const hist = macdHist[index];
  const prevHist = index > 0 ? macdHist[index - 1] : null;
  if (hist === null || prevHist === null) return { action: 'HOLD', reason: 'Insufficient data for MACD' };
  const direction = (params as any).direction ?? 'bullish';
  if (direction === 'bullish') {
    if (!inPosition && prevHist < 0 && hist > 0) return { action: 'BUY', reason: `MACD bullish crossover (histogram: ${hist.toFixed(3)})` };
    if (inPosition && prevHist > 0 && hist < 0) return { action: 'SELL', reason: `MACD bearish crossover (histogram: ${hist.toFixed(3)})` };
  } else {
    if (!inPosition && prevHist > 0 && hist < 0) return { action: 'SHORT', reason: `MACD bearish crossover (histogram: ${hist.toFixed(3)})` };
    if (inPosition && prevHist < 0 && hist > 0) return { action: 'SELL', reason: `MACD bullish crossover (histogram: ${hist.toFixed(3)})` };
  }
  return { action: 'HOLD', reason: `MACD histogram: ${hist.toFixed(3)}` };
}

function bollingerStrategy(bars: Bar[], index: number, sma: (number | null)[], stdDevs: (number | null)[], inPosition: boolean, params: StrategyParams): StrategySignal {
  const ma = sma[index];
  const sd = stdDevs[index];
  if (ma === null || sd === null) return { action: 'HOLD', reason: 'Insufficient data for Bollinger' };
  const multiplier = (params as any).bbStdDev ?? 2;
  const upper = ma + multiplier * sd;
  const lower = ma - multiplier * sd;
  const price = bars[index].close;
  const direction = (params as any).direction ?? 'lower';
  if (direction === 'lower') {
    if (!inPosition && price <= lower) return { action: 'BUY', reason: `Price ($${price.toFixed(2)}) at lower Bollinger Band ($${lower.toFixed(2)})` };
    if (inPosition && price >= ma) return { action: 'SELL', reason: `Price ($${price.toFixed(2)}) reverted to mean ($${ma.toFixed(2)})` };
  } else {
    if (!inPosition && price >= upper) return { action: 'SHORT', reason: `Price ($${price.toFixed(2)}) at upper Bollinger Band ($${upper.toFixed(2)})` };
    if (inPosition && price <= ma) return { action: 'SELL', reason: `Price ($${price.toFixed(2)}) reverted to mean ($${ma.toFixed(2)})` };
  }
  return { action: 'HOLD', reason: `Price: $${price.toFixed(2)}, BB: $${lower.toFixed(2)}-$${upper.toFixed(2)}` };
}

function stochasticStrategy(bars: Bar[], index: number, stochK: (number | null)[], inPosition: boolean, params: StrategyParams): StrategySignal {
  const k = stochK[index];
  const prevK = index > 0 ? stochK[index - 1] : null;
  if (k === null || prevK === null) return { action: 'HOLD', reason: 'Insufficient data for Stochastic' };
  const oversold = (params as any).stochOversold ?? 20;
  const overbought = (params as any).stochOverbought ?? 80;
  if (!inPosition && prevK < oversold && k > oversold) return { action: 'BUY', reason: `Stochastic (%K=${k.toFixed(0)}) crossed above ${oversold} - oversold reversal` };
  if (inPosition && prevK > overbought && k < overbought) return { action: 'SELL', reason: `Stochastic (%K=${k.toFixed(0)}) crossed below ${overbought} - overbought reversal` };
  return { action: 'HOLD', reason: `Stochastic %K: ${k.toFixed(0)}` };
}

function calculateStochasticK(bars: Bar[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = bars.slice(i - period + 1, i + 1);
    const high = Math.max(...slice.map(b => b.high));
    const low = Math.min(...slice.map(b => b.low));
    result.push(high !== low ? ((bars[i].close - low) / (high - low)) * 100 : 50);
  }
  return result;
}

function calculateMACDHistogram(closes: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number = 9): (number | null)[] {
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) macdLine.push(emaFast[i]! - emaSlow[i]!);
    else macdLine.push(0);
  }
  const signal = calculateEMA(macdLine, signalPeriod);
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] === null || emaSlow[i] === null || signal[i] === null) result.push(null);
    else result.push(macdLine[i] - signal[i]!);
  }
  return result;
}

function calculateStdDev(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
    result.push(Math.sqrt(variance));
  }
  return result;
}

function gapFillStrategy(bars: Bar[], index: number, inPosition: boolean, entryPrice: number | null, params: StrategyParams, entryDate?: string | null): { signal: StrategySignal; exitAtEntryPrice?: boolean } {
  if (index < 1) return { signal: { action: 'HOLD', reason: 'Need previous bar' } };
  const prevClose = bars[index - 1].close;
  const todayOpen = bars[index].open;
  const todayClose = bars[index].close;
  const todayHigh = bars[index].high;
  const currentDate = normalizeDate(bars[index].date);
  const threshold = params.gapThreshold ?? 2;
  const takeProfit = params.takeProfitPercent ?? null;
  const holdingPeriod = params.holdingPeriod ?? null;
  const gapPercent = ((todayOpen - prevClose) / prevClose) * 100;

  if (!inPosition && gapPercent < -threshold) return { signal: { action: 'BUY', reason: `Gap down of ${gapPercent.toFixed(2)}% (below -${threshold}%)` } };

  if (inPosition && entryPrice !== null) {
    const currentReturn = ((todayClose - entryPrice) / entryPrice) * 100;
    if (holdingPeriod !== null && entryDate) {
      const tradingDaysHeld = countTradingDaysBetween(entryDate, currentDate);
      if (tradingDaysHeld >= holdingPeriod) return { signal: { action: 'SELL', reason: `Holding period of ${holdingPeriod} days reached` } };
    }
    if (takeProfit !== null) {
      if (currentReturn >= takeProfit) return { signal: { action: 'SELL', reason: `Take profit triggered at +${takeProfit}%` } };
      return { signal: { action: 'HOLD', reason: `Waiting for +${takeProfit}% target` } };
    }
    if (holdingPeriod === null && todayHigh >= entryPrice) {
      return { signal: { action: 'SELL', reason: `Gap filled - price returned to entry` }, exitAtEntryPrice: true };
    }
  }
  return { signal: { action: 'HOLD', reason: `Gap: ${gapPercent.toFixed(2)}%` } };
}

function consecutiveDaysStrategy(bars: Bar[], index: number, inPosition: boolean, entryDate: string | null, currentDate: string, params: StrategyParams): StrategySignal {
  const consecutiveDays = params.consecutiveDays ?? 3;
  const holdingPeriod = params.holdingPeriod ?? 5;
  if (index < consecutiveDays) return { action: 'HOLD', reason: 'Need more history' };
  if (!inPosition) {
    let downDays = 0;
    for (let i = 0; i < consecutiveDays; i++) {
      if ((bars[index - i].close - bars[index - i].open) / bars[index - i].open < 0) downDays++;
    }
    if (downDays === consecutiveDays) return { action: 'BUY', reason: `${consecutiveDays} consecutive down days` };
  }
  if (inPosition && entryDate !== null) {
    const tradingDaysHeld = countTradingDaysBetween(entryDate, currentDate);
    if (tradingDaysHeld >= holdingPeriod) return { action: 'SELL', reason: `Holding period of ${holdingPeriod} days reached` };
  }
  return { action: 'HOLD', reason: 'Waiting for signal' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSITION STATE (supports multiple positions via pyramiding)
// ═══════════════════════════════════════════════════════════════════════════════

interface OpenPosition {
  entryPrice: number;
  shares: number;
  remainingShares: number; // tracks partial exits
  entryDate: string;
  entryIndex: number;
  entryReason: string;
  entryBarRaw: Bar;
  entryIndicatorValue: number | null;
  type: 'LONG' | 'SHORT';
  highWaterMark: number; // for trailing stop
  stopLossPrice: number | null; // dynamic stop level (may move for break-even/trailing)
  tiersExecuted: Set<number>; // indices of exitTiers already triggered
  barsHeld: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BACKTEST ENGINE (with full AdvancedParams wiring)
// ═══════════════════════════════════════════════════════════════════════════════

function runBacktest(
  bars: Bar[],
  strategy: string,
  initialCapital: number,
  params: StrategyParams,
  advancedParams: AdvancedParams,
  dataSource: 'database' | 'polygon',
  dataSourceUrl: string,
  dataWindow?: BacktestResult['dataWindow']
): Omit<BacktestResult, 'success' | 'ticker' | 'startDate' | 'endDate'> {
  const trades: Trade[] = [];
  const portfolioHistory: PortfolioSnapshot[] = [];

  let cash = initialCapital;
  const positions: OpenPosition[] = [];

  const execConfig = buildExecutionConfig(advancedParams);

  // Merge legacy params with advancedParams (advancedParams takes precedence when enabled)
  const effectiveStopLoss = advancedParams.stopLossEnabled ? advancedParams.stopLossValue : (params.stopLossPercent ?? null);
  const effectiveTakeProfit = advancedParams.takeProfitEnabled ? advancedParams.takeProfitValue : (params.takeProfitPercent ?? null);

  // Pre-calculate indicators
  const closes = bars.map(b => b.close);
  const rsiValues = calculateRSI(closes, params.rsiPeriod ?? 14);
  const fastMa = calculateEMA(closes, params.fastMaPeriod ?? 10);
  const slowMa = calculateSMA(closes, params.slowMaPeriod ?? 50);
  const atrValues = calculateATR(bars, advancedParams.stopLossAtrPeriod ?? 14);
  
  // MACD, Bollinger, Stochastic indicators (computed lazily but pre-calc is fine)
  const macdHist = calculateMACDHistogram(closes, (params as any).fastMaPeriod ?? 12, (params as any).slowMaPeriod ?? 26, 9);
  const bbSma = calculateSMA(closes, (params as any).bbPeriod ?? 20);
  const bbStdDevs = calculateStdDev(closes, (params as any).bbPeriod ?? 20);
  const stochK = calculateStochasticK(bars, (params as any).stochPeriod ?? 14);

  const getIndicatorName = (s: string): string => {
    switch (s) { case 'rsi': return 'RSI'; case 'ma-crossover': return 'Fast EMA'; case 'gap-fill': return 'Gap %'; case 'consecutive-days': return 'Down Days'; case 'macd': return 'MACD Hist'; case 'bollinger': return 'BB Position'; case 'stochastic': return 'Stochastic %K'; default: return 'Indicator'; }
  };
  const getIndicatorValue = (s: string, idx: number): number | null => {
    switch (s) {
      case 'rsi': return rsiValues[idx];
      case 'ma-crossover': return fastMa[idx];
      case 'gap-fill': return idx < 1 ? null : ((bars[idx].open - bars[idx - 1].close) / bars[idx - 1].close) * 100;
      case 'consecutive-days': { let c = 0; for (let j = 0; j < Math.min(idx + 1, 5); j++) { if ((bars[idx - j].close - bars[idx - j].open) / bars[idx - j].open < 0) c++; else break; } return c; }
      case 'macd': return macdHist[idx];
      case 'bollinger': return bbSma[idx] !== null ? (bars[idx].close - bbSma[idx]!) / (bbStdDevs[idx] || 1) : null;
      case 'stochastic': return stochK[idx];
      default: return null;
    }
  };
  const indicatorName = getIndicatorName(strategy);

  // Pending order state (for limit/stop entries)
  let pendingOrder: { type: 'limit' | 'stop' | 'stop-limit'; triggerPrice: number; limitPrice?: number; direction: 'LONG' | 'SHORT'; reason: string; barIndex: number; stopTriggered?: boolean } | null = null;

  // Helper: close a position (full or partial)
  function closePosition(pos: OpenPosition, exitPrice: number, exitDate: string, exitReason: string, barIndex: number, sharesToClose?: number): void {
    const closeShares = sharesToClose ?? pos.remainingShares;
    if (closeShares <= 0) return;

    const trade = createTradeWithRealism(
      pos.entryPrice, exitPrice, closeShares, pos.entryDate, exitDate, pos.type,
      pos.entryReason, exitReason, execConfig,
      { entryBarRaw: pos.entryBarRaw, exitBarRaw: { ...bars[barIndex] }, indicatorValueAtEntry: pos.entryIndicatorValue ?? undefined, indicatorValueAtExit: getIndicatorValue(strategy, barIndex) ?? undefined, indicatorName }
    );
    trades.push(trade);

    // Cash flow
    const side: 'buy' | 'sell' = pos.type === 'LONG' ? 'sell' : 'buy';
    const fill = getExecutionFill(exitPrice, side, execConfig, closeShares);
    if (pos.type === 'LONG') {
      cash += closeShares * fill.price - fill.commission;
    } else {
      // SHORT cover: we previously credited (entry * shares), now we debit (exit * shares)
      cash -= closeShares * fill.price + fill.commission;
    }

    pos.remainingShares -= closeShares;
  }

  // Helper: calculate position sizing
  function calculateShares(price: number, posType: 'LONG' | 'SHORT'): number {
    const margin = posType === 'LONG' ? advancedParams.marginLong : advancedParams.marginShort;
    const buyingPower = cash * (margin / 100);

    let amountToInvest: number;
    switch (advancedParams.positionSizingMethod) {
      case 'percent-equity': {
        const totalEquity = cash + positions.reduce((s, p) => s + p.remainingShares * bars[bars.length - 1]?.close || 0, 0);
        amountToInvest = totalEquity * (advancedParams.positionSizingValue / 100);
        break;
      }
      case 'fixed-dollar':
        amountToInvest = advancedParams.positionSizingValue;
        break;
      case 'fixed-shares':
        return Math.min(Math.floor(advancedParams.positionSizingValue), Math.floor(buyingPower / price));
      case 'risk-based': {
        // (Portfolio * riskPercent) / stopDistance
        if (effectiveStopLoss === null || effectiveStopLoss === 0) {
          amountToInvest = cash * 0.1; // fallback 10% if no SL
        } else {
          const riskAmount = cash * (advancedParams.positionSizingValue / 100);
          const stopDistance = price * (effectiveStopLoss / 100);
          amountToInvest = stopDistance > 0 ? (riskAmount / stopDistance) * price : cash * 0.1;
        }
        break;
      }
      default:
        amountToInvest = cash * 0.1;
    }

    // Also respect legacy positionSizePercent if no advanced sizing
    if (params.positionSizePercent !== undefined && advancedParams.positionSizingMethod === 'percent-equity' && advancedParams.positionSizingValue === DEFAULT_ADVANCED_PARAMS.positionSizingValue) {
      amountToInvest = cash * (params.positionSizePercent / 100);
    }

    amountToInvest = Math.min(amountToInvest, buyingPower);
    const buyFill = getExecutionFill(price, posType === 'LONG' ? 'buy' : 'sell', execConfig);
    return Math.max(0, Math.floor((amountToInvest - buyFill.commission) / buyFill.price));
  }

  // Helper: compute initial stop loss price for a position
  function computeInitialStopLoss(entryPrice: number, posType: 'LONG' | 'SHORT', barIndex: number): number | null {
    if (effectiveStopLoss === null) return null;

    if (advancedParams.stopLossEnabled && advancedParams.stopLossType === 'atr') {
      const atr = atrValues[barIndex];
      if (atr !== null) {
        return posType === 'LONG'
          ? entryPrice - atr * advancedParams.stopLossValue
          : entryPrice + atr * advancedParams.stopLossValue;
      }
    }

    // Percent or fixed
    const stopDist = advancedParams.stopLossEnabled && advancedParams.stopLossType === 'fixed'
      ? advancedParams.stopLossValue
      : entryPrice * (effectiveStopLoss / 100);

    return posType === 'LONG' ? entryPrice - stopDist : entryPrice + stopDist;
  }

  // ─── MAIN LOOP ─────────────────────────────────────────────────────────────
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (!isTradingDay(bar.date)) continue;

    // Update position high-water marks and bars held
    for (const pos of positions) {
      pos.barsHeld++;
      if (pos.type === 'LONG' && bar.high > pos.highWaterMark) pos.highWaterMark = bar.high;
      if (pos.type === 'SHORT' && bar.low < pos.highWaterMark) pos.highWaterMark = bar.low;
    }

    const positionValue = positions.reduce((s, p) => {
      const dir = p.type === 'LONG' ? 1 : -1;
      return s + p.remainingShares * (p.entryPrice + dir * (bar.close - p.entryPrice));
    }, 0);
    const totalValue = cash + positionValue;

    portfolioHistory.push({ date: bar.date, value: totalValue, cash, positionValue, inPosition: positions.length > 0 });

    // ─── EXIT CHECKS (priority order) ──────────────────────────────────────
    const positionsToRemove: number[] = [];
    for (let p = 0; p < positions.length; p++) {
      const pos = positions[p];
      if (pos.remainingShares <= 0) { positionsToRemove.push(p); continue; }

      const isLong = pos.type === 'LONG';
      const currentReturn = isLong
        ? ((bar.close - pos.entryPrice) / pos.entryPrice) * 100
        : ((pos.entryPrice - bar.close) / pos.entryPrice) * 100;
      const unrealizedPnlPercent = currentReturn;

      // 1. HARD STOP LOSS
      if (pos.stopLossPrice !== null) {
        const slTriggered = isLong ? bar.low <= pos.stopLossPrice : bar.high >= pos.stopLossPrice;
        if (slTriggered) {
          closePosition(pos, pos.stopLossPrice, bar.date, `Stop Loss triggered at $${pos.stopLossPrice.toFixed(2)}`, i);
          positionsToRemove.push(p);
          continue;
        }
      }

      // 2. TAKE PROFIT (full or partial)
      if (effectiveTakeProfit !== null) {
        const tpPrice = isLong
          ? pos.entryPrice * (1 + effectiveTakeProfit / 100)
          : pos.entryPrice * (1 - effectiveTakeProfit / 100);
        const tpHit = isLong ? bar.high >= tpPrice : bar.low <= tpPrice;

        if (tpHit) {
          if (advancedParams.takeProfitPartial && pos.remainingShares > 1) {
            const partialShares = Math.max(1, Math.floor(pos.remainingShares * (advancedParams.takeProfitPartialPercent / 100)));
            closePosition(pos, tpPrice, bar.date, `Partial TP (${advancedParams.takeProfitPartialPercent}%) at +${effectiveTakeProfit}%`, i, partialShares);
            // Remainder stays open with trailing stop if enabled
          } else {
            closePosition(pos, tpPrice, bar.date, `Take Profit at +${effectiveTakeProfit}%`, i);
            positionsToRemove.push(p);
            continue;
          }
        }
      }

      // 3. BREAK-EVEN STOP (move stop to entry when profit exceeds trigger)
      if (advancedParams.breakEvenEnabled && advancedParams.breakEvenTrigger !== undefined) {
        if (unrealizedPnlPercent >= advancedParams.breakEvenTrigger) {
          const bePrice = pos.entryPrice;
          // Only move stop up, never down
          if (isLong && (pos.stopLossPrice === null || bePrice > pos.stopLossPrice)) {
            pos.stopLossPrice = bePrice;
          }
          if (!isLong && (pos.stopLossPrice === null || bePrice < pos.stopLossPrice)) {
            pos.stopLossPrice = bePrice;
          }
        }
      }

      // 4. TRAILING STOP
      if (advancedParams.trailingStopEnabled) {
        let trailingActive = advancedParams.trailingStopActivation === 'immediate';
        if (!trailingActive && advancedParams.trailingStopActivation === 'after-profit') {
          trailingActive = unrealizedPnlPercent >= (advancedParams.trailingStopActivationPercent ?? 0);
        }
        if (trailingActive) {
          const trailDist = pos.highWaterMark * (advancedParams.trailingStopPercent / 100);
          const trailingStopLevel = isLong
            ? pos.highWaterMark - trailDist
            : pos.highWaterMark + trailDist;

          // Move stop up only (for longs) or down only (for shorts)
          if (isLong && (pos.stopLossPrice === null || trailingStopLevel > pos.stopLossPrice)) {
            pos.stopLossPrice = trailingStopLevel;
          }
          if (!isLong && (pos.stopLossPrice === null || trailingStopLevel < pos.stopLossPrice)) {
            pos.stopLossPrice = trailingStopLevel;
          }

          // Check if trailing stop triggered
          const trailTriggered = isLong ? bar.low <= pos.stopLossPrice! : bar.high >= pos.stopLossPrice!;
          if (trailTriggered && pos.stopLossPrice !== null) {
            closePosition(pos, pos.stopLossPrice, bar.date, `Trailing Stop at $${pos.stopLossPrice.toFixed(2)}`, i);
            positionsToRemove.push(p);
            continue;
          }
        }
      }

      // 5. SCALED EXIT TIERS
      if (advancedParams.exitTiers.length > 0) {
        for (let t = 0; t < advancedParams.exitTiers.length; t++) {
          if (pos.tiersExecuted.has(t)) continue;
          const tier = advancedParams.exitTiers[t];
          if (unrealizedPnlPercent >= tier.profitPercent) {
            const tierShares = Math.max(1, Math.floor(pos.remainingShares * (tier.closePercent / 100)));
            closePosition(pos, bar.close, bar.date, `Scaled Exit Tier: ${tier.closePercent}% at +${tier.profitPercent}%`, i, tierShares);
            pos.tiersExecuted.add(t);
          }
        }
        if (pos.remainingShares <= 0) { positionsToRemove.push(p); continue; }
      }

      // 6. TIME EXIT
      if (advancedParams.timeExitEnabled && advancedParams.timeExitBars !== undefined) {
        if (pos.barsHeld >= advancedParams.timeExitBars) {
          closePosition(pos, bar.close, bar.date, `Time exit after ${advancedParams.timeExitBars} bars`, i);
          positionsToRemove.push(p);
          continue;
        }
      }

      // 7. LEGACY holding period (from StrategyParams)
      if (params.holdingPeriod !== undefined && params.holdingPeriod !== null && !advancedParams.timeExitEnabled) {
        const tradingDaysHeld = countTradingDaysBetween(pos.entryDate, bar.date);
        if (tradingDaysHeld >= params.holdingPeriod) {
          closePosition(pos, bar.close, bar.date, `Holding period of ${params.holdingPeriod} trading days reached`, i);
          positionsToRemove.push(p);
          continue;
        }
      }
    }

    // Remove closed positions (iterate in reverse to preserve indices)
    for (const idx of [...new Set(positionsToRemove)].sort((a, b) => b - a)) {
      if (positions[idx].remainingShares <= 0) positions.splice(idx, 1);
    }

    // ─── PENDING ORDER FILL CHECK ──────────────────────────────────────────
    if (pendingOrder !== null) {
      let filled = false;
      let fillPrice = 0;

      switch (pendingOrder.type) {
        case 'limit':
          if (bar.low <= pendingOrder.triggerPrice) {
            filled = true;
            fillPrice = pendingOrder.triggerPrice;
          }
          break;
        case 'stop':
          if (bar.high >= pendingOrder.triggerPrice) {
            filled = true;
            fillPrice = pendingOrder.triggerPrice;
          }
          break;
        case 'stop-limit':
          if (!pendingOrder.stopTriggered && bar.high >= pendingOrder.triggerPrice) {
            pendingOrder.stopTriggered = true;
          }
          if (pendingOrder.stopTriggered && pendingOrder.limitPrice !== undefined && bar.low <= pendingOrder.limitPrice) {
            filled = true;
            fillPrice = pendingOrder.limitPrice;
          }
          break;
      }

      // Cancel stale orders after 5 bars
      if (i - pendingOrder.barIndex > 5) { pendingOrder = null; }
      else if (filled && positions.length < advancedParams.pyramiding) {
        const shares = calculateShares(fillPrice, pendingOrder.direction);
        if (shares > 0) {
          const side: 'buy' | 'sell' = pendingOrder.direction === 'LONG' ? 'buy' : 'sell';
          const buyFill = getExecutionFill(fillPrice, side, execConfig, shares);
          if (pendingOrder.direction === 'LONG') {
            cash -= shares * buyFill.price + buyFill.commission;
          } else {
            cash += shares * buyFill.price - buyFill.commission;
          }
          positions.push({
            entryPrice: fillPrice,
            shares,
            remainingShares: shares,
            entryDate: bar.date,
            entryIndex: i,
            entryReason: pendingOrder.reason,
            entryBarRaw: { ...bar },
            entryIndicatorValue: getIndicatorValue(strategy, i),
            type: pendingOrder.direction,
            highWaterMark: fillPrice,
            stopLossPrice: computeInitialStopLoss(fillPrice, pendingOrder.direction, i),
            tiersExecuted: new Set(),
            barsHeld: 0,
          });
        }
        pendingOrder = null;
      }
    }

    // ─── STRATEGY SIGNAL ───────────────────────────────────────────────────
    const inPosition = positions.length > 0;
    const entryPrice = positions.length > 0 ? positions[0].entryPrice : null;
    const entryDate = positions.length > 0 ? positions[0].entryDate : null;

    let signal: StrategySignal;
    let gapFillExitAtEntry = false;

    switch (strategy) {
      case 'rsi': signal = rsiStrategy(bars, i, rsiValues, inPosition, params); break;
      case 'ma-crossover': signal = maStrategy(bars, i, fastMa, slowMa, inPosition, params); break;
      case 'gap-fill': { const r = gapFillStrategy(bars, i, inPosition, entryPrice, params, entryDate); signal = r.signal; gapFillExitAtEntry = r.exitAtEntryPrice || false; break; }
      case 'consecutive-days': signal = consecutiveDaysStrategy(bars, i, inPosition, entryDate, bar.date, params); break;
      case 'macd': signal = macdStrategy(bars, i, macdHist, inPosition, params); break;
      case 'bollinger': signal = bollingerStrategy(bars, i, bbSma, bbStdDevs, inPosition, params); break;
      case 'stochastic': signal = stochasticStrategy(bars, i, stochK, inPosition, params); break;
      default: signal = { action: 'HOLD', reason: 'Unknown strategy' };
    }

    // ─── EXECUTE ENTRY ─────────────────────────────────────────────────────
    if ((signal.action === 'BUY' || signal.action === 'SHORT') && positions.length < advancedParams.pyramiding) {
      if (!isTradingDay(bar.date)) continue;

      const posType: 'LONG' | 'SHORT' = signal.action === 'BUY' ? 'LONG' : 'SHORT';

      if (advancedParams.entryOrderType === 'market' || advancedParams.entryOrderType === undefined) {
        // Market order: fill at bar close (or next bar open if not executeOnBarClose)
        const fillPrice = advancedParams.executeOnBarClose ? bar.close : (i + 1 < bars.length ? bars[i + 1].open : bar.close);
        const shares = calculateShares(fillPrice, posType);
        if (shares > 0) {
          const side: 'buy' | 'sell' = posType === 'LONG' ? 'buy' : 'sell';
          const buyFill = getExecutionFill(fillPrice, side, execConfig, shares);
          if (posType === 'LONG') {
            cash -= shares * buyFill.price + buyFill.commission;
          } else {
            cash += shares * buyFill.price - buyFill.commission; // short: credit proceeds
          }
          positions.push({
            entryPrice: fillPrice,
            shares,
            remainingShares: shares,
            entryDate: bar.date,
            entryIndex: i,
            entryReason: signal.reason,
            entryBarRaw: { ...bar },
            entryIndicatorValue: getIndicatorValue(strategy, i),
            type: posType,
            highWaterMark: fillPrice,
            stopLossPrice: computeInitialStopLoss(fillPrice, posType, i),
            tiersExecuted: new Set(),
            barsHeld: 0,
          });
        }
      } else {
        // Limit/Stop/Stop-Limit: place pending order
        const basePrice = bar.close;
        let triggerPrice = basePrice;
        let limitPrice: number | undefined;

        if (advancedParams.entryOrderType === 'limit') {
          triggerPrice = basePrice * (1 - (advancedParams.entryLimitOffset ?? 0.5) / 100);
        } else if (advancedParams.entryOrderType === 'stop') {
          triggerPrice = basePrice * (1 + (advancedParams.entryStopOffset ?? 0.5) / 100);
        } else if (advancedParams.entryOrderType === 'stop-limit') {
          triggerPrice = basePrice * (1 + (advancedParams.entryStopOffset ?? 0.5) / 100);
          limitPrice = triggerPrice * (1 - (advancedParams.entryLimitOffset ?? 0.2) / 100);
        }
        pendingOrder = { type: advancedParams.entryOrderType, triggerPrice, limitPrice, direction: posType, reason: signal.reason, barIndex: i };
      }
    }

    // ─── EXECUTE STRATEGY EXIT ─────────────────────────────────────────────
    if (signal.action === 'SELL' && positions.length > 0) {
      if (!isTradingDay(bar.date)) continue;

      // When TP/SL is active, skip strategy-specific sells (TP/SL handled above)
      if (effectiveTakeProfit !== null || effectiveStopLoss !== null) continue;

      const exitPrice = gapFillExitAtEntry && positions[0] ? positions[0].entryPrice : bar.close;

      // Close all LONG positions on strategy sell
      for (let p = positions.length - 1; p >= 0; p--) {
        if (positions[p].type === 'LONG' && positions[p].remainingShares > 0) {
          closePosition(positions[p], exitPrice, bar.date, signal.reason, i);
          if (positions[p].remainingShares <= 0) positions.splice(p, 1);
        }
      }
    }
  }

  // Close any open positions at end
  for (let p = positions.length - 1; p >= 0; p--) {
    const pos = positions[p];
    if (pos.remainingShares > 0 && bars.length > 0) {
      closePosition(pos, bars[bars.length - 1].close, bars[bars.length - 1].date, 'End of backtest period', bars.length - 1);
      positions.splice(p, 1);
    }
  }

  // ─── CALCULATE METRICS ───────────────────────────────────────────────────
  const finalValue = cash;
  const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;
  const years = bars.length / 252;
  const annualizedReturn = years > 0 ? (Math.pow(finalValue / initialCapital, 1 / years) - 1) * 100 : 0;

  const firstClose = bars[0]?.close || 1;
  const lastClose = bars[bars.length - 1]?.close || firstClose;
  const buyHoldReturn = ((lastClose - firstClose) / firstClose) * 100;

  const dailyReturns: number[] = [];
  for (let i = 1; i < portfolioHistory.length; i++) {
    const prev = portfolioHistory[i - 1].value;
    if (prev > 0) dailyReturns.push((portfolioHistory[i].value - prev) / prev);
  }

  const avgDailyReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const dailyStdDev = dailyReturns.length > 1 ? Math.sqrt(dailyReturns.reduce((s, r) => s + Math.pow(r - avgDailyReturn, 2), 0) / (dailyReturns.length - 1)) : 0;
  const annualizedVol = dailyStdDev * Math.sqrt(252) * 100;
  const riskFreeRate = 0.04;
  const sharpeRatio = annualizedVol > 0 ? (annualizedReturn - riskFreeRate * 100) / annualizedVol : 0;

  const negativeReturns = dailyReturns.filter(r => r < 0);
  const downsideDeviation = negativeReturns.length > 0 ? Math.sqrt(negativeReturns.reduce((s, r) => s + r * r, 0) / negativeReturns.length) * Math.sqrt(252) * 100 : 0.001;
  const sortinoRatio = downsideDeviation > 0 ? (annualizedReturn - riskFreeRate * 100) / downsideDeviation : 0;

  let peak = initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownDate = '';
  for (const snap of portfolioHistory) {
    if (snap.value > peak) peak = snap.value;
    const dd = ((peak - snap.value) / peak) * 100;
    if (dd > maxDrawdown) { maxDrawdown = dd; maxDrawdownDate = snap.date; }
  }

  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnlPercent, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((s, t) => s + Math.abs(t.pnlPercent), 0) / losingTrades.length : 0;
  const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => t.pnlPercent)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => t.pnlPercent)) : 0;
  const expectedValue = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;
  const grossProfit = winningTrades.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const avgHoldingDays = trades.length > 0 ? trades.reduce((s, t) => s + t.holdingDays, 0) / trades.length : 0;

  const totalSlippageCost = trades.reduce((s, t) => s + (t.slippageCost || 0), 0);
  const totalCommissionCost = trades.reduce((s, t) => s + (t.commissionCost || 0), 0);
  const grossReturnTotal = trades.reduce((s, t) => s + (t.grossPnl ?? t.pnl), 0);
  const netReturnTotal = trades.reduce((s, t) => s + (t.netPnl ?? t.pnl), 0);

  const r2 = (v: number) => Math.round(v * 100) / 100;

  return {
    strategy, initialCapital,
    finalValue: r2(finalValue), totalReturn: r2(totalReturn), annualizedReturn: r2(annualizedReturn),
    buyHoldReturn: r2(buyHoldReturn), outperformance: r2(totalReturn - buyHoldReturn),
    sharpeRatio: r2(sharpeRatio), sortinoRatio: r2(sortinoRatio),
    maxDrawdown: r2(maxDrawdown), maxDrawdownDate,
    volatility: r2(annualizedVol),
    totalTrades: trades.length, winningTrades: winningTrades.length, losingTrades: losingTrades.length,
    winRate: r2(winRate), avgWin: r2(avgWin), avgLoss: r2(avgLoss),
    bestTrade: r2(bestTrade), worstTrade: r2(worstTrade),
    expectedValue: r2(expectedValue), profitFactor: r2(profitFactor),
    avgHoldingDays: Math.round(avgHoldingDays * 10) / 10,
    trades, portfolioHistory, tradingDays: bars.length,
    dataSource, dataSourceUrl, barsCount: bars.length, rawBarsPreview: bars.slice(0, 10),
    executionConfig: execConfig,
    totalSlippageCost: r2(totalSlippageCost), totalCommissionCost: r2(totalCommissionCost),
    grossReturn: r2(grossReturnTotal), netReturn: r2(netReturnTotal),
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

    if (body.ping === true) {
      console.log('[strategy-backtest] Ping received - function is warm');
      return handlePing();
    }

    const { ticker, strategy, startDate, initialCapital = 10000 } = body;
    let { endDate } = body;
    const requestedStartDate = normalizeDate(startDate);
    const requestedEndDateInitial = normalizeDate(endDate);

    const today = new Date().toISOString().split('T')[0];
    endDate = normalizeDate(endDate);
    if (endDate > today) {
      console.log(`[strategy-backtest] End date ${endDate} capped to today (${today})`);
      endDate = today;
    }

    const params: StrategyParams = body.params || {};

    // Backwards-compat aliases
    if (params.takeProfitPercent === undefined && (params as any).takeProfit !== undefined) (params as any).takeProfitPercent = (params as any).takeProfit;
    if (params.stopLossPercent === undefined && (params as any).stopLoss !== undefined) (params as any).stopLossPercent = (params as any).stopLoss;
    if (body.stopLossPercent !== undefined) params.stopLossPercent = body.stopLossPercent;
    if (body.takeProfitPercent !== undefined) params.takeProfitPercent = body.takeProfitPercent;
    if (body.stopLoss !== undefined && body.stopLossPercent === undefined) params.stopLossPercent = body.stopLoss;
    if (body.takeProfit !== undefined && body.takeProfitPercent === undefined) params.takeProfitPercent = body.takeProfit;
    if (body.rsiPeriod !== undefined) params.rsiPeriod = body.rsiPeriod;
    if (body.rsiOversold !== undefined) params.rsiOversold = body.rsiOversold;
    if (body.rsiOverbought !== undefined) params.rsiOverbought = body.rsiOverbought;
    if (body.fastMaPeriod !== undefined) params.fastMaPeriod = body.fastMaPeriod;
    if (body.slowMaPeriod !== undefined) params.slowMaPeriod = body.slowMaPeriod;
    if (body.gapThreshold !== undefined) params.gapThreshold = body.gapThreshold;
    if (body.consecutiveDays !== undefined) params.consecutiveDays = body.consecutiveDays;
    if (body.holdingPeriod !== undefined) params.holdingPeriod = body.holdingPeriod;
    if (body.positionSizePercent !== undefined) params.positionSizePercent = body.positionSizePercent;

    // Merge advancedParams from request body
    const advancedParams: AdvancedParams = { ...DEFAULT_ADVANCED_PARAMS, ...(body.advancedParams || {}) };

    console.log('[strategy-backtest] Params:', JSON.stringify(params));
    console.log('[strategy-backtest] AdvancedParams:', JSON.stringify({
      entryOrderType: advancedParams.entryOrderType,
      stopLossEnabled: advancedParams.stopLossEnabled,
      takeProfitEnabled: advancedParams.takeProfitEnabled,
      trailingStopEnabled: advancedParams.trailingStopEnabled,
      breakEvenEnabled: advancedParams.breakEvenEnabled,
      positionSizingMethod: advancedParams.positionSizingMethod,
      pyramiding: advancedParams.pyramiding,
    }));

    if (!ticker || !strategy) {
      return new Response(
        JSON.stringify({ success: false, error: 'ticker and strategy are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[strategy-backtest] Running ${strategy} on ${ticker} from ${requestedStartDate} to ${endDate}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedTicker = ticker.toUpperCase().trim();

    let bars: Bar[] = [];
    let dataSource: 'database' | 'polygon' = 'database';
    let dataSourceUrl = '';

    const requestedStartMs = new Date(requestedStartDate).getTime();
    const requestedEndMs = new Date(endDate).getTime();
    const daysDiff = Math.floor((requestedEndMs - requestedStartMs) / (1000 * 60 * 60 * 24));
    const expectedBars = Math.floor(daysDiff * 0.7);

    const { data: priceData, error } = await supabase
      .from('market_daily_bars')
      .select('bar_date, open, high, low, close, volume, daily_return')
      .eq('ticker', normalizedTicker)
      .gte('bar_date', requestedStartDate)
      .lte('bar_date', endDate)
      .order('bar_date', { ascending: true });

    if (error) console.error('[strategy-backtest] Database error:', error);

    const dbCoverage = priceData ? priceData.length / Math.max(expectedBars, 50) : 0;

    if (priceData && priceData.length >= 50 && dbCoverage >= 0.8) {
      dataSourceUrl = `Cloud DB: market_daily_bars (ticker=${normalizedTicker})`;
      bars = priceData.map(row => ({
        date: normalizeDate(row.bar_date), open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume, dailyReturn: row.daily_return
      })).filter(bar => isTradingDay(bar.date));
    } else {
      const polygonBars = await fetchPolygonBars(normalizedTicker, startDate, endDate);
      if (polygonBars && polygonBars.length >= 50) {
        bars = polygonBars;
        dataSource = 'polygon';
        dataSourceUrl = `https://api.polygon.io/v2/aggs/ticker/${normalizedTicker}/range/1/day/${startDate}/${endDate}`;
      } else if (priceData && priceData.length >= 20) {
        dataSourceUrl = `Cloud DB: market_daily_bars (ticker=${normalizedTicker}) [PARTIAL]`;
        bars = priceData.map(row => ({
          date: normalizeDate(row.bar_date), open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume, dailyReturn: row.daily_return
        })).filter(bar => isTradingDay(bar.date));
      } else {
        return new Response(
          JSON.stringify({ success: false, error: `Insufficient data for ${normalizedTicker}. Need at least 50 bars.`, availableBars: priceData?.length || 0, polygonBars: polygonBars?.length || 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Final normalization
    bars = bars.map(b => ({ ...b, date: normalizeDate(b.date) })).filter(b => isTradingDay(b.date));

    const lastAvailableBarDate = normalizeDate(bars[bars.length - 1]?.date || endDate);
    const effectiveStartDate = normalizeDate(bars[0]?.date || requestedStartDate);
    const effectiveEndDate = lastAvailableBarDate;
    const dataWindow: BacktestResult['dataWindow'] = {
      requestedStartDate,
      requestedEndDate: requestedEndDateInitial,
      effectiveStartDate,
      effectiveEndDate,
      lastAvailableBarDate,
      wasEndDateClamped: requestedEndDateInitial !== effectiveEndDate,
      isForwardSimulated: false,
    };

    const result = runBacktest(bars, strategy, initialCapital, params, advancedParams, dataSource, dataSourceUrl, dataWindow);

    console.log(`[strategy-backtest] Complete: ${result.totalTrades} trades, ${result.totalReturn.toFixed(2)}% return`);

    return new Response(
      JSON.stringify({ success: true, ...result, ticker: normalizedTicker, startDate: normalizeDate(bars[0]?.date || requestedStartDate), endDate: normalizeDate(bars[bars.length - 1]?.date || endDate) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[strategy-backtest] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
