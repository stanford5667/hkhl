// Manual Position Entry Form with Ticker Search
import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Loader2, DollarSign, Hash, TrendingUp, TrendingDown } from 'lucide-react';
import { useTickerSearch } from '@/hooks/useTickerSearch';
import { ASSET_TYPES, type PositionFormData } from '@/types/positions';
import { cn } from '@/lib/utils';
import { useBatchQuotes } from '@/hooks/useMarketDataQuery';

interface ManualPositionFormProps {
  onSubmit: (data: PositionFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function ManualPositionForm({ onSubmit, isSubmitting }: ManualPositionFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicker, setSelectedTicker] = useState<{ symbol: string; name: string } | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [costPerShare, setCostPerShare] = useState<string>('');
  const [assetType, setAssetType] = useState('stock');

  // Ticker search - use the hook and update its query
  const tickerSearch = useTickerSearch(300);
  const searchResults = tickerSearch.results;
  const isSearching = tickerSearch.isSearching;
  
  // Sync our local search query to the hook
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    tickerSearch.setQuery(value);
  };

  // Fetch current price for selected ticker
  const tickersToFetch = useMemo(() => 
    selectedTicker ? [selectedTicker.symbol] : [], 
    [selectedTicker]
  );
  const { quotes } = useBatchQuotes(tickersToFetch);
  const currentQuote = selectedTicker ? quotes.get(selectedTicker.symbol) : null;

  // Calculate values
  const parsedQuantity = parseFloat(quantity) || 0;
  const parsedCostPerShare = parseFloat(costPerShare) || 0;
  const totalCostBasis = parsedQuantity * parsedCostPerShare;
  const currentValue = currentQuote?.price ? parsedQuantity * currentQuote.price : null;
  const unrealizedGain = currentValue && totalCostBasis ? currentValue - totalCostBasis : null;
  const unrealizedGainPercent = unrealizedGain && totalCostBasis ? (unrealizedGain / totalCostBasis) * 100 : null;

  const handleSelectTicker = useCallback((symbol: string, name: string) => {
    setSelectedTicker({ symbol, name });
    setSearchQuery('');
  }, []);

  const handleSubmit = async () => {
    if (!selectedTicker || !parsedQuantity) return;

    await onSubmit({
      symbol: selectedTicker.symbol,
      name: selectedTicker.name,
      quantity: parsedQuantity,
      cost_per_share: parsedCostPerShare || undefined,
      cost_basis: totalCostBasis || undefined,
      asset_type: assetType,
    });

    // Reset form
    setSelectedTicker(null);
    setQuantity('');
    setCostPerShare('');
    setAssetType('stock');
  };

  const isValid = selectedTicker && parsedQuantity > 0;

  return (
    <div className="space-y-6">
      {/* Ticker Search */}
      <div className="space-y-2">
        <Label>Search Ticker</Label>
        {selectedTicker ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <Badge variant="outline" className="font-mono text-lg px-3 py-1">
              {selectedTicker.symbol}
            </Badge>
            <div className="flex-1">
              <p className="font-medium">{selectedTicker.name}</p>
              {currentQuote && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="tabular-nums">${currentQuote.price?.toFixed(2)}</span>
                  <span className={cn(
                    'flex items-center gap-1 tabular-nums',
                    (currentQuote.changePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {(currentQuote.changePercent || 0) >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {(currentQuote.changePercent || 0) >= 0 ? '+' : ''}
                    {currentQuote.changePercent?.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTicker(null)}>
              Change
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by ticker or company name..."
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            
            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    onClick={() => handleSelectTicker(result.symbol, result.name)}
                    className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3 transition-colors"
                  >
                    <Badge variant="outline" className="font-mono">
                      {result.symbol}
                    </Badge>
                    <span className="text-sm truncate flex-1">{result.name}</span>
                    {result.type && (
                      <Badge variant="secondary" className="text-xs">
                        {result.type}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quantity & Cost */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Shares
          </Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="100"
            min="0"
            step="any"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cost per Share
          </Label>
          <Input
            type="number"
            value={costPerShare}
            onChange={(e) => setCostPerShare(e.target.value)}
            placeholder="150.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Asset Type */}
      <div className="space-y-2">
        <Label>Asset Type</Label>
        <Select value={assetType} onValueChange={setAssetType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSET_TYPES.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                <span className="flex items-center gap-2">
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Position Preview */}
      {isValid && (
        <div className="p-4 rounded-lg border border-border bg-gradient-to-br from-card to-muted/50">
          <h4 className="text-sm font-medium mb-3">Position Preview</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Total Cost Basis</span>
              <p className="font-mono text-lg">${totalCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            {currentValue !== null && (
              <div>
                <span className="text-muted-foreground">Current Value</span>
                <p className="font-mono text-lg">${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            )}
            {unrealizedGain !== null && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Unrealized Gain/Loss</span>
                <p className={cn(
                  "font-mono text-lg flex items-center gap-2",
                  unrealizedGain >= 0 ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {unrealizedGain >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {unrealizedGain >= 0 ? '+' : ''}${unrealizedGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-sm">
                    ({unrealizedGainPercent! >= 0 ? '+' : ''}{unrealizedGainPercent!.toFixed(2)}%)
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit */}
      <Button 
        onClick={handleSubmit} 
        disabled={!isValid || isSubmitting} 
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Plus className="h-4 w-4 mr-2" />
        )}
        Add Position
      </Button>
    </div>
  );
}
