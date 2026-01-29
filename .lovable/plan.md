

# Enhance Firecrawl Integration for Earnings History Data

## Overview

The current architecture already has Firecrawl integrated, but it's underutilized. When a ticker is searched, the `backfill-earnings-history` edge function runs, but it primarily relies on:
1. Polygon API for filing dates
2. FMP API for historical estimates
3. SEC XBRL API for EPS actuals

The Firecrawl integration in `fetch-sec-earnings-history` is a secondary fallback that's only invoked when the backfill function explicitly calls it. This plan enhances the architecture to **always use Firecrawl as a primary enrichment source** when a ticker is searched.

## Current Data Flow

```text
User searches "MS" (Morgan Stanley)
        ↓
EarningsImpactSection loads
        ↓
useEarningsHistoryData fetches from DB
        ↓
backfill-earnings-history triggers
        ↓
Polygon → FMP → (but NOT Firecrawl)
```

## Proposed Data Flow

```text
User searches "MS" (Morgan Stanley)
        ↓
EarningsImpactSection loads
        ↓
useEarningsHistoryData fetches from DB
        ↓
backfill-earnings-history triggers
        ↓
1. Polygon (filing dates)
2. FMP (historical estimates)
3. SEC XBRL (if empty) via fetch-sec-earnings-history
4. Firecrawl (scrape Yahoo/Nasdaq/Zacks for missing estimates)
        ↓
Complete earnings data with EPS estimates
```

## Implementation Plan

### Step 1: Add Firecrawl Scraping Function to backfill-earnings-history

Add a new function that uses Firecrawl to scrape historical earnings estimates from reliable financial sites.

**File**: `supabase/functions/backfill-earnings-history/index.ts`

Add new function after the existing `fetchFMPHistoricalEstimates`:

```typescript
// Scrape earnings history from Yahoo Finance or Zacks via Firecrawl
async function fetchFirecrawlEarningsEstimates(
  symbol: string,
  firecrawlApiKey: string
): Promise<Map<string, EstimateData>> {
  const estimates = new Map<string, EstimateData>();
  
  // Target URLs to scrape (in order of reliability)
  const sources = [
    `https://finance.yahoo.com/quote/${symbol}/analysis`,
    `https://www.nasdaq.com/market-activity/stocks/${symbol.toLowerCase()}/earnings`,
    `https://www.zacks.com/stock/quote/${symbol}/earnings-surprises`,
  ];
  
  for (const url of sources) {
    try {
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
          onlyMainContent: true,
          waitFor: 2000,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const markdown = data.data?.markdown || '';
        
        // Parse earnings data from markdown
        // Look for patterns like "Q2 2025: EPS $1.23 vs $1.20 est"
        const parsed = parseEarningsFromMarkdown(markdown, symbol);
        for (const [key, value] of parsed) {
          if (!estimates.has(key)) {
            estimates.set(key, value);
          }
        }
        
        if (estimates.size >= 8) break; // Have enough data
      }
    } catch (err) {
      console.error(`[Firecrawl] Error scraping ${url}:`, err);
    }
  }
  
  return estimates;
}

function parseEarningsFromMarkdown(markdown: string, symbol: string): Map<string, EstimateData> {
  const estimates = new Map<string, EstimateData>();
  
  // Multiple regex patterns for different site formats
  const patterns = [
    // Yahoo Finance format: "Q2 2025 | $1.23 | $1.20 | +2.5%"
    /Q([1-4])\s*(?:'?|FY)?(\d{2,4}).*?\$?([\d.]+).*?(?:estimate|est\.?)[:\s]*\$?([\d.]+)/gi,
    // Zacks format: "Reported: $1.23 Estimate: $1.20"
    /Q([1-4]).*?(\d{4}).*?reported[:\s]*\$?([\d.]+).*?estimate[:\s]*\$?([\d.]+)/gi,
    // Generic: "EPS of $1.23 vs. consensus of $1.20"
    /Q([1-4])\s*(\d{4}).*?eps.*?\$?([\d.]+).*?(?:vs\.?|versus|consensus)[:\s]*\$?([\d.]+)/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(markdown)) !== null) {
      const quarter = parseInt(match[1]);
      const yearStr = match[2];
      const year = yearStr.length === 2 ? 2000 + parseInt(yearStr) : parseInt(yearStr);
      const epsEstimate = parseFloat(match[4] || match[3]);
      
      if (isNaN(quarter) || isNaN(year) || isNaN(epsEstimate)) continue;
      
      const key = `Q${quarter} ${year}`;
      if (!estimates.has(key)) {
        estimates.set(key, {
          eps_estimate: epsEstimate,
          revenue_estimate: null,
          fiscal_year: year,
        });
        console.log(`[Firecrawl] Parsed ${symbol} ${key}: EPS Est $${epsEstimate}`);
      }
    }
  }
  
  return estimates;
}
```

### Step 2: Integrate Firecrawl into the Main Backfill Flow

**File**: `supabase/functions/backfill-earnings-history/index.ts`

Update the main serve function to fetch Firecrawl estimates:

```typescript
// After FMP_API_KEY check (around line 459)
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

// After line 481 (FMP estimates fetch)
let firecrawlEstimates = new Map<string, EstimateData>();
if (FIRECRAWL_API_KEY) {
  firecrawlEstimates = await fetchFirecrawlEarningsEstimates(symbol, FIRECRAWL_API_KEY);
  console.log(`[backfill-earnings-history] Got ${firecrawlEstimates.size} estimates from Firecrawl for ${symbol}`);
}
```

Update `findMatchingEstimate` to include Firecrawl data (add as 4th parameter):

```typescript
function findMatchingEstimate(
  record: { fiscal_period: string | null; report_date: string },
  estimatesByPeriod: Map<string, EstimateData>,
  estimatesByDate: Map<string, EstimateData>,
  fmpEstimates: Map<string, EstimateData>,
  firecrawlEstimates: Map<string, EstimateData>  // NEW
): EstimateData | null {
  // ... existing logic ...
  
  // After FMP fallback, add Firecrawl fallback
  for (const key of keysToTry) {
    const fcEstimate = firecrawlEstimates.get(key);
    if (fcEstimate) {
      console.log(`[backfill-earnings-history] Matched Firecrawl estimate by key "${key}"`);
      return fcEstimate;
    }
  }
  
  return null;
}
```

### Step 3: Add SEC Fallback for Empty Data

When Polygon returns no filing dates, invoke the SEC function:

```typescript
// In the section starting at line 569 (after allDates.size === 0 check)
if (allDates.size === 0 && POLYGON_API_KEY) {
  console.log(`[backfill-earnings-history] No earnings dates from Polygon, trying SEC XBRL...`);
  
  try {
    const secResponse = await supabase.functions.invoke('fetch-sec-earnings-history', {
      body: { symbols: [symbol] }
    });
    
    if (secResponse.data?.results?.[symbol]?.success) {
      // SEC function already stores data - invalidate cache and return
      return new Response(JSON.stringify({
        success: true,
        symbol,
        created: secResponse.data.results[symbol].quartersStored || 0,
        reason: 'created_from_sec_xbrl'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('[backfill-earnings-history] SEC fallback failed:', err);
  }
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/backfill-earnings-history/index.ts` | Add Firecrawl scraping functions, integrate into main flow, add SEC fallback |

## Data Sources Hierarchy (After Implementation)

| Priority | Source | Data Provided | Reliability |
|----------|--------|---------------|-------------|
| 1 | earnings_calendar (DB) | EPS estimates, dates | High (already validated) |
| 2 | FMP API | Historical EPS estimates | High (structured API) |
| 3 | Polygon Benzinga | Actual report dates | High |
| 4 | SEC XBRL | EPS actuals, revenue | High (official filings) |
| 5 | Firecrawl (Yahoo/Nasdaq/Zacks) | Missing EPS estimates | Medium (web scraping) |

## Expected Results

After implementation:

1. **MS (Morgan Stanley)**: Currently shows "—" for beat rate → Will show actual beat/miss percentages
2. **LLY (Eli Lilly)**: Only 3 records → Will have 16 quarters of data with estimates
3. **Any new ticker search**: Will automatically trigger Firecrawl enrichment if FMP/Polygon data is incomplete

## Firecrawl Usage Details

| Feature | Usage |
|---------|-------|
| Endpoint | `/v1/scrape` |
| Format | `markdown` (cleanest for parsing) |
| Target Sites | Yahoo Finance, Nasdaq, Zacks |
| Rate Limiting | Sequential scraping with early exit on success |
| Fallback | Only used when FMP estimates are missing |

## Technical Considerations

1. **Caching**: Firecrawl results are stored in `earnings_history` table, so subsequent loads don't re-scrape
2. **Rate Limits**: Limited to 3 sites max, with early exit when enough data is found
3. **Error Handling**: Firecrawl failures don't block the main flow - data from other sources is still returned
4. **API Key**: Uses existing `FIRECRAWL_API_KEY` secret (already configured)

