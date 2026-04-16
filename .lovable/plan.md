

## Finviz-Style Screener Enhancement Plan

### Part 1: Current State Analysis

**Backend filtering** (`supabase/functions/polygon-screener/index.ts`): A Deno edge function that queries Polygon.io's snapshot API and `asset_universe` DB table. Supports `ScreenerFilters` interface with market cap, price, sector, change%, volume, and ~15 fundamental metric filters (P/E, P/B, EV/EBITDA, D/E, etc.). Fundamentals are fetched per-ticker from Polygon's ratios + income statement endpoints with caching.

**Data fields available**: Price, volume, change%, market cap, sector (via SIC), P/E, forward P/E, P/B, EV/EBITDA, D/E, quick ratio, operating margin, EPS growth, revenue growth. PEG, volatility, beta, sharpe, max drawdown are in the type system but always return `null`.

**Frontend results table** (`UnifiedDiscoveryScreener.tsx`): 1,446-line component with tabbed quick screens, 20 dropdown-based filters grouped by category, sortable columns that show/hide based on active filters, mobile/desktop rows, pagination, and AI insight badges.

**Gaps to close**:
- PEG is never computed (always `null`)
- Max Drawdown and Std Dev (20d) are never computed
- No `CustomFilterBuilder` with operator-based dynamic filters
- No hover preview with sparkline chart
- No "Daily Digest" / news attribution column
- No E2E test infrastructure

### Part 2: Backend — Compute Advanced Metrics

**File: `supabase/functions/polygon-screener/index.ts`**

1. Add `computeAdvancedMetrics(ticker, apiKey, pe, epsGrowth)` function:
   - **PEG**: `pe / epsGrowth` when both are positive numbers; fallback to `null`
   - **Max Drawdown (1Y)**: Fetch 252 daily bars from Polygon aggregates API, compute peak-to-trough decline
   - **Std Dev (20d)**: Fetch last 25 bars, compute std dev of daily % returns over last 20

2. Add `customFilters` support to the `ScreenerFilters` interface:
   ```
   customFilters?: {
     peg?: { operator: string; value: number; value2?: number };
     drawdown?: { operator: string; value: number; value2?: number };
     stdDev?: { operator: string; value: number; value2?: number };
   }
   ```

3. In the enrichment step, call `computeAdvancedMetrics` for each ticker and apply custom filters after enrichment (same chunked pattern as existing fundamental filters).

4. Add helper `applyCustomFilter(actual, filter)` supporting `<, >, <=, >=, =, between` operators.

### Part 3A: CustomFilterBuilder Component

**New file: `src/components/screener/CustomFilterBuilder.tsx`**

- "+ Add Custom Filter" button
- Each row: Metric dropdown (PEG, Max Drawdown 1Y, Std Dev 20d) | Operator dropdown (<, >, <=, >=, =, Between) | Value input(s) | Remove (X)
- "Between" shows two inputs (min/max)
- `onChange` prop emits structured `customFilters` object
- Integrates into `UnifiedDiscoveryScreener.tsx` above the results table

### Part 3B: Hover Preview (Quick-Info Panel)

**New file: `src/components/screener/TickerHoverPreview.tsx`**

- Uses Radix `HoverCard` (already in the UI library) triggered on ticker symbol hover
- Content: Mini sparkline chart (last 30 days via Polygon aggregates, using `recharts` `<Sparkline>`), key stats (price, change, volume), quick fundamentals (P/E, market cap), and news sentiment badge
- Fetches data on hover with short TTL cache via `useQuery`
- Close on mouse leave

**Modified: `UnifiedDiscoveryScreener.tsx`** — Wrap ticker symbol cells with the hover trigger.

### Part 3C: Daily Digest Column

**New edge function: `supabase/functions/polygon-news/index.ts`**
- Accepts `ticker` param, calls Polygon's `/v2/reference/news` endpoint (already included in their plan)
- Returns most recent headline from last 24 hours, source, URL, published time
- No external news API key needed — Polygon includes news

**New file: `src/components/screener/DailyDigestCell.tsx`**
- Renders 5-7 word truncated headline or "—"
- Click opens a `Dialog` modal with full title, source, time, and "Read More" link

**Modified: `UnifiedDiscoveryScreener.tsx`** — Add Daily Digest as a new column.

### Part 4: Testing

**A. Backend unit tests** — `supabase/functions/polygon-screener/screener_test.ts`
- `calculatePEG()` with known inputs
- `calculateMaxDrawdown()` with controlled price array
- `calculateStdDev()` with controlled returns array
- Custom filter operator logic

**B. Frontend component tests** — `src/components/screener/CustomFilterBuilder.test.tsx`
- Add filter, change operator, remove filter, verify output object
- Uses Vitest + React Testing Library (already configured)

**C. E2E test** — `src/test/screener.spec.ts` (Playwright-style via Vitest browser mode)
- Navigate to screener, add PEG < 1.0 filter, add Max Drawdown > -15% filter
- Run screener, verify results
- Hover test for tooltip
- Daily Digest modal test
- Uses `data-testid` attributes added to new components

### Part 5: Integration

- All components use existing Tailwind + shadcn/ui design system
- Loading skeletons for hover preview and digest cells
- Error states: "News Unavailable" fallback
- No new API keys required — Polygon's news endpoint is used
- `recharts` is likely already installed; verify and add if needed

### Files Created/Modified

| File | Action |
|------|--------|
| `supabase/functions/polygon-screener/index.ts` | Modified — add PEG/drawdown/stdDev computation + custom filters |
| `supabase/functions/polygon-news/index.ts` | **New** — news headline fetcher |
| `src/components/screener/CustomFilterBuilder.tsx` | **New** — dynamic filter builder |
| `src/components/screener/TickerHoverPreview.tsx` | **New** — hover sparkline + stats |
| `src/components/screener/DailyDigestCell.tsx` | **New** — news digest cell + modal |
| `src/components/research/UnifiedDiscoveryScreener.tsx` | Modified — integrate all 3 new components |
| `src/services/polygonScreenerService.ts` | Modified — add custom filter types + news fetch |
| `supabase/functions/polygon-screener/screener_test.ts` | **New** — backend unit tests |
| `src/components/screener/CustomFilterBuilder.test.tsx` | **New** — component tests |
| `src/test/screener.spec.ts` | **New** — E2E test file |

### Estimated scope
This is a large feature set spanning ~8-10 files. Implementation will proceed in order: backend metrics → custom filter builder → hover preview → daily digest → tests.

