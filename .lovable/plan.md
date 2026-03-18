

# Rebuild Marketing Landing Page

## Overview
Replace the existing `MarketingLandingPage.tsx` with a full-featured, dark-mode fintech landing page. Add a `/landing` route. The page will be fully self-contained with local state, live data fetching, and scoped dark styling.

## Architecture

- **Standalone component**: `src/components/landing/MarketingLandingPage.tsx` (full rewrite)
- **New route**: Add `/landing` to `App.tsx`
- **No global side effects**: Dark theme applied via root wrapper class, all state local
- **Live data**: Reuse `useTrendingTickers` for ticker dropdown, use `PrebuiltStrategyId` list for strategy dropdown, invoke `strategy-backtest` edge function for results

## Sections (top to bottom)

### 1. Top Navigation Bar
- Fixed/sticky nav with `bg-slate-950/90 backdrop-blur`
- Left: Asset Labs logo (reuse `AssetLabsLogo` component with "Intelligent Investing" tagline)
- Right: Text links (Features, Pricing, Learn, Log In) in `text-gray-400`
- Far right: "Sign Up" button with `bg-cyan-400 text-black` rounded

### 2. Hero Section (2-Column)
- **Left column**:
  - H1: "Build AI Investment Strategies in Mins." (white) + "No Coding Required." (gray)
  - Two `<Select>` dropdowns side by side:
    - Ticker select: populated from `useTrendingTickers` (live Polygon data)
    - Strategy select: populated from `PrebuiltStrategyId` mapped to display names
  - Glowing cyan "RUN FREE BACKTEST" button triggers `strategy-backtest` edge function
- **Right column**:
  - Results dashboard card with `border-cyan-500/50` glow
  - Loading skeleton state while backtest runs
  - Recharts `AreaChart` fed from `portfolioHistory` response data (green gradient)
  - Bottom metric grid: Total Return (green/red), Max Drawdown, Win Rate, Sharpe Ratio

### 3. Features Grid (3 columns)
- Three dark cards (`bg-slate-900 border-slate-800`)
- Card 1: Zap icon (cyan) — "Powerful AI Backtesting"
- Card 2: Database icon (purple) — "Curated Datasets"
- Card 3: Brain icon (gold) — "AI Insights"

### 4. Bottom CTA Section
- Wide horizontal card with blurred dark background
- Overlay: "Deep Dive & Customize Signals: Create Your Complete Workspace"
- Outline button with cyan border: "Unlock the Full Platform"
- Triggers auth gate on click

## Data Flow

```text
useTrendingTickers() → ticker dropdown (live Polygon)
PrebuiltStrategyId enum → strategy dropdown (static mapping)
"Run Backtest" click → supabase.functions.invoke('strategy-backtest') → results card
All state (selectedTicker, selectedStrategy, results, isLoading, error) local via useState
```

## Files Changed

1. **`src/components/landing/MarketingLandingPage.tsx`** — Full rewrite with all 4 sections
2. **`src/App.tsx`** — Add `<Route path="/landing" element={<LandingPage />} />`

## Key Constraints
- No modifications to dashboard, global state, or existing components
- Reuse existing hooks (`useTrendingTickers`, `useRequireAuth`) and services (edge function)
- All styling scoped to component root (`bg-slate-950` wrapper)
- Framer Motion animations matching existing patterns

