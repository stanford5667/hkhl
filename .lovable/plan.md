
# Comprehensive Fundamental & Risk Metrics Integration

## Overview
Integrate 18+ key financial metrics across Company Details and Discovery Screener views, prioritizing **Polygon.io** as the primary data source with **SEC XBRL** as fallback. Includes a self-grading command to ensure implementation quality.

## Self-Grading System
A performance ranking command (1-10) will be integrated to validate implementation quality against these criteria:
- **Data Accuracy**: Metrics calculated from live API data, no mock/hardcoded values
- **Source Transparency**: Clear indication of data source (Polygon/SEC/Calculated)
- **Error Handling**: Graceful degradation when data unavailable
- **Test Coverage**: All calculations verified with real API calls

---

## Phase 1: Enhance `fmp-fundamentals` Edge Function

### New Polygon Endpoints to Add
The Polygon `/v1/reference/tickers/{ticker}/ratios` endpoint provides pre-calculated ratios:
```text
GET /v1/reference/tickers/{ticker}/ratios?apiKey=...

Response includes:
├── price_to_book
├── price_to_cash_flow  
├── price_to_free_cash_flow
├── debt_to_equity
├── current (current ratio)
├── quick (quick ratio)
├── ev_to_ebitda
├── ev_to_sales
├── return_on_assets
├── return_on_equity
├── enterprise_value
├── free_cash_flow
```

### New Balance Sheet Fetching from Polygon Financials
```text
GET /vX/reference/financials?ticker={symbol}&timeframe=annual&limit=2

Extract from financials.balance_sheet:
├── assets
├── liabilities  
├── equity
├── current_assets
├── current_liabilities
├── inventory
├── cash_and_cash_equivalents
├── long_term_debt / noncurrent_liabilities
```

### SEC XBRL Fallback Concepts (existing pipeline)
```text
Extend fetchSECFinancials to include balance sheet concepts:
├── Assets
├── Liabilities
├── StockholdersEquity
├── AssetsCurrent
├── LiabilitiesCurrent  
├── InventoryNet
├── CashAndCashEquivalentsAtCarryingValue
├── LongTermDebt / DebtCurrent
```

### Enhanced Response Interface
```typescript
interface EnhancedFundamentalsResponse {
  // Existing
  profile: CompanyProfile | null;
  financials: IncomeStatement[];
  estimates: AnalystEstimate[];
  useMockData: boolean;
  source: string;
  
  // NEW: Balance Sheet Data
  balanceSheet: {
    totalAssets: number | null;
    totalLiabilities: number | null;
    totalEquity: number | null;
    currentAssets: number | null;
    currentLiabilities: number | null;
    inventory: number | null;
    cash: number | null;
    longTermDebt: number | null;
    shortTermDebt: number | null;
  } | null;
  
  // NEW: Pre-calculated Ratios from Polygon
  ratios: {
    priceToBook: number | null;
    priceToCash: number | null;
    priceToFreeCashFlow: number | null;
    evToEbitda: number | null;
    evToSales: number | null;
    debtToEquity: number | null;
    quickRatio: number | null;
    currentRatio: number | null;
    returnOnAssets: number | null;
    returnOnEquity: number | null;
    enterpriseValue: number | null;
    freeCashFlow: number | null;
  } | null;
  
  // NEW: Calculated Margins & Growth
  metrics: {
    operatingMargin: number | null;
    grossMargin: number | null;
    netMargin: number | null;
    epsGrowthYoY: number | null;
    revenueGrowthYoY: number | null;
    epsStdDev: number | null; // From 8 quarters
  } | null;
}
```

---

## Phase 2: Create `useComprehensiveFundamentals` Hook

### File: `src/hooks/useComprehensiveFundamentals.ts`

Unified hook aggregating data from:
1. Enhanced `fmp-fundamentals` (Polygon ratios + balance sheet)
2. `useAssetMetrics` (volatility, beta, sharpe, max drawdown)
3. `earnings_predictions` table (beat probability)
4. `market_daily_bars` (custom period performance)

### Return Interface
```typescript
interface ComprehensiveFundamentals {
  // Valuation Metrics
  pe: number | null;
  forwardPE: number | null;
  peg: number | null;
  priceToBook: number | null;
  priceToCash: number | null;
  evToEbitda: number | null;
  
  // Profitability Metrics  
  operatingMargin: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  
  // Growth Metrics
  epsGrowthYoY: number | null;
  revenueGrowthYoY: number | null;
  epsStdDev: number | null;
  
  // Stability Metrics
  debtToEquity: number | null;
  quickRatio: number | null;
  currentRatio: number | null;
  
  // Risk Metrics (from useAssetMetrics)
  volatility: number | null;
  beta: number | null;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  maxDrawdown: number | null;
  
  // Custom Period Performance
  returns: {
    day1: number | null;
    week1: number | null;
    month1: number | null;
    month3: number | null;
    month6: number | null;
    year1: number | null;
    year3: number | null;
    year5: number | null;
  };
  
  // Market Data
  avgVolume20D: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  
  // Earnings Intelligence (from DB)
  beatProbability: number | null;
  confidenceLevel: 'high' | 'medium' | 'low' | null;
  
  // Metadata
  source: string;
  isLoading: boolean;
  dataQuality: number; // 1-10 score
}
```

---

## Phase 3: Update Company Details UI (`ALAOverviewTab`)

### New Card Components

#### 1. Enhanced Key Financials Card
```text
┌────────────────────────────────────────────────────────┐
│ 📊 Key Financials                      [Source: Polygon]│
├────────────┬────────────┬────────────┬────────────────┤
│ Mkt Cap    │ EPS (TTM)  │ P/E        │ Forward P/E    │
│ $2.9T      │ $6.42      │ 28.8x      │ 26.2x          │
├────────────┼────────────┼────────────┼────────────────┤
│ PEG        │ P/B        │ P/Cash     │ EV/EBITDA      │
│ 1.8        │ 45.2x      │ 12.3x      │ 22.1x          │
├────────────┼────────────┼────────────┼────────────────┤
│ Op Margin  │ D/E        │ Quick      │ Beta           │
│ 31.2%      │ 1.54       │ 0.83       │ 1.28           │
└────────────┴────────────┴────────────┴────────────────┘
```

#### 2. New Risk & Performance Card
```text
┌────────────────────────────────────────────────────────┐
│ ⚡ Risk & Performance                                   │
├────────────┬────────────┬────────────┬────────────────┤
│ Volatility │ Max DD     │ Sharpe     │ Sortino        │
│ 24.3%      │ -18.2%     │ 1.42       │ 1.85           │
├────────────────────────────────────────────────────────┤
│ Returns: [1D] [1W] [1M] [3M] [6M] [1Y] [3Y] [5Y]      │
│          +0.8  +2.1  +5.3 +12.1 +18.4 +32.5 +68.2 +142│
└────────────────────────────────────────────────────────┘
```

#### 3. Earnings Intelligence Card (when prediction exists)
```text
┌────────────────────────────────────────────────────────┐
│ 🎯 Earnings Intelligence                               │
├────────────────────────────────────────────────────────┤
│ Beat Probability: 72%  ████████░░  HIGH CONFIDENCE     │
│ EPS Std Dev: $0.12 | Avg Volume: 54.8M                │
└────────────────────────────────────────────────────────┘
```

---

## Phase 4: Extend Discovery Screener

### New Filter Dropdowns for `UnifiedDiscoveryScreener`
```typescript
const FUNDAMENTAL_FILTER_OPTIONS = [
  { 
    id: 'pe', 
    label: 'P/E Ratio',
    options: [
      { label: 'Under 10', value: { maxPE: 10 } },
      { label: '10-20', value: { minPE: 10, maxPE: 20 } },
      { label: '20-35', value: { minPE: 20, maxPE: 35 } },
      { label: 'Over 35', value: { minPE: 35 } },
    ]
  },
  {
    id: 'opMargin',
    label: 'Operating Margin',
    options: [
      { label: 'Negative', value: { maxOperatingMargin: 0 } },
      { label: '0-10%', value: { minOperatingMargin: 0, maxOperatingMargin: 10 } },
      { label: '10-20%', value: { minOperatingMargin: 10, maxOperatingMargin: 20 } },
      { label: '20%+', value: { minOperatingMargin: 20 } },
    ]
  },
  {
    id: 'debtEquity',
    label: 'Debt/Equity',
    options: [
      { label: 'Under 0.5', value: { maxDebtEquity: 0.5 } },
      { label: '0.5-1.0', value: { minDebtEquity: 0.5, maxDebtEquity: 1 } },
      { label: '1.0-2.0', value: { minDebtEquity: 1, maxDebtEquity: 2 } },
      { label: 'Over 2', value: { minDebtEquity: 2 } },
    ]
  },
  {
    id: 'beatExpected',
    label: 'Expected to Beat',
    options: [
      { label: 'High (70%+)', value: { minBeatProbability: 70 } },
      { label: 'Medium (50-70%)', value: { minBeatProbability: 50, maxBeatProbability: 70 } },
      { label: 'Low (<50%)', value: { maxBeatProbability: 50 } },
    ]
  },
];
```

---

## Phase 5: Formula Implementations

All formulas use LIVE data from Polygon or calculated from SEC filings:

```text
P/E Ratio
─────────
Source: Polygon ratios API OR calculated
pe = currentPrice / ttmEPS

Forward P/E  
───────────
Source: FMP analyst estimates (existing)
fwdPE = currentPrice / estimatedNextYearEPS

PEG Ratio
─────────
Calculated from P/E and EPS growth
peg = pe / (epsGrowthRate × 100)

Price to Book
─────────────
Source: Polygon ratios API "price_to_book"
Fallback: currentPrice / (totalEquity / sharesOutstanding)

Price to Cash
─────────────
Source: Polygon ratios API "price_to_cash_flow"
Fallback: marketCap / cashAndCashEquivalents

EV/EBITDA
─────────
Source: Polygon ratios API "ev_to_ebitda"
Fallback: enterpriseValue / ttmEBITDA

Operating Margin
────────────────
Calculated from income statement
opMargin = (operatingIncome / revenue) × 100

EPS Growth Rate (YoY)
─────────────────────
Calculated from 4 quarters vs prior 4 quarters
epsGrowth = ((currentTTM_EPS - priorTTM_EPS) / |priorTTM_EPS|) × 100

Earnings Std Dev
────────────────
Calculated from last 8 quarters of EPS
epsStdDev = σ([q1_eps, q2_eps, ..., q8_eps])

Debt to Equity
──────────────
Source: Polygon ratios API "debt_to_equity"
Fallback: (longTermDebt + shortTermDebt) / totalEquity

Quick Ratio
───────────
Source: Polygon ratios API "quick"
Fallback: (currentAssets - inventory) / currentLiabilities

Custom Period Performance
─────────────────────────
Source: market_daily_bars table
return = ((price_end - price_start) / price_start) × 100

Volatility
──────────
Source: useAssetMetrics (existing)
volatility = annualized std dev of daily returns

Beta
────
Source: useAssetMetrics (existing)  
beta = Cov(asset, SPY) / Var(SPY)

Expected to Beat
────────────────
Source: earnings_predictions table
beatProbability = confidence_score WHERE predicted_outcome = 'beat'
```

---

## Implementation Files

### Files to Create
| File | Purpose |
|------|---------|
| `src/hooks/useComprehensiveFundamentals.ts` | Unified metrics aggregation hook |
| `src/components/research/ComprehensiveMetricsCard.tsx` | Combined valuation/profitability/stability display |
| `src/components/research/RiskPerformanceCard.tsx` | Risk metrics + custom period returns |
| `src/components/research/EarningsIntelCard.tsx` | Beat probability + EPS stability |

### Files to Modify
| File | Changes |
|------|---------|
| `supabase/functions/fmp-fundamentals/index.ts` | Add Polygon ratios + balance sheet fetching |
| `src/hooks/useTickerFundamentals.ts` | Extend interface for new fields |
| `src/components/research/ALAOverviewTab.tsx` | Integrate new metric cards |
| `src/components/research/UnifiedDiscoveryScreener.tsx` | Add fundamental filter dropdowns |

---

## Testing & Validation Strategy

### Automated Tests
Each metric calculation will be tested against known values:

```typescript
// Example test structure
describe('useComprehensiveFundamentals', () => {
  it('should fetch real P/E ratio from Polygon', async () => {
    const { result } = renderHook(() => 
      useComprehensiveFundamentals('AAPL')
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.pe).toBeGreaterThan(0);
    expect(result.current.source).not.toBe('Demo Data');
  });
  
  it('should calculate operating margin from real income statement', async () => {
    const { result } = renderHook(() => 
      useComprehensiveFundamentals('MSFT')
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.operatingMargin).toBeGreaterThan(20); // MSFT typically >35%
    expect(result.current.operatingMargin).toBeLessThan(100);
  });
});
```

### Self-Grading Command Integration
The implementation will include a data quality score (1-10) based on:
- **10**: All metrics from live Polygon ratios API
- **8-9**: Mix of Polygon + calculated from SEC
- **6-7**: Primarily SEC XBRL with some gaps
- **1-5**: Significant data gaps or fallbacks

This score will be visible in the UI and logged for monitoring.

---

## Data Flow Diagram

```text
User views Company Details
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              useComprehensiveFundamentals(ticker)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           fmp-fundamentals (enhanced)                 │  │
│  │                                                       │  │
│  │  1. Polygon /v1/reference/tickers/{ticker}/ratios    │  │
│  │     → P/B, P/CF, D/E, Quick, EV/EBITDA, ROE, ROA    │  │
│  │                                                       │  │
│  │  2. Polygon /vX/reference/financials                 │  │
│  │     → Balance sheet: assets, liabilities, equity     │  │
│  │     → Income statement: revenue, operating income    │  │
│  │                                                       │  │
│  │  3. SEC XBRL (fallback if Polygon missing)           │  │
│  │     → All financial concepts via companyfacts API    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ useAssetMetrics  │  │ earnings_        │                │
│  │ (existing)       │  │ predictions DB   │                │
│  │                  │  │                  │                │
│  │ • Volatility     │  │ • Beat prob      │                │
│  │ • Beta           │  │ • Confidence     │                │
│  │ • Sharpe/Sortino │  │ • Signals        │                │
│  │ • Max Drawdown   │  │                  │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                          │
│           └─────────┬───────────┘                          │
│                     ▼                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Consolidated Metrics + Quality Score        │  │
│  │                                                       │  │
│  │  Valuation: pe, fwdPE, peg, pb, pCash, evEbitda      │  │
│  │  Margins: opMargin, netMargin, grossMargin, ROE, ROA │  │
│  │  Growth: epsGrowth, revGrowth, epsStdDev             │  │
│  │  Stability: debtEquity, quickRatio, currentRatio     │  │
│  │  Risk: sharpe, sortino, maxDrawdown, volatility      │  │
│  │  Performance: returns[1D..5Y], avgVolume             │  │
│  │  Earnings: beatProbability, confidenceLevel          │  │
│  │  Meta: source, dataQuality (1-10)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    ALAOverviewTab UI                        │
├─────────────────┬───────────────────┬───────────────────────┤
│ Key Financials  │ Risk & Perf       │ Earnings Intel        │
│ (expanded)      │ (new)             │ (new)                 │
│                 │                   │                       │
│ P/E, Fwd P/E    │ Volatility        │ Beat Probability     │
│ PEG, P/B        │ Max Drawdown      │ Confidence Level     │
│ EV/EBITDA       │ Sharpe/Sortino    │ EPS Std Dev          │
│ Op Margin       │ Beta              │ Avg Volume           │
│ D/E, Quick      │ 1D-5Y Returns     │                       │
│ ROE, ROA        │                   │                       │
└─────────────────┴───────────────────┴───────────────────────┘
```

---

## Priority Implementation Order

1. **Enhance `fmp-fundamentals`** with Polygon ratios API + balance sheet fetching
2. **Create `useComprehensiveFundamentals`** hook with data quality scoring
3. **Add metric cards** to `ALAOverviewTab` with source indicators
4. **Write integration tests** to verify real data (no mocks)
5. **Add screener filters** for new fundamental metrics
6. **Implement "Expected to Beat"** earnings integration

---

## Technical Notes

### Rate Limiting
- Polygon ratios endpoint: Included in existing rate limits
- Balance sheet fetch: Batched with existing financials call
- No additional API calls beyond current architecture

### Caching Strategy
- Ratios cached for 1 hour (existing cache)
- Balance sheet cached with financials
- Risk metrics cached for 10 minutes (existing)

### Error Handling
- Missing Polygon data → Fall back to SEC XBRL
- Missing SEC data → Show "—" with tooltip explaining unavailability
- Never show mock data as real data

