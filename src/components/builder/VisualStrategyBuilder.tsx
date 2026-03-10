/**
 * Visual Strategy Builder
 * 
 * Main 3-panel layout component for drag-and-drop strategy creation.
 * When embedded=true, uses compact layout suitable for side panel.
 * Includes undo/redo, mobile responsive design, and enhanced UX.
 */

import { useState, useCallback, useEffect } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Trash2, HelpCircle, Undo2, Redo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CanvasBlock, Connection, BlockSubtype } from '@/lib/strategyBuilder/types';
import { canConnect } from '@/lib/strategyBuilder/types';
import { ALL_PALETTE_BLOCKS, STRATEGY_TEMPLATES, type StrategyTemplate } from '@/lib/strategyBuilder/templates';
import { BlockPalette } from './BlockPalette';
import { StrategyCanvas } from './StrategyCanvas';
import { StrategySummary, type SerializedStrategy } from './StrategySummary';
import { BuilderOnboarding } from './BuilderOnboarding';
import { MobileBuilder } from './MobileBuilder';
import { BacktestResultsView } from './BacktestResultsView';
import { useBuilderHistory } from '@/hooks/useBuilderHistory';
import { useIsMobile } from '@/hooks/use-mobile';
import type { SentenceBuilderState } from './SentenceBuilder';
import type { AdvancedBacktestParams } from '@/lib/backtesting/types';

interface BacktestParams {
  strategy: string;
  ticker: string;
  params: Record<string, number | string | undefined>;
}

interface BacktestMetrics {
  totalReturn?: number;
  winRate?: number;
  totalTrades?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  avgWin?: number;
  avgLoss?: number;
  profitFactor?: number;
  avgHoldingDays?: number;
}

interface VisualStrategyBuilderProps {
  embedded?: boolean;
  /** Callback for inline backtest execution - should return metrics for results view */
  onRunBacktest?: (params: BacktestParams) => Promise<BacktestMetrics | void> | void;
  /** Callback when user clears the strategy */
  onClear?: () => void;
  /** Callback to prompt upgrade dialog */
  onPromptUpgrade?: (feature: string) => void;
  /** Initial ticker for embedded mode */
  initialTicker?: string;
  /** Advanced params for execution configuration */
  advancedParams?: AdvancedBacktestParams;
  onAdvancedParamsChange?: (params: AdvancedBacktestParams) => void;
  /** Auto-run strategy params (e.g. resumed after auth) */
  autoRunStrategy?: BacktestParams;
}

export function VisualStrategyBuilder({ 
  embedded = false, 
  onRunBacktest,
  onClear,
  onPromptUpgrade,
  initialTicker = 'AAPL',
  advancedParams,
  onAdvancedParamsChange,
  autoRunStrategy,
}: VisualStrategyBuilderProps) {
  const isMobile = useIsMobile();
  
  // Use history hook for undo/redo
  const {
    blocks,
    connections,
    setBlocks,
    setConnections,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength,
  } = useBuilderHistory();

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [strategyName, setStrategyName] = useState('My Visual Strategy');
  const [ticker, setTicker] = useState(initialTicker);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  
  // Stage-based flow for embedded mode: 'build' | 'results'
  const [stage, setStage] = useState<'build' | 'results'>('build');
  const [lastBacktestParams, setLastBacktestParams] = useState<BacktestParams | null>(null);
  const [lastBacktestMetrics, setLastBacktestMetrics] = useState<BacktestMetrics | null>(null);
  const [isRunningBacktest, setIsRunningBacktest] = useState(false);
  
  // Sentence builder state - persisted across stage transitions
  const [sentenceState, setSentenceState] = useState<SentenceBuilderState>({
    entrySignals: [],
    entryLogic: 'AND',
    exitRules: [],
    exitLogic: 'OR',
  });

  // Generate unique ID
  const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add block (shared by drag-drop and click-to-add)
  const addBlockToCanvas = useCallback((subtype: BlockSubtype) => {
    const paletteBlock = ALL_PALETTE_BLOCKS.find(b => b.subtype === subtype);
    if (!paletteBlock) return;

    const newBlock: CanvasBlock = {
      id: generateId(),
      type: paletteBlock.type,
      subtype: paletteBlock.subtype,
      position: {
        x: 100 + (blocks.length % 3) * 180,
        y: 80 + Math.floor(blocks.length / 3) * 120,
      },
      parameters: { ...paletteBlock.defaultParameters },
      connections: { inputs: [], outputs: [] },
    };

    setBlocks(prev => [...prev, newBlock]);
    setShowOnboarding(false);
  }, [blocks.length, setBlocks]);

  // Handle drag end from palette to canvas
  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, draggableId } = result;

    // Dropped outside
    if (!destination) return;

    // Only handle drops onto canvas
    if (destination.droppableId !== 'canvas') return;

    // Extract subtype from draggableId (palette-{SUBTYPE})
    const subtype = draggableId.replace('palette-', '') as BlockSubtype;
    addBlockToCanvas(subtype);
  }, [addBlockToCanvas]);

  // Handle click to add block
  const handleAddBlock = useCallback((subtype: BlockSubtype) => {
    addBlockToCanvas(subtype);
  }, [addBlockToCanvas]);

  // Update block position
  const handleUpdateBlockPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setBlocks(prev => prev.map(b => 
      b.id === id ? { ...b, position } : b
    ));
  }, [setBlocks]);

  // Update block parameter
  const handleUpdateBlockParameter = useCallback((blockId: string, key: string, value: number | string) => {
    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, parameters: { ...b.parameters, [key]: value } } : b
    ));
  }, [setBlocks]);

  // Delete block
  const handleDeleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    // Also remove connections
    setConnections(prev => prev.filter(c => c.fromBlockId !== id && c.toBlockId !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId, setBlocks, setConnections]);

  // Delete connection
  const handleDeleteConnection = useCallback((connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return;

    setConnections(prev => prev.filter(c => c.id !== connectionId));

    // Update block connection references
    setBlocks(prev => prev.map(b => {
      if (b.id === conn.fromBlockId) {
        return { 
          ...b, 
          connections: { 
            ...b.connections, 
            outputs: b.connections.outputs.filter(id => id !== conn.toBlockId) 
          } 
        };
      }
      if (b.id === conn.toBlockId) {
        return { 
          ...b, 
          connections: { 
            ...b.connections, 
            inputs: b.connections.inputs.filter(id => id !== conn.fromBlockId) 
          } 
        };
      }
      return b;
    }));
  }, [connections, setBlocks, setConnections]);

  // Connect blocks
  const handleConnect = useCallback((fromId: string, toId: string) => {
    const fromBlock = blocks.find(b => b.id === fromId);
    const toBlock = blocks.find(b => b.id === toId);

    if (!fromBlock || !toBlock) return;

    // Validate connection
    if (!canConnect(fromBlock, toBlock)) {
      return; // Invalid connection
    }

    // Check if connection already exists
    const exists = connections.some(c => c.fromBlockId === fromId && c.toBlockId === toId);
    if (exists) return;

    const newConnection: Connection = {
      id: `conn-${Date.now()}`,
      fromBlockId: fromId,
      fromPort: 'output',
      toBlockId: toId,
      toPort: 'input',
    };

    setConnections(prev => [...prev, newConnection]);

    // Update block connection references
    setBlocks(prev => prev.map(b => {
      if (b.id === fromId) {
        return { ...b, connections: { ...b.connections, outputs: [...b.connections.outputs, toId] } };
      }
      if (b.id === toId) {
        return { ...b, connections: { ...b.connections, inputs: [...b.connections.inputs, fromId] } };
      }
      return b;
    }));
  }, [blocks, connections, setBlocks, setConnections]);

  // Load template
  const handleLoadTemplate = useCallback((template: StrategyTemplate) => {
    // Regenerate IDs to avoid conflicts
    const idMap = new Map<string, string>();
    
    const newBlocks = template.blocks.map(block => {
      const newId = generateId();
      idMap.set(block.id, newId);
      return {
        ...block,
        id: newId,
        connections: { inputs: [], outputs: [] }, // Will be rebuilt
      };
    });

    // Rebuild connections with new IDs
    const newConnections: Connection[] = [];
    template.blocks.forEach(block => {
      block.connections.outputs.forEach(targetId => {
        const fromId = idMap.get(block.id);
        const toId = idMap.get(targetId);
        if (fromId && toId) {
          newConnections.push({
            id: `conn-${Date.now()}-${Math.random()}`,
            fromBlockId: fromId,
            fromPort: 'output',
            toBlockId: toId,
            toPort: 'input',
          });
          
          // Update block references
          const fromBlock = newBlocks.find(b => b.id === fromId);
          const toBlock = newBlocks.find(b => b.id === toId);
          if (fromBlock) fromBlock.connections.outputs.push(toId);
          if (toBlock) toBlock.connections.inputs.push(fromId);
        }
      });
    });

    setBlocks(newBlocks);
    setConnections(newConnections);
    setStrategyName(template.name);
    setShowOnboarding(false);
  }, [setBlocks, setConnections]);

  // Clear all
  const handleClear = useCallback(() => {
    setBlocks([]);
    setConnections([]);
    setSelectedBlockId(null);
  }, [setBlocks, setConnections]);

  // Use mobile builder for mobile devices
  if (isMobile && !embedded) {
    return (
      <MobileBuilder
        onRunBacktest={onRunBacktest}
        initialTicker={initialTicker}
      />
    );
  }

  // Wrapped backtest handler that captures results for stage flow
  const handleEmbeddedBacktest = useCallback(async (params: BacktestParams) => {
    // Call the parent's onRunBacktest if provided
    if (onRunBacktest) {
      try {
        // The parent handler should return metrics (or undefined if auth blocked)
        const result = onRunBacktest(params);
        
        // If result is undefined synchronously, auth gate likely blocked it
        if (result === undefined) {
          return;
        }

        setLastBacktestParams(params);
        setIsRunningBacktest(true);
        setLastBacktestMetrics(null);

        const metrics = await result;
        
        if (metrics) {
          setLastBacktestMetrics(metrics);
        }
        
        // Only transition to results if we got actual data back
        if (metrics && (metrics.totalTrades ?? 0) > 0) {
          setStage('results');
        } else if (metrics) {
          // Got metrics but 0 trades — still show results
          setStage('results');
        }
      } catch (error) {
        console.error('Backtest error:', error);
      } finally {
        setIsRunningBacktest(false);
      }
    }
  }, [onRunBacktest]);

  // Handle going back to build stage
  const handleBackToBuilder = useCallback(() => {
    setStage('build');
  }, []);

  // Handle re-run
  const handleRerun = useCallback(() => {
    if (lastBacktestParams) {
      handleEmbeddedBacktest(lastBacktestParams);
    }
  }, [lastBacktestParams, handleEmbeddedBacktest]);

  // Embedded compact layout (for side panel in Backtester)
  // Uses SentenceBuilder directly - no canvas needed
  if (embedded) {
    // Results stage - show results with back button
    if (stage === 'results' && lastBacktestParams) {
      return (
        <BacktestResultsView
          params={lastBacktestParams}
          metrics={lastBacktestMetrics || {}}
          isLoading={isRunningBacktest}
          onBack={handleBackToBuilder}
          onRerun={handleRerun}
        />
      );
    }
    
    // Build stage - show the strategy builder
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col">
          {/* SentenceBuilder is the primary interface in embedded mode */}
          <BlockPalette 
            className="border-b border-border/30" 
            compact 
            onAddBlock={handleAddBlock}
            onRunBacktest={handleEmbeddedBacktest}
            onClear={onClear}
            onPromptUpgrade={onPromptUpgrade}
            ticker={ticker}
            sentenceState={sentenceState}
            onSentenceStateChange={setSentenceState}
            advancedParams={advancedParams}
            onAdvancedParamsChange={onAdvancedParamsChange}
          />
          
          {/* Compact Summary - ticker + template only */}
          <StrategySummary
            blocks={blocks}
            connections={connections}
            strategyName={strategyName}
            ticker={ticker}
            onNameChange={setStrategyName}
            onTickerChange={setTicker}
            onLoadTemplate={handleLoadTemplate}
            onRunBacktest={handleEmbeddedBacktest}
            className="border-t border-border/30"
            compact
            showTickerAndTemplate={false}
          />
        </div>
      </DragDropContext>
    );
  }

  // Full-page layout
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Strategy Builder</h1>
            <span className="text-sm text-muted-foreground">
              {blocks.length} blocks
            </span>
            {historyLength > 0 && (
              <span className="text-xs text-muted-foreground/60">
                ({historyLength} in history)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md bg-muted/30">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={undo}
                disabled={!canUndo}
                className="h-8 px-2 rounded-r-none"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={redo}
                disabled={!canRedo}
                className="h-8 px-2 rounded-l-none border-l"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHelp(true)}
              className="gap-1"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* Main 3-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Block Palette */}
          <BlockPalette className="w-64 shrink-0" onAddBlock={handleAddBlock} />

          {/* Center: Strategy Canvas OR Onboarding */}
          <div className="flex-1 flex flex-col relative">
            {/* Onboarding overlay */}
            {blocks.length === 0 && (showOnboarding || showHelp) && (
              <div className="absolute inset-0 z-10 p-6 bg-background/95 backdrop-blur-sm overflow-auto">
                <BuilderOnboarding
                  templates={STRATEGY_TEMPLATES}
                  onLoadTemplate={handleLoadTemplate}
                  onDismiss={() => {
                    setShowOnboarding(false);
                    setShowHelp(false);
                  }}
                />
              </div>
            )}
            
            <StrategyCanvas
              blocks={blocks}
              connections={connections}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onDeleteBlock={handleDeleteBlock}
              onDeleteConnection={handleDeleteConnection}
              onUpdateBlockPosition={handleUpdateBlockPosition}
              onUpdateBlockParameter={handleUpdateBlockParameter}
              onConnect={handleConnect}
              onLoadTemplate={handleLoadTemplate}
            />
          </div>

          {/* Right: Strategy Summary */}
          <StrategySummary
            blocks={blocks}
            connections={connections}
            strategyName={strategyName}
            ticker={ticker}
            onNameChange={setStrategyName}
            onTickerChange={setTicker}
            onLoadTemplate={handleLoadTemplate}
            onRunBacktest={onRunBacktest}
            className="w-72 shrink-0"
          />
        </div>
      </div>
    </DragDropContext>
  );
}
