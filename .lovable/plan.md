
# Fix: Global Search Navigation to Correct Route

## Problem Identified

The global search is navigating to `/research/MU` but this route doesn't exist. The correct route for viewing ticker details is `/stock/:ticker`.

**Current routing:**
- `/research` → Research home page (list view)
- `/stock/:ticker` → TickerDetail page (shows stock information)

**Bug in GlobalSearch:**
```typescript
// WRONG - navigates to non-existent route
navigate(`/research/${result.symbol}`)

// CORRECT - should navigate to /stock/:ticker
navigate(`/stock/${result.symbol}`)
```

## Solution

Update the `GlobalSearch.tsx` component to navigate to the correct route.

## Files to Modify

### 1. `src/components/shared/GlobalSearch.tsx`

Change line 72 from:
```typescript
runCommand(() => navigate(`/research/${result.symbol}`));
```

To:
```typescript
runCommand(() => navigate(`/stock/${result.symbol}`));
```

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Route Pattern | `/stock/:ticker` |
| Component | `TickerDetail` → `PublicStockView` |
| Behavior | Shows stock quote, charts, financials, and research data |

The `TickerDetail` component already handles:
- Authenticated users with existing portfolio holdings → redirects to `/portfolio/:id`
- All other cases → displays `PublicStockView` with full stock research

## Expected Result

After this fix:
1. User types "MU" in global search
2. Clicks on "MU - Micron Technology" result
3. Gets navigated to `/stock/MU`
4. TickerDetail page loads and displays Micron's stock information
