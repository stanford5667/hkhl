# API Call Audit Report

**Generated:** 2026-01-02  
**Updated:** 2026-01-02 (ALL edge functions now have kill switches!)
**Purpose:** Identify all external API calls in the codebase for cost/usage control

---

## Summary

| Category | Count | With Kill Switch | Auto-Polling |
|----------|-------|------------------|--------------|
| Edge Functions (Perplexity) | 6 | 6 ✅ | N/A |
| Edge Functions (Lovable AI) | 11 | 11 ✅ | N/A |
| Edge Functions (Other) | 1 | 1 ✅ | N/A |
| Client Hooks (Perplexity) | 2 | 2 ✅ | ❌ DISABLED |
| Client setInterval | 2 | 2 ✅ | ❌ DISABLED |
| Client refetchInterval | All | All ✅ | ❌ DISABLED |

---

## ✅ ALL EDGE FUNCTIONS NOW HAVE KILL SWITCHES

### Perplexity API Functions (ENABLE_PERPLEXITY_API = false)
| Function | Kill Switch Variable |
|----------|---------------------|
| `market-data/index.ts` | `ENABLE_PERPLEXITY_API = false` |
| `market-intel/index.ts` | `ENABLE_PERPLEXITY_API = false` |
| `industry-intel/index.ts` | `ENABLE_PERPLEXITY_API = false` |
| `research-asset/index.ts` | `ENABLE_PERPLEXITY_API = false` |
| `stock-quote/index.ts` | `ENABLE_PERPLEXITY_API = false` |
| `scrape-website/index.ts` | `ENABLE_PERPLEXITY_API = false` |

### Lovable AI Functions (ENABLE_LOVABLE_AI = false)
| Function | Kill Switch Variable |
|----------|---------------------|
| `generate-ai-summary/index.ts` | `ENABLE_LOVABLE_AI = false` |
| `lookup-company/index.ts` | `ENABLE_LOVABLE_AI = false` |
| `extract-document/index.ts` | `ENABLE_LOVABLE_AI = false` |
| `suggest-companies/index.ts` | `ENABLE_LOVABLE_AI = false` |
| `suggest-folder/index.ts` | `ENABLE_LOVABLE_AI = false` |
| `process-documents/index.ts` | `ENABLE_LOVABLE_AI = false` |
| `summarize-document/index.ts` | `ENABLE_LOVABLE_AI = false` |
| `generate-assumptions/index.ts` | `ENABLE_LOVABLE_AI = false` |
| `extract-historical/index.ts` | `ENABLE_LOVABLE_AI = false` |
| `extract-company-financials/index.ts` | `ENABLE_LOVABLE_AI = false` |

### External API Functions (ENABLE_EXTERNAL_APIS = false)
| Function | Kill Switch Variable |
|----------|---------------------|
| `fetch-market-data/index.ts` | `ENABLE_EXTERNAL_APIS = false` |

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

### Edge Function Kill Switches - ALL ENABLED ✅

| Function | Kill Switch Variable | Status |
|----------|---------------------|--------|
| `market-data` | `ENABLE_PERPLEXITY_API` | ✅ `false` |
| `market-intel` | `ENABLE_PERPLEXITY_API` | ✅ `false` |
| `industry-intel` | `ENABLE_PERPLEXITY_API` | ✅ `false` |
| `research-asset` | `ENABLE_PERPLEXITY_API` | ✅ `false` |
| `stock-quote` | `ENABLE_PERPLEXITY_API` | ✅ `false` |
| `scrape-website` | `ENABLE_PERPLEXITY_API` | ✅ `false` |
| `generate-ai-summary` | `ENABLE_LOVABLE_AI` | ✅ `false` |
| `lookup-company` | `ENABLE_LOVABLE_AI` | ✅ `false` |
| `extract-document` | `ENABLE_LOVABLE_AI` | ✅ `false` |
| `suggest-companies` | `ENABLE_LOVABLE_AI` | ✅ `false` |
| `suggest-folder` | `ENABLE_LOVABLE_AI` | ✅ `false` |
| `process-documents` | `ENABLE_LOVABLE_AI` | ✅ `false` |
| `summarize-document` | `ENABLE_LOVABLE_AI` | ✅ `false` |
| `generate-assumptions` | `ENABLE_LOVABLE_AI` | ✅ `false` |
| `extract-historical` | `ENABLE_LOVABLE_AI` | ✅ `false` |
| `extract-company-financials` | `ENABLE_LOVABLE_AI` | ✅ `false` |
| `fetch-market-data` | `ENABLE_EXTERNAL_APIS` | ✅ `false` |

---

## 6. Current Status

### ✅ ALL COMPLETE
- All Perplexity API calls blocked at edge function level
- All Lovable AI calls blocked at edge function level
- All external API calls blocked at edge function level
- All automatic polling/intervals removed from client
- All useQuery hooks use `staleTime: Infinity`
- No auto-refetch on window focus, mount, or reconnect
- Market intel hooks require explicit user action to fetch
- Database triggers only call database functions (not edge functions)

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
