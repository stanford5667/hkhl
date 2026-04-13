

## Fix Screener Showing 0% Change When Market Is Closed

### Problem
When the market is closed (weekends, after hours), the screener shows `0.00%` for all stocks. This happens because the edge function detects `marketClosed = true` and hardcodes `changePercent = 0` instead of using the last trading day's actual change.

### Root Cause
In `supabase/functions/polygon-screener/index.ts`, the Polygon snapshot API provides a `todaysChangePerc` field on every ticker that always reflects the most recent trading session's change — even when the market is closed. However, the code ignores this field and instead manually calculates change from `day.c` vs `prevDay.c`, which yields 0 when there's no active `day` data.

### Fix
**File: `supabase/functions/polygon-screener/index.ts`**

1. **When market is closed, use `todaysChangePerc` and `todaysChange` from the snapshot** instead of hardcoding 0. These fields always contain the last session's actual change values.

2. Update **3 locations** where `changePercent` is calculated or used during market-closed conditions:
   - **Line ~846-847 (first sort block)**: Use `t.todaysChangePerc` instead of `0` when `marketClosed`
   - **Line ~947-948 (second sort block)**: Same fix
   - **Lines ~985-986 (final result mapping)**: Use `t.todaysChange` and `t.todaysChangePerc` instead of `0`

3. Also update the **filter logic** (lines ~815-816) so that change-based filters (like "Top Gainers > 3%") still work when the market is closed, using `todaysChangePerc`.

### Technical Details
The Polygon snapshot response includes per-ticker fields:
- `todaysChange`: absolute dollar change (e.g., `+2.50`)
- `todaysChangePerc`: percentage change (e.g., `+1.85`)

These persist after market close and represent the last completed session's performance — exactly what users expect to see.

