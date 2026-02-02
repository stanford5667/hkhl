
# Unified Plan: Cleanup Legacy Backtest + Add Execution Realism

## Overview
This plan combines two critical objectives:
1. **Cleanup** - Remove the legacy/orphan `run-backtest` system that causes confusion
2. **Execution Realism** - Fix systematic data issues in the active `strategy-backtest` system

The Strategy Backtester on company detail pages (`/stock/:ticker`) uses `strategy-backtest` edge function - this is the ONLY backtester you'll have after cleanup.

---

## Phase 1: Remove Legacy Backtest Infrastructure

### What Gets Deleted

| Item | Path | Purpose | Reason for Removal |
|------|------|---------|-------------------|
| Legacy Edge Function | `supabase/functions/run-backtest/` | Portfolio buy-hold simulation | Only used by orphan page |
| Orphan Page | `src/pages/Backtest.tsx` | Portfolio simulation UI | Not routed in App.tsx |
| Config Entry | Line 63-64 in `supabase/config.toml` | Function config | Removing the function |

### What Stays (Your Active Systems)

| Component | Location | Purpose |
|-----------|----------|---------|
| **Strategy Backtester** | `src/components/backtester/StrategyBacktester.tsx` | Single-ticker strategy testing on `/stock/:ticker` |
| **strategy-backtest** | `supabase/functions/strategy-backtest/index.ts` | Edge function (1051 lines) with RSI, MA, Gap, Consecutive strategies |
| **Portfolio Visualizer** | `src/components/backtester/ProfessionalBacktester.tsx` | Multi-asset portfolio analysis at `/backtester` route |

---

## Phase 2: Execution Realism Improvements

These changes target the active `strategy-backtest` edge function.

### 2.1 Trading Calendar Enforcement for Exit Dates

**Problem**: Exit dates can land on weekends when holding periods expire.

**Solution**: Add `getNextTradingDay()` helper and apply to all exit date calculations.

```text
Entry Signal → Is Trading Day? 
                    ↓ No
              Skip to Next Trading Day
                    ↓ Yes
              Execute Trade
```

### 2.2 Slippage & Commission Modeling

**New Configuration Interface**:
```text
ExecutionConfig {
  slippageBps: 10          // 0.10% default (10 basis points)
  commissionPerTrade: 0.99 // $0.99 default
  orderType: 'market'      // 'market' or 'limit'
}
```

**Application**:
- Entry price adjusted UP by slippage (buying at slightly higher price)
- Exit price adjusted DOWN by slippage (selling at slightly lower price)  
- Commission deducted from both legs
- Net P&L reflects real-world friction

### 2.3 Enhanced Trade Logging

Add new fields to each trade for transparency:

| Field | Description |
|-------|-------------|
| `grossPnl` | P&L before costs |
| `slippageCost` | Estimated slippage amount |
| `commissionCost` | Round-trip commission |
| `netPnl` | Final P&L after all costs |
| `dataQualityFlag` | Any warnings (weekend date corrected, future date, etc.) |

### 2.4 Reality Scenarios Display

Add a comparison section in the results dashboard:

```text
┌───────────────────────────────────────────────────────┐
│ 📊 Reality Scenarios                                  │
├─────────────┬─────────────┬─────────────┬─────────────┤
│ Theoretical │ With        │ With        │ Realistic   │
│ (Perfect)   │ Slippage    │ Commission  │ (Combined)  │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ +25.4%      │ +23.8%      │ +24.9%      │ +23.3%      │
│ 68% Win     │ 66% Win     │ 68% Win     │ 66% Win     │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## Phase 3: Data Quality Validation

### 3.1 Future Date Prevention

Reject or flag trades with dates beyond today:

```text
if (trade.exitDate > currentDate) {
  trade.dataQualityWarning = 'Future date detected - may be synthetic data';
}
```

### 3.2 Weekend/Holiday Auto-Correction

When a calculated exit date falls on a non-trading day:
1. Automatically snap to next valid trading day
2. Add warning flag to trade
3. Log the correction for transparency

### 3.3 Exit Date Validation in Holding Period Strategies

For strategies like "Consecutive Days" that use fixed holding periods:
- Calculate target exit date
- Check if it's a valid trading day
- If not, find next trading day using existing `isTradingDay()` function

---

## Implementation Details

### Files to Delete

| File | Action |
|------|--------|
| `src/pages/Backtest.tsx` | Delete |
| `supabase/functions/run-backtest/index.ts` | Delete entire directory |

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | Remove lines 63-64 (`[functions.run-backtest]` block) |
| `supabase/functions/strategy-backtest/index.ts` | Add execution realism logic |
| `src/components/backtester/BacktestResultsDashboard.tsx` | Add Reality Scenarios panel |
| `src/lib/backtesting/types.ts` | Add ExecutionConfig and trade cost fields |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/backtester/RealityScenarios.tsx` | Comparison display component |

---

## Edge Function Changes Summary

The `strategy-backtest` function gets these additions:

1. **`getNextTradingDay(dateStr)`** - Helper to find next valid trading day
2. **`applySlippage(price, direction, bps)`** - Apply slippage to prices
3. **`calculateNetPnl(trade, config)`** - Compute P&L after all costs
4. **Modified trade execution** - Apply slippage/commission at entry and exit
5. **Data validation** - Flag future dates and weekend corrections

---

## Expected Outcomes

After implementation:

| Metric | Before | After |
|--------|--------|-------|
| Weekend/Holiday Trades | Possible | Prevented |
| Perfect Fill Assumption | Yes | Slippage Applied |
| Commission Modeling | None | Deducted |
| Execution Transparency | Basic | Full Cost Breakdown |
| Data Quality Flags | None | Automatic Warnings |

The result will be backtests that are:
- More realistic (won't mislead users with perfect-world returns)
- More transparent (shows where costs come from)
- Higher quality (flags suspicious data automatically)
