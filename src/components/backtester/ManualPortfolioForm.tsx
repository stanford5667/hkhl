// Manual Portfolio Form - Direct input for experienced investors
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  ArrowRight,
  DollarSign,
  Clock,
  Plus,
  Trash2,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { PortfolioAllocation, AssetClass, ASSET_CLASS_ETFS } from '@/types/portfolio';
import { POLYGON_CONFIG } from '@/config/apiConfig';

interface ManualPortfolioFormProps {
  onComplete: (data: {
    capital: number;
    horizon: number;
    allocations: PortfolioAllocation[];
  }) => void;
  onBack: () => void;
}

export function ManualPortfolioForm({ onComplete, onBack }: ManualPortfolioFormProps) {
  const [capital, setCapital] = useState(100000);
  const [horizon, setHorizon] = useState(5);
  const [allocations, setAllocations] = useState<PortfolioAllocation[]>([]);
  const [newSymbol, setNewSymbol] = useState('');

  const totalWeight = useMemo(() => 
    allocations.reduce((sum, a) => sum + a.weight, 0), 
    [allocations]
  );
  
  const isValidAllocation = Math.abs(totalWeight - 100) < 0.1;
  const canProceed = capital > 0 && horizon > 0 && allocations.length > 0 && isValidAllocation;

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
    
    setAllocations([
      ...allocations,
      { symbol, weight: 0, assetClass }
    ]);
    setNewSymbol('');
  };

  const removeAllocation = (symbol: string) => {
    setAllocations(allocations.filter(a => a.symbol !== symbol));
  };

  const updateWeight = (symbol: string, weight: number) => {
    setAllocations(
      allocations.map(a => a.symbol === symbol ? { ...a, weight } : a)
    );
  };

  const equalizeWeights = () => {
    if (allocations.length === 0) return;
    const equalWeight = Math.round((100 / allocations.length) * 10) / 10;
    const updated = allocations.map((a, i) => ({ 
      ...a, 
      weight: i === 0 ? 100 - (equalWeight * (allocations.length - 1)) : equalWeight 
    }));
    setAllocations(updated);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0 
    }).format(value);
  };

  // Quick add suggestions
  const quickTickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'BND', 'GLD', 'VTI', 'NVDA']
    .filter(t => !allocations.find(a => a.symbol === t))
    .slice(0, 6);

  const handleSubmit = () => {
    if (canProceed) {
      onComplete({ capital, horizon, allocations });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <Badge className="mb-4 bg-blue-500/10 text-blue-500 border-blue-500/30">
            Manual Mode
          </Badge>
          <h1 className="text-3xl font-bold mb-2">Build Your Portfolio</h1>
          <p className="text-muted-foreground">
            Enter your portfolio details and we'll analyze it using Black-Litterman optimization
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Capital & Horizon */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                Portfolio Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm mb-2 block">Portfolio Total</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={capital.toLocaleString()}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setCapital(parseInt(value) || 0);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Time Horizon
                  </span>
                  <Badge variant="outline">{horizon} years</Badge>
                </Label>
                <Slider
                  value={[horizon]}
                  onValueChange={([v]) => setHorizon(v)}
                  min={1}
                  max={POLYGON_CONFIG.MAX_HISTORY_YEARS}
                  step={1}
                  className="mt-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1 year</span>
                  <span>{POLYGON_CONFIG.MAX_HISTORY_YEARS} years</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Assets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-500" />
                Add Assets
              </CardTitle>
              <CardDescription>Enter ticker symbols for your portfolio</CardDescription>
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
                <Button 
                  onClick={addAllocation} 
                  disabled={!newSymbol.trim()} 
                  size="icon"
                  aria-label="Add ticker"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {quickTickers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">Quick add:</span>
                  {quickTickers.map(ticker => (
                    <button
                      key={ticker}
                      onClick={() => {
                        setNewSymbol(ticker);
                        setTimeout(() => {
                          setAllocations(prev => [
                            ...prev,
                            { symbol: ticker, weight: 0, assetClass: 'stocks' as AssetClass }
                          ]);
                        }, 0);
                        setNewSymbol('');
                      }}
                      className="px-2 py-0.5 text-xs rounded border border-border hover:bg-muted transition-colors"
                    >
                      {ticker}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Allocations */}
        <Card>
          <CardHeader className="pb-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-sm">Asset Weights</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Assign target weights (must sum to 100%)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={equalizeWeights} 
                  disabled={allocations.length === 0}
                  className="text-xs sm:text-sm"
                >
                  <Scale className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Equal Weight
                </Button>
                <Badge 
                  variant={isValidAllocation ? 'default' : 'destructive'}
                  className="whitespace-nowrap text-xs sm:text-sm"
                >
                  {totalWeight.toFixed(1)}% / 100%
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {allocations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Scale className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No assets added yet</p>
                <p className="text-sm">Add tickers above to build your portfolio</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allocations.map((allocation) => (
                  <motion.div 
                    key={allocation.symbol}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <Badge variant="outline" className="font-mono text-sm sm:text-base">
                          {allocation.symbol}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {allocation.assetClass}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Input
                          type="number"
                          value={allocation.weight}
                          onChange={(e) => updateWeight(allocation.symbol, parseFloat(e.target.value) || 0)}
                          className="w-16 sm:w-20 text-right text-sm"
                          min={0}
                          max={100}
                          step={0.5}
                        />
                        <span className="text-base sm:text-lg font-bold">%</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive"
                          onClick={() => removeAllocation(allocation.symbol)}
                          aria-label={`Remove ${allocation.symbol}`}
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
                  </motion.div>
                ))}
              </div>
            )}

            {/* Status Messages */}
            {!isValidAllocation && allocations.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3"
              >
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
              </motion.div>
            )}
            
            {isValidAllocation && allocations.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-emerald-500">
                    Portfolio ready for analysis
                  </p>
                  <p className="text-xs text-emerald-500/80">
                    {formatCurrency(capital)} across {allocations.length} assets over {horizon} years
                  </p>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t border-border">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Choose Path
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canProceed}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
          >
            <Play className="h-4 w-4 mr-2" />
            Analyze Portfolio
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
