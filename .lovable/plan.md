

## Simulation Trading Platform — Gap Fill Plan

### Overview

Upgrade the existing sim trading platform from a basic paper trading tool to a professional-grade simulator, closing the gaps identified in the prior analysis. This is broken into 5 phases, ordered by impact.

---

### Phase 1: Integrated Charting

Add the existing `IntegratedStockChart` component directly into the sim trading detail page so users can see price action for any position or before placing a trade.

**Changes:**
- **`SimPortfolioDetail.tsx`** — Add a chart section above the tabs showing the selected ticker's chart. Default to the first open position's ticker, or allow user to type any symbol.
- Add a ticker selector bar that updates the chart when clicking a position row or searching a symbol.
- Overlay trade entry/exit markers on the chart using the trade history data (buy = green triangle, sell = red triangle).

**Files:** `SimPortfolioDetail.tsx` (modify), new `SimChartSection.tsx`

---

### Phase 2: Limit & Stop Orders

Add pending order support so users can set limit and stop orders that execute when price conditions are met.

**Database migration:**
- New table `sim_pending_orders` — `id, portfolio_id, ticker, instrument_type, order_type (market/limit/stop), side (buy/sell), quantity, limit_price, stop_price, time_in_force (day/gtc), status (pending/filled/cancelled), created_at, filled_at`

**Changes:**
- **New `PendingOrdersTab.tsx`** — Table of open orders with cancel/modify buttons.
- **`TradeDialog.tsx`** — Add order type selector (Market / Limit / Stop). For limit/stop, show price input field instead of fetching live price. Insert into `sim_pending_orders` instead of `sim_trades`.
- **New `useOrderExecution.ts` hook** — On each price refresh, check all pending orders against current prices. If limit buy price >= current price (or stop conditions met), execute the order by moving it to `sim_trades` and updating cash balance.
- **`SimPortfolioDetail.tsx`** — Add "Orders" tab showing pending orders count.

**Files:** New `PendingOrdersTab.tsx`, new `useOrderExecution.ts`, modify `TradeDialog.tsx`, modify `SimPortfolioDetail.tsx`, DB migration

---

### Phase 3: Symbol Search & Watchlist

Replace the raw ticker input with autocomplete search and add a watchlist panel.

**Database migration:**
- New table `sim_watchlist` — `id, user_id, ticker, added_at`

**Changes:**
- **`TradeDialog.tsx`** — Replace plain text input with the existing `useTickerSearch` hook for autocomplete dropdown showing symbol + company name + live price.
- **New `SimWatchlist.tsx`** — Sidebar/panel showing watched symbols with live prices. Click to trade or view chart. Add/remove buttons.
- **`SimPortfolioDetail.tsx`** — Add watchlist as a collapsible right panel on desktop, or a new tab on mobile.

**Files:** Modify `TradeDialog.tsx`, new `SimWatchlist.tsx`, modify `SimPortfolioDetail.tsx`, DB migration

---

### Phase 4: Advanced Performance Analytics

Upgrade the Performance tab from a simple equity curve to a full analytics dashboard.

**Changes:**
- **New `PerformanceAnalytics.tsx`** — Replace the standalone `EquityCurve` with a comprehensive component showing:
  - **Metrics cards:** Win Rate, Total Trades, Avg Win/Avg Loss, Max Drawdown, Sharpe Ratio, Profit Factor
  - **Equity curve** (keep existing Recharts chart)
  - **Monthly returns heatmap** — calendar grid colored by monthly P&L
  - **Win/Loss distribution** — bar chart of trade P&L buckets
  - **Buy & Hold comparison** — overlay line showing what SPY would have returned over the same period
- **CSV Export button** — Export full trade history as downloadable CSV.
- All metrics calculated client-side from `sim_trades` data (no new DB tables needed).

**Files:** New `PerformanceAnalytics.tsx`, modify `SimPortfolioDetail.tsx`

---

### Phase 5: Layout & UX Polish

Upgrade from the current single-column layout to a professional trading workspace.

**Changes:**
- **`SimPortfolioDetail.tsx`** — Restructure to a 3-panel layout on desktop:
  - **Left panel:** Order entry (trade dialog inline, not modal), account summary, positions
  - **Center:** Chart with ticker selector and timeframe controls
  - **Right:** Watchlist, pending orders, recent trades
- On mobile/tablet, collapse to tabbed single-column view (current behavior).
- Add skeleton loaders for chart and position tables.
- Add keyboard shortcuts: `B` for buy, `S` for sell, `Esc` to cancel.

**Files:** Modify `SimPortfolioDetail.tsx`, new `SimTradingLayout.tsx`

---

### Implementation Order

| Priority | Phase | Effort | Dependencies |
|----------|-------|--------|-------------|
| 1 | Phase 1: Charting | Medium | None — uses existing `IntegratedStockChart` |
| 2 | Phase 3: Symbol Search | Small | None — uses existing `useTickerSearch` |
| 3 | Phase 2: Limit/Stop Orders | Large | DB migration + new execution logic |
| 4 | Phase 4: Analytics | Medium | Needs trade history data |
| 5 | Phase 5: Layout | Large | Benefits from all above being done first |

### What's Intentionally Excluded

- **WebSocket real-time streaming** — Polygon WebSocket requires a paid plan; polling on refresh is sufficient for paper trading.
- **Leverage settings** — Adds complexity without educational value for the target audience.
- **Multi-currency support** — USD only; not needed for US stock/options sim trading.
- **Competitions/leaderboards** — Can be added later as a social feature.

