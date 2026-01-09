import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Sparkles, Star, X, Trash2, Save, Loader2, 
  TrendingUp, TrendingDown, RefreshCw, Filter, ChevronDown 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useWatchlist } from '@/hooks/useWatchlist';
import {
  screenStocksFromPolygon,
  parseNaturalLanguageQuery,
  formatMarketCap,
  formatVolume,
  formatChange,
  QUICK_SCREENS,
  MARKET_CAP_TIERS,
  SECTORS,
  type ScreenerFilters,
  type ScreenerResult,
} from '@/services/polygonScreenerService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EXAMPLE_QUERIES = [
  'Large cap tech gainers',
  'Small cap momentum',
  'Healthcare stocks',
  'Under $20 high volume',
  'Energy sector today',
];

const STORAGE_KEY = 'saved-screens';

interface SavedScreen {
  id: string;
  name: string;
  query: string;
  filters: ScreenerFilters;
  savedAt: string;
}

// =====================
// Applied Filters Card
// =====================
function AppliedFiltersCard({ filters }: { filters: ScreenerFilters }) {
  const filterItems: { label: string; value: string }[] = [];

  if (filters.minMarketCap) {
    filterItems.push({ label: 'Min Market Cap', value: formatMarketCap(filters.minMarketCap) });
  }
  if (filters.maxMarketCap) {
    filterItems.push({ label: 'Max Market Cap', value: formatMarketCap(filters.maxMarketCap) });
  }
  if (filters.minPrice !== undefined) {
    filterItems.push({ label: 'Min Price', value: `$${filters.minPrice}` });
  }
  if (filters.maxPrice !== undefined) {
    filterItems.push({ label: 'Max Price', value: `$${filters.maxPrice}` });
  }
  if (filters.sectors && filters.sectors.length > 0) {
    filterItems.push({ label: 'Sectors', value: filters.sectors.join(', ') });
  }
  if (filters.minChange1D !== undefined) {
    filterItems.push({ label: 'Min Change', value: `${filters.minChange1D}%+` });
  }
  if (filters.maxChange1D !== undefined) {
    filterItems.push({ label: 'Max Change', value: `${filters.maxChange1D}%` });
  }
  if (filters.minRelativeVolume) {
    filterItems.push({ label: 'Relative Volume', value: `${filters.minRelativeVolume}x+` });
  }

  if (filterItems.length === 0) {
    return (
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Applied Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No filters applied. Enter a query to screen stocks.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Applied Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filterItems.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium tabular-nums">{item.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// =====================
// Quick Screens
// =====================
function QuickScreensCard({ onSelect }: { onSelect: (filters: ScreenerFilters, name: string) => void }) {
  const categories = {
    'Performance': ['topGainers', 'topLosers', 'mostActive', 'unusualVolume'],
    'Market Cap': ['megaCap', 'smallCapMomentum'],
    'Sectors': ['techStocks', 'healthcareStocks', 'financials', 'energy'],
    'Price': ['under10', 'over100'],
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Quick Screens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(categories).map(([category, keys]) => (
          <div key={category}>
            <p className="text-xs text-muted-foreground mb-2">{category}</p>
            <div className="space-y-1">
              {keys.map((key) => {
                const screen = QUICK_SCREENS[key];
                if (!screen) return null;
                return (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-1.5 px-2"
                    onClick={() => onSelect(screen.filters, screen.name)}
                  >
                    <span className="truncate">{screen.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// =====================
// Saved Screens
// =====================
function SavedScreensList({
  screens,
  onSelect,
  onDelete,
}: {
  screens: SavedScreen[];
  onSelect: (filters: ScreenerFilters, query: string) => void;
  onDelete: (id: string) => void;
}) {
  if (screens.length === 0) return null;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Saved Screens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {screens.map((screen) => (
          <div
            key={screen.id}
            className="flex items-center justify-between group p-2 -mx-2 rounded-md hover:bg-muted/50 cursor-pointer"
            onClick={() => onSelect(screen.filters, screen.query)}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{screen.name}</p>
              <p className="text-xs text-muted-foreground truncate">{screen.query}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(screen.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// =====================
// Advanced Filters Sheet
// =====================
function AdvancedFiltersSheet({
  filters,
  onApply,
}: {
  filters: ScreenerFilters;
  onApply: (filters: ScreenerFilters) => void;
}) {
  const [localFilters, setLocalFilters] = useState<ScreenerFilters>(filters);
  const [selectedSectors, setSelectedSectors] = useState<string[]>(filters.sectors || []);

  const handleSectorToggle = (sector: string) => {
    setSelectedSectors(prev =>
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  };

  const handleApply = () => {
    onApply({ ...localFilters, sectors: selectedSectors.length > 0 ? selectedSectors : undefined });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Advanced Filters</SheetTitle>
          <SheetDescription>Refine your stock screen</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Market Cap */}
          <div>
            <Label className="text-sm font-medium">Market Cap</Label>
            <Select
              value={
                localFilters.minMarketCap === 200_000_000_000 ? 'mega' :
                localFilters.minMarketCap === 10_000_000_000 ? 'large' :
                localFilters.minMarketCap === 2_000_000_000 ? 'mid' :
                localFilters.maxMarketCap === 2_000_000_000 ? 'small' :
                localFilters.maxMarketCap === 300_000_000 ? 'micro' : 'all'
              }
              onValueChange={(value) => {
                const tier = MARKET_CAP_TIERS[value as keyof typeof MARKET_CAP_TIERS];
                if (tier) {
                  setLocalFilters(f => ({ ...f, minMarketCap: tier.min, maxMarketCap: tier.max }));
                } else {
                  setLocalFilters(f => ({ ...f, minMarketCap: undefined, maxMarketCap: undefined }));
                }
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Any market cap" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any market cap</SelectItem>
                {Object.entries(MARKET_CAP_TIERS).map(([key, tier]) => (
                  <SelectItem key={key} value={key}>{tier.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Min Price</Label>
              <Input
                type="number"
                placeholder="$0"
                className="mt-2"
                value={localFilters.minPrice || ''}
                onChange={(e) => setLocalFilters(f => ({ ...f, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Max Price</Label>
              <Input
                type="number"
                placeholder="No limit"
                className="mt-2"
                value={localFilters.maxPrice || ''}
                onChange={(e) => setLocalFilters(f => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
          </div>

          {/* Change % */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Min Change %</Label>
              <Input
                type="number"
                placeholder="-100"
                className="mt-2"
                value={localFilters.minChange1D ?? ''}
                onChange={(e) => setLocalFilters(f => ({ ...f, minChange1D: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Max Change %</Label>
              <Input
                type="number"
                placeholder="100"
                className="mt-2"
                value={localFilters.maxChange1D ?? ''}
                onChange={(e) => setLocalFilters(f => ({ ...f, maxChange1D: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
          </div>

          {/* Relative Volume */}
          <div>
            <Label className="text-sm font-medium">Min Relative Volume</Label>
            <Input
              type="number"
              placeholder="e.g., 2 for 2x volume"
              className="mt-2"
              value={localFilters.minRelativeVolume || ''}
              onChange={(e) => setLocalFilters(f => ({ ...f, minRelativeVolume: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>

          {/* Sectors */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Sectors</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {SECTORS.map((sector) => (
                <div key={sector} className="flex items-center space-x-2">
                  <Checkbox
                    id={sector}
                    checked={selectedSectors.includes(sector)}
                    onCheckedChange={() => handleSectorToggle(sector)}
                  />
                  <label htmlFor={sector} className="text-sm cursor-pointer truncate">
                    {sector}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleApply} className="w-full">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// =====================
// Results Table
// =====================
function ResultsTable({
  results,
  isLoading,
  onAddToWatchlist,
  isInWatchlist,
  sortBy,
  sortDirection,
  onSort,
}: {
  results: ScreenerResult[];
  isLoading: boolean;
  onAddToWatchlist: (symbol: string, name: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
}) {
  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === column && (
          <ChevronDown className={cn("h-4 w-4", sortDirection === 'asc' && "rotate-180")} />
        )}
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <Card className="bg-card border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stock</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">Market Cap</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="py-16 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-1">No results yet</h3>
          <p className="text-sm text-muted-foreground">
            Enter a natural language query or pick a quick screen to find stocks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stock</TableHead>
            <TableHead>Sector</TableHead>
            <SortableHeader column="price">Price</SortableHeader>
            <SortableHeader column="change">Change</SortableHeader>
            <SortableHeader column="volume">Volume</SortableHeader>
            <SortableHeader column="marketCap">Market Cap</SortableHeader>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((stock) => {
            const inWatchlist = isInWatchlist(stock.symbol);
            const isUp = stock.changePercent >= 0;
            
            return (
              <TableRow key={stock.symbol} className="group">
                <TableCell>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {stock.symbol}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                      {stock.name}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {stock.sector}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium tabular-nums">
                    ${stock.price.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className={cn(
                    "flex items-center justify-end gap-1",
                    isUp ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span className="font-medium tabular-nums">
                      {formatChange(stock.changePercent)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div>
                    <span className="font-medium tabular-nums">{formatVolume(stock.volume)}</span>
                    {stock.relativeVolume && stock.relativeVolume > 1.5 && (
                      <p className="text-xs text-amber-500">
                        {stock.relativeVolume.toFixed(1)}x avg
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {formatMarketCap(stock.marketCap)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-8 w-8',
                      inWatchlist
                        ? 'text-amber-500'
                        : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-500'
                    )}
                    onClick={() => onAddToWatchlist(stock.symbol, stock.name)}
                    disabled={inWatchlist}
                  >
                    <Star className={cn('h-4 w-4', inWatchlist && 'fill-amber-500')} />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

// =====================
// Main Component
// =====================
export default function Screener() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ScreenerFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [savedScreens, setSavedScreens] = useState<SavedScreen[]>([]);
  const [sortBy, setSortBy] = useState<string>('volume');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { addToWatchlist, isInWatchlist } = useWatchlist('stock');

  // Load saved screens
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSavedScreens(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  const runScreen = async (screenFilters: ScreenerFilters, screenQuery?: string) => {
    setIsLoading(true);
    if (screenQuery) setQuery(screenQuery);
    setFilters(screenFilters);

    try {
      const response = await screenStocksFromPolygon({
        ...screenFilters,
        sortBy: sortBy as 'volume' | 'change' | 'price' | 'marketCap',
        sortDirection,
        limit: 100,
      });

      if (response.ok) {
        setResults(response.results);
        setTotalCount(response.count);
        setExplanation(`Found ${response.count.toLocaleString()} stocks matching your criteria`);
      } else {
        toast.error(response.error || 'Failed to screen stocks');
        if (response.fallback) {
          toast.info('Polygon Snapshot API requires a paid plan for full market coverage');
        }
      }
    } catch (err) {
      console.error('Screen error:', err);
      toast.error('Failed to run screen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    const parsedFilters = parseNaturalLanguageQuery(query);
    runScreen(parsedFilters, query);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
    
    // Re-sort locally
    const sorted = [...results].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (column) {
        case 'change':
          aVal = a.changePercent;
          bVal = b.changePercent;
          break;
        case 'price':
          aVal = a.price;
          bVal = b.price;
          break;
        case 'marketCap':
          aVal = a.marketCap || 0;
          bVal = b.marketCap || 0;
          break;
        case 'volume':
        default:
          aVal = a.volume;
          bVal = b.volume;
          break;
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    setResults(sorted);
  };

  const handleSaveScreen = () => {
    if (!query.trim()) return;

    const name = prompt('Enter a name for this screen:');
    if (!name) return;

    const newScreen: SavedScreen = {
      id: Date.now().toString(),
      name,
      query,
      filters,
      savedAt: new Date().toISOString(),
    };

    const updated = [newScreen, ...savedScreens.slice(0, 9)]; // Keep max 10
    setSavedScreens(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success('Screen saved');
  };

  const handleDeleteScreen = (id: string) => {
    const updated = savedScreens.filter((s) => s.id !== id);
    setSavedScreens(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success('Screen deleted');
  };

  const handleAddToWatchlist = (symbol: string, name: string) => {
    addToWatchlist({ itemType: 'stock', itemId: symbol, itemName: name });
  };

  const checkInWatchlist = (symbol: string) => {
    return isInWatchlist('stock', symbol);
  };

  return (
    <div className="p-6">
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Stock Screener
            </h1>
            <p className="text-muted-foreground mt-1">
              Search 10,000+ stocks with natural language powered by Polygon.io
            </p>
          </div>

          {/* Search Section */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="e.g., 'Large cap tech gainers' or 'Under $20 high volume'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 h-12 text-base"
                  />
                  {query && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button onClick={handleSearch} disabled={!query.trim() || isLoading} className="h-12 px-6">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Screen'}
                </Button>
                <AdvancedFiltersSheet filters={filters} onApply={(f) => runScreen(f, query || 'Advanced filters')} />
                {query.trim() && results.length > 0 && (
                  <Button variant="outline" onClick={handleSaveScreen} className="h-12">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                )}
              </div>

              {/* Example Badges */}
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((example) => (
                  <Badge
                    key={example}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => {
                      setQuery(example);
                      const parsedFilters = parseNaturalLanguageQuery(example);
                      runScreen(parsedFilters, example);
                    }}
                  >
                    {example}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Explanation / Stats */}
          {(explanation || totalCount > 0) && (
            <div className="bg-muted/50 border border-border/50 rounded-lg px-4 py-3 flex items-center justify-between">
              <p className="text-sm">{explanation}</p>
              {results.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => runScreen(filters, query)}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                  Refresh
                </Button>
              )}
            </div>
          )}

          {/* Results Table */}
          <ResultsTable
            results={results}
            isLoading={isLoading}
            onAddToWatchlist={handleAddToWatchlist}
            isInWatchlist={checkInWatchlist}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>

        {/* Sidebar */}
        <div className="w-72 space-y-4 flex-shrink-0">
          <AppliedFiltersCard filters={filters} />
          <SavedScreensList
            screens={savedScreens}
            onSelect={(f, q) => runScreen(f, q)}
            onDelete={handleDeleteScreen}
          />
          <QuickScreensCard onSelect={(f, name) => {
            setQuery(name);
            runScreen(f, name);
          }} />
        </div>
      </div>
    </div>
  );
}
