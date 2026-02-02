/**
 * Mobile Builder Component
 * 
 * Tabbed interface for the Visual Strategy Builder on mobile devices.
 * Provides touch-optimized controls for < 768px screens.
 */

import { memo, useState, useCallback } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FlaskConical, 
  Undo2, 
  Redo2, 
  Trash2,
  LayoutGrid,
  Layers,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CanvasBlock, Connection, BlockSubtype } from '@/lib/strategyBuilder/types';
import { canConnect } from '@/lib/strategyBuilder/types';
import { ALL_PALETTE_BLOCKS, STRATEGY_TEMPLATES, type StrategyTemplate } from '@/lib/strategyBuilder/templates';
import { BlockPalette } from './BlockPalette';
import { StrategyCanvas } from './StrategyCanvas';
import { StrategySummary, type SerializedStrategy } from './StrategySummary';
import { useBuilderHistory } from '@/hooks/useBuilderHistory';

interface MobileBuilderProps {
  onRunBacktest?: (serialized: SerializedStrategy) => void;
  initialTicker?: string;
}

export const MobileBuilder = memo(function MobileBuilder({
  onRunBacktest,
  initialTicker = 'AAPL',
}: MobileBuilderProps) {
  const [activeTab, setActiveTab] = useState('canvas');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [strategyName, setStrategyName] = useState('My Visual Strategy');
  const [ticker, setTicker] = useState(initialTicker);

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
  } = useBuilderHistory();

  // Generate unique ID
  const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Handle drag end
  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination || destination.droppableId !== 'canvas') return;

    const subtype = draggableId.replace('palette-', '') as BlockSubtype;
    const paletteBlock = ALL_PALETTE_BLOCKS.find(b => b.subtype === subtype);
    if (!paletteBlock) return;

    const newBlock: CanvasBlock = {
      id: generateId(),
      type: paletteBlock.type,
      subtype: paletteBlock.subtype,
      position: {
        x: 60 + (blocks.length % 2) * 160,
        y: 60 + Math.floor(blocks.length / 2) * 100,
      },
      parameters: { ...paletteBlock.defaultParameters },
      connections: { inputs: [], outputs: [] },
    };

    setBlocks(prev => [...prev, newBlock]);
    setActiveTab('canvas'); // Switch to canvas after dropping
  }, [blocks.length, setBlocks]);

  // Handle adding a block by subtype (from SentenceBuilder)
  const handleAddBlockBySubtype = useCallback((subtype: BlockSubtype) => {
    const paletteBlock = ALL_PALETTE_BLOCKS.find(b => b.subtype === subtype);
    if (!paletteBlock) return;

    const newBlock: CanvasBlock = {
      id: generateId(),
      type: paletteBlock.type,
      subtype: paletteBlock.subtype,
      position: {
        x: 60 + (blocks.length % 2) * 160,
        y: 60 + Math.floor(blocks.length / 2) * 100,
      },
      parameters: { ...paletteBlock.defaultParameters },
      connections: { inputs: [], outputs: [] },
    };

    setBlocks(prev => [...prev, newBlock]);
  }, [blocks.length, setBlocks]);

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
    setConnections(prev => prev.filter(c => c.fromBlockId !== id && c.toBlockId !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [selectedBlockId, setBlocks, setConnections]);

  // Connect blocks
  const handleConnect = useCallback((fromId: string, toId: string) => {
    const fromBlock = blocks.find(b => b.id === fromId);
    const toBlock = blocks.find(b => b.id === toId);

    if (!fromBlock || !toBlock || !canConnect(fromBlock, toBlock)) return;
    
    const exists = connections.some(c => c.fromBlockId === fromId && c.toBlockId === toId);
    if (exists) return;

    setConnections(prev => [...prev, {
      id: `conn-${Date.now()}`,
      fromBlockId: fromId,
      fromPort: 'output',
      toBlockId: toId,
      toPort: 'input',
    }]);

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
    const idMap = new Map<string, string>();
    
    const newBlocks = template.blocks.map(block => {
      const newId = generateId();
      idMap.set(block.id, newId);
      return { ...block, id: newId, connections: { inputs: [], outputs: [] } };
    });

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
    setActiveTab('canvas');
  }, [setBlocks, setConnections]);

  // Clear all
  const handleClear = useCallback(() => {
    setBlocks([]);
    setConnections([]);
    setSelectedBlockId(null);
  }, [setBlocks, setConnections]);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full bg-background">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">Builder</h1>
            <Badge variant="outline" className="text-[10px]">
              {blocks.length} blocks
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClear}
              disabled={blocks.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="canvas" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
              <StrategyCanvas
                blocks={blocks}
                connections={connections}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onDeleteBlock={handleDeleteBlock}
                onUpdateBlockPosition={handleUpdateBlockPosition}
                onUpdateBlockParameter={handleUpdateBlockParameter}
                onConnect={handleConnect}
                onLoadTemplate={handleLoadTemplate}
                className="flex-1"
                compact
              />
            </TabsContent>

            <TabsContent value="blocks" className="h-full m-0 overflow-auto">
              <BlockPalette 
                className="h-full border-r-0" 
                compact 
                onAddBlock={handleAddBlockBySubtype}
                onSwitchToCanvas={() => setActiveTab('canvas')}
              />
            </TabsContent>

            <TabsContent value="summary" className="h-full m-0 overflow-auto">
              <StrategySummary
                blocks={blocks}
                strategyName={strategyName}
                ticker={ticker}
                onNameChange={setStrategyName}
                onTickerChange={setTicker}
                onLoadTemplate={handleLoadTemplate}
                onRunBacktest={onRunBacktest}
                className="h-full border-l-0"
              />
            </TabsContent>
          </div>

          {/* Bottom Tab Bar - Renamed for clarity: Build, Add, Run */}
          <TabsList className="grid grid-cols-3 h-14 rounded-none border-t bg-card">
            <TabsTrigger value="canvas" className="flex flex-col gap-0.5 h-full data-[state=active]:bg-primary/10">
              <LayoutGrid className="h-4 w-4" />
              <span className="text-[10px] font-medium">Build</span>
            </TabsTrigger>
            <TabsTrigger value="blocks" className="flex flex-col gap-0.5 h-full data-[state=active]:bg-primary/10">
              <Layers className="h-4 w-4" />
              <span className="text-[10px] font-medium">Add</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex flex-col gap-0.5 h-full data-[state=active]:bg-primary/10">
              <FileText className="h-4 w-4" />
              <span className="text-[10px] font-medium">Run</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Floating Test Button */}
        {blocks.length > 0 && activeTab === 'canvas' && (
          <Button
            size="lg"
            className={cn(
              "fixed bottom-20 right-4 h-12 px-5 rounded-full shadow-xl",
              "bg-primary hover:bg-primary/90"
            )}
            onClick={() => setActiveTab('summary')}
          >
            <FlaskConical className="h-5 w-5 mr-2" />
            Test Strategy
          </Button>
        )}
      </div>
    </DragDropContext>
  );
});
