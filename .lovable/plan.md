

# Integrate Quant Lab Studies into the Strategy Backtester

## Overview

Two distinct integrations, both living inside the existing backtester area:

1. **Signal-capable studies become entry signal presets** -- Studies like RSI, MACD, Bollinger, Stochastic, Gap Analysis, and Consecutive Days already have matching backtest strategies. These get added to the signal picker so users can select them as entry conditions directly.

2. **Informational studies get an inline "Quick Insights" panel** -- Studies like Best Days of the Week, Best Months, Volatility Profile, Drawdown Analysis, and Win Streaks show their results inline within the backtester card, without requiring a full backtest run. The user clicks a study, it calls the existing `run-single-study` edge function, and the results render right there.

---

## Part 1: Map Quant Lab Studies to Entry Signal Presets

Currently, `SIGNAL_PRESETS` in `SentenceBuilder.tsx` has 8 presets (RSI Oversold, RSI Overbought, Price Above/Below SMA, EMA Crossover, Gap Down, Consecutive Down, Volume Spike). Many Quant Lab studies map directly to these or to new backtestable strategies we just built.

### New signal presets to add:

| Preset | Maps to Strategy | Source Study |
|--------|-----------------|--------------|
| MACD Bullish Cross | `macd-divergence` | `macd_analysis` |
| MACD Bearish Cross | `macd-divergence` | `macd_analysis` |
| Bollinger Lower Touch | `bollinger-reversal` | `bollinger_analysis` |
| Bollinger Upper Touch | `bollinger-reversal` | `bollinger_analysis` |
| Stochastic Oversold | `stochastic` (new handler) | `stochastic_analysis` |
| ADX Strong Trend | `adx-trend` | (new indicator) |
| Supertrend Bullish | `supertrend` | (new indicator) |

### New signal categories:

Expand the category system from `['momentum', 'trend', 'pattern']` to include `'oscillator'` for the MACD/Stochastic/Bollinger signals.

### Strategy map updates:

Add entries to `STRATEGY_MAP` in `StrategyBacktester.tsx`:
- `'macd-bullish'` -> `'macd-divergence'`
- `'macd-bearish'` -> `'macd-divergence'`
- `'bollinger-lower'` -> `'bollinger-reversal'`
- `'bollinger-upper'` -> `'bollinger-reversal'`
- `'stochastic-oversold'` -> `'stochastic'`
- `'adx-strong-trend'` -> `'adx-trend'`
- `'supertrend-bullish'` -> `'supertrend'`

### Files modified:
- `src/components/builder/SentenceBuilder.tsx` -- Add ~7 new entries to `SIGNAL_PRESETS` array, add `'oscillator'` category
- `src/components/backtester/StrategyBacktester.tsx` -- Add new entries to `STRATEGY_MAP`
- `supabase/functions/strategy-backtest/index.ts` -- Add `stochastic` strategy handler (if not already present)

---

## Part 2: Inline Quick Insights Panel

### Concept

A new collapsible section inside the backtester card (below the strategy builder, above results) titled "Quick Insights". It shows a row of clickable study chips for non-backtest studies. Clicking one calls `run-single-study` and renders the result inline.

### Studies shown as Quick Insights (not backtest-able, informational only):

| Study | What it shows |
|-------|--------------|
| `day_of_week_returns` | Bar chart: win rate + avg return per weekday |
| `month_of_year_returns` | Bar chart: avg return per month |
| `daily_return_distribution` | Histogram of daily returns |
| `drawdown_analysis` | Max drawdown, recovery time |
| `up_down_streaks` | Streak length distribution |
| `volatility_analysis` | ATR, daily range stats |
| `mean_reversion` | Reversion tendency stats |

### New component: `QuickInsightsPanel`

Located at `src/components/backtester/QuickInsightsPanel.tsx`

**UI structure:**
- Collapsible section with header "Quick Insights for {TICKER}"
- Row of small chips/buttons for each study (icon + short name)
- Clicking a chip triggers `supabase.functions.invoke('run-single-study', { body: { ticker, studyId } })`
- Results render below the chips in a compact card format
- Multiple studies can be open simultaneously (accordion-style or grid)
- Loading skeleton while fetching

**Result renderers** (compact inline versions):
- **Day of Week**: Horizontal bar chart showing each weekday's win rate and avg return
- **Month of Year**: 12-cell grid with color-coded avg returns (green = positive, red = negative)
- **Volatility**: Simple stat cards (ATR, Daily Range, Current vs Avg)
- **Drawdown**: Single stat card with max drawdown %, date, and recovery time
- **Streaks**: Compact display of current streak, max win/loss streaks
- **Distribution**: Mini histogram using Recharts

### Integration point

In `StrategyBacktester.tsx`, the `QuickInsightsPanel` is rendered between the strategy builder card and the results dashboard. It receives the `ticker` prop and manages its own state (which studies are loaded/open).

### Files created:
- `src/components/backtester/QuickInsightsPanel.tsx` -- Main panel with study chips and result renderers

### Files modified:
- `src/components/backtester/StrategyBacktester.tsx` -- Import and render `QuickInsightsPanel` between builder and results

---

## Technical Details

### Data flow for Quick Insights:
```text
User clicks "Best Days" chip
  --> QuickInsightsPanel calls supabase.functions.invoke('run-single-study', { ticker, studyId: 'day_of_week_returns' })
  --> Edge function fetches Polygon bars, runs study, returns result
  --> QuickInsightsPanel renders inline chart/table
  --> Result is cached in component state (no re-fetch if already loaded for this ticker)
```

### No database or edge function changes needed:
- `run-single-study` already handles all the studies we need
- All rendering is client-side using existing Recharts dependency

### Files summary:

| File | Action |
|------|--------|
| `src/components/builder/SentenceBuilder.tsx` | Modify -- add 7 new signal presets, add oscillator category |
| `src/components/backtester/StrategyBacktester.tsx` | Modify -- add strategy map entries, render QuickInsightsPanel |
| `src/components/backtester/QuickInsightsPanel.tsx` | Create -- inline study results panel |
| `supabase/functions/strategy-backtest/index.ts` | Modify -- add stochastic strategy handler if missing |

