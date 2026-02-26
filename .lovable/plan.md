

# Incorporate Fundamental Analysis (Earnings Data) into the Backtester

## Overview

Add earnings-based strategy signals to the backtester so users can backtest strategies that trade around earnings events. The `earnings_history` table already has historical report dates, EPS surprise data, and post-earnings price changes for hundreds of tickers -- we just need to wire it into the existing backtest engine.

## New Signal Presets (Frontend)

Add these to the SentenceBuilder signal palette under a new **"fundamental"** category:

| Signal ID | Label | Description | Parameters |
|-----------|-------|-------------|------------|
| `earnings-beat-buy` | Buy Before Earnings | Enter N days before earnings report | Days Before (1-10), Historical Beat Rate min (50-100%) |
| `post-earnings-drift` | Post-Earnings Drift | Buy after an earnings beat, ride the drift | Min Surprise % (1-20%), Hold Days (5-30) |
| `earnings-miss-short` | Sell After Miss | Short/sell after earnings miss | Max Surprise % (-20 to -1%), Hold Days (5-30) |
| `pre-earnings-run` | Pre-Earnings Run | Buy N days before earnings, sell day before | Days Before (5-20) |

## Backend Changes (strategy-backtest edge function)

### 1. Fetch Earnings Data at Backtest Start

When the strategy is an earnings-based one, query the `earnings_history` table for the ticker's historical earnings dates within the backtest window:

```text
SELECT report_date, eps_estimate, eps_actual, eps_surprise_pct, 
       price_change_pct, price_before, price_after
FROM earnings_history 
WHERE symbol = $ticker 
  AND report_date BETWEEN $startDate AND $endDate
ORDER BY report_date ASC
```

Build a date-indexed map of earnings events that the strategy functions can reference during the bar loop.

### 2. New Strategy Functions

**earningsPreBuyStrategy** (`earnings-beat-buy` / `pre-earnings-run`):
- For each bar, check if any earnings report is N trading days ahead
- Look up the ticker's historical beat rate from past earnings in the dataset
- BUY if beat rate exceeds the user's threshold
- SELL the day before or day of earnings (configurable)

**postEarningsDriftStrategy** (`post-earnings-drift`):
- On earnings day, check if `eps_surprise_pct` exceeds the user's min threshold (a beat)
- BUY on the next trading day after a beat
- SELL after the configured holding period
- Indicator value = eps_surprise_pct

**earningsMissStrategy** (`earnings-miss-short`):
- On earnings day, check if `eps_surprise_pct` is below the user's max threshold (a miss)
- SHORT on the next trading day after a miss
- Cover after the configured holding period

### 3. Wire Into the Engine

- Add `earningsData` parameter to the `runBacktest` function signature
- Add `case 'earnings-beat-buy':`, `case 'post-earnings-drift':`, `case 'earnings-miss-short':`, `case 'pre-earnings-run':` to the strategy switch
- Add indicator names: `EPS Surprise %`, `Beat Rate`, `Days to Earnings`
- Add indicator value functions for each

### 4. Frontend Mapping

**SentenceBuilder.tsx** -- add 4 new presets to `SIGNAL_PRESETS` array with category `'fundamental'` and appropriate parameter configs.

**StrategyBacktester.tsx** -- add to `STRATEGY_MAP`:
```text
'earnings-beat-buy': 'earnings-beat-buy'
'post-earnings-drift': 'post-earnings-drift'
'earnings-miss-short': 'earnings-miss-short'
'pre-earnings-run': 'pre-earnings-run'
```

### 5. Category Filter Update

Add `'fundamental'` to the category filter buttons in the signal picker so earnings signals are grouped together (alongside existing `momentum`, `trend`, `pattern`, `oscillator`).

## Files to Change

| File | Action | What |
|------|--------|------|
| `supabase/functions/strategy-backtest/index.ts` | Edit | Add earnings data fetch, 4 new strategy functions, wire into switch/indicators |
| `src/components/builder/SentenceBuilder.tsx` | Edit | Add 4 new signal presets with `'fundamental'` category, add category filter button |
| `src/components/backtester/StrategyBacktester.tsx` | Edit | Add 4 entries to `STRATEGY_MAP` |

## Data Availability

The `earnings_history` table already contains data for 100+ tickers (AAPL has 27 records, META has 27, etc.) with `report_date`, `eps_actual`, `eps_surprise_pct`, and `price_change_pct`. No new database tables or migrations are needed.

