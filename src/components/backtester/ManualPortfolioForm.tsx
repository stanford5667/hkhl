// Manual Portfolio Form - Direct input for experienced investors
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
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
  onBack: () => void;
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

export function ManualPortfolioForm({ onComplete, onBack }: ManualPortfolioFormProps) {
  const [capital, setCapital] = useState(100000);
  const [horizon, setHorizon] = useState(5);
  const [rows, setRows] = useState<TickerRow[]>(() => 
    Array.from({ length: 5 }, createEmptyRow)
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

        {/* Settings + Ticker Input in one card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Settings row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Portfolio Total */}
              <div>
                <Label className="text-xs mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />
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
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Time Horizon */}
              <div>
                <Label className="text-xs mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Time Horizon
                  </span>
                  <Badge variant="outline" className="text-xs h-5">{horizon}y</Badge>
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

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Assets Header with Equal Weight button */}
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-primary" />
                Portfolio Assets
              </Label>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={equalizeWeights} 
                  disabled={validAllocations.length === 0}
                  className="text-xs h-7"
                >
                  <Scale className="h-3 w-3 mr-1" />
                  Equal Weight
                </Button>
                <Badge 
                  variant={isValidAllocation ? 'default' : validAllocations.length > 0 ? 'destructive' : 'secondary'}
                  className="whitespace-nowrap text-xs"
                >
                  {totalWeight.toFixed(1)}%
                </Badge>
              </div>
            </div>

            {/* Inline Ticker + Slider Rows */}
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div 
                  key={row.id}
                  className="p-2 rounded-lg border border-border bg-muted/20"
                >
                  {/* Top row: Number + Ticker + Weight + Delete */}
                  <div className="flex items-center gap-2">
                    {/* Row number */}
                    <span className="text-xs text-muted-foreground w-4 text-center flex-shrink-0">
                      {index + 1}
                    </span>
                    
                    {/* Ticker Input with Autocomplete */}
                    <TickerInputWithAutocomplete
                      value={row.symbol}
                      onChange={(val) => updateRow(row.id, { symbol: val })}
                      placeholder="TICKER"
                    />
                    
                    {/* Weight Slider - desktop only, inline */}
                    <div className="hidden sm:flex flex-1 min-w-0">
                      <Slider
                        value={[row.weight]}
                        onValueChange={([value]) => updateRow(row.id, { weight: value })}
                        max={100}
                        step={0.5}
                        className={cn("w-full h-1", !row.symbol.trim() && "opacity-40")}
                        disabled={!row.symbol.trim()}
                      />
                    </div>
                    
                    {/* Weight Input */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Input
                        type="number"
                        value={row.weight}
                        onChange={(e) => updateRow(row.id, { weight: parseFloat(e.target.value) || 0 })}
                        className="w-12 h-7 text-xs text-right px-1"
                        min={0}
                        max={100}
                        step={0.5}
                        disabled={!row.symbol.trim()}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    
                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => removeRow(row.id)}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Bottom row: Slider - mobile only, full width underneath */}
                  <div className="sm:hidden mt-2 pl-6 pr-8">
                    <Slider
                      value={[row.weight]}
                      onValueChange={([value]) => updateRow(row.id, { weight: value })}
                      max={100}
                      step={0.5}
                      className={cn("w-full h-2", !row.symbol.trim() && "opacity-40")}
                      disabled={!row.symbol.trim()}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add More Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
              className="w-full text-xs h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Asset Row
            </Button>

            {/* Status Messages */}
            {!isValidAllocation && validAllocations.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-destructive">
                    Allocations must sum to 100%
                  </p>
                  <p className="text-[10px] text-destructive/80">
                    Current total: {totalWeight.toFixed(1)}%. 
                    {totalWeight < 100 ? ` Add ${(100 - totalWeight).toFixed(1)}%` : ` Remove ${(totalWeight - 100).toFixed(1)}%`}
                  </p>
                </div>
              </motion.div>
            )}
            
            {isValidAllocation && validAllocations.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-emerald-500">
                    Portfolio ready for analysis
                  </p>
                  <p className="text-[10px] text-emerald-500/80">
                    {formatCurrency(capital)} across {validAllocations.length} assets over {horizon} years
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
