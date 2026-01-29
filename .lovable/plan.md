
# Earnings History Data Not Working - Root Cause Analysis & Fix Plan

## Problem Summary

The Earnings Impact section shows data for some tickers but is missing critical data (EPS estimates, beat/miss indicators) for most tickers. This results in:
- "Beat Rate" showing "—" instead of a percentage
- "Avg Surprise" showing "—" instead of actual values
- The surprise vs return chart not displaying properly

## Root Causes Identified

### Issue 1: Fiscal Period Format Mismatch
The `backfill-earnings-history` function tries to match estimates from `earnings_calendar` to `earnings_history`, but the formats don't match:

| Table | fiscal_period Format | Example |
|-------|---------------------|---------|
| `earnings_calendar` | `Q1`, `Q2`, `Q3`, `Q4` | "Q2" |
| `earnings_history` | `Q1 YYYY`, `Q2 YYYY` | "Q2 2025" |

**Result**: The matching logic at line 552 never finds matches because `"Q2"` !== `"Q2 2025"`

### Issue 2: Report Date Mismatch
The `earnings_history` table stores fiscal quarter-end dates (from SEC filings) while `earnings_calendar` stores actual earnings announcement dates:

| Table | report_date Meaning | AAPL Q2 Example |
|-------|-------------------|-----------------|
| `earnings_calendar` | Earnings call date | 2026-04-29 |
| `earnings_history` | Fiscal quarter-end | 2025-06-28 |

**Result**: Date-based matching (`estimatesByDate.get(record.report_date)`) also fails

### Issue 3: Missing Analyst Estimates for Historical Data
The `earnings_calendar` table only contains upcoming/recent earnings events (4,967 with estimates out of 6,476 total). Historical quarters in `earnings_history` have no corresponding records in `earnings_calendar`.

### Issue 4: EPS Actuals Missing for Some Tickers
Tickers with unusual fiscal years or those not in `KNOWN_CIKS` fail to get data from SEC XBRL API. Examples: LLY (3 records), TXN (4 records), CVX (4 records).

## Solution Plan

### Step 1: Fix Fiscal Period Matching Logic
**File**: `supabase/functions/backfill-earnings-history/index.ts`

Enhance the matching to handle format differences:

```text
Current (line 552):
  const estimate = estimatesByPeriod.get(record.fiscal_period || '') 
                || estimatesByDate.get(record.report_date);

Fixed:
  // Try multiple fiscal period formats
  const periodFormats = [
    record.fiscal_period,                           // "Q2 2025"
    record.fiscal_period?.split(' ')[0],            // "Q2"
    record.fiscal_period?.replace(' ', ' FY'),      // "Q2 FY2025" (rare)
  ].filter(Boolean);
  
  let estimate = null;
  for (const format of periodFormats) {
    estimate = estimatesByPeriod.get(format);
    if (estimate) break;
  }
  if (!estimate) estimate = estimatesByDate.get(record.report_date);
```

### Step 2: Add FMP Historical Estimates Fallback
When earnings_calendar doesn't have estimates, fetch from Financial Modeling Prep's historical earnings endpoint:

**File**: `supabase/functions/backfill-earnings-history/index.ts`

Add a new function to fetch historical estimates:

```text
async function fetchHistoricalEstimatesFromFMP(
  symbol: string, 
  fmpApiKey: string
): Promise<Map<string, { eps_estimate: number; revenue_estimate: number | null }>>
```

This will call FMP's `/api/v3/historical/earning_calendar/{symbol}` endpoint to get past earnings with estimates.

### Step 3: Trigger SEC Data Fetch for Missing Tickers
Update the backfill flow to call `fetch-sec-earnings-history` when a ticker has no records:

**File**: `supabase/functions/backfill-earnings-history/index.ts`

Before returning "no_earnings_data_from_polygon", invoke `fetch-sec-earnings-history`:

```text
// If Polygon has no data, try SEC XBRL as fallback
if (allDates.size === 0) {
  const secResponse = await supabase.functions.invoke('fetch-sec-earnings-history', {
    body: { symbols: [symbol] }
  });
  // Process SEC response...
}
```

### Step 4: Update Matching to Use Fiscal Year + Quarter
Improve matching by extracting and comparing quarter + year explicitly:

```text
function parseFiscalPeriod(fp: string): { quarter: number; year: number } | null {
  const match = fp?.match(/Q(\d)\s*(\d{4})?/i);
  if (!match) return null;
  return { 
    quarter: parseInt(match[1]), 
    year: match[2] ? parseInt(match[2]) : null 
  };
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/backfill-earnings-history/index.ts` | Fix fiscal period matching, add FMP fallback, add SEC fallback |

## Expected Outcome

After implementation:
1. Tickers will show accurate beat/miss indicators based on EPS estimates
2. Beat rate percentages will be calculated correctly
3. The "Surprise vs Return" chart will display properly
4. Historical data will be enriched from multiple sources (earnings_calendar, FMP, SEC)

## Technical Details

**Data Flow After Fix:**
```text
1. User loads /stock/AAPL
2. EarningsImpactSection triggers backfill-earnings-history
3. Backfill function:
   a. Checks earnings_history for existing records
   b. If empty → fetch from Polygon + SEC XBRL
   c. For each record without eps_estimate:
      i.  Try matching from earnings_calendar (with flexible period format)
      ii. If no match → fetch from FMP historical earnings
   d. Calculate eps_surprise_pct when both actual and estimate exist
4. Return enriched data to UI
```

**API Dependencies:**
- Polygon API: Filing dates (already configured)
- SEC XBRL API: EPS actuals from 10-Q filings (free, no key needed)
- FMP API: Historical estimates (requires FMP_API_KEY secret)
