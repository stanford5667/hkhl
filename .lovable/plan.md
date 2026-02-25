

# Backtest Validation Test Suite

## Overview

Create an automated test suite that verifies backtest calculations against real price data from the Polygon API. The tests will call the live `strategy-backtest` edge function with known tickers and date ranges, then validate that every trade, metric, and portfolio value is mathematically consistent with the underlying price bars returned in the response.

## Validation Layers

### Layer 1: Data Integrity Checks
- Verify `barsCount` matches the actual number of bars in the response
- Confirm all bar dates fall on valid trading days (no weekends/holidays)
- Ensure bars are sorted chronologically with no duplicates
- Validate OHLCV relationships: `low <= open, close <= high` for every bar
- Confirm `dailyReturn` matches `(close - prevClose) / prevClose * 100`
- Check `dataSource` is either `'database'` or `'polygon'` (no mock data)

### Layer 2: Trade-Level Verification
For every trade in the `trades` array:
- Confirm `entryDate` and `exitDate` exist in the bars data
- Verify `entryPrice` matches the bar's close on `entryDate` (adjusted for slippage)
- Verify `exitPrice` matches the bar's close on `exitDate` (adjusted for slippage)
- Recalculate `grossPnl` as `shares * (exitPrice - entryPrice)` and compare
- Recalculate `grossPnlPercent` as `((exitPrice - entryPrice) / entryPrice) * 100`
- Verify `holdingDays` (trading days between entry and exit)
- Check that no two trades overlap in time (no double-positions unless pyramiding > 1)
- Validate `commissionCost` matches the commission model (percent, fixed-per-order, or fixed-per-contract)
- Verify `netPnl = grossPnl - slippageCost - commissionCost`

### Layer 3: Portfolio / Equity Curve
- Walk through `portfolioHistory` and verify `value = cash + positionValue`
- Confirm initial snapshot value equals `initialCapital`
- Confirm final snapshot value equals `finalValue`
- Verify `inPosition` flag flips correctly at trade entry/exit dates

### Layer 4: Summary Metrics
- **totalReturn**: recalculate as `((finalValue - initialCapital) / initialCapital) * 100`
- **winRate**: recalculate as `winningTrades / totalTrades * 100`
- **winningTrades + losingTrades = totalTrades**
- **avgWin**: mean of positive `pnlPercent` trades
- **avgLoss**: mean of negative `pnlPercent` trades
- **profitFactor**: `sum(wins) / abs(sum(losses))`
- **maxDrawdown**: walk equity curve, find largest peak-to-trough drop
- **sharpeRatio**: recalculate from daily returns in portfolio history
- **buyHoldReturn**: `((lastClose - firstClose) / firstClose) * 100`
- **outperformance**: `totalReturn - buyHoldReturn`

### Layer 5: Strategy-Specific Signal Validation
For a known strategy (e.g., RSI with period=14, oversold=30):
- Independently compute RSI from the bar closes
- Verify that BUY signals only fired when RSI was below the oversold threshold
- Verify that SELL signals only fired when RSI was above the overbought threshold
- Spot-check 2-3 trades' `entryReason` text against computed indicator values

## Test Scenarios

| Test | Strategy | Ticker | Period | What it validates |
|------|----------|--------|--------|-------------------|
| 1 | RSI (14, 30/70) | AAPL | 1Y | Signal accuracy + trade math |
| 2 | MA Crossover (20/50) | MSFT | 3Y | Crossover detection + long holding periods |
| 3 | MACD (12/26/9) | TSLA | 1Y | Histogram sign flip accuracy |
| 4 | Bollinger (20, 2) | SPY | 3Y | Band touch detection |
| 5 | Gap Fill (-2%) | QQQ | 1Y | Gap calculation + fill logic |
| 6 | Consecutive Down (3) | NVDA | 1Y | Streak counting |
| 7 | No-trade scenario | BRK.B | 1Y (RSI 5/95) | Edge case: 0 trades, metrics default correctly |
| 8 | Execution realism | AAPL | 1Y | Slippage + commission deductions match config |

## Implementation

### File: `supabase/functions/strategy-backtest/index_test.ts`

A Deno test file using the existing edge function endpoint. Each test:
1. Calls `strategy-backtest` with specific params
2. Parses the full response (bars, trades, portfolio history, metrics)
3. Runs the validation checks above
4. Asserts with clear error messages on any mismatch

Tolerance for floating-point comparisons: 0.01% for prices, 0.1% for percentages.

### Helper functions to create:
- `validateBarIntegrity(bars)` -- OHLCV sanity, trading day check
- `validateTradeAgainstBars(trade, bars, execConfig)` -- price/PnL verification
- `validatePortfolioHistory(history, trades, initialCapital)` -- equity walk
- `validateSummaryMetrics(result)` -- recalculate all metrics
- `computeRSI(closes, period)` -- independent RSI for signal validation

## Technical Details

```text
Test runner: Deno.test() via supabase--test-edge-functions tool
Env loading: import "https://deno.land/std@0.224.0/dotenv/load.ts"
Endpoint:    VITE_SUPABASE_URL + /functions/v1/strategy-backtest
Auth:        VITE_SUPABASE_PUBLISHABLE_KEY as Bearer token
Timeout:     120s per test (API calls + computation)
```

### Files summary:

| File | Action |
|------|--------|
| `supabase/functions/strategy-backtest/index_test.ts` | Create -- full validation test suite |

