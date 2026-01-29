

# Simplify Earnings History to Use SEC EDGAR Directly

## Overview

Replace the complex multi-source data pipeline in `backfill-earnings-history` with a streamlined approach that fetches quarterly earnings data directly from the SEC EDGAR XBRL API. The existing `fetch-sec-earnings-history` function already has the correct logic - we just need to make it the primary data source.

## Current State vs. Target State

| Current | Target |
|---------|--------|
| Polygon → FMP → Firecrawl → SEC (fallback) | SEC XBRL (primary) → Firecrawl for estimates (optional) |
| Complex 1000+ line function | Simple, focused function |
| Multiple API dependencies | Single official source |
| Inconsistent data quality | Authoritative SEC data |

## Changes Required

### 1. Refactor `backfill-earnings-history` to Use SEC Directly

**File**: `supabase/functions/backfill-earnings-history/index.ts`

Replace the Polygon/FMP data fetching with direct SEC XBRL calls using the pattern from `fetch-sec-earnings-history`:

```text
New Flow:
1. Convert ticker to CIK (use KNOWN_CIKS or SEC lookup)
2. Fetch from data.sec.gov/api/xbrl/companyfacts/CIK{CIK}.json
3. Extract EarningsPerShareDiluted + Revenues from us-gaap
4. Filter for 10-Q filings (quarterly data)
5. Store in earnings_history table
6. (Optional) Enhance with Firecrawl for analyst estimates
7. Calculate price returns using existing return logic
```

Key code to add:

```typescript
// SEC XBRL fetch with mandatory User-Agent
const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
const response = await fetch(factsUrl, {
  headers: { 'User-Agent': 'Asset Labs AI (chris@assetlabs.ai)' }
});
```

### 2. Add KNOWN_CIKS to backfill-earnings-history

Copy the comprehensive CIK mapping from `fetch-sec-earnings-history/index.ts` (lines 22-70) which includes 100+ common tickers:

```typescript
const KNOWN_CIKS: Record<string, string> = {
  'AAPL': '0000320193', 'MSFT': '0000789019', 'GOOGL': '0001652044',
  'MS': '0000895421', // Morgan Stanley
  // ... 100+ more mappings
};
```

### 3. Reuse SEC Parsing Logic

Extract and reuse the XBRL parsing logic from `fetch-sec-earnings-history`:

```typescript
// EPS concepts to try (in priority order)
const epsConcepts = [
  'EarningsPerShareDiluted',
  'EarningsPerShareBasic',
  'EarningsPerShareBasicAndDiluted'
];

// Revenue concepts to try
const revenueConcepts = [
  'Revenues',
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'SalesRevenueNet',
  'TotalRevenuesAndOtherIncome'
];

// Filter for 10-Q filings only
for (const entry of epsData) {
  if (entry.form !== '10-Q') continue;
  // ... extract quarterly data
}
```

### 4. Keep Return Calculation Logic

The existing `computeMultiPeriodReturns` function is still needed - it calculates 1W, 2W, 1M, 3M returns around earnings dates. Keep this logic intact.

### 5. Simplify the Main Serve Function

Remove:
- `fetchPolygonBenzingaEarningsReleaseDates` calls
- `fetchPolygonEarningsDates` calls  
- `fetchFMPHistoricalEstimates` calls
- Complex date reconciliation logic

Replace with:
- Direct SEC XBRL fetch
- Simple quarterly data extraction
- Optional Firecrawl estimate enhancement

## File Changes

| File | Action |
|------|--------|
| `supabase/functions/backfill-earnings-history/index.ts` | Major refactor: replace Polygon/FMP with direct SEC XBRL |

## Code Structure After Refactor

```text
backfill-earnings-history/index.ts (~400 lines instead of 1000+)
├── KNOWN_CIKS mapping
├── getCIKFromTicker() - CIK lookup
├── fetchSECQuarterlyData() - SEC XBRL fetch + parse
├── computeMultiPeriodReturns() - price return calculation (keep existing)
├── fetchFirecrawlEarningsEstimates() - optional estimates (keep existing)
└── serve() - main handler
```

## Expected Data Flow After Implementation

```text
User searches "MS"
        ↓
EarningsImpactSection loads
        ↓
Triggers backfill-earnings-history
        ↓
1. Get CIK for MS → "0000895421"
2. Fetch data.sec.gov/api/xbrl/companyfacts/CIK0000895421.json
3. Parse us-gaap EPS + Revenue from 10-Q filings
4. Get last 12 quarters of data
5. (Optional) Enhance with Firecrawl estimates
6. Calculate price returns
7. Store in earnings_history table
        ↓
UI displays complete earnings impact data
```

## Benefits of This Approach

1. **Single Source of Truth**: SEC EDGAR is the official, authoritative source
2. **Simpler Code**: ~400 lines instead of 1000+ lines
3. **No API Key Dependencies**: SEC API is free and requires no authentication
4. **Better Data Quality**: Official filings, not scraped/estimated data
5. **Faster Execution**: One API call instead of multiple parallel calls
6. **Reliable**: No rate limits or payment issues like with FMP/Firecrawl

## Technical Notes

- **User-Agent Header**: Required by SEC - use `Asset Labs AI (chris@assetlabs.ai)`
- **10-Q Filter**: Only quarterly filings, not annual (10-K) to avoid double-counting
- **Date Handling**: SEC uses fiscal quarter end dates, which we'll store as `report_date`
- **CIK Fallback**: If not in KNOWN_CIKS, fetch from `sec.gov/files/company_tickers.json`

