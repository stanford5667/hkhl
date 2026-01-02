# API Call Audit Report

**Generated:** 2026-01-02  
**Updated:** 2026-01-02 (All automatic polling DISABLED)
**Purpose:** Identify all external API calls in the codebase for cost/usage control

---

## Summary

| Category | Count | With Kill Switch | Auto-Polling |
|----------|-------|------------------|--------------|
| Edge Functions (Perplexity) | 6 | 6 ✅ | N/A |
| Edge Functions (Lovable AI) | 11 | 0 ❌ | N/A |
| Edge Functions (Other) | 1 | 0 ❌ | N/A |
| Client Hooks (Perplexity) | 2 | 2 ✅ | ❌ DISABLED |
| Client setInterval | 2 | 2 ✅ | ❌ DISABLED |
| Client refetchInterval | All | All ✅ | ❌ DISABLED |

---

## ✅ AUTOMATIC POLLING STATUS: ALL DISABLED

### Changes Made:

1. **`useAppData.ts`** - `refetchInterval` for documents processing: **REMOVED**
2. **`PublicEquityDetailView.tsx`** - 60s auto-refresh interval: **REMOVED**
3. **`useMarketDataQuery.ts`** - Market status interval: **REMOVED**
4. **`useMarketIntel.ts`** - All hooks now have `staleTime: Infinity`, no auto-refetch
5. **`useEconomicIndicators.ts`** - All hooks now have `staleTime: Infinity`, no auto-refetch
6. **`useWatchlist.ts`** - All hooks now have `staleTime: Infinity`, no auto-refetch
7. **`usePerplexityMarketIntel.ts`** - Auto-load on mount: **REMOVED**
8. **`useCachedIndustryIntel.ts`** - Auto-load on mount: **REMOVED**

### All useQuery hooks now use:
```typescript
{
  staleTime: Infinity,           // Never auto-stale
  refetchOnWindowFocus: false,   // No auto-refresh on focus
  refetchOnMount: false,         // No auto-fetch on mount
  refetchOnReconnect: false,     // No auto-fetch on reconnect
}
```

---

## 1. Edge Functions - External API Calls

### Functions with Perplexity API (ALL HAVE KILL SWITCH ✅)

| Function | Line | API Called | Kill Switch |
|----------|------|------------|-------------|
| `market-data/index.ts` | 124 | `api.perplexity.ai` | YES (line 5) |
| `market-intel/index.ts` | 276 | `api.perplexity.ai` | YES (line 4) |
| `industry-intel/index.ts` | 48 | `api.perplexity.ai` | YES (line 4) |
| `research-asset/index.ts` | 70 | `api.perplexity.ai` | YES (line 4) |
| `stock-quote/index.ts` | 60 | `api.perplexity.ai` | YES (line 4) |
| `scrape-website/index.ts` | 74 | `api.perplexity.ai` | YES (line 4) |

### Functions with Lovable AI Gateway (NO KILL SWITCH ❌)

| Function | Line | API Called | Kill Switch | Trigger |
|----------|------|------------|-------------|---------|
| `generate-ai-summary/index.ts` | 120 | `ai.gateway.lovable.dev` | **NO** | Manual button |
| `lookup-company/index.ts` | 44 | `ai.gateway.lovable.dev` | **NO** | Company name input |
| `extract-document/index.ts` | 66 | `ai.gateway.lovable.dev` | **NO** | Document upload |
| `suggest-companies/index.ts` | 50 | `ai.gateway.lovable.dev` | **NO** | Company search |
| `suggest-folder/index.ts` | 102 | `ai.gateway.lovable.dev` | **NO** | Document upload |
| `process-documents/index.ts` | 84 | `ai.gateway.lovable.dev` | **NO** | Document processing |
| `summarize-document/index.ts` | 56 | `ai.gateway.lovable.dev` | **NO** | Document analysis |
| `generate-assumptions/index.ts` | 96 | `ai.gateway.lovable.dev` | **NO** | Model creation |
| `extract-historical/index.ts` | 118 | `ai.gateway.lovable.dev` | **NO** | Model creation |
| `extract-company-financials/index.ts` | 98 | `ai.gateway.lovable.dev` | **NO** | Data extraction |
| `scrape-website/index.ts` | 130 | `ai.gateway.lovable.dev` (fallback) | **NO** | Website scrape |

### Functions with Other External APIs

| Function | Line | API Called | Kill Switch |
|----------|------|------------|-------------|
| `fetch-market-data/index.ts` | 112, 231, 313 | Various RSS/JSON feeds | **NO** |

---

## 2. Client-Side API Triggers

### supabase.functions.invoke Calls

| File | Line | Function Called | Frequency | Has Kill Switch |
|------|------|-----------------|-----------|-----------------|
| `src/services/MarketDataManager.ts` | 181 | `market-data` (batch) | On demand | NO (API blocked at edge) |
| `src/services/MarketDataManager.ts` | 231 | `market-data` (quote) | On demand | NO (API blocked at edge) |
| `src/services/MarketDataManager.ts` | 261 | `market-data` (indices) | On demand | NO (API blocked at edge) |
| `src/services/documentExtractionService.ts` | 32 | `extract-document` | On upload | NO |
| `src/pages/Markets.tsx` | 133 | `stock-quote` | On load | NO (API blocked at edge) |
| `src/pages/Markets.tsx` | 174 | `stock-quote` | On load | NO (API blocked at edge) |
| `src/pages/Research.tsx` | 60 | `research-asset` | Manual | NO (API blocked at edge) |
| `src/components/companies/AddAssetWizard.tsx` | 212 | `stock-quote` | On ticker input | NO (API blocked at edge) |
| `src/components/companies/CompanySummaryCard.tsx` | 63 | `generate-company-summary` | Manual button | NO |
| `src/components/companies/CreateCompanyWizard.tsx` | 135 | `lookup-company` | On name blur | NO |
| `src/components/companies/CreateCompanyWizard.tsx` | 192 | `suggest-companies` | On name change | NO |
| `src/components/companies/CreateCompanyDialog.tsx` | 148 | `lookup-company` | On name blur | NO |
| `src/components/companies/DataExtractionPanel.tsx` | 169 | `extract-company-financials` | Manual button | NO |
| `src/components/dataroom/UploadZone.tsx` | 121 | `suggest-folder` | On upload | NO |
| `src/hooks/usePerplexityMarketIntel.ts` | 75 | `market-intel` | Manual only | YES ✅ |
| `src/hooks/useCachedIndustryIntel.ts` | 79 | `industry-intel` | Manual only | YES ✅ |
| `src/hooks/useAppData.ts` | 684 | `process-documents` | Manual | NO |
| `src/hooks/useAppData.ts` | 693 | `generate-ai-summary` | Manual | NO |

---

## 3. Polling/Interval Patterns - ALL DISABLED ✅

### refetchInterval (useQuery) - ALL DISABLED

| File | Line | Query | Status |
|------|------|-------|--------|
| `src/hooks/useMarketDataQuery.ts` | 59 | quote | ❌ DISABLED |
| `src/hooks/useMarketDataQuery.ts` | 114 | batchQuotes | ❌ DISABLED |
| `src/hooks/useMarketDataQuery.ts` | 144 | indices | ❌ DISABLED |
| `src/hooks/useAppData.ts` | 554 | company-documents | ❌ DISABLED (was 5s polling) |
| `src/hooks/useMarketIntel.ts` | all | all queries | ❌ DISABLED |
| `src/hooks/useEconomicIndicators.ts` | all | all queries | ❌ DISABLED |
| `src/hooks/useWatchlist.ts` | all | all queries | ❌ DISABLED |

### setInterval - ALL DISABLED

| File | Line | Purpose | Status |
|------|------|---------|--------|
| `src/hooks/useMarketDataQuery.ts` | 218 | Market status check | ❌ DISABLED |
| `src/components/equity/PublicEquityDetailView.tsx` | 151 | Auto-refresh quote | ❌ DISABLED |

### Auto-Load on Mount - ALL DISABLED

| File | Hook | Status |
|------|------|--------|
| `src/hooks/usePerplexityMarketIntel.ts` | useMarketIntelQuery | ❌ DISABLED |
| `src/hooks/useCachedIndustryIntel.ts` | useCachedIndustryIntel | ❌ DISABLED |

---

## 4. useQuery Hooks (Supabase DB Only - Safe)

These query Supabase database directly, no external APIs:

| Hook | File | What It Fetches |
|------|------|-----------------|
| `useCompanies` | `src/hooks/useAppData.ts` | Companies from DB |
| `useContacts` | `src/hooks/useAppData.ts` | Contacts from DB |
| `useTasks` | `src/hooks/useAppData.ts` | Tasks from DB |
| `useCompanyDocuments` | `src/hooks/useAppData.ts` | Documents from DB |
| `useCompanySummaries` | `src/hooks/useAppData.ts` | AI summaries from DB |
| `usePortfolioAssets` | `src/hooks/useMarketIntel.ts` | Portfolio assets from DB |
| `useEconomicIndicators` | `src/hooks/useMarketIntel.ts` | Indicators from DB |
| `usePEFunds` | `src/hooks/useMarketIntel.ts` | PE funds from DB |
| `useDealPipeline` | `src/hooks/useMarketIntel.ts` | Deals from DB |
| `useMarketQuote` | `src/hooks/useMarketDataQuery.ts` | Calls edge function |
| `useBatchMarketQuotes` | `src/hooks/useMarketDataQuery.ts` | Calls edge function |
| `useMarketIndices` | `src/hooks/useMarketDataQuery.ts` | Calls edge function |

---

## 5. Kill Switch Status

### Global Config (`src/config/apiConfig.ts`)

```typescript
export const API_CONFIG = {
  ENABLE_PERPLEXITY: false,  // ✅ DISABLED
  ENABLE_MARKET_DATA: false, // ✅ DISABLED
  ENABLE_AI_FEATURES: false, // ✅ DISABLED
  ENABLE_EXTERNAL_SCRAPING: false, // ✅ DISABLED
};
```

### Edge Function Kill Switches

| Function | Has Kill Switch | Status |
|----------|-----------------|--------|
| `market-data` | ✅ | `ENABLE_PERPLEXITY_API = false` |
| `market-intel` | ✅ | `ENABLE_PERPLEXITY_API = false` |
| `industry-intel` | ✅ | `ENABLE_PERPLEXITY_API = false` |
| `research-asset` | ✅ | `ENABLE_PERPLEXITY_API = false` |
| `stock-quote` | ✅ | `ENABLE_PERPLEXITY_API = false` |
| `scrape-website` | ✅ | `ENABLE_PERPLEXITY_API = false` |
| `generate-ai-summary` | ❌ | **MISSING** |
| `lookup-company` | ❌ | **MISSING** |
| `extract-document` | ❌ | **MISSING** |
| `suggest-companies` | ❌ | **MISSING** |
| `suggest-folder` | ❌ | **MISSING** |
| `process-documents` | ❌ | **MISSING** |
| `summarize-document` | ❌ | **MISSING** |
| `generate-assumptions` | ❌ | **MISSING** |
| `extract-historical` | ❌ | **MISSING** |
| `extract-company-financials` | ❌ | **MISSING** |
| `fetch-market-data` | ❌ | **MISSING** |

---

## 6. Current Status

### ✅ COMPLETED
- All Perplexity API calls blocked at edge function level
- All automatic polling/intervals removed
- All useQuery hooks use `staleTime: Infinity`
- No auto-refetch on window focus, mount, or reconnect
- Market intel hooks require explicit user action to fetch

### ⚠️ REMAINING ISSUES
- 11 Lovable AI edge functions lack kill switches (triggered by user action only)
- `fetch-market-data` lacks kill switch

---

## Appendix: Search Patterns Used

```bash
# Patterns searched:
supabase\.functions\.invoke
refetchInterval
setInterval
fetch\(
useQuery
API_CONFIG|isApiBlocked
ENABLE_PERPLEXITY_API|ENABLE_LOVABLE_AI
```
