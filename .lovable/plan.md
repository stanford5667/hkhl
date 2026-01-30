
# Visual Strategy Builder - Implementation Plan

## Overview

Build a **visual drag-and-drop strategy builder** at `/builder` that creates trading strategies through a node-based interface, then exports parameters to your existing `StrategyBacktester` component and `strategy-backtest` edge function.

This is an **INPUT METHOD** only - no new backtest engine, no new results display.

---

## Architecture Summary

```text
+---------------------------+     +---------------------------+     +---------------------------+
|   Visual Builder Page     |     |   Parameter JSON Output   |     |   Existing Backtest Tab   |
|       /builder            | --> |   (localStorage + URL)    | --> |   /backtester or          |
|                           |     |                           |     |   TickerDetail Strategy   |
+---------------------------+     +---------------------------+     +---------------------------+
         |                                    |                                |
    Drag-and-drop              Converts visual nodes           Consumes parameters via
    strategy construction      to params matching              existing strategy-backtest
    with @hello-pangea/dnd     existing StrategyParams         edge function
```

---

## Data Flow

1. User drags indicator blocks (RSI, MA, Volume, etc.) onto canvas
2. Connects blocks with logic operators (AND/OR)
3. Sets exit conditions (Take Profit, Stop Loss, Time Exit)
4. Clicks "Test in Backtest" button
5. Builder serializes to JSON matching existing `StrategyParams` interface
6. Navigates to `/backtester` or `/stock/{ticker}` with parameters in URL/state
7. Existing backtest UI pre-fills form and runs backtest

---

## Phase 1: Core Visual Builder Page

### New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Builder.tsx` | Page wrapper at `/builder` route |
| `src/components/builder/VisualStrategyBuilder.tsx` | Main 3-panel layout component |
| `src/components/builder/BlockPalette.tsx` | Left panel with draggable indicator/condition blocks |
| `src/components/builder/StrategyCanvas.tsx` | Center panel drop zone with connection logic |
| `src/components/builder/StrategySummary.tsx` | Right panel showing auto-generated summary and export |
| `src/components/builder/blocks/IndicatorBlock.tsx` | Draggable RSI/MA/Volume/MACD blocks |
| `src/components/builder/blocks/ConditionBlock.tsx` | Comparison operators (<, >, crosses above) |
| `src/components/builder/blocks/LogicBlock.tsx` | AND/OR gate blocks |
| `src/components/builder/blocks/ExitBlock.tsx` | Take Profit, Stop Loss, Time Exit blocks |
| `src/components/builder/blocks/ConnectionLine.tsx` | SVG connector between blocks |
| `src/lib/strategyBuilder/types.ts` | Type definitions for visual blocks and connections |
| `src/lib/strategyBuilder/serializer.ts` | Converts visual layout to existing StrategyParams |
| `src/lib/strategyBuilder/templates.ts` | Pre-built visual strategy templates |

### Block Types Mapping to Existing Strategies

| Visual Block | Maps To | Existing Edge Function Strategy |
|--------------|---------|--------------------------------|
| RSI Indicator + < 30 condition | `rsiOversold: 30, rsiPeriod: 14` | `rsi` strategy |
| Fast MA + Slow MA + "crosses above" | `fastMaPeriod: 10, slowMaPeriod: 50` | `ma-crossover` strategy |
| Gap Down condition | `gapThreshold: 2` | `gap-fill` strategy |
| Consecutive Down Days | `consecutiveDays: 3, holdingPeriod: 5` | `consecutive-days` strategy |

---

## Phase 2: Drag-and-Drop Implementation

### Using Existing @hello-pangea/dnd

Your project already uses `@hello-pangea/dnd` in `TaskBoard.tsx`. The builder will follow the same pattern:

```text
<DragDropContext onDragEnd={handleDragEnd}>
  <BlockPalette>          <!-- Droppable source -->
    <IndicatorBlock />    <!-- Draggable items -->
    <ConditionBlock />
    <LogicBlock />
    <ExitBlock />
  </BlockPalette>
  
  <StrategyCanvas>        <!-- Droppable target -->
    <CanvasNode />        <!-- Dropped + positioned blocks -->
    <ConnectionLine />    <!-- SVG lines between blocks -->
  </StrategyCanvas>
</DragDropContext>
```

### Block Data Structure

```typescript
interface CanvasBlock {
  id: string;
  type: 'indicator' | 'condition' | 'logic' | 'exit' | 'action';
  subtype: string; // 'RSI', 'SMA', 'AND', 'TAKE_PROFIT', etc.
  position: { x: number; y: number };
  parameters: Record<string, number | string>;
  connections: {
    inputs: string[];  // IDs of blocks connecting INTO this one
    outputs: string[]; // IDs of blocks this connects TO
  };
}
```

### Connection Validation Rules

| From Block | Can Connect To |
|------------|----------------|
| Indicator (RSI, MA, Volume) | Condition (<, >, crosses) |
| Condition | Logic Gate (AND/OR) or Action (BUY/SELL) |
| Logic Gate | Action (BUY/SELL) |
| Exit Condition | Automatically applied to position |

Invalid connections show red "X" indicator and snap back.

---

## Phase 3: Strategy Serialization

### Output JSON Format

The serializer converts visual blocks to parameters matching existing `strategy-backtest` edge function:

```typescript
// Output matches existing StrategyParams interface
interface VisualStrategyOutput {
  strategy: 'rsi' | 'ma-crossover' | 'gap-fill' | 'consecutive-days' | 'visual-custom';
  ticker: string;
  params: {
    // RSI parameters
    rsiPeriod?: number;
    rsiOversold?: number;
    rsiOverbought?: number;
    // MA parameters
    fastMaPeriod?: number;
    slowMaPeriod?: number;
    // Gap parameters
    gapThreshold?: number;
    // Consecutive days parameters
    consecutiveDays?: number;
    holdingPeriod?: number;
    // Risk management (always available)
    stopLossPercent?: number;
    takeProfitPercent?: number;
  };
}
```

### Detection Logic

```typescript
function detectStrategyType(blocks: CanvasBlock[]): string {
  const hasRSI = blocks.some(b => b.subtype === 'RSI');
  const hasMACrossover = blocks.filter(b => 
    b.subtype === 'EMA' || b.subtype === 'SMA'
  ).length >= 2;
  const hasGap = blocks.some(b => b.subtype === 'GAP_DOWN');
  const hasConsecutive = blocks.some(b => b.subtype === 'CONSECUTIVE_DOWN');
  
  if (hasRSI) return 'rsi';
  if (hasMACrossover) return 'ma-crossover';
  if (hasGap) return 'gap-fill';
  if (hasConsecutive) return 'consecutive-days';
  return 'visual-custom'; // Future: custom strategy support
}
```

---

## Phase 4: Integration with Existing Backtest

### Option A: URL Parameter Passing (Recommended)

```typescript
// In VisualStrategyBuilder.tsx
const handleTestInBacktest = () => {
  const output = serializeStrategy(canvasBlocks);
  const params = new URLSearchParams({
    source: 'builder',
    strategy: output.strategy,
    params: JSON.stringify(output.params),
    ticker: selectedTicker
  });
  navigate(`/backtester?${params.toString()}`);
};
```

### Option B: localStorage + Navigation

```typescript
const handleTestInBacktest = () => {
  const output = serializeStrategy(canvasBlocks);
  localStorage.setItem('visual_strategy', JSON.stringify(output));
  navigate('/backtester?source=builder');
};
```

### Modification to Existing StrategyBacktester.tsx

Add URL parameter reading at component mount:

```typescript
// In StrategyBacktester.tsx
useEffect(() => {
  const searchParams = new URLSearchParams(location.search);
  if (searchParams.get('source') === 'builder') {
    const strategyId = searchParams.get('strategy');
    const params = JSON.parse(searchParams.get('params') || '{}');
    
    // Pre-select strategy
    const strategy = STRATEGIES.find(s => s.id === strategyId);
    if (strategy) {
      setSelectedStrategy(strategy);
      setParams({ ...strategy.defaultParams, ...params });
      // Optionally auto-run
    }
  }
}, [location.search]);
```

---

## Phase 5: Round-Trip Editing

### "Edit in Visual Builder" Button

Add to existing backtest results display:

```typescript
// In StrategyBacktester.tsx results section
<Button 
  variant="outline"
  onClick={() => {
    const builderState = reconstructVisualFromParams(selectedStrategy, params);
    localStorage.setItem('builder_state', JSON.stringify(builderState));
    navigate('/builder?edit=true');
  }}
>
  <Edit className="h-4 w-4 mr-2" />
  Edit in Visual Builder
</Button>
```

---

## UI Design Specifications

### Left Panel: Block Palette (250px wide)

```text
+----------------------------------+
| STRATEGY BLOCKS                  |
+----------------------------------+
| 📊 INDICATORS                    |
|   [RSI]  [SMA]  [EMA]  [MACD]   |
|   [Volume]  [Bollinger]          |
+----------------------------------+
| 🎯 CONDITIONS                    |
|   [< Less Than]  [> Greater]    |
|   [Crosses Above]  [Crosses Below]|
+----------------------------------+
| 🔗 LOGIC                         |
|   [AND]  [OR]                    |
+----------------------------------+
| 🛑 EXIT CONDITIONS               |
|   [Take Profit %]  [Stop Loss %] |
|   [Hold for N days]              |
+----------------------------------+
| ✅ ACTIONS                       |
|   [BUY Signal]  [SELL Signal]    |
+----------------------------------+
```

### Center Panel: Strategy Canvas

- Grid background (terminal-style dots)
- Drop zones highlighted on drag
- Blocks snap to grid (20px)
- SVG connection lines with arrow heads
- Zoom controls (optional)
- Pre-loaded example strategy (collapsible)

### Right Panel: Strategy Summary (300px wide)

```text
+----------------------------------+
| STRATEGY CONFIGURATION           |
+----------------------------------+
| 📋 Name: [My RSI Strategy    ]   |
+----------------------------------+
| 🔍 CONDITIONS SUMMARY            |
| "BUY when: RSI(14) < 30"         |
| "SELL when: +5% profit OR -2%"   |
+----------------------------------+
| ⚙️ PARAMETERS                    |
| RSI Period:    [14]              |
| RSI Threshold: [30]              |
| Take Profit:   [5]%              |
| Stop Loss:     [2]%              |
+----------------------------------+
| 📤 EXPORT                        |
| Ticker: [AAPL        ] 🔍        |
|                                  |
| [🧪 TEST IN BACKTEST TAB]        |
| [💾 Save Strategy]               |
| [📋 Copy as JSON]                |
+----------------------------------+
```

---

## Technical Specifications

### State Management

```typescript
interface BuilderState {
  blocks: CanvasBlock[];
  connections: Connection[];
  selectedBlockId: string | null;
  strategyName: string;
  ticker: string;
  isDirty: boolean;
}

interface Connection {
  id: string;
  fromBlockId: string;
  fromPort: 'output';
  toBlockId: string;
  toPort: 'input';
}
```

### Validation

- Entry conditions required (at least one indicator + condition)
- Exit conditions recommended (warning if missing)
- Logic gates must have 2+ inputs
- Actions must have at least one input connection

---

## Files Modified (Minimal)

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/builder` route |
| `src/components/backtester/StrategyBacktester.tsx` | Add URL param reading for pre-fill |
| `src/pages/Backtester.tsx` | Optional: Add "Load from Builder" button |

---

## Implementation Order

1. **Core page structure** - Builder.tsx, VisualStrategyBuilder.tsx with 3-panel layout
2. **Block components** - IndicatorBlock, ConditionBlock, LogicBlock, ExitBlock
3. **Drag-and-drop** - DragDropContext integration with canvas
4. **Connection system** - SVG lines, validation, snap-to-port
5. **Serializer** - Convert visual to StrategyParams JSON
6. **Navigation integration** - URL params to StrategyBacktester
7. **Pre-built templates** - RSI Bounce, MA Crossover as starting points
8. **Round-trip editing** - Reconstruct visual from params

---

## Out of Scope (Per Your Request)

- New backtest calculation engine
- New results display components
- Modifications to existing backtest calculations
- Custom JavaScript strategy execution
- Database storage of visual strategies (Phase 2)
