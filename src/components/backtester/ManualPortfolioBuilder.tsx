// Manual Portfolio Builder - Matching MobileBacktester visual format
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Plus, 
  X, 
  Scale,
  Search,
  Layers,
} from 'lucide-react';
import { PortfolioAllocation, AssetClass, ASSET_CLASS_ETFS } from '@/types/portfolio';
import { cn } from '@/lib/utils';

interface ManualPortfolioBuilderProps {
  allocations: PortfolioAllocation[];
  onAllocationsChange: (allocations: PortfolioAllocation[]) => void;
  assetUniverse: AssetClass[];
  blackLittermanAnalysis?: {
    impliedRisk: Map<string, number>;
    riskContribution: Map<string, number>;
    totalRisk: number;
    expectedReturn: number;
  };
}

const POPULAR_ETFS = [
  { symbol: 'VTI', name: 'Total Stock Market' },
  { symbol: 'VOO', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'NASDAQ 100' },
  { symbol: 'VGT', name: 'Technology' },
  { symbol: 'VXUS', name: 'International' },
  { symbol: 'VWO', name: 'Emerging Mkts' },
  { symbol: 'BND', name: 'Total Bond' },
  { symbol: 'TLT', name: 'Long Treasury' },
  { symbol: 'GLD', name: 'Gold' },
  { symbol: 'VNQ', name: 'Real Estate' },
  { symbol: 'SCHD', name: 'Dividend' },
  { symbol: 'IEF', name: 'Med Treasury' },
];

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
];

export function ManualPortfolioBuilder({ 
  allocations, 
  onAllocationsChange,
  assetUniverse,
  blackLittermanAnalysis
}: ManualPortfolioBuilderProps) {
  const [newSymbol, setNewSymbol] = useState('');

  const totalWeight = useMemo(() => 
    allocations.reduce((sum, a) => sum + a.weight, 0), 
    [allocations]
  );
  
  const isValid = Math.abs(totalWeight - 100) < 0.1;

  // Get a color for an asset based on its index
  const getColorForIndex = (index: number) => COLORS[index % COLORS.length];

  const addAllocation = (symbol?: string) => {
    const sym = (symbol || newSymbol).toUpperCase().trim();
    if (!sym || allocations.find(a => a.symbol === sym)) return;
    
    // Determine asset class
    let assetClass: AssetClass = 'stocks';
    for (const [cls, etfs] of Object.entries(ASSET_CLASS_ETFS)) {
      if (etfs.includes(sym)) {
        assetClass = cls as AssetClass;
        break;
      }
    }
    
    // Get name from POPULAR_ETFS if available
    const etfInfo = POPULAR_ETFS.find(e => e.symbol === sym);
    
    onAllocationsChange([
      ...allocations,
      { symbol: sym, weight: 0, assetClass, name: etfInfo?.name }
    ]);
    setNewSymbol('');
  };

  const removeAllocation = (symbol: string) => {
    onAllocationsChange(allocations.filter(a => a.symbol !== symbol));
  };

  const updateWeight = (symbol: string, weight: number) => {
    onAllocationsChange(
      allocations.map(a => a.symbol === symbol ? { ...a, weight } : a)
    );
  };

  const equalizeWeights = () => {
    if (allocations.length === 0) return;
    const equalWeight = 100 / allocations.length;
    onAllocationsChange(
      allocations.map(a => ({ ...a, weight: Math.round(equalWeight * 10) / 10 }))
    );
  };

  // Filter quick add tickers to those not already added
  const availableQuickAdd = POPULAR_ETFS.filter(
    e => !allocations.find(a => a.symbol === e.symbol)
  ).slice(0, 10);

  return (
    <div className="space-y-3">
      {/* Add ticker search - prominently at top */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && addAllocation()}
                placeholder="Enter ticker symbol..."
                className="pl-9 h-11 text-base"
              />
            </div>
            <Button onClick={() => addAllocation()} disabled={!newSymbol} className="h-11 px-4">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick add pills */}
      {availableQuickAdd.length > 0 && (
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-2">
            {availableQuickAdd.map((etf) => (
              <button
                key={etf.symbol}
                onClick={() => addAllocation(etf.symbol)}
                className="flex-shrink-0 px-2.5 py-1.5 text-xs rounded-full border bg-card hover:bg-muted/50 transition-colors"
              >
                <span className="font-mono font-medium">{etf.symbol}</span>
                <span className="text-muted-foreground ml-1">{etf.name}</span>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-muted-foreground">
          Your Portfolio ({allocations.length} assets)
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant={isValid ? 'secondary' : 'destructive'} className="font-mono text-xs">
            {totalWeight.toFixed(0)}%
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 gap-1.5 text-xs"
            onClick={equalizeWeights}
            disabled={allocations.length === 0}
          >
            <Scale className="h-3 w-3" />
            Equal Weight
          </Button>
        </div>
      </div>

      {/* Asset cards */}
      <div className="space-y-2">
        {allocations.length === 0 ? (
          <Card className="p-8 text-center">
            <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              No assets yet. Add tickers above or choose a template.
            </p>
          </Card>
        ) : (
          allocations.map((allocation, index) => (
            <div 
              key={allocation.symbol}
              className="flex items-center gap-3 p-3 rounded-xl border bg-card"
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: getColorForIndex(index) }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{allocation.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {allocation.name || allocation.assetClass}
                  </span>
                </div>
                <Slider
                  value={[allocation.weight]}
                  onValueChange={([v]) => updateWeight(allocation.symbol, v)}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm w-10 text-right">
                  {allocation.weight.toFixed(0)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAllocation(allocation.symbol)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Validation message */}
      {allocations.length > 0 && !isValid && (
        <div className="text-xs text-destructive text-center">
          Allocations must sum to 100% (currently {totalWeight.toFixed(1)}%)
        </div>
      )}
    </div>
  );
}
