
# Condensed Discovery Screener with Tabbed Categories

## Overview
Redesign the Market Intelligence section on the Research page to display screening categories one at a time with a unified tab navigation system. This will reduce visual clutter and provide a cleaner, more focused discovery experience.

## Current State
The Research page currently shows multiple panels simultaneously:
- **Today's Market Movers** panel with two columns (Top Gainers + Most Active)
- **Quick Screener** panel with its own internal tabs
- **Market Moving News** panel alongside the Quick Screener

This creates information overload and takes significant vertical space.

## Proposed Design

### Single Unified Screener Panel
Replace the current multi-panel layout with a single card that contains:

1. **Primary Tab Navigation** - Horizontal pill/button tabs at the top:
   - Top Gainers (TrendingUp icon)
   - Most Active (Activity icon)
   - Momentum (TrendingUp icon)
   - Unusual Volume (Zap icon)
   - Market News (Newspaper icon)

2. **Content Area** - Shows only the selected category's data:
   - For stock screeners: Display a clean table/grid of stocks
   - For news: Display the news feed

3. **Consistent Layout** - Same display format regardless of which tab is selected

```text
+--------------------------------------------------+
|  [Top Gainers] [Most Active] [Momentum] [...]    |  <- Tab selector
+--------------------------------------------------+
|                                                  |
|  Stock Table / Grid                              |  <- Single content area
|  (filtered by selected category)                 |
|                                                  |
+--------------------------------------------------+
```

## Implementation Plan

### Step 1: Create New Unified Screener Component
Create `src/components/research/UnifiedDiscoveryScreener.tsx`:
- Consolidate the existing `TrendingMostActivePanel`, `QuickScreenerPanel`, and `MarketNewsPanel` logic
- Single state variable to track the active tab
- Reuse existing data queries (topGainers, mostActive, momentum, unusualVolume)
- Common row/card component for consistent display

### Step 2: Tab Configuration
```text
SCREENER_TABS = [
  { id: 'topGainers',     label: 'Top Gainers',    icon: TrendingUp }
  { id: 'mostActive',     label: 'Most Active',    icon: Activity }
  { id: 'momentum',       label: 'Momentum',       icon: TrendingUp }
  { id: 'unusualVolume',  label: 'Unusual Vol',    icon: Zap }
  { id: 'news',           label: 'News',           icon: Newspaper }
]
```

### Step 3: Update MarketIntelligenceSection
- Replace the current multi-panel grid layout with the single `UnifiedDiscoveryScreener`
- Remove the separate `TrendingMostActivePanel`, `QuickScreenerPanel`, `MarketNewsPanel` components (or keep them for potential reuse elsewhere)

### Step 4: Styling and UX
- Use the existing `SubTabs` pattern from `MarketIntelTabs.tsx` for consistent styling
- Active tab highlighted with primary color
- Smooth content transitions
- Maintain "Full Screener" and "All News" quick-access links

## Visual Comparison

### Before (Current)
```text
+------------------------+------------------------+
|   TODAY'S MOVERS       |                        |
|  +----------+----------+                        |
|  | Gainers  | Active   |                        |
|  +----------+----------+                        |
+------------------------+------------------------+
+------------------------+------------------------+
|   QUICK SCREENER       |   MARKET NEWS          |
|  [tabs] [tabs] [tabs]  |                        |
|   results grid         |   news list            |
+------------------------+------------------------+
```

### After (Proposed)
```text
+----------------------------------------------------+
|  MARKET DISCOVERY                                  |
|  [Gainers] [Active] [Momentum] [Vol] [News]       |
+----------------------------------------------------+
|                                                    |
|  Content for selected category                     |
|  (table or news feed, depending on tab)            |
|                                                    |
+----------------------------------------------------+
```

## Technical Details

### Files to Create
- `src/components/research/UnifiedDiscoveryScreener.tsx` - New consolidated component

### Files to Modify
- `src/components/research/MarketIntelligenceSection.tsx` - Replace multi-panel with unified screener

### Data Queries
Reuse existing React Query hooks:
- `['screener', 'topGainers-quality']` for top gainers
- `['screener', 'mostActive-quality']` for most active
- `['screener', 'smallCapMomentum']` for momentum
- `['screener', 'unusualVolume']` for unusual volume
- `['market-news-research']` for news

## Benefits
- Reduces visual complexity and cognitive load
- More screen real estate for displayed content
- Consistent interaction pattern
- Easier to add new screening categories in the future
- Better mobile experience with less scrolling
