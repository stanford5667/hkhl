import { useState, useEffect } from 'react';
import { Search, Sparkles, Star, X, Trash2, Save } from 'lucide-react';
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
import { useWatchlist } from '@/hooks/useWatchlist';
import {
  aiScreenStocks,
  formatMarketCap,
  QUICK_SCREENS,
  ScreenerCriteria,
  ScreenerResult,
} from '@/services/aiScreenerService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EXAMPLE_QUERIES = [
  'Large cap tech',
  'High dividend utilities',
  'Value stocks low P/E',
  'Small cap gainers',
  'Under $50 financials',
];

const STORAGE_KEY = 'saved-screens';

interface SavedScreen {
  id: string;
  name: string;
  query: string;
  savedAt: string;
}

function AppliedFiltersCard({ criteria }: { criteria: ScreenerCriteria | null }) {
  if (!criteria || Object.keys(criteria).length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Applied Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No filters applied. Enter a query to screen stocks.</p>
        </CardContent>
      </Card>
    );
  }

  const filters: { label: string; value: string }[] = [];

  if (criteria.minMarketCap) {
    filters.push({ label: 'Min Market Cap', value: formatMarketCap(criteria.minMarketCap) });
  }
  if (criteria.maxMarketCap) {
    filters.push({ label: 'Max Market Cap', value: formatMarketCap(criteria.maxMarketCap) });
  }
  if (criteria.maxPE) {
    filters.push({ label: 'Max P/E', value: criteria.maxPE.toString() });
  }
  if (criteria.minPE) {
    filters.push({ label: 'Min P/E', value: criteria.minPE.toString() });
  }
  if (criteria.minDividendYield) {
    filters.push({ label: 'Min Dividend', value: `${criteria.minDividendYield}%` });
  }
  if (criteria.maxPrice) {
    filters.push({ label: 'Max Price', value: `$${criteria.maxPrice}` });
  }
  if (criteria.sectors && criteria.sectors.length > 0) {
    filters.push({ label: 'Sectors', value: criteria.sectors.join(', ') });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Applied Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filters.map((filter, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{filter.label}</span>
            <span className="font-medium">{filter.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SavedScreensList({
  screens,
  onSelect,
  onDelete,
}: {
  screens: SavedScreen[];
  onSelect: (query: string) => void;
  onDelete: (id: string) => void;
}) {
  if (screens.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Saved Screens</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No saved screens yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Saved Screens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {screens.map((screen) => (
          <div
            key={screen.id}
            className="flex items-center justify-between group p-2 -mx-2 rounded-md hover:bg-muted/50 cursor-pointer"
            onClick={() => onSelect(screen.query)}
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

function QuickScreensCard({ onSelect }: { onSelect: (query: string) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Quick Screens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(QUICK_SCREENS).map(([key, screen]) => (
          <Button
            key={key}
            variant="outline"
            size="sm"
            className="w-full justify-start text-left h-auto py-2"
            onClick={() => onSelect(screen.query)}
          >
            <div>
              <p className="font-medium">{key === 'dividendChampions' ? 'Dividend Champions' : key === 'valuePlays' ? 'Value Plays' : 'Growth Leaders'}</p>
              <p className="text-xs text-muted-foreground font-normal">{screen.description}</p>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function ResultsTable({
  results,
  isLoading,
  onAddToWatchlist,
  isInWatchlist,
}: {
  results: ScreenerResult[];
  isLoading: boolean;
  onAddToWatchlist: (symbol: string, name: string) => void;
  isInWatchlist: (symbol: string) => boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stock</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Market Cap</TableHead>
              <TableHead className="text-right">P/E</TableHead>
              <TableHead className="text-right">Dividend</TableHead>
              <TableHead>Match Score</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
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
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-medium mb-1">No results yet</h3>
          <p className="text-sm text-muted-foreground">
            Describe what you're looking for to screen stocks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stock</TableHead>
            <TableHead>Sector</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Market Cap</TableHead>
            <TableHead className="text-right">P/E</TableHead>
            <TableHead className="text-right">Dividend</TableHead>
            <TableHead>Match Score</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((stock) => {
            const inWatchlist = isInWatchlist(stock.symbol);
            return (
              <TableRow key={stock.symbol} className="group">
                <TableCell>
                  <div>
                    <p className="font-medium">{stock.symbol}</p>
                    <p className="text-xs text-muted-foreground">{stock.name}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {stock.sector}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${stock.price.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatMarketCap(stock.marketCap)}
                </TableCell>
                <TableCell className="text-right">
                  {stock.pe !== null ? stock.pe.toFixed(1) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {stock.dividendYield > 0 ? `${stock.dividendYield.toFixed(1)}%` : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={stock.matchScore} className="h-2 w-20" />
                    <span className="text-xs text-muted-foreground w-8">
                      {stock.matchScore}%
                    </span>
                  </div>
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

export default function Screener() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [criteria, setCriteria] = useState<ScreenerCriteria | null>(null);
  const [explanation, setExplanation] = useState('');
  const [savedScreens, setSavedScreens] = useState<SavedScreen[]>([]);

  const { addToWatchlist, isInWatchlist, isAdding } = useWatchlist('stock');

  // Load saved screens from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSavedScreens(JSON.parse(saved));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const runScreen = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setQuery(searchQuery);

    // Simulate async operation
    setTimeout(() => {
      const response = aiScreenStocks(searchQuery);
      setResults(response.results);
      setCriteria(response.criteria);
      setExplanation(response.explanation);
      setIsLoading(false);
    }, 500);
  };

  const handleSearch = () => {
    runScreen(query);
  };

  const handleSaveScreen = () => {
    if (!query.trim()) return;

    const name = prompt('Enter a name for this screen:');
    if (!name) return;

    const newScreen: SavedScreen = {
      id: Date.now().toString(),
      name,
      query,
      savedAt: new Date().toISOString(),
    };

    const updated = [newScreen, ...savedScreens];
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
              Describe what you're looking for in natural language
            </p>
          </div>

          {/* Search Section */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Describe what you're looking for..."
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
                  Screen
                </Button>
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
                    onClick={() => runScreen(example)}
                  >
                    {example}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Explanation */}
          {explanation && (
            <div className="bg-muted/50 border rounded-lg px-4 py-3">
              <p className="text-sm">{explanation}</p>
            </div>
          )}

          {/* Results Table */}
          <ResultsTable
            results={results}
            isLoading={isLoading}
            onAddToWatchlist={handleAddToWatchlist}
            isInWatchlist={checkInWatchlist}
          />
        </div>

        {/* Sidebar */}
        <div className="w-72 space-y-4 flex-shrink-0">
          <AppliedFiltersCard criteria={criteria} />
          <SavedScreensList
            screens={savedScreens}
            onSelect={runScreen}
            onDelete={handleDeleteScreen}
          />
          <QuickScreensCard onSelect={runScreen} />
        </div>
      </div>
    </div>
  );
}
