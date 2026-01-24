// Manual Portfolio Form - Direct input for experienced investors
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
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
import { TickerInputWithAutocomplete } from './TickerInputWithAutocomplete';

interface ManualPortfolioFormProps {
  onComplete: (data: {
    capital: number;
    horizon: number;
    allocations: PortfolioAllocation[];
  }) => void;
}

// Row type for inline ticker + weight input
interface TickerRow {
  id: string;
  symbol: string;
  weight: number;
  assetClass: AssetClass;
}

const createEmptyRow = (): TickerRow => ({
  id: crypto.randomUUID(),
  symbol: '',
  weight: 0,
  assetClass: 'stocks'
});

export function ManualPortfolioForm({ onComplete }: ManualPortfolioFormProps) {
  const [capital, setCapital] = useState(100000);
  const [horizon, setHorizon] = useState(5);
  const [rows, setRows] = useState<TickerRow[]>(() => 
    Array.from({ length: 3 }, createEmptyRow)
  );

  // Filter to only rows with valid tickers for calculations
  const validAllocations = useMemo(() => 
    rows.filter(r => r.symbol.trim().length > 0),
    [rows]
  );

  const totalWeight = useMemo(() => 
    validAllocations.reduce((sum, a) => sum + a.weight, 0), 
    [validAllocations]
  );
  
  const isValidAllocation = Math.abs(totalWeight - 100) < 0.1;
  const canProceed = capital > 0 && horizon > 0 && validAllocations.length > 0 && isValidAllocation;

  const updateRow = (id: string, updates: Partial<TickerRow>) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      
      const updated = { ...row, ...updates };
      
      // Auto-detect asset class when symbol changes
      if (updates.symbol !== undefined) {
        const symbol = updates.symbol.toUpperCase().trim();
        let assetClass: AssetClass = 'stocks';
        for (const [cls, etfs] of Object.entries(ASSET_CLASS_ETFS)) {
          if (etfs.includes(symbol)) {
            assetClass = cls as AssetClass;
            break;
          }
        }
        updated.assetClass = assetClass;
        updated.symbol = symbol;
      }
      
      return updated;
    }));
  };

  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    setRows(prev => {
      const filtered = prev.filter(r => r.id !== id);
      // Keep at least one row
      return filtered.length > 0 ? filtered : [createEmptyRow()];
    });
  };

  const equalizeWeights = () => {
    const validRows = rows.filter(r => r.symbol.trim().length > 0);
    if (validRows.length === 0) return;
    
    const equalWeight = Math.round((100 / validRows.length) * 10) / 10;
    const validIds = new Set(validRows.map(r => r.id));
    
    setRows(prev => {
      let assigned = 0;
      let count = 0;
      return prev.map(row => {
        if (!validIds.has(row.id)) return row;
        count++;
        // Last valid row gets remainder to ensure exactly 100%
        if (count === validRows.length) {
          return { ...row, weight: Math.round((100 - assigned) * 10) / 10 };
        }
        assigned += equalWeight;
        return { ...row, weight: equalWeight };
      });
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0 
    }).format(value);
  };

  const handleSubmit = () => {
    if (canProceed) {
      const allocations = validAllocations.map(({ symbol, weight, assetClass }) => ({
        symbol,
        weight,
        assetClass
      }));
      onComplete({ capital, horizon, allocations });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Header with gradient accent */}
        <div className="text-center relative">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-primary/10 rounded-full blur-3xl" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">Portfolio Builder</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Build Your Portfolio
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Add your assets and allocate what percentage of your portfolio each should represent
          </p>
        </div>

        {/* Settings Card with colored accents */}
        <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="h-1 bg-gradient-to-r from-primary via-cyan-500 to-primary" />
          <CardContent className="p-4 space-y-4">
            {/* Settings row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Portfolio Total */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Label className="text-xs mb-1.5 flex items-center gap-1.5 text-primary font-medium">
                  <DollarSign className="h-3.5 w-3.5" />
                  Portfolio Total
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={capital.toLocaleString()}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setCapital(parseInt(value) || 0);
                    }}
                    className="pl-8 h-9 text-sm bg-background/50"
                  />
                </div>
              </div>

              {/* Time Horizon */}
              <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                <Label className="text-xs mb-1.5 flex items-center justify-between text-cyan-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Time Horizon
                  </span>
                  <Badge className="text-xs h-5 bg-cyan-500/20 text-cyan-400 border-0">{horizon} years</Badge>
                </Label>
                <Slider
                  value={[horizon]}
                  onValueChange={([v]) => setHorizon(v)}
                  min={1}
                  max={POLYGON_CONFIG.MAX_HISTORY_YEARS}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Divider with label */}
            <div className="relative">
              <div className="border-t border-border" />
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-[10px] text-muted-foreground uppercase tracking-wider">
                Allocations
              </span>
            </div>

            {/* Assets Header with instructions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                  <Scale className="h-4 w-4 text-white" />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Your Assets</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Use slider to set each asset's % of portfolio
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={equalizeWeights} 
                  disabled={validAllocations.length === 0}
                  className="text-xs h-7 border-primary/30 hover:bg-primary/10 hover:text-primary"
                >
                  <Scale className="h-3 w-3 mr-1" />
                  Equal Weight
                </Button>
                <Badge 
                  className={cn(
                    "whitespace-nowrap text-xs px-2.5",
                    isValidAllocation 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                      : validAllocations.length > 0 
                        ? "bg-destructive/20 text-destructive border-destructive/30" 
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {totalWeight.toFixed(1)}% / 100%
                </Badge>
              </div>
            </div>

            {/* Inline Ticker + Slider Rows */}
            <div className="space-y-2">
              {rows.map((row, index) => (
                <motion.div 
                  key={row.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    row.symbol.trim() 
                      ? "border-primary/30 bg-primary/5" 
                      : "border-border bg-muted/20"
                  )}
                >
                  {/* Top row: Number + Ticker + Weight + Delete */}
                  <div className="flex items-center gap-2">
                    {/* Row number with colored background */}
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium",
                      row.symbol.trim() 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    
                    {/* Ticker Input with Autocomplete */}
                    <TickerInputWithAutocomplete
                      value={row.symbol}
                      onChange={(val) => updateRow(row.id, { symbol: val })}
                      placeholder="TICKER"
                    />
                    
                    {/* Weight Slider - desktop only, inline */}
                    <div className="hidden sm:flex flex-1 min-w-0 items-center gap-2">
                      <span className="text-[10px] text-muted-foreground shrink-0">0%</span>
                      <Slider
                        value={[row.weight]}
                        onValueChange={([value]) => updateRow(row.id, { weight: value })}
                        max={100}
                        step={0.5}
                        className={cn("w-full h-1.5", !row.symbol.trim() && "opacity-40")}
                        disabled={!row.symbol.trim()}
                      />
                      <span className="text-[10px] text-muted-foreground shrink-0">100%</span>
                    </div>
                    
                    {/* Weight Input */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 bg-background/50 rounded-md px-2 py-1">
                      <Input
                        type="number"
                        value={row.weight}
                        onChange={(e) => updateRow(row.id, { weight: parseFloat(e.target.value) || 0 })}
                        className="w-12 h-6 text-xs text-center px-1 border-0 bg-transparent"
                        min={0}
                        max={100}
                        step={0.5}
                        disabled={!row.symbol.trim()}
                      />
                      <span className="text-[10px] text-muted-foreground">%</span>
                    </div>
                    
                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={() => removeRow(row.id)}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Bottom row: Slider - mobile only, full width underneath */}
                  <div className="sm:hidden mt-3 px-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>0%</span>
                      <span className="text-primary font-medium">% of portfolio</span>
                      <span>100%</span>
                    </div>
                    <Slider
                      value={[row.weight]}
                      onValueChange={([value]) => updateRow(row.id, { weight: value })}
                      max={100}
                      step={0.5}
                      className={cn("w-full h-2", !row.symbol.trim() && "opacity-40")}
                      disabled={!row.symbol.trim()}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Add More Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
              className="w-full text-xs h-9 border-dashed border-primary/30 hover:bg-primary/5 hover:border-primary/50"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Add Another Asset
            </Button>

            {/* Status Messages */}
            {!isValidAllocation && validAllocations.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-xs font-medium text-destructive">
                    Allocations must sum to 100%
                  </p>
                  <p className="text-[10px] text-destructive/80">
                    Current: {totalWeight.toFixed(1)}% — 
                    {totalWeight < 100 ? ` add ${(100 - totalWeight).toFixed(1)}% more` : ` remove ${(totalWeight - 100).toFixed(1)}%`}
                  </p>
                </div>
              </motion.div>
            )}
            
            {isValidAllocation && validAllocations.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-400">
                    Portfolio ready for analysis!
                  </p>
                  <p className="text-[10px] text-emerald-500/80">
                    {formatCurrency(capital)} across {validAllocations.length} asset{validAllocations.length > 1 ? 's' : ''} • {horizon} year horizon
                  </p>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Analyze Button - Always visible, sticky on mobile */}
        <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-background/80 pt-4 pb-3 -mx-4 sm:-mx-6 px-4 sm:px-6">
          <Button 
            onClick={handleSubmit} 
            disabled={!canProceed}
            className={cn(
              "w-full h-12 text-base font-semibold shadow-lg transition-all",
              canProceed 
                ? "bg-gradient-to-r from-primary via-cyan-500 to-primary hover:shadow-primary/25 hover:shadow-xl" 
                : "bg-muted"
            )}
          >
            <Play className="h-5 w-5 mr-2" />
            Analyze Portfolio
          </Button>
          {!canProceed && validAllocations.length === 0 && (
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Add at least one asset and set allocations to 100%
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
