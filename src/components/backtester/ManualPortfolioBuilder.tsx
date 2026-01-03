// Manual Portfolio Builder with Black-Litterman Analysis
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2,
  Scale,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import { PortfolioAllocation, AssetClass, ASSET_CLASS_ETFS } from '@/types/portfolio';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  
  const isValidAllocation = Math.abs(totalWeight - 100) < 0.1;

  const addAllocation = () => {
    const symbol = newSymbol.toUpperCase().trim();
    if (!symbol || allocations.find(a => a.symbol === symbol)) return;
    
    // Determine asset class
    let assetClass: AssetClass = 'stocks';
    for (const [cls, etfs] of Object.entries(ASSET_CLASS_ETFS)) {
      if (etfs.includes(symbol)) {
        assetClass = cls as AssetClass;
        break;
      }
    }
    
    onAllocationsChange([
      ...allocations,
      { symbol, weight: 0, assetClass }
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
    const equalWeight = 100 / allocations.length;
    onAllocationsChange(
      allocations.map(a => ({ ...a, weight: Math.round(equalWeight * 10) / 10 }))
    );
  };

  // Quick add popular tickers
  const quickAddTickers = useMemo(() => {
    const suggestions: string[] = [];
    for (const cls of assetUniverse) {
      const etfs = ASSET_CLASS_ETFS[cls] || [];
      suggestions.push(...etfs.slice(0, 2));
    }
    return suggestions.filter(t => !allocations.find(a => a.symbol === t)).slice(0, 6);
  }, [assetUniverse, allocations]);

  return (
    <div className="space-y-6">
      {/* Add Ticker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add Assets</CardTitle>
          <CardDescription>
            Enter ticker symbols and assign weights. Your views will be analyzed using Black-Litterman.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && addAllocation()}
              placeholder="Enter ticker (e.g., AAPL)"
              className="flex-1"
              maxLength={10}
            />
            <Button onClick={addAllocation} disabled={!newSymbol.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
          
          {/* Quick Add */}
          {quickAddTickers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Quick add:</span>
              {quickAddTickers.map(ticker => (
                <button
                  key={ticker}
                  onClick={() => {
                    setNewSymbol(ticker);
                    setTimeout(() => addAllocation(), 0);
                  }}
                  className="px-2 py-1 text-xs rounded border border-border hover:bg-muted transition-colors"
                >
                  {ticker}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocation Summary */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Portfolio Allocations</CardTitle>
            <CardDescription>
              Assign target weights (must sum to 100%)
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={equalizeWeights} disabled={allocations.length === 0}>
              <Scale className="h-4 w-4 mr-2" />
              Equal Weight
            </Button>
            <Badge variant={isValidAllocation ? 'default' : 'destructive'}>
              {totalWeight.toFixed(1)}% / 100%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No assets added yet. Add tickers above to build your portfolio.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allocations.map((allocation) => {
                const riskContrib = blackLittermanAnalysis?.riskContribution.get(allocation.symbol) || 0;
                const isOverweight = riskContrib > allocation.weight * 1.5;
                const isUnderweight = riskContrib < allocation.weight * 0.5 && riskContrib > 0;
                
                return (
                  <div key={allocation.symbol} className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {allocation.symbol}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {allocation.assetClass}
                        </Badge>
                        {blackLittermanAnalysis && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {isOverweight && (
                                  <Badge variant="destructive" className="text-xs gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    High Risk
                                  </Badge>
                                )}
                                {isUnderweight && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Info className="h-3 w-3" />
                                    Low Risk
                                  </Badge>
                                )}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Risk contribution: {riskContrib.toFixed(1)}%</p>
                                <p>Weight: {allocation.weight.toFixed(1)}%</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{allocation.weight.toFixed(1)}%</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeAllocation(allocation.symbol)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Slider
                      value={[allocation.weight]}
                      onValueChange={([value]) => updateWeight(allocation.symbol, value)}
                      max={100}
                      step={0.5}
                      className="w-full"
                    />
                    
                    {/* Risk contribution bar */}
                    {blackLittermanAnalysis && riskContrib > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Risk Contribution</span>
                          <span className={cn(
                            isOverweight ? 'text-rose-500' : isUnderweight ? 'text-muted-foreground' : 'text-emerald-500'
                          )}>
                            {riskContrib.toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(riskContrib, 100)} 
                          className={cn(
                            "h-1.5",
                            isOverweight && "[&>div]:bg-rose-500",
                            isUnderweight && "[&>div]:bg-muted-foreground"
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Allocation warning */}
          {!isValidAllocation && allocations.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Allocations must sum to 100%
                </p>
                <p className="text-xs text-destructive/80">
                  Current total: {totalWeight.toFixed(1)}%. 
                  {totalWeight < 100 ? ` Add ${(100 - totalWeight).toFixed(1)}%` : ` Remove ${(totalWeight - 100).toFixed(1)}%`}
                </p>
              </div>
            </div>
          )}
          
          {isValidAllocation && allocations.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-500">
                  Portfolio ready for analysis
                </p>
                <p className="text-xs text-emerald-500/80">
                  Click "Analyze Portfolio" to run Black-Litterman optimization
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Black-Litterman Summary */}
      {blackLittermanAnalysis && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-500" />
              Black-Litterman Analysis
            </CardTitle>
            <CardDescription>
              Your manual weights treated as investor views with 100% confidence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Portfolio Risk</p>
                <p className="text-2xl font-bold">
                  {(blackLittermanAnalysis.totalRisk * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Annualized volatility</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Expected Return</p>
                <p className={cn(
                  "text-2xl font-bold",
                  blackLittermanAnalysis.expectedReturn >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {blackLittermanAnalysis.expectedReturn >= 0 ? '+' : ''}
                  {(blackLittermanAnalysis.expectedReturn * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Implied from views</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
