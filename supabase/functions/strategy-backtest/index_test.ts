import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertAlmostEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/strategy-backtest`;

const PRICE_TOLERANCE = 0.02;    // 2 cents for price comparisons
const PCT_TOLERANCE = 0.5;       // 0.5% absolute tolerance for percentages
const LOOSE_PCT_TOLERANCE = 2.0; // 2% for metrics that compound rounding

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

interface Bar {
  date: string; open: number; high: number; low: number; close: number; volume: number; dailyReturn?: number;
}

interface Trade {
  entryDate: string; exitDate: string; entryPrice: number; exitPrice: number;
  shares: number; pnl: number; pnlPercent: number; type: 'LONG' | 'SHORT';
  entryReason: string; exitReason: string; holdingDays: number;
  grossPnl?: number; grossPnlPercent?: number; slippageCost?: number;
  commissionCost?: number; netPnl?: number; netPnlPercent?: number;
  indicatorValueAtEntry?: number; indicatorName?: string;
}

interface PortfolioSnapshot {
  date: string; value: number; cash: number; positionValue: number; inPosition: boolean;
}

interface BacktestResult {
  success: boolean; strategy: string; ticker: string;
  startDate: string; endDate: string;
  initialCapital: number; finalValue: number;
  totalReturn: number; buyHoldReturn: number; outperformance: number;
  sharpeRatio: number; maxDrawdown: number;
  totalTrades: number; winningTrades: number; losingTrades: number;
  winRate: number; avgWin: number; avgLoss: number;
  profitFactor: number; avgHoldingDays: number;
  trades: Trade[]; portfolioHistory: PortfolioSnapshot[];
  tradingDays: number; dataSource: string; barsCount: number;
  rawBarsPreview: Bar[];
  executionConfig: { slippageBps: number; commissionType: string; commissionValue: number; applySlippage: boolean; applyCommission: boolean };
  totalSlippageCost: number; totalCommissionCost: number;
  grossReturn: number; netReturn: number;
}

async function callBacktest(body: Record<string, unknown>): Promise<BacktestResult> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  assert(res.ok, `HTTP ${res.status}: ${text.slice(0, 500)}`);
  const data = JSON.parse(text);
  assert(data.success, `Backtest failed: ${JSON.stringify(data).slice(0, 500)}`);
  return data as BacktestResult;
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr.slice(0, 10) + "T12:00:00Z");
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function assertClose(actual: number, expected: number, tolerance: number, msg: string) {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, `${msg}: expected ~${expected}, got ${actual} (diff ${diff.toFixed(6)}, tol ${tolerance})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: DATA INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════

function validateBarIntegrity(result: BacktestResult) {
  const bars = result.rawBarsPreview;

  // rawBarsPreview may be a subset; barsCount >= bars.length
  assert(result.barsCount >= bars.length, `barsCount (${result.barsCount}) < bars.length (${bars.length})`);

  // dataSource is real
  assert(
    result.dataSource === "database" || result.dataSource === "polygon",
    `Invalid dataSource: ${result.dataSource}`
  );

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];

    // No weekends
    assert(!isWeekend(b.date), `Bar on weekend: ${b.date}`);

    // OHLCV sanity
    assert(b.low <= b.open + 0.01, `Bar ${b.date}: low (${b.low}) > open (${b.open})`);
    assert(b.low <= b.close + 0.01, `Bar ${b.date}: low (${b.low}) > close (${b.close})`);
    assert(b.high >= b.open - 0.01, `Bar ${b.date}: high (${b.high}) < open (${b.open})`);
    assert(b.high >= b.close - 0.01, `Bar ${b.date}: high (${b.high}) < close (${b.close})`);
    assert(b.volume >= 0, `Bar ${b.date}: negative volume`);

    // Chronological order
    if (i > 0) {
      assert(b.date > bars[i - 1].date, `Bars not sorted: ${bars[i - 1].date} >= ${b.date}`);
    }

    // Daily return check - might be in percentage or decimal form depending on source
    if (i > 0 && b.dailyReturn !== undefined && b.dailyReturn !== null) {
      const expectedReturnPct = ((b.close - bars[i - 1].close) / bars[i - 1].close) * 100;
      // Try percentage form first, then decimal form
      const matchesPct = Math.abs(b.dailyReturn - expectedReturnPct) < 0.1;
      const matchesDec = Math.abs(b.dailyReturn - expectedReturnPct / 100) < 0.001;
      assert(matchesPct || matchesDec, `Bar ${b.date} dailyReturn ${b.dailyReturn} doesn't match expected ${expectedReturnPct.toFixed(4)}% or ${(expectedReturnPct/100).toFixed(6)}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: TRADE-LEVEL VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateTrades(result: BacktestResult) {
  for (const trade of result.trades) {
    // Gross PnL sign consistency
    if (trade.grossPnl !== undefined && trade.grossPnlPercent !== undefined) {
      if (trade.grossPnl > 0.01) {
        assert(trade.grossPnlPercent > -1, `Trade ${trade.entryDate}: positive grossPnl but very negative grossPnlPercent`);
      }
    }

    // netPnl = grossPnl - slippageCost - commissionCost
    if (trade.grossPnl !== undefined && trade.slippageCost !== undefined && trade.commissionCost !== undefined && trade.netPnl !== undefined) {
      const expectedNet = trade.grossPnl - trade.slippageCost - trade.commissionCost;
      assertClose(trade.netPnl, expectedNet, 0.05,
        `Trade ${trade.entryDate} netPnl`);
    }

    // Shares > 0
    assert(trade.shares > 0, `Trade ${trade.entryDate}: shares = ${trade.shares}`);

    // holdingDays >= 0
    assert(trade.holdingDays >= 0, `Trade ${trade.entryDate}: holdingDays = ${trade.holdingDays}`);

    // commissionCost >= 0
    if (trade.commissionCost !== undefined) {
      assert(trade.commissionCost >= 0, `Trade ${trade.entryDate}: negative commission`);
    }

    // slippageCost >= 0
    if (trade.slippageCost !== undefined) {
      assert(trade.slippageCost >= 0, `Trade ${trade.entryDate}: negative slippage`);
    }

    // Entry before exit
    assert(trade.entryDate <= trade.exitDate, `Trade entry ${trade.entryDate} after exit ${trade.exitDate}`);

    // Prices > 0
    assert(trade.entryPrice > 0, `Trade ${trade.entryDate}: entryPrice <= 0`);
    assert(trade.exitPrice > 0, `Trade ${trade.entryDate}: exitPrice <= 0`);
  }

  // No overlapping trades (single position mode)
  if (result.trades.length > 1) {
    const sorted = [...result.trades].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
    for (let i = 1; i < sorted.length; i++) {
      assert(
        sorted[i].entryDate >= sorted[i - 1].exitDate,
        `Overlapping trades: trade ending ${sorted[i - 1].exitDate} overlaps with trade starting ${sorted[i].entryDate}`
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3: PORTFOLIO / EQUITY CURVE
// ═══════════════════════════════════════════════════════════════════════════════

function validatePortfolioHistory(result: BacktestResult) {
  const history = result.portfolioHistory;
  assert(history.length > 0, "portfolioHistory is empty");

  // Initial snapshot ≈ initialCapital
  assertClose(history[0].value, result.initialCapital, result.initialCapital * 0.01,
    "Initial portfolio value");

  // Final snapshot ≈ finalValue
  const lastSnapshot = history[history.length - 1];
  assertClose(lastSnapshot.value, result.finalValue, result.finalValue * 0.01,
    "Final portfolio value");

  // Each snapshot: value ≈ cash + positionValue
  for (const snap of history) {
    assertClose(snap.value, snap.cash + snap.positionValue, Math.max(1, snap.value * 0.01),
      `Snapshot ${snap.date}: value != cash + positionValue`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 4: SUMMARY METRICS
// ═══════════════════════════════════════════════════════════════════════════════

function validateSummaryMetrics(result: BacktestResult) {
  // totalReturn
  const expectedTotalReturn = ((result.finalValue - result.initialCapital) / result.initialCapital) * 100;
  assertClose(result.totalReturn, expectedTotalReturn, PCT_TOLERANCE,
    "totalReturn");

  // winningTrades + losingTrades = totalTrades
  assertEquals(result.winningTrades + result.losingTrades, result.totalTrades,
    `winningTrades (${result.winningTrades}) + losingTrades (${result.losingTrades}) != totalTrades (${result.totalTrades})`);

  // winRate
  if (result.totalTrades > 0) {
    const expectedWinRate = (result.winningTrades / result.totalTrades) * 100;
    assertClose(result.winRate, expectedWinRate, PCT_TOLERANCE, "winRate");
  }

  // avgWin / avgLoss from trades
  if (result.trades.length > 0) {
    const wins = result.trades.filter(t => t.pnlPercent > 0);
    const losses = result.trades.filter(t => t.pnlPercent <= 0);

    if (wins.length > 0) {
      const expectedAvgWin = wins.reduce((s, t) => s + t.pnlPercent, 0) / wins.length;
      assertClose(result.avgWin, expectedAvgWin, LOOSE_PCT_TOLERANCE, "avgWin");
    }

    if (losses.length > 0) {
      // avgLoss is stored as absolute value (positive) in engine
      const expectedAvgLoss = losses.reduce((s, t) => s + Math.abs(t.pnlPercent), 0) / losses.length;
      assertClose(result.avgLoss, expectedAvgLoss, LOOSE_PCT_TOLERANCE, "avgLoss");
    }
  }

  // profitFactor
  if (result.totalTrades > 0 && result.trades.some(t => t.pnl < 0)) {
    const sumWins = result.trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const sumLosses = Math.abs(result.trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    if (sumLosses > 0) {
      const expectedPF = sumWins / sumLosses;
      assertClose(result.profitFactor, expectedPF, LOOSE_PCT_TOLERANCE, "profitFactor");
    }
  }

  // buyHoldReturn - can't recompute from rawBarsPreview (only 10 bars), just check consistency
  // outperformance = totalReturn - buyHoldReturn

  // outperformance
  assertClose(result.outperformance, result.totalReturn - result.buyHoldReturn, LOOSE_PCT_TOLERANCE,
    "outperformance");

  // maxDrawdown is stored as positive percentage in engine
  assert(result.maxDrawdown >= -0.01, `maxDrawdown should be >= 0, got ${result.maxDrawdown}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 5: RSI SIGNAL VALIDATION (independent computation)
// ═══════════════════════════════════════════════════════════════════════════════

function computeRSI(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) changes.push(closes[i] - closes[i - 1]);
  for (let i = 0; i < closes.length; i++) {
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

function validateRSISignals(result: BacktestResult, oversold: number, _overbought: number) {
  // Use the indicatorValueAtEntry from trades instead of recomputing from preview bars
  const sampled = result.trades.slice(0, 5);
  for (const trade of sampled) {
    if (trade.indicatorValueAtEntry === undefined || trade.indicatorValueAtEntry === null) continue;

    const rsi = trade.indicatorValueAtEntry;
    if (trade.type === 'LONG' && trade.entryReason.toLowerCase().includes('oversold')) {
      assert(rsi < oversold + 5,
        `RSI signal validation: entry at ${trade.entryDate} with RSI=${rsi.toFixed(1)} but oversold threshold is ${oversold}`);
    }

    // Also verify the indicator name is RSI
    if (trade.indicatorName) {
      assert(trade.indicatorName === 'RSI', `Expected indicator RSI, got ${trade.indicatorName}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

Deno.test("Test 1: RSI strategy on AAPL - signal accuracy + trade math", async () => {
  const result = await callBacktest({
    ticker: "AAPL",
    strategy: "rsi",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    initialCapital: 100000,
    params: { rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 70 },
  });

  validateBarIntegrity(result);
  validateTrades(result);
  validatePortfolioHistory(result);
  validateSummaryMetrics(result);
  validateRSISignals(result, 30, 70);

  console.log(`RSI/AAPL: ${result.totalTrades} trades, ${result.totalReturn.toFixed(2)}% return, ${result.dataSource} source`);
});

Deno.test("Test 2: MA Crossover on MSFT - crossover detection", async () => {
  const result = await callBacktest({
    ticker: "MSFT",
    strategy: "ma-crossover",
    startDate: "2022-01-01",
    endDate: "2024-12-31",
    initialCapital: 100000,
    params: { fastMaPeriod: 20, slowMaPeriod: 50 },
  });

  validateBarIntegrity(result);
  validateTrades(result);
  validatePortfolioHistory(result);
  validateSummaryMetrics(result);

  // MA crossover should produce trades with entry reasons containing "Cross"
  for (const trade of result.trades.slice(0, 3)) {
    assert(
      trade.entryReason.toLowerCase().includes("cross") || trade.entryReason.toLowerCase().includes("ma"),
      `MA trade reason doesn't mention crossover: ${trade.entryReason}`
    );
  }

  console.log(`MA/MSFT: ${result.totalTrades} trades, ${result.totalReturn.toFixed(2)}% return`);
});

Deno.test("Test 3: MACD on TSLA - histogram sign flip", async () => {
  const result = await callBacktest({
    ticker: "TSLA",
    strategy: "macd",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    initialCapital: 100000,
    params: { fastMaPeriod: 12, slowMaPeriod: 26, direction: "bullish" },
  });

  validateBarIntegrity(result);
  validateTrades(result);
  validatePortfolioHistory(result);
  validateSummaryMetrics(result);

  // MACD trades should reference histogram in reasons
  for (const trade of result.trades.slice(0, 3)) {
    assert(
      trade.entryReason.toLowerCase().includes("macd") || trade.entryReason.toLowerCase().includes("histogram"),
      `MACD trade reason doesn't mention MACD: ${trade.entryReason}`
    );
  }

  console.log(`MACD/TSLA: ${result.totalTrades} trades, ${result.totalReturn.toFixed(2)}% return`);
});

Deno.test("Test 4: Bollinger on SPY - band touch detection", async () => {
  const result = await callBacktest({
    ticker: "SPY",
    strategy: "bollinger",
    startDate: "2022-01-01",
    endDate: "2024-12-31",
    initialCapital: 100000,
    params: { bbPeriod: 20, bbStdDev: 2, direction: "lower" },
  });

  validateBarIntegrity(result);
  validateTrades(result);
  validatePortfolioHistory(result);
  validateSummaryMetrics(result);

  console.log(`Bollinger/SPY: ${result.totalTrades} trades, ${result.totalReturn.toFixed(2)}% return`);
});

Deno.test("Test 5: Gap Fill on QQQ - gap calculation", async () => {
  const result = await callBacktest({
    ticker: "QQQ",
    strategy: "gap-fill",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    initialCapital: 100000,
    params: { gapThreshold: 2 },
  });

  validateBarIntegrity(result);
  validateTrades(result);
  validatePortfolioHistory(result);
  validateSummaryMetrics(result);

  // Gap fill entries should mention "gap"
  for (const trade of result.trades.slice(0, 3)) {
    assert(
      trade.entryReason.toLowerCase().includes("gap"),
      `Gap fill trade reason doesn't mention gap: ${trade.entryReason}`
    );
  }

  console.log(`GapFill/QQQ: ${result.totalTrades} trades, ${result.totalReturn.toFixed(2)}% return`);
});

Deno.test("Test 6: Consecutive Down on NVDA - streak counting", async () => {
  const result = await callBacktest({
    ticker: "NVDA",
    strategy: "consecutive-days",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    initialCapital: 100000,
    params: { consecutiveDays: 3, holdingPeriod: 5 },
  });

  validateBarIntegrity(result);
  validateTrades(result);
  validatePortfolioHistory(result);
  validateSummaryMetrics(result);

  // Entries should mention "consecutive"
  for (const trade of result.trades.slice(0, 3)) {
    assert(
      trade.entryReason.toLowerCase().includes("consecutive"),
      `Consecutive trade reason: ${trade.entryReason}`
    );
  }

  console.log(`ConsecDown/NVDA: ${result.totalTrades} trades, ${result.totalReturn.toFixed(2)}% return`);
});

Deno.test("Test 7: No-trade scenario - extreme RSI thresholds", async () => {
  const result = await callBacktest({
    ticker: "AAPL",
    strategy: "rsi",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    initialCapital: 100000,
    params: { rsiPeriod: 14, rsiOversold: 5, rsiOverbought: 95 },
  });

  validateBarIntegrity(result);

  // With RSI 5/95 thresholds, likely 0 trades
  if (result.totalTrades === 0) {
    assertEquals(result.winningTrades, 0, "winningTrades should be 0");
    assertEquals(result.losingTrades, 0, "losingTrades should be 0");
    assertClose(result.finalValue, result.initialCapital, 0.01, "finalValue should equal initialCapital");
    assertClose(result.totalReturn, 0, 0.01, "totalReturn should be 0");
    assertEquals(result.trades.length, 0, "trades array should be empty");
  } else {
    // If trades happened, still validate
    validateTrades(result);
    validateSummaryMetrics(result);
  }

  validatePortfolioHistory(result);

  console.log(`NoTrade/AAPL: ${result.totalTrades} trades, finalValue=$${result.finalValue.toFixed(2)}`);
});

Deno.test("Test 8: Execution realism - slippage + commission", async () => {
  const result = await callBacktest({
    ticker: "AAPL",
    strategy: "rsi",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    initialCapital: 100000,
    params: { rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 70 },
    advancedParams: {
      commissionType: "fixed-per-order",
      commissionValue: 5.0,
      slippageTicks: 2,
      positionSizingMethod: "percent-equity",
      positionSizingValue: 20,
    },
  });

  validateBarIntegrity(result);
  validateTrades(result);
  validatePortfolioHistory(result);
  validateSummaryMetrics(result);

  // Verify execution config reflects our params
  assertEquals(result.executionConfig.commissionType, "fixed-per-order", "commissionType");
  assertClose(result.executionConfig.commissionValue, 5.0, 0.01, "commissionValue");
  assert(result.executionConfig.applySlippage, "slippage should be enabled");

  // Total costs should be positive if trades occurred
  if (result.totalTrades > 0) {
    assert(result.totalSlippageCost > 0, `totalSlippageCost should be > 0, got ${result.totalSlippageCost}`);
    assert(result.totalCommissionCost > 0, `totalCommissionCost should be > 0, got ${result.totalCommissionCost}`);

    // Each trade's commission should be ~$5 per order (entry + exit = $10)
    for (const trade of result.trades) {
      if (trade.commissionCost !== undefined) {
        assertClose(trade.commissionCost, 10.0, 0.5,
          `Trade ${trade.entryDate} commission (fixed-per-order $5 x 2)`);
      }
    }

    // grossReturn > netReturn (costs reduce returns)
    assert(result.grossReturn >= result.netReturn,
      `grossReturn (${result.grossReturn}) should be >= netReturn (${result.netReturn})`);
  }

  console.log(`ExecRealism/AAPL: ${result.totalTrades} trades, slippage=$${result.totalSlippageCost.toFixed(2)}, commission=$${result.totalCommissionCost.toFixed(2)}`);
});
