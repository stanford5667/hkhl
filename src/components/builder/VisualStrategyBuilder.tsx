/**
 * Visual Strategy Builder
 * 
 * Main 3-panel layout component for drag-and-drop strategy creation.
 * When embedded=true, uses compact layout suitable for side panel.
 */

import { useState, useCallback } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CanvasBlock, Connection, BlockSubtype } from '@/lib/strategyBuilder/types';
import { canConnect } from '@/lib/strategyBuilder/types';
import { ALL_PALETTE_BLOCKS, type StrategyTemplate } from '@/lib/strategyBuilder/templates';
import { BlockPalette } from './BlockPalette';
import { StrategyCanvas } from './StrategyCanvas';
import { StrategySummary, type SerializedStrategy } from './StrategySummary';

interface VisualStrategyBuilderProps {
  embedded?: boolean;
  /** Callback for inline backtest execution (instead of navigating to /backtester) */
  onRunBacktest?: (serialized: SerializedStrategy) => void;
  /** Initial ticker for embedded mode */
  initialTicker?: string;
}

export function VisualStrategyBuilder({ 
  embedded = false, 
  onRunBacktest,
  initialTicker = 'AAPL',
}: VisualStrategyBuilderProps) {
  // State
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [strategyName, setStrategyName] = useState('My Visual Strategy');
  const [ticker, setTicker] = useState(initialTicker);

  // Generate unique ID
  const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Handle drag end from palette to canvas
  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside
    if (!destination) return;

    // Only handle drops onto canvas
    if (destination.droppableId !== 'canvas') return;

    // Extract subtype from draggableId (palette-{SUBTYPE})
    const subtype = draggableId.replace('palette-', '') as BlockSubtype;
    const paletteBlock = ALL_PALETTE_BLOCKS.find(b => b.subtype === subtype);

    if (!paletteBlock) return;

    // Create new canvas block
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
  }, [blocks.length]);

  // Update block position
  const handleUpdateBlockPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setBlocks(prev => prev.map(b => 
      b.id === id ? { ...b, position } : b
    ));
  }, []);

  // Update block parameter
  const handleUpdateBlockParameter = useCallback((blockId: string, key: string, value: number | string) => {
    setBlocks(prev => prev.map(b => 
      b.id === blockId ? { ...b, parameters: { ...b.parameters, [key]: value } } : b
    ));
  }, []);

  // Delete block
  const handleDeleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    // Also remove connections
    setConnections(prev => prev.filter(c => c.fromBlockId !== id && c.toBlockId !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId]);

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
  }, [blocks, connections]);

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
  }, []);

  // Clear all
  const handleClear = useCallback(() => {
    setBlocks([]);
    setConnections([]);
    setSelectedBlockId(null);
  }, []);

  // Embedded compact layout (for side panel in Backtester)
  if (embedded) {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col h-full">
          {/* Compact toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[rgb(33,38,45)] bg-[rgb(13,17,23)]">
            <span className="text-xs font-medium text-[rgb(139,148,158)]">
              Strategy Builder
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[rgb(87,96,106)]">
                {blocks.length} blocks
              </span>
              {blocks.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 px-2 text-[10px]">
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Stacked layout for embedded mode - avoid overflow:hidden to prevent nested scroll issues */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Palette (compact) */}
            <BlockPalette className="border-b border-[rgb(33,38,45)] shrink-0" compact />
            
            {/* Canvas */}
            <StrategyCanvas
              blocks={blocks}
              connections={connections}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onDeleteBlock={handleDeleteBlock}
              onUpdateBlockPosition={handleUpdateBlockPosition}
              onUpdateBlockParameter={handleUpdateBlockParameter}
              onConnect={handleConnect}
              className="flex-1 min-h-[200px]"
            />
            
            {/* Summary */}
            <StrategySummary
              blocks={blocks}
              strategyName={strategyName}
              ticker={ticker}
              onNameChange={setStrategyName}
              onTickerChange={setTicker}
              onLoadTemplate={handleLoadTemplate}
              onRunBacktest={onRunBacktest}
              className="border-t border-[rgb(33,38,45)] shrink-0"
              compact
            />
          </div>
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
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* Main 3-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Block Palette */}
          <BlockPalette className="w-64 shrink-0" />

          {/* Center: Strategy Canvas */}
          <StrategyCanvas
            blocks={blocks}
            connections={connections}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onDeleteBlock={handleDeleteBlock}
            onUpdateBlockPosition={handleUpdateBlockPosition}
            onUpdateBlockParameter={handleUpdateBlockParameter}
            onConnect={handleConnect}
            className="flex-1"
          />

          {/* Right: Strategy Summary */}
          <StrategySummary
            blocks={blocks}
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
