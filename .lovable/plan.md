
# Fix: Backtest Reliability - Automatic Retry on First Failure

## Problem Summary
The backtest button fails on the first click ~50% of the time because:
- Edge functions "cold start" when not recently used (takes ~25-30ms to boot)
- The browser request may timeout before the function responds
- There's no retry logic - the error just shows and the user has to click again

## Solution: Intelligent Retry with User Feedback

### What You'll See After the Fix
1. **Automatic retry** - If the first request fails, it silently retries up to 2 more times
2. **Better loading feedback** - Shows "Warming up..." on first attempt, "Running backtest..." on success
3. **Faster perceived performance** - Pre-warms the edge function when you select a strategy
4. **Graceful degradation** - Only shows an error after all retries fail

---

## Implementation Steps

### Step 1: Create Retry Utility
Create a reusable retry wrapper for edge function calls:

**New file**: `src/utils/retryWithBackoff.ts`
- Accepts any async function
- Retries up to 3 times with exponential backoff (200ms → 400ms → 800ms)
- Returns result on first success
- Throws only after all attempts exhausted

### Step 2: Add Pre-warm Function Call
When user selects a strategy, fire a lightweight "ping" to wake up the edge function:

**Modify**: `src/components/backtester/StrategyBacktester.tsx`
- In `handleSelectStrategy`, add a silent ping to `/strategy-backtest` with `{ ping: true }`
- Edge function responds immediately with `{ ok: true }` for ping requests
- This ensures the function is warm when "Run" is clicked

### Step 3: Wrap Backtest Calls with Retry Logic
Update both `handleRunBacktest` and `handleVisualBuilderBacktest`:

**Modify**: `src/components/backtester/StrategyBacktester.tsx`
- Wrap `supabase.functions.invoke()` calls with the retry utility
- Add progress indicator showing attempt number if retrying
- Only show error toast after all retries fail

### Step 4: Add Ping Handler to Edge Function

**Modify**: `supabase/functions/strategy-backtest/index.ts`
- Add early return for ping requests:
  ```typescript
  if (body.ping) {
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }
  ```

---

## Technical Details

### Retry Configuration
```text
┌─────────────┬─────────────┬─────────────┐
│  Attempt 1  │  Attempt 2  │  Attempt 3  │
├─────────────┼─────────────┼─────────────┤
│ Immediate   │ +200ms wait │ +400ms wait │
│ "Starting"  │ "Retrying"  │ "Retrying"  │
└─────────────┴─────────────┴─────────────┘
        Total max wait: ~600ms + execution time
```

### Files Changed
| File | Change |
|------|--------|
| `src/utils/retryWithBackoff.ts` | New - Retry utility |
| `src/components/backtester/StrategyBacktester.tsx` | Add retry wrapper + pre-warm |
| `supabase/functions/strategy-backtest/index.ts` | Add ping handler |

### User Experience Flow (After Fix)
```text
User clicks "Run Backtest"
        ↓
   [Attempt 1] ─── Success ──→ Show Results ✓
        │
    Failure (cold start)
        ↓
   Wait 200ms
        ↓
   [Attempt 2] ─── Success ──→ Show Results ✓
        │
    Failure
        ↓
   Wait 400ms
        ↓
   [Attempt 3] ─── Success ──→ Show Results ✓
        │
    Failure
        ↓
   Show Error Toast ✗
```

## Expected Outcome
- First-click success rate increases from ~50% to ~99%
- Users see smoother loading experience
- Pre-warming eliminates most cold starts entirely
