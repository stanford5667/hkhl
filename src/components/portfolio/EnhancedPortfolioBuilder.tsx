// Enhanced Portfolio Builder - All-in-one component with multiple import options
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Upload, 
  Link2, 
  FolderOpen, 
  TrendingUp,
  Wallet,
  FileSpreadsheet,
  Bookmark
} from 'lucide-react';
import { ManualPositionForm } from './ManualPositionForm';
import { CSVImportPanel } from './CSVImportPanel';
import { BrokerageConnectionPanel } from './BrokerageConnectionPanel';
import type { PortfolioAllocation } from '@/types/portfolio';
import type { PositionFormData } from '@/types/positions';
import type { UnifiedPosition } from '@/services/unifiedPortfolioService';

interface SavedPortfolioOption {
  id: string;
  name: string;
  allocations: PortfolioAllocation[];
  description?: string;
}

interface EnhancedPortfolioBuilderProps {
  // Mode determines primary data model
  mode: 'allocations' | 'positions';
  
  // For allocations mode (visualizer)
  allocations?: PortfolioAllocation[];
  onAllocationsChange?: (allocations: PortfolioAllocation[]) => void;
  
  // For positions mode (portfolio page)
  positions?: UnifiedPosition[];
  onPositionAdd?: (data: PositionFormData) => Promise<UnifiedPosition>;
  onPositionsImport?: (positions: PositionFormData[]) => Promise<UnifiedPosition[]>;
  onBrokerageSync?: () => void;
  
  // Common
  totalValue?: number;
  savedPortfolios?: SavedPortfolioOption[];
  onLoadSavedPortfolio?: (portfolio: SavedPortfolioOption) => void;
  
  // Compact mode for sidebars
  compact?: boolean;
}

export function EnhancedPortfolioBuilder({
  mode,
  allocations = [],
  onAllocationsChange,
  positions = [],
  onPositionAdd,
  onPositionsImport,
  onBrokerageSync,
  totalValue = 0,
  savedPortfolios = [],
  onLoadSavedPortfolio,
  compact = false,
}: EnhancedPortfolioBuilderProps) {
  const [activeTab, setActiveTab] = useState('manual');
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  
  // Handle manual position add
  const handleManualAdd = async (data: PositionFormData) => {
    if (mode === 'positions' && onPositionAdd) {
      setIsAddingPosition(true);
      try {
        await onPositionAdd(data);
      } finally {
        setIsAddingPosition(false);
      }
    } else if (mode === 'allocations' && onAllocationsChange) {
      // For allocations mode, convert to allocation
      const newAllocation: PortfolioAllocation = {
        symbol: data.symbol.toUpperCase(),
        weight: 10, // Default weight
        assetClass: (data.asset_type as PortfolioAllocation['assetClass']) || 'stocks',
        name: data.name,
      };
      onAllocationsChange([...allocations, newAllocation]);
    }
  };
  
  // Handle CSV import
  const handleCSVImport = async (importedPositions: PositionFormData[]) => {
    if (mode === 'positions' && onPositionsImport) {
      await onPositionsImport(importedPositions);
    } else if (mode === 'allocations' && onAllocationsChange) {
      // Convert imported positions to allocations
      const newAllocations: PortfolioAllocation[] = importedPositions.map(p => ({
        symbol: p.symbol.toUpperCase(),
        weight: 100 / importedPositions.length, // Equal weight
        assetClass: (p.asset_type as PortfolioAllocation['assetClass']) || 'stocks',
        name: p.name,
      }));
      onAllocationsChange([...allocations, ...newAllocations]);
    }
  };
  
  // Handle loading saved portfolio
  const handleLoadSaved = (portfolio: SavedPortfolioOption) => {
    if (onLoadSavedPortfolio) {
      onLoadSavedPortfolio(portfolio);
    } else if (mode === 'allocations' && onAllocationsChange) {
      onAllocationsChange(portfolio.allocations);
    }
  };
  
  // Current holdings summary
  const holdingsCount = mode === 'positions' ? positions.length : allocations.length;
  const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);
  
  if (compact) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Add Holdings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="manual" className="text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Manual
              </TabsTrigger>
              <TabsTrigger value="csv" className="text-xs">
                <Upload className="h-3 w-3 mr-1" />
                CSV
              </TabsTrigger>
              <TabsTrigger value="saved" className="text-xs">
                <FolderOpen className="h-3 w-3 mr-1" />
                Saved
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="mt-3">
              <ManualPositionForm 
                onSubmit={handleManualAdd}
                isSubmitting={isAddingPosition}
              />
            </TabsContent>
            
            <TabsContent value="csv" className="mt-3">
              <CSVImportPanel 
                onImport={handleCSVImport}
              />
            </TabsContent>
            
            <TabsContent value="saved" className="mt-3">
              <SavedPortfoliosList 
                portfolios={savedPortfolios}
                onSelect={handleLoadSaved}
                compact
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Portfolio Builder
            </CardTitle>
            <CardDescription>
              Add positions manually, import from CSV, connect a brokerage, or load a saved portfolio
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {holdingsCount} holdings
            </Badge>
            {mode === 'allocations' && (
              <Badge 
                variant={Math.abs(totalWeight - 100) < 0.1 ? 'default' : 'destructive'}
                className="font-mono"
              >
                {totalWeight.toFixed(1)}%
              </Badge>
            )}
            {totalValue > 0 && (
              <Badge variant="secondary" className="font-mono">
                ${totalValue.toLocaleString()}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="brokerage" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Brokerage
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              CSV Import
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Saved
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium mb-3">Add Position</h4>
                <ManualPositionForm 
                  onSubmit={handleManualAdd}
                  isSubmitting={isAddingPosition}
                />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3">Current Holdings</h4>
                <CurrentHoldingsList 
                  mode={mode}
                  positions={positions}
                  allocations={allocations}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="brokerage" className="mt-4">
            <BrokerageConnectionPanel 
              onSyncComplete={onBrokerageSync}
            />
          </TabsContent>
          
          <TabsContent value="csv" className="mt-4">
            <CSVImportPanel 
              onImport={handleCSVImport}
            />
          </TabsContent>
          
          <TabsContent value="saved" className="mt-4">
            <SavedPortfoliosList 
              portfolios={savedPortfolios}
              onSelect={handleLoadSaved}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Sub-component: Current holdings list
function CurrentHoldingsList({ 
  mode, 
  positions, 
  allocations 
}: { 
  mode: 'allocations' | 'positions';
  positions: UnifiedPosition[];
  allocations: PortfolioAllocation[];
}) {
  const items = mode === 'positions' 
    ? positions.map(p => ({ symbol: p.symbol, weight: p.weight, value: p.currentValue }))
    : allocations.map(a => ({ symbol: a.symbol, weight: a.weight, value: null }));
  
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No holdings yet</p>
        <p className="text-xs">Add your first position to get started</p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-2">
        {items.map((item, i) => (
          <div 
            key={`${item.symbol}-${i}`}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
          >
            <span className="font-mono font-medium">{item.symbol}</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {item.weight !== null && (
                <Badge variant="outline" className="font-mono">
                  {item.weight.toFixed(1)}%
                </Badge>
              )}
              {item.value !== null && (
                <span className="font-mono">
                  ${item.value.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Sub-component: Saved portfolios list
function SavedPortfoliosList({ 
  portfolios, 
  onSelect,
  compact = false,
}: { 
  portfolios: SavedPortfolioOption[];
  onSelect: (portfolio: SavedPortfolioOption) => void;
  compact?: boolean;
}) {
  if (portfolios.length === 0) {
    return (
      <div className={`text-center ${compact ? 'py-4' : 'py-8'} text-muted-foreground`}>
        <FolderOpen className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} mx-auto mb-2 opacity-50`} />
        <p className="text-sm">No saved portfolios</p>
        <p className="text-xs">Save your current portfolio to access it later</p>
      </div>
    );
  }
  
  return (
    <ScrollArea className={compact ? 'h-[200px]' : 'h-[300px]'}>
      <div className="space-y-2">
        {portfolios.map(portfolio => (
          <div 
            key={portfolio.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{portfolio.name}</p>
              {portfolio.description && !compact && (
                <p className="text-xs text-muted-foreground truncate">
                  {portfolio.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {portfolio.allocations.length} assets
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onSelect(portfolio)}
            >
              Load
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
