
# Closing the TradingView Parity Gaps

This plan addresses the five major gaps identified in the previous analysis. Given the scope, the work is organized into five phases that build on each other. Each phase is independently deployable and testable.

---

## Phase 1: Missing Technical Indicators (~20 new indicators)

**Goal**: Expand the `TechnicalIndicators` class with all standard Pine Script `ta.*` indicators and add source input flexibility.

### What gets added to `src/lib/backtesting/indicators.ts`:

| Indicator | Method | Parameters |
|-----------|--------|------------|
| WMA (Weighted MA) | `wma(period, source?, index?)` | period, source |
| HMA (Hull MA) | `hma(period, source?, index?)` | period, source |
| VWAP | `vwap(index?)` | -- |
| CCI (Commodity Channel) | `cci(period, index?)` | period |
| OBV (On-Balance Volume) | `obv(index?)` | -- |
| ADX (Avg Directional) | `adx(period, index?)` | period |
| Parabolic SAR | `parabolicSar(step, max, index?)` | step, maxStep |
| Supertrend | `supertrend(period, multiplier, index?)` | period, multiplier |
| Donchian Channels | `donchian(period, index?)` | period |
| Keltner Channels | `keltner(period, atrPeriod, multiplier, index?)` | period, atrPeriod, mult |
| Momentum | `momentum(period, index?)` | period |
| CMF (Chaikin Money Flow) | `cmf(period, index?)` | period |

**Source input flexibility**: A new optional `source` parameter (`'open' | 'high' | 'low' | 'close' | 'hl2' | 'hlc3' | 'ohlc4'`) is added to all moving average and oscillator methods. Default remains `close`.

**Fix existing simplified indicators**: The MACD signal line and Stochastic %D currently use placeholder `* 0.9` approximations. These will be replaced with proper EMA-of-MACD and SMA-of-%K calculations.

### What gets added to the Visual Strategy Builder palette (`src/lib/strategyBuilder/templates.ts`):

New indicator blocks in `INDICATOR_BLOCKS`:
- MACD, Bollinger (already typed but missing from palette), ADX, Supertrend, VWAP, Stochastic, CCI, OBV, Donchian, Keltner

Each block gets a `parameterConfig` with appropriate ranges and a `source` dropdown where applicable.

### Type updates (`src/lib/strategyBuilder/types.ts`):
- Expand `IndicatorSubtype` to include all new indicator names
- Add `'source'` as an allowed parameter type in `ParameterConfig`

---

## Phase 2: Wire AdvancedBacktestParams to the Edge Function Engine

**Goal**: Make the Advanced Parameters panel actually affect trade execution in the `strategy-backtest` edge function.

### Changes to `supabase/functions/strategy-backtest/index.ts`:

The edge function currently receives `advancedParams` in the request body but ignores it entirely. It uses a hardcoded `DEFAULT_EXECUTION_CONFIG`. This phase wires up every parameter.

**2a. Entry Order Types**
- Current: All entries fill at `bar.close` (market order at current bar close).
- New: Read `advancedParams.entryOrderType` and adjust fill logic:
  - `'market'`: Fill at next bar's open (more realistic than current bar close).
  - `'limit'`: Only fill if `bar.low <= entryPrice * (1 - limitOffset/100)`. Fill at limit price.
  - `'stop'`: Only fill if `bar.high >= entryPrice * (1 + stopOffset/100)`. Fill at stop price.
  - `'stop-limit'`: Stop triggers first, then limit placed on subsequent bars.
- Pending orders are tracked in a new `pendingOrder` variable that persists across bars.

**2b. Exit Mechanics**
Replace the current simple `stopLoss`/`takeProfit` percentage check with the full `AdvancedBacktestParams` exit system:

- **Trailing Stop**: Track `highWaterMark` per position. If `trailingStopEnabled`, calculate trailing stop level each bar. Support activation threshold (`after-profit` mode).
- **Break-Even Stop**: When `breakEvenEnabled` and position profit exceeds `breakEvenTrigger`, move stop loss to entry price.
- **Partial Take Profit**: When `takeProfitPartial` is true, sell `takeProfitPartialPercent`% of shares at target, keep remainder with trailing stop.
- **Scaled Exit Tiers**: Process `exitTiers` array in order -- at each profit threshold, close the specified percentage of remaining shares.
- **ATR-Based Stop**: Calculate ATR using the existing indicator function and set stop at `entry - ATR * multiplier`.
- **Time Exit**: Exit after `timeExitBars` bars. `timeExitOnSessionClose` will exit at bar close instead of next open.

Exit priority order (checked each bar):
1. Stop Loss (hard stop)
2. Take Profit / Partial TP
3. Trailing Stop
4. Scaled Exit Tiers
5. Time Exit
6. Strategy-specific exit signal (only if no TP/SL configured)

**2c. Execution Realism**
- **Commission**: Read `commissionType` and `commissionValue` from `advancedParams` instead of the hardcoded `$0.99`. Support percent-of-trade, fixed-per-order, and fixed-per-contract modes.
- **Slippage**: Convert `slippageTicks` to basis points (1 tick ~ 1 cent for stocks). Apply to all market and stop fills.
- **Bar Close Execution**: When `executeOnBarClose` is true, fill entries on the signal bar's close instead of the next bar. Add a `dataQualityFlag` warning about lookahead bias.

**2d. Position Sizing**
- Read `positionSizingMethod` and `positionSizingValue` from `advancedParams`:
  - `'percent-equity'`: Invest X% of current portfolio value.
  - `'fixed-dollar'`: Invest fixed dollar amount.
  - `'fixed-shares'`: Buy fixed number of shares.
  - `'risk-based'`: `(Portfolio * riskPercent) / stopDistance`. Requires stop loss to be enabled.
- **Pyramiding**: Track `openPositionCount`. Allow up to `pyramiding` concurrent entries in same direction. Convert engine from single-position to multi-position tracking using a `positions[]` array.
- **Margin**: Apply `marginLong` / `marginShort` as leverage multiplier to buying power. `marginLong = 50` means 2x leverage.

### Data flow:
```text
StrategyBacktester.tsx
  --> advancedParams state
  --> supabase.functions.invoke('strategy-backtest', { body: { ..., advancedParams } })
  --> Edge function reads body.advancedParams
  --> Merges with DEFAULT_ADVANCED_PARAMS (for missing fields)
  --> Passes to runBacktest() which uses them for all execution logic
```

---

## Phase 3: Short Selling Support

**Goal**: Allow strategies to enter SHORT positions with correct P&L, margin, and stop/TP reversal.

### Changes:

**Edge function (`strategy-backtest/index.ts`)**:
- Add `positionType: 'LONG' | 'SHORT'` tracking to the position state.
- For SHORT entries: sell first (credit cash), buy to cover on exit (debit cash).
- Reverse stop loss / take profit logic for shorts:
  - Stop loss triggers when price rises above entry by X%.
  - Take profit triggers when price falls below entry by X%.
- Apply `marginShort` from advanced params for margin requirements.

**Strategy signals**:
- Add `'SHORT'` as a valid signal action alongside `'BUY'` and `'SELL'`.
- Existing strategies remain long-only by default.
- The Visual Builder gets a new action block: `SHORT` (enter short position).

**Visual Builder (`src/lib/strategyBuilder/types.ts`)**:
- Add `'SHORT'` to `ActionSubtype`.
- Add a SHORT action block to `ACTION_BLOCKS` in templates.

**Trade record**:
- Already supports `type: 'LONG' | 'SHORT'` in the Trade interface -- just needs to be populated correctly.

---

## Phase 4: New Strategy Blocks for the Visual Builder

**Goal**: Add new indicator blocks and condition types that map to the expanded indicator library.

### New palette blocks (`src/lib/strategyBuilder/templates.ts`):

**Indicators** (added to `INDICATOR_BLOCKS`):
- MACD -- params: fastPeriod, slowPeriod, signalPeriod
- Bollinger Bands -- params: period, stdDev
- ADX -- params: period
- Supertrend -- params: period, multiplier
- VWAP -- no params
- Stochastic -- params: kPeriod, dPeriod
- CCI -- params: period
- OBV -- no params
- Donchian -- params: period
- Keltner -- params: period, atrPeriod, multiplier

**Conditions** (added to `CONDITION_BLOCKS`):
- `BETWEEN` -- "Value is between X and Y" (useful for RSI 30-70 range)
- `IS_RISING` -- "Value is increasing" (positive slope over N bars)
- `IS_FALLING` -- "Value is decreasing"

**Source selector**:
- Add a `source` dropdown to each indicator block's `parameterConfig`: `{ key: 'source', label: 'Source', type: 'select', options: [{value: 'close', label: 'Close'}, {value: 'open', label: 'Open'}, {value: 'high', label: 'High'}, {value: 'low', label: 'Low'}, {value: 'hlc3', label: 'HLC/3'}, {value: 'ohlc4', label: 'OHLC/4'}] }`

### Strategy template additions:
- **MACD Divergence** template: MACD indicator + CROSSES_ABOVE condition + BUY + Stop Loss + Take Profit
- **Supertrend Follow** template: Supertrend indicator + CROSSES_ABOVE condition + BUY + Trailing Stop
- **Bollinger Squeeze** template: Bollinger + LESS_THAN (bandwidth) + BUY + Time Exit

### Edge function mapping:
- Add new strategy handlers in the edge function for `'macd-divergence'`, `'supertrend'`, `'bollinger-reversal'` (already exists), `'adx-trend'`, `'volume-spike'`.
- Each calculates the relevant indicator inline and generates BUY/SELL signals.

---

## Phase 5: Structural Improvements

**Goal**: Address remaining architectural gaps.

### 5a. Multi-Timeframe Analysis (foundation only)
- Add a `timeframe` parameter to `BacktestConfig`: `'1min' | '5min' | '15min' | '1hour' | 'daily'` (already typed).
- In the edge function, add ability to fetch a secondary timeframe from Polygon (e.g., weekly bars for trend filter).
- Add a new condition block: `HIGHER_TF_TREND` -- "Daily trend is bullish (price above 50 SMA on daily)".
- This is a foundation; full MTF is a future expansion.

### 5b. Bar Referencing / Price Action Conditions
- Add condition blocks for price action:
  - `PRICE_ABOVE_PREV_HIGH` -- "Close > Previous bar's High"
  - `PRICE_BELOW_PREV_LOW` -- "Close < Previous bar's Low"
  - `NEW_HIGH` -- "Making N-period new high"
  - `NEW_LOW` -- "Making N-period new low"
- These map to existing `isNewHigh`/`isNewLow` methods in the indicators class.

### 5c. Skewness & Kurtosis
- Replace the `skewness: 0` and `kurtosis: 0` TODO placeholders in `engine.ts` with actual calculations.

---

## Files Summary

| File | Action | Phase |
|------|--------|-------|
| `src/lib/backtesting/indicators.ts` | Modify -- add ~12 new indicators, fix MACD/Stochastic, add source param | 1 |
| `src/lib/strategyBuilder/types.ts` | Modify -- expand `IndicatorSubtype`, `ConditionSubtype`, `ActionSubtype` | 1, 3, 4 |
| `src/lib/strategyBuilder/templates.ts` | Modify -- add ~10 new indicator blocks, conditions, SHORT action, templates | 1, 3, 4, 5 |
| `supabase/functions/strategy-backtest/index.ts` | Modify -- wire advancedParams, add exit mechanics, position sizing, short selling, new strategies | 2, 3, 4 |
| `src/lib/backtesting/engine.ts` | Modify -- fix skewness/kurtosis, add source support | 1, 5 |
| `src/lib/backtesting/types.ts` | Modify -- add source type, expand strategy context indicators | 1 |
| `src/components/backtester/AdvancedParamsPanel.tsx` | Modify -- add source selector, short selling toggle | 3, 4 |

No new files are created. No database changes required.

---

## Implementation Order

Due to the size of this plan, I recommend implementing it in two batches:

**Batch 1** (Phases 1 + 2): Indicators + Engine Wiring -- This is the highest-value work. Users get 12+ new indicators and their Advanced Parameters panel actually starts affecting backtest results.

**Batch 2** (Phases 3 + 4 + 5): Short Selling + New Builder Blocks + Structural -- Builds on the wired engine to add shorts, new visual blocks, and architectural refinements.
