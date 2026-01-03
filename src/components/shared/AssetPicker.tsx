import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Check, Star, Plus, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export interface AssetSelection {
  ticker: string;
  name: string;
  category: string;
  assetType: string;
  liquidityScore: number;
}

export interface AssetPickerProps {
  onSelect: (assets: AssetSelection[]) => void;
  selectedTickers?: string[];
  multiSelect?: boolean;
  maxSelections?: number;
  filterCategories?: string[];
  className?: string;
}

interface AssetRow {
  ticker: string;
  name: string;
  category: string;
  asset_type: string;
  sector: string | null;
  liquidity_score: number | null;
  expense_ratio: number | null;
  is_free_tier: boolean | null;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'etfs', label: 'ETFs' },
  { id: 'bonds', label: 'Bonds' },
  { id: 'reits', label: 'REITs' },
  { id: 'crypto', label: 'Crypto' },
];

const CATEGORY_FILTER_MAP: Record<string, string[]> = {
  all: [],
  stocks: ['mega_cap_stock', 'large_cap_stock', 'mid_cap_stock', 'stock'],
  etfs: ['broad_market_etf', 'sector_etf', 'bond_etf', 'international_etf', 'commodity_etf', 'crypto_etf', 'etf'],
  bonds: ['bond_etf', 'bond'],
  reits: ['reit'],
  crypto: ['crypto_etf', 'crypto'],
};

function getLiquidityColor(score: number | null): string {
  if (!score) return 'bg-muted text-muted-foreground';
  if (score >= 80) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
  if (score >= 60) return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
  if (score >= 40) return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
  return 'bg-rose-500/10 text-rose-600 border-rose-500/30';
}

export function AssetPicker({
  onSelect,
  selectedTickers = [],
  multiSelect = true,
  maxSelections = 20,
  filterCategories,
  className,
}: AssetPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selected, setSelected] = useState<Map<string, AssetSelection>>(new Map());

  // Initialize selected from props
  useEffect(() => {
    if (selectedTickers.length > 0 && selected.size === 0) {
      // We'll populate these when data loads
    }
  }, [selectedTickers]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['asset-search-picker', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 1) return [];
      
      const { data } = await supabase
        .from('asset_universe')
        .select('ticker, name, category, asset_type, sector, liquidity_score, expense_ratio, is_free_tier')
        .eq('is_active', true)
        .or(`ticker.ilike.%${debouncedQuery}%,name.ilike.%${debouncedQuery}%`)
        .order('liquidity_score', { ascending: false })
        .limit(50);
      
      return (data || []) as AssetRow[];
    },
    enabled: debouncedQuery.length >= 1,
    staleTime: 60 * 1000,
  });

  // Category browse query
  const { data: categoryResults, isLoading: isBrowsing } = useQuery({
    queryKey: ['asset-browse', activeCategory],
    queryFn: async () => {
      let query = supabase
        .from('asset_universe')
        .select('ticker, name, category, asset_type, sector, liquidity_score, expense_ratio, is_free_tier')
        .eq('is_active', true);
      
      const categoryFilters = CATEGORY_FILTER_MAP[activeCategory];
      if (categoryFilters && categoryFilters.length > 0) {
        query = query.in('category', categoryFilters);
      }
      
      const { data } = await query
        .order('liquidity_score', { ascending: false })
        .limit(50);
      
      return (data || []) as AssetRow[];
    },
    enabled: !debouncedQuery,
    staleTime: 5 * 60 * 1000,
  });

  // Determine which results to show
  const displayResults = useMemo(() => {
    const results = debouncedQuery ? searchResults : categoryResults;
    if (!results) return [];
    
    // Apply filterCategories if provided
    if (filterCategories && filterCategories.length > 0) {
      return results.filter(r => filterCategories.includes(r.category));
    }
    
    return results;
  }, [debouncedQuery, searchResults, categoryResults, filterCategories]);

  const isLoading = debouncedQuery ? isSearching : isBrowsing;

  const handleAssetClick = useCallback((asset: AssetRow) => {
    const newSelected = new Map(selected);
    const ticker = asset.ticker;
    
    if (newSelected.has(ticker)) {
      newSelected.delete(ticker);
    } else {
      if (!multiSelect) {
        newSelected.clear();
      }
      if (newSelected.size < maxSelections) {
        newSelected.set(ticker, {
          ticker: asset.ticker,
          name: asset.name,
          category: asset.category,
          assetType: asset.asset_type,
          liquidityScore: asset.liquidity_score || 50,
        });
      }
    }
    
    setSelected(newSelected);
  }, [selected, multiSelect, maxSelections]);

  const handleAddToPortfolio = useCallback(() => {
    onSelect(Array.from(selected.values()));
  }, [selected, onSelect]);

  const handleClearSelection = useCallback(() => {
    setSelected(new Map());
  }, []);

  const isSelected = useCallback((ticker: string) => {
    return selected.has(ticker) || selectedTickers.includes(ticker);
  }, [selected, selectedTickers]);

  // Filter tabs based on filterCategories
  const visibleTabs = useMemo(() => {
    if (!filterCategories || filterCategories.length === 0) {
      return CATEGORY_TABS;
    }
    return CATEGORY_TABS.filter(tab => {
      if (tab.id === 'all') return true;
      const tabCategories = CATEGORY_FILTER_MAP[tab.id];
      return tabCategories.some(c => filterCategories.includes(c));
    });
  }, [filterCategories]);

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticker or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Category Tabs */}
        {!debouncedQuery && (
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}>
              {visibleTabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Results Grid */}
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : displayResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <Search className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">
                {debouncedQuery ? 'No assets found' : 'Browse or search for assets'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {displayResults.map((asset) => {
                const assetSelected = isSelected(asset.ticker);
                const isEtf = asset.asset_type?.toLowerCase().includes('etf') || 
                              asset.category?.toLowerCase().includes('etf');
                
                return (
                  <button
                    key={asset.ticker}
                    onClick={() => handleAssetClick(asset)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      'hover:border-primary/50 hover:bg-muted/50',
                      assetSelected 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                        : 'border-border bg-card'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{asset.ticker}</span>
                          {asset.is_free_tier && (
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          )}
                          {assetSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {asset.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {asset.sector && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {asset.sector}
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={cn('text-[10px] px-1.5 py-0', getLiquidityColor(asset.liquidity_score))}
                      >
                        Liq: {asset.liquidity_score || 'N/A'}
                      </Badge>
                      {isEtf && asset.expense_ratio !== null && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          ER: {(asset.expense_ratio * 100).toFixed(2)}%
                        </Badge>
                      )}
                      {asset.is_free_tier && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                          Free Tier
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Selection Footer */}
        {multiSelect && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {selected.size > 0 ? (
                <span>
                  <span className="font-medium text-foreground">{selected.size}</span> selected
                  {maxSelections < 100 && ` (max ${maxSelections})`}
                </span>
              ) : (
                <span>Select assets to add</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                  Clear
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={handleAddToPortfolio}
                disabled={selected.size === 0}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                Add to Portfolio
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AssetPicker;
