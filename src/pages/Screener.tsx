import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  executeScreen,
  parseNaturalLanguageQuery,
  formatMarketCap,
  formatVolume,
  QUICK_SCREENS,
  getQuickScreensByCategory,
  generateExplanation,
} from '@/services/finvizStyleScreenerService';
import type { ScreenerCriteria, ScreenerResult, Sector, Exchange, Index, RSIFilter, SMAFilter, HighLow52W } from '@/types/screener';
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

// Market cap tiers for the filter dropdown
const MARKET_CAP_TIERS: Record<string, { label: string; min?: number; max?: number }> = {
  mega: { label: 'Mega Cap ($200B+)', min: 200_000_000_000 },
  large: { label: 'Large Cap ($10-200B)', min: 10_000_000_000, max: 200_000_000_000 },
  mid: { label: 'Mid Cap ($2-10B)', min: 2_000_000_000, max: 10_000_000_000 },
  small: { label: 'Small Cap ($300M-2B)', min: 300_000_000, max: 2_000_000_000 },
  micro: { label: 'Micro Cap ($50-300M)', min: 50_000_000, max: 300_000_000 },
};

// Sectors list
const SECTORS: Sector[] = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Communication Services', 'Industrials', 'Consumer Defensive',
  'Energy', 'Basic Materials', 'Real Estate', 'Utilities'
];

interface SavedScreen {
  id: string;
  name: string;
  query: string;
  criteria: ScreenerCriteria;
  savedAt: string;
}

// =====================
// Applied Filters Card
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

// =====================
// Quick Screens
// =====================
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

// =====================
// Saved Screens
// =====================
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

// Filter options constants
const EXCHANGES: Exchange[] = ['NYSE', 'NASDAQ', 'AMEX'];
const INDICES: { value: Index; label: string }[] = [
  { value: 'sp500', label: 'S&P 500' },
  { value: 'djia', label: 'Dow Jones' },
  { value: 'nasdaq100', label: 'NASDAQ 100' },
  { value: 'russell2000', label: 'Russell 2000' },
];
const RSI_FILTERS: { value: RSIFilter; label: string }[] = [
  { value: 'oversold_30', label: 'Oversold (<30)' },
  { value: 'oversold_40', label: 'Oversold (<40)' },
  { value: 'overbought_60', label: 'Overbought (>60)' },
  { value: 'overbought_70', label: 'Overbought (>70)' },
  { value: 'not_oversold', label: 'Not Oversold (>30)' },
  { value: 'not_overbought', label: 'Not Overbought (<70)' },
];
const SMA_FILTERS: { value: SMAFilter; label: string }[] = [
  { value: 'price_above', label: 'Price Above SMA' },
  { value: 'price_below', label: 'Price Below SMA' },
  { value: 'cross_above', label: 'Price Crossed Above' },
  { value: 'cross_below', label: 'Price Crossed Below' },
];
const HIGHLOWS: { value: HighLow52W; label: string }[] = [
  { value: 'new_high', label: 'New 52-Week High' },
  { value: 'new_low', label: 'New 52-Week Low' },
  { value: 'near_high', label: 'Near 52-Week High (5%)' },
  { value: 'near_low', label: 'Near 52-Week Low (5%)' },
];

// =====================
// Advanced Filters Sheet
// =====================
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
    minPlaceholder = "Min", 
    maxPlaceholder = "Max",
    suffix = ""
  }: { 
    label: string; 
    minKey: keyof ScreenerCriteria; 
    maxKey: keyof ScreenerCriteria;
    minPlaceholder?: string;
    maxPlaceholder?: string;
    suffix?: string;
  }) => (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 gap-2 mt-1.5">
        <Input
          type="number"
          placeholder={minPlaceholder}
          className="h-8 text-sm"
          value={(localCriteria[minKey] as number) ?? ''}
          onChange={(e) => setLocalCriteria(f => ({ ...f, [minKey]: e.target.value ? Number(e.target.value) : undefined }))}
        />
        <Input
          type="number"
          placeholder={maxPlaceholder}
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
          <SheetDescription>67+ Finviz-style filter criteria</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="descriptive" className="mt-2">
          <TabsList className="w-full justify-start px-4 h-9">
            <TabsTrigger value="descriptive" className="text-xs">Descriptive</TabsTrigger>
            <TabsTrigger value="fundamental" className="text-xs">Fundamental</TabsTrigger>
            <TabsTrigger value="technical" className="text-xs">Technical</TabsTrigger>
          </TabsList>

          {/* Descriptive Tab */}
          <TabsContent value="descriptive" className="m-0">
            <ScrollArea className="h-[calc(100vh-220px)] px-4">
              <div className="space-y-5 py-4">
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

                <NumberRangeInput label="Price ($)" minKey="minPrice" maxKey="maxPrice" minPlaceholder="$0" maxPlaceholder="No max" />
                <NumberRangeInput label="Volume" minKey="minVolume" maxKey="maxVolume" minPlaceholder="0" maxPlaceholder="No max" />
                <NumberRangeInput label="Avg Volume" minKey="minAvgVolume" maxKey="maxAvgVolume" />
                <NumberRangeInput label="Relative Volume" minKey="minRelativeVolume" maxKey="maxRelativeVolume" minPlaceholder="1x" maxPlaceholder="No max" />
                <NumberRangeInput label="Float Short (%)" minKey="minFloatShort" maxKey="maxFloatShort" />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Fundamental Tab */}
          <TabsContent value="fundamental" className="m-0">
            <ScrollArea className="h-[calc(100vh-220px)] px-4">
              <div className="space-y-5 py-4">
                <FilterSection title="Valuation">
                  <div className="space-y-3">
                    <NumberRangeInput label="P/E Ratio" minKey="minPE" maxKey="maxPE" />
                    <NumberRangeInput label="Forward P/E" minKey="minForwardPE" maxKey="maxForwardPE" />
                    <NumberRangeInput label="PEG Ratio" minKey="minPEG" maxKey="maxPEG" />
                    <NumberRangeInput label="P/S Ratio" minKey="minPS" maxKey="maxPS" />
                    <NumberRangeInput label="P/B Ratio" minKey="minPB" maxKey="maxPB" />
                    <NumberRangeInput label="EV/EBITDA" minKey="minEVEBITDA" maxKey="maxEVEBITDA" />
                  </div>
                </FilterSection>

                <FilterSection title="Dividends">
                  <NumberRangeInput label="Dividend Yield (%)" minKey="minDividendYield" maxKey="maxDividendYield" />
                  <NumberRangeInput label="Payout Ratio (%)" minKey="minPayoutRatio" maxKey="maxPayoutRatio" />
                </FilterSection>

                <FilterSection title="Profitability">
                  <div className="space-y-3">
                    <NumberRangeInput label="ROE (%)" minKey="minROE" maxKey="maxROE" />
                    <NumberRangeInput label="ROA (%)" minKey="minROA" maxKey="maxROA" />
                    <NumberRangeInput label="ROI (%)" minKey="minROI" maxKey="maxROI" />
                    <NumberRangeInput label="Gross Margin (%)" minKey="minGrossMargin" maxKey="maxGrossMargin" />
                    <NumberRangeInput label="Operating Margin (%)" minKey="minOperatingMargin" maxKey="maxOperatingMargin" />
                    <NumberRangeInput label="Net Margin (%)" minKey="minNetMargin" maxKey="maxNetMargin" />
                  </div>
                </FilterSection>

                <FilterSection title="Growth">
                  <div className="space-y-3">
                    <NumberRangeInput label="EPS Growth This Year (%)" minKey="minEPSGrowthThisYear" maxKey="maxEPSGrowthThisYear" />
                    <NumberRangeInput label="EPS Growth Next Year (%)" minKey="minEPSGrowthNextYear" maxKey="maxEPSGrowthNextYear" />
                    <NumberRangeInput label="Sales Growth QoQ (%)" minKey="minSalesGrowthQoQ" maxKey="maxSalesGrowthQoQ" />
                  </div>
                </FilterSection>

                <FilterSection title="Financial Health">
                  <div className="space-y-3">
                    <NumberRangeInput label="Current Ratio" minKey="minCurrentRatio" maxKey="maxCurrentRatio" />
                    <NumberRangeInput label="Quick Ratio" minKey="minQuickRatio" maxKey="maxQuickRatio" />
                    <NumberRangeInput label="Debt/Equity" minKey="minDebtEquity" maxKey="maxDebtEquity" />
                  </div>
                </FilterSection>

                <FilterSection title="Ownership">
                  <div className="space-y-3">
                    <NumberRangeInput label="Insider Ownership (%)" minKey="minInsiderOwnership" maxKey="maxInsiderOwnership" />
                    <NumberRangeInput label="Institutional Ownership (%)" minKey="minInstitutionalOwnership" maxKey="maxInstitutionalOwnership" />
                  </div>
                </FilterSection>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Technical Tab */}
          <TabsContent value="technical" className="m-0">
            <ScrollArea className="h-[calc(100vh-220px)] px-4">
              <div className="space-y-5 py-4">
                <FilterSection title="Performance">
                  <div className="space-y-3">
                    <NumberRangeInput label="Today (%)" minKey="minPerfToday" maxKey="maxPerfToday" />
                    <NumberRangeInput label="Week (%)" minKey="minPerfWeek" maxKey="maxPerfWeek" />
                    <NumberRangeInput label="Month (%)" minKey="minPerfMonth" maxKey="maxPerfMonth" />
                    <NumberRangeInput label="Quarter (%)" minKey="minPerfQuarter" maxKey="maxPerfQuarter" />
                    <NumberRangeInput label="Year (%)" minKey="minPerfYear" maxKey="maxPerfYear" />
                    <NumberRangeInput label="YTD (%)" minKey="minPerfYTD" maxKey="maxPerfYTD" />
                  </div>
                </FilterSection>

                <FilterSection title="52-Week Range">
                <Select
                    value={localCriteria.highLow52W || 'any'}
                    onValueChange={(value) => setLocalCriteria(f => ({ ...f, highLow52W: value === 'any' ? undefined : value as HighLow52W }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {HIGHLOWS.map((hl) => (
                        <SelectItem key={hl.value} value={hl.value}>{hl.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterSection>

                <FilterSection title="RSI (14)">
                <Select
                    value={localCriteria.rsiFilter || 'any'}
                    onValueChange={(value) => setLocalCriteria(f => ({ ...f, rsiFilter: value === 'any' ? undefined : value as RSIFilter }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Any RSI" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any RSI</SelectItem>
                      {RSI_FILTERS.map((rsi) => (
                        <SelectItem key={rsi.value} value={rsi.value}>{rsi.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterSection>

                <FilterSection title="Moving Averages">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">SMA 20</Label>
                      <Select
                        value={localCriteria.sma20 || 'any'}
                        onValueChange={(value) => setLocalCriteria(f => ({ ...f, sma20: value === 'any' ? undefined : value as SMAFilter }))}
                      >
                        <SelectTrigger className="h-8 text-sm mt-1">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          {SMA_FILTERS.map((sma) => (
                            <SelectItem key={sma.value} value={sma.value}>{sma.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">SMA 50</Label>
                      <Select
                        value={localCriteria.sma50 || 'any'}
                        onValueChange={(value) => setLocalCriteria(f => ({ ...f, sma50: value === 'any' ? undefined : value as SMAFilter }))}
                      >
                        <SelectTrigger className="h-8 text-sm mt-1">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          {SMA_FILTERS.map((sma) => (
                            <SelectItem key={sma.value} value={sma.value}>{sma.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">SMA 200</Label>
                      <Select
                        value={localCriteria.sma200 || 'any'}
                        onValueChange={(value) => setLocalCriteria(f => ({ ...f, sma200: value === 'any' ? undefined : value as SMAFilter }))}
                      >
                        <SelectTrigger className="h-8 text-sm mt-1">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          {SMA_FILTERS.map((sma) => (
                            <SelectItem key={sma.value} value={sma.value}>{sma.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </FilterSection>

                <FilterSection title="Volatility">
                  <div className="space-y-3">
                    <NumberRangeInput label="Beta" minKey="minBeta" maxKey="maxBeta" />
                    <NumberRangeInput label="Volatility (%)" minKey="minVolatility" maxKey="maxVolatility" />
                    <NumberRangeInput label="ATR" minKey="minATR" maxKey="maxATR" />
                  </div>
                </FilterSection>

                <FilterSection title="Gaps">
                  <div className="space-y-3">
                    <NumberRangeInput label="Gap Up (%)" minKey="minGapUp" maxKey="maxGapUp" />
                    <NumberRangeInput label="Gap Down (%)" minKey="minGapDown" maxKey="maxGapDown" />
                  </div>
                </FilterSection>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

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
// Main Component
// =====================
export default function Screener() {
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

  // Handle row click - navigate to ticker detail page
  const handleRowClick = (stock: ScreenerResult) => {
    navigate(`/stock/${stock.ticker}`);
  };

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
      criteria,
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
    </div>
  );
}
