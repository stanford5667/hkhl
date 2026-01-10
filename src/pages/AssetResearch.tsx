import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { 
  Search, 
  Building2, 
  TrendingUp, 
  TrendingDown,
  Globe, 
  BarChart3, 
  DollarSign,
  ArrowRight,
  Sparkles,
  LineChart,
  Star,
  X,
  Trash2,
  Save,
  Loader2,
  RefreshCw,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import {
  executeScreen,
  parseNaturalLanguageQuery,
  formatMarketCap,
  formatVolume,
  QUICK_SCREENS,
  generateExplanation,
} from '@/services/finvizStyleScreenerService';
import type { ScreenerCriteria, ScreenerResult, Sector, Exchange, Index, RSIFilter, SMAFilter, HighLow52W } from '@/types/screener';
import { cn } from '@/lib/utils';

// =====================
// Types & Constants
// =====================
interface TickerDetails {
  ticker: string;
  name: string;
  description?: string;
  sector?: string;
  industry?: string;
  primaryExchange?: string;
  homepageUrl?: string;
  marketCap?: number;
  listDate?: string;
}

interface SavedScreen {
  id: string;
  name: string;
  query: string;
  criteria: ScreenerCriteria;
  savedAt: string;
}

const EXAMPLE_QUERIES = [
  'Large cap tech gainers',
  'Small cap momentum',
  'Healthcare stocks',
  'Under $20 high volume',
  'Energy sector today',
];

const STORAGE_KEY = 'saved-screens';

const MARKET_CAP_TIERS: Record<string, { label: string; min?: number; max?: number }> = {
  mega: { label: 'Mega Cap ($200B+)', min: 200_000_000_000 },
  large: { label: 'Large Cap ($10-200B)', min: 10_000_000_000, max: 200_000_000_000 },
  mid: { label: 'Mid Cap ($2-10B)', min: 2_000_000_000, max: 10_000_000_000 },
  small: { label: 'Small Cap ($300M-2B)', min: 300_000_000, max: 2_000_000_000 },
  micro: { label: 'Micro Cap ($50-300M)', min: 50_000_000, max: 300_000_000 },
};

const SECTORS: Sector[] = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Communication Services', 'Industrials', 'Consumer Defensive',
  'Energy', 'Basic Materials', 'Real Estate', 'Utilities'
];

const EXCHANGES: Exchange[] = ['NYSE', 'NASDAQ', 'AMEX'];
const INDICES: { value: Index; label: string }[] = [
  { value: 'sp500', label: 'S&P 500' },
  { value: 'djia', label: 'Dow Jones' },
  { value: 'nasdaq100', label: 'NASDAQ 100' },
  { value: 'russell2000', label: 'Russell 2000' },
];

// =====================
// Ticker Search Tab Component
// =====================
function TickerSearchTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tickerDetails, setTickerDetails] = useState<TickerDetails | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const searchTicker = useCallback(async (ticker: string) => {
    if (!ticker.trim()) return;
    
    const normalizedTicker = ticker.toUpperCase().trim();
    setIsSearching(true);
    setNotFound(false);
    setTickerDetails(null);

    try {
      const { data, error } = await supabase.functions.invoke('polygon-ticker-details', {
        body: { ticker: normalizedTicker }
      });

      if (error) {
        console.error('Search error:', error);
        toast.error('Failed to search for ticker');
        setIsSearching(false);
        return;
      }

      if (!data?.ok || !data?.details) {
        setNotFound(true);
        setIsSearching(false);
        return;
      }

      setTickerDetails({
        ticker: normalizedTicker,
        name: data.details.name,
        description: data.details.description,
        sector: data.details.sector,
        industry: data.details.industry,
        primaryExchange: data.details.primaryExchange,
        homepageUrl: data.details.homepageUrl,
        marketCap: data.details.marketCap,
        listDate: data.details.listDate,
      });

      setRecentSearches(prev => {
        const updated = [normalizedTicker, ...prev.filter(t => t !== normalizedTicker)].slice(0, 5);
        return updated;
      });

    } catch (e) {
      console.error('Search error:', e);
      toast.error('Failed to search for ticker');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchTicker(searchQuery);
  };

  const viewFullDetails = async () => {
    if (!tickerDetails || !user) {
      toast.error('Please sign in to view full details');
      return;
    }

    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('ticker_symbol', tickerDetails.ticker)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCompany) {
      navigate(`/portfolio/${existingCompany.id}`);
    } else {
      navigate(`/stock/${tickerDetails.ticker}`);
    }
  };

  const formatMktCap = (value: number | undefined) => {
    if (!value) return 'N/A';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B'];

  return (
    <div className="space-y-6">
      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search by Ticker Symbol
          </CardTitle>
          <CardDescription>
            Enter a stock ticker to get company details, financials, and market data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Enter ticker (e.g., AAPL, MSFT, GOOGL)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              className="flex-1 text-lg"
            />
            <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Popular:</span>
            {popularTickers.map(ticker => (
              <Badge 
                key={ticker} 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => {
                  setSearchQuery(ticker);
                  searchTicker(ticker);
                }}
              >
                {ticker}
              </Badge>
            ))}
          </div>

          {recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Recent:</span>
              {recentSearches.map(ticker => (
                <Badge 
                  key={ticker} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => {
                    setSearchQuery(ticker);
                    searchTicker(ticker);
                  }}
                >
                  {ticker}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isSearching && (
        <Card>
          <CardContent className="py-8 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-3 gap-4 mt-6">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Found State */}
      {notFound && !isSearching && (
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Ticker Not Found</h3>
            <p className="text-muted-foreground">
              We couldn't find any company with the ticker "{searchQuery}". Please check the symbol and try again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {tickerDetails && !isSearching && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="text-lg px-3 py-1">
                    {tickerDetails.ticker}
                  </Badge>
                  <CardTitle className="text-2xl">{tickerDetails.name}</CardTitle>
                </div>
                {tickerDetails.primaryExchange && (
                  <p className="text-sm text-muted-foreground">
                    Listed on {tickerDetails.primaryExchange}
                  </p>
                )}
              </div>
              <Button onClick={viewFullDetails} className="gap-2">
                View Full Profile
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Market Cap</span>
                </div>
                <p className="text-xl font-semibold">{formatMktCap(tickerDetails.marketCap)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">Sector</span>
                </div>
                <p className="text-xl font-semibold">{tickerDetails.sector || 'N/A'}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm">Industry</span>
                </div>
                <p className="text-xl font-semibold truncate">{tickerDetails.industry || 'N/A'}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <LineChart className="h-4 w-4" />
                  <span className="text-sm">Exchange</span>
                </div>
                <p className="text-xl font-semibold">{tickerDetails.primaryExchange || 'N/A'}</p>
              </div>
            </div>

            {tickerDetails.description && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  About
                </h4>
                <p className="text-muted-foreground leading-relaxed line-clamp-4">
                  {tickerDetails.description}
                </p>
              </div>
            )}

            {tickerDetails.homepageUrl && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={tickerDetails.homepageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {tickerDetails.homepageUrl}
                </a>
              </div>
            )}

            <Card className="bg-gradient-to-r from-primary/10 to-secondary/30 border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium">Want deeper analysis?</p>
                      <p className="text-sm text-muted-foreground">
                        View price charts, fundamentals, and AI-powered insights
                      </p>
                    </div>
                  </div>
                  <Button onClick={viewFullDetails} variant="default">
                    Open Full Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =====================
// Screener Components
// =====================
function AppliedFiltersCard({ criteria }: { criteria: ScreenerCriteria }) {
  const filterItems: { label: string; value: string }[] = [];

  if (criteria.marketCap) {
    filterItems.push({ label: 'Market Cap', value: criteria.marketCap.toUpperCase() });
  }
  if (criteria.minMarketCap) {
    filterItems.push({ label: 'Min Market Cap', value: formatMarketCap(criteria.minMarketCap) });
  }
  if (criteria.maxMarketCap) {
    filterItems.push({ label: 'Max Market Cap', value: formatMarketCap(criteria.maxMarketCap) });
  }
  if (criteria.minPrice !== undefined) {
    filterItems.push({ label: 'Min Price', value: `$${criteria.minPrice}` });
  }
  if (criteria.maxPrice !== undefined) {
    filterItems.push({ label: 'Max Price', value: `$${criteria.maxPrice}` });
  }
  if (criteria.sector && criteria.sector.length > 0) {
    filterItems.push({ label: 'Sectors', value: criteria.sector.join(', ') });
  }
  if (criteria.minPerfToday !== undefined) {
    filterItems.push({ label: 'Min Change', value: `${criteria.minPerfToday}%+` });
  }
  if (criteria.maxPerfToday !== undefined) {
    filterItems.push({ label: 'Max Change', value: `${criteria.maxPerfToday}%` });
  }
  if (criteria.minRelativeVolume) {
    filterItems.push({ label: 'Relative Volume', value: `${criteria.minRelativeVolume}x+` });
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

function QuickScreensCard({ onSelect }: { onSelect: (criteria: ScreenerCriteria, name: string) => void }) {
  const categories = {
    'Market Movers': ['top_gainers', 'top_losers', 'most_active', 'unusual_volume'],
    'Technical': ['new_52w_high', 'oversold_rsi', 'golden_cross', 'above_200_sma'],
    'Fundamental': ['high_dividend', 'value_stocks', 'high_growth', 'high_roe'],
    'Market Cap': ['mega_cap', 'large_cap', 'mid_cap', 'small_cap'],
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
                    onClick={() => onSelect(screen.criteria, screen.name)}
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

function SavedScreensList({
  screens,
  onSelect,
  onDelete,
}: {
  screens: SavedScreen[];
  onSelect: (criteria: ScreenerCriteria, query: string) => void;
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
            onClick={() => onSelect(screen.criteria, screen.query)}
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

function AdvancedFiltersSheet({
  criteria,
  onApply,
}: {
  criteria: ScreenerCriteria;
  onApply: (criteria: ScreenerCriteria) => void;
}) {
  const [localCriteria, setLocalCriteria] = useState<ScreenerCriteria>(criteria);
  const [selectedSectors, setSelectedSectors] = useState<Sector[]>(criteria.sector || []);
  const [selectedExchanges, setSelectedExchanges] = useState<Exchange[]>(criteria.exchange || []);

  const handleSectorToggle = (sector: Sector) => {
    setSelectedSectors(prev =>
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
  };

  const handleExchangeToggle = (exchange: Exchange) => {
    setSelectedExchanges(prev =>
      prev.includes(exchange) ? prev.filter(e => e !== exchange) : [...prev, exchange]
    );
  };

  const handleApply = () => {
    onApply({
      ...localCriteria,
      sector: selectedSectors.length > 0 ? selectedSectors : undefined,
      exchange: selectedExchanges.length > 0 ? selectedExchanges : undefined,
    });
  };

  const handleClear = () => {
    setLocalCriteria({});
    setSelectedSectors([]);
    setSelectedExchanges([]);
  };

  const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</Label>
      {children}
    </div>
  );

  const NumberRangeInput = ({ 
    label, 
    minKey, 
    maxKey, 
  }: { 
    label: string; 
    minKey: keyof ScreenerCriteria; 
    maxKey: keyof ScreenerCriteria;
  }) => (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 gap-2 mt-1.5">
        <Input
          type="number"
          placeholder="Min"
          className="h-8 text-sm"
          value={(localCriteria[minKey] as number) ?? ''}
          onChange={(e) => setLocalCriteria(f => ({ ...f, [minKey]: e.target.value ? Number(e.target.value) : undefined }))}
        />
        <Input
          type="number"
          placeholder="Max"
          className="h-8 text-sm"
          value={(localCriteria[maxKey] as number) ?? ''}
          onChange={(e) => setLocalCriteria(f => ({ ...f, [maxKey]: e.target.value ? Number(e.target.value) : undefined }))}
        />
      </div>
    </div>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[520px] sm:max-w-[520px] p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle>Advanced Filters</SheetTitle>
          <SheetDescription>Filter stocks by various criteria</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] px-4 py-4">
          <div className="space-y-5">
            <FilterSection title="Exchange">
              <div className="flex flex-wrap gap-2">
                {EXCHANGES.map((ex) => (
                  <Button
                    key={ex}
                    variant={selectedExchanges.includes(ex) ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleExchangeToggle(ex)}
                  >
                    {ex}
                  </Button>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Index">
              <Select
                value={localCriteria.index?.[0] || 'any'}
                onValueChange={(value) => setLocalCriteria(f => ({ ...f, index: value === 'any' ? undefined : [value as Index] }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Any index" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any index</SelectItem>
                  {INDICES.map((idx) => (
                    <SelectItem key={idx.value} value={idx.value}>{idx.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            <FilterSection title="Market Cap">
              <Select
                value={localCriteria.marketCap || 'any'}
                onValueChange={(value) => {
                  if (value && value !== 'any') {
                    const tier = MARKET_CAP_TIERS[value as keyof typeof MARKET_CAP_TIERS];
                    setLocalCriteria(f => ({ ...f, marketCap: value as any, minMarketCap: tier?.min, maxMarketCap: tier?.max }));
                  } else {
                    setLocalCriteria(f => ({ ...f, marketCap: undefined, minMarketCap: undefined, maxMarketCap: undefined }));
                  }
                }}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Any market cap" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any market cap</SelectItem>
                  {Object.entries(MARKET_CAP_TIERS).map(([key, tier]) => (
                    <SelectItem key={key} value={key}>{tier.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            <FilterSection title="Sectors">
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                {SECTORS.map((sector) => (
                  <div key={sector} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sector-${sector}`}
                      checked={selectedSectors.includes(sector)}
                      onCheckedChange={() => handleSectorToggle(sector)}
                      className="h-3.5 w-3.5"
                    />
                    <label htmlFor={`sector-${sector}`} className="text-xs cursor-pointer truncate">
                      {sector}
                    </label>
                  </div>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Price">
              <NumberRangeInput label="Price Range ($)" minKey="minPrice" maxKey="maxPrice" />
            </FilterSection>

            <FilterSection title="Performance">
              <NumberRangeInput label="Today's Change (%)" minKey="minPerfToday" maxKey="maxPerfToday" />
            </FilterSection>

            <FilterSection title="Volume">
              <div>
                <Label className="text-sm font-medium">Minimum Relative Volume</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g., 1.5"
                  className="h-8 text-sm mt-1.5"
                  value={localCriteria.minRelativeVolume ?? ''}
                  onChange={(e) => setLocalCriteria(f => ({ ...f, minRelativeVolume: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
            </FilterSection>
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-2">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear All
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ResultsTable({
  results,
  isLoading,
  onAddToWatchlist,
  isInWatchlist,
  sortBy,
  sortDirection,
  onSort,
  onRowClick,
}: {
  results: ScreenerResult[];
  isLoading: boolean;
  onAddToWatchlist: (symbol: string, name: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  onRowClick: (stock: ScreenerResult) => void;
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
            const inWatchlist = isInWatchlist(stock.ticker);
            const isUp = stock.changePercent >= 0;
            
            return (
              <TableRow 
                key={stock.ticker} 
                className="group cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(stock)}
              >
                <TableCell>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {stock.ticker}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                      {stock.company}
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
                      {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToWatchlist(stock.ticker, stock.company);
                    }}
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
// Screener Tab Component
// =====================
function ScreenerTab() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [criteria, setCriteria] = useState<ScreenerCriteria>({});
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [savedScreens, setSavedScreens] = useState<SavedScreen[]>([]);
  const [sortBy, setSortBy] = useState<string>('volume');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { addToWatchlist, isInWatchlist } = useWatchlist('stock');

  const handleRowClick = (stock: ScreenerResult) => {
    navigate(`/stock/${stock.ticker}`);
  };

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

  const runScreen = async (screenCriteria: ScreenerCriteria, screenQuery?: string) => {
    setIsLoading(true);
    if (screenQuery) setQuery(screenQuery);
    setCriteria(screenCriteria);

    try {
      const response = await executeScreen({
        ...screenCriteria,
        sortBy: sortBy as 'volume' | 'change' | 'price' | 'marketCap' | 'ticker',
        sortOrder: sortDirection,
        limit: 100,
      });

      setResults(response.results);
      setTotalCount(response.totalCount);
      setExplanation(generateExplanation(screenCriteria, response.totalCount));
    } catch (err) {
      console.error('Screen error:', err);
      toast.error('Failed to run screen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    const parsedCriteria = parseNaturalLanguageQuery(query);
    runScreen(parsedCriteria, query);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
    
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
      criteria,
      savedAt: new Date().toISOString(),
    };

    const updated = [newScreen, ...savedScreens.slice(0, 9)];
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
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
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
              <AdvancedFiltersSheet criteria={criteria} onApply={(c) => runScreen(c, query || 'Advanced filters')} />
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
                    const parsedCriteria = parseNaturalLanguageQuery(example);
                    runScreen(parsedCriteria, example);
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
                onClick={() => runScreen(criteria, query)}
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
          onRowClick={handleRowClick}
        />
      </div>

      {/* Sidebar */}
      <div className="w-72 space-y-4 flex-shrink-0">
        <AppliedFiltersCard criteria={criteria} />
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
  );
}

// =====================
// Main Component
// =====================
export default function AssetResearch() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" />
          Asset Research
        </h1>
        <p className="text-muted-foreground mt-1">
          Search individual tickers or screen 10,000+ stocks with natural language
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="screener" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="screener" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Stock Screener
          </TabsTrigger>
          <TabsTrigger value="ticker" className="gap-2">
            <Search className="h-4 w-4" />
            Ticker Lookup
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="screener" className="mt-6">
          <ScreenerTab />
        </TabsContent>
        
        <TabsContent value="ticker" className="mt-6">
          <div className="max-w-4xl">
            <TickerSearchTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
