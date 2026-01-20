import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Globe, TrendingUp, Target, Percent, Calendar, Search, Filter, 
  ArrowUpDown, Loader2, BarChart3, Download, RefreshCw, Zap,
  ChevronDown, ChevronUp, Star, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ScreenerFilters {
  minProbability: number;
  maxProbability: number;
  minExpectedReturn: number | null;
  maxExpectedReturn: number | null;
  minSampleSize: number;
  eventTypes: string[];
  sectors: string[];
  marketCapTiers: string[];
  maxDaysUntil: number | null;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  limit: number;
}

interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string | null;
  market_cap_tier: string | null;
  event_type: string;
  probability_score: number;
  expected_return: number;
  sample_size: number;
  win_rate: number;
  avg_gain: number;
  avg_loss: number;
  days_until_event: number;
  next_event_date: string | null;
  confidence_level: string;
}

const allEventTypes = [
  { value: 'earnings', label: 'Earnings', icon: '📊' },
  { value: 'dividend', label: 'Dividend', icon: '💰' },
  { value: 'fomc', label: 'FOMC', icon: '🏛️' },
  { value: 'cpi', label: 'CPI', icon: '📈' },
  { value: 'jobs', label: 'Jobs', icon: '👷' },
  { value: 'gdp', label: 'GDP', icon: '📉' },
];

const allSectors = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Communication Services', 'Industrials', 'Consumer Defensive',
  'Energy', 'Basic Materials', 'Real Estate', 'Utilities'
];

const allMarketCapTiers = [
  { value: 'mega', label: 'Mega Cap', desc: '>$200B' },
  { value: 'large', label: 'Large Cap', desc: '$10-200B' },
  { value: 'mid', label: 'Mid Cap', desc: '$2-10B' },
  { value: 'small', label: 'Small Cap', desc: '$300M-2B' },
  { value: 'micro', label: 'Micro Cap', desc: '<$300M' },
];

const quickScreens = [
  { name: 'High Probability Today', minProb: 80, maxDays: 1, description: 'Events happening today with 80%+ probability' },
  { name: 'This Week Best Bets', minProb: 75, maxDays: 7, description: 'Top opportunities this week' },
  { name: 'High Return Setups', minProb: 65, minReturn: 5, maxDays: 14, description: 'Expected return >5%' },
  { name: 'Conservative Plays', minProb: 85, minSample: 20, maxDays: 30, description: 'High probability with large sample size' },
];

export function UniverseScreener() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('screen');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isScreening, setIsScreening] = useState(false);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  const [filters, setFilters] = useState<ScreenerFilters>({
    minProbability: 70,
    maxProbability: 100,
    minExpectedReturn: null,
    maxExpectedReturn: null,
    minSampleSize: 10,
    eventTypes: [],
    sectors: [],
    marketCapTiers: [],
    maxDaysUntil: 14,
    sortBy: 'probability_score',
    sortOrder: 'DESC',
    limit: 50,
  });

  const runScreen = async (customFilters?: Partial<ScreenerFilters>) => {
    const activeFilters = { ...filters, ...customFilters };
    setIsScreening(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('screen-probability', {
        body: {
          minProbability: activeFilters.minProbability,
          maxProbability: activeFilters.maxProbability,
          minExpectedReturn: activeFilters.minExpectedReturn,
          maxExpectedReturn: activeFilters.maxExpectedReturn,
          minSampleSize: activeFilters.minSampleSize,
          eventTypes: activeFilters.eventTypes.length > 0 ? activeFilters.eventTypes : null,
          sectors: activeFilters.sectors.length > 0 ? activeFilters.sectors : null,
          marketCapTiers: activeFilters.marketCapTiers.length > 0 ? activeFilters.marketCapTiers : null,
          maxDaysUntilEvent: activeFilters.maxDaysUntil,
          sortBy: activeFilters.sortBy,
          sortOrder: activeFilters.sortOrder,
          limit: activeFilters.limit,
        }
      });

      if (error) throw error;
      
      setResults(data.results || []);
      setTotalCount(data.totalCount || data.results?.length || 0);
      
      toast({
        title: 'Universe Screened',
        description: `Found ${data.results?.length || 0} high-probability setups`,
      });
    } catch (err) {
      console.error('Universe screening error:', err);
      toast({
        title: 'Screening Failed',
        description: 'Unable to screen universe. Ensure data has been synced.',
        variant: 'destructive',
      });
    } finally {
      setIsScreening(false);
    }
  };

  const applyQuickScreen = (screen: typeof quickScreens[0]) => {
    const newFilters: Partial<ScreenerFilters> = {
      minProbability: screen.minProb,
      maxDaysUntil: screen.maxDays,
    };
    if (screen.minReturn) newFilters.minExpectedReturn = screen.minReturn;
    if (screen.minSample) newFilters.minSampleSize = screen.minSample;
    
    setFilters(f => ({ ...f, ...newFilters }));
    runScreen(newFilters);
  };

  const toggleArrayFilter = (arr: string[], value: string, setter: (arr: string[]) => void) => {
    if (arr.includes(value)) {
      setter(arr.filter(v => v !== value));
    } else {
      setter([...arr, value]);
    }
  };

  const exportToCsv = () => {
    if (results.length === 0) return;
    
    const headers = ['Symbol', 'Name', 'Sector', 'Market Cap', 'Event', 'Probability', 'Expected Return', 'Win Rate', 'Sample Size', 'Days Until', 'Next Event'];
    const rows = results.map(r => [
      r.symbol,
      r.name,
      r.sector || '',
      r.market_cap_tier || '',
      r.event_type,
      r.probability_score,
      r.expected_return,
      r.win_rate,
      r.sample_size,
      r.days_until_event,
      r.next_event_date || ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `probability-screen-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 85) return 'text-green-500';
    if (prob >= 75) return 'text-emerald-500';
    if (prob >= 65) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getReturnColor = (ret: number) => {
    if (ret >= 7) return 'text-green-500';
    if (ret >= 4) return 'text-emerald-500';
    if (ret >= 2) return 'text-yellow-500';
    if (ret > 0) return 'text-orange-500';
    return 'text-red-500';
  };

  const getConfidenceBadge = (level: string, sampleSize: number) => {
    if (sampleSize >= 30 || level === 'high') {
      return <Badge className="bg-green-500/20 text-green-500 text-xs">High</Badge>;
    }
    if (sampleSize >= 15 || level === 'medium') {
      return <Badge className="bg-yellow-500/20 text-yellow-500 text-xs">Med</Badge>;
    }
    return <Badge className="bg-orange-500/20 text-orange-500 text-xs">Low</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Universe</span>
            </div>
            <p className="text-lg font-semibold mt-1">10,000+</p>
            <p className="text-xs text-muted-foreground">Tickers</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Found</span>
            </div>
            <p className="text-lg font-semibold mt-1">{totalCount}</p>
            <p className="text-xs text-muted-foreground">Matches</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Min Prob</span>
            </div>
            <p className="text-lg font-semibold mt-1">{filters.minProbability}%</p>
            <p className="text-xs text-muted-foreground">Threshold</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Window</span>
            </div>
            <p className="text-lg font-semibold mt-1">{filters.maxDaysUntil || '∞'}</p>
            <p className="text-xs text-muted-foreground">Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Screens */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Quick Screens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickScreens.map((screen) => (
              <Button
                key={screen.name}
                variant="outline"
                size="sm"
                onClick={() => applyQuickScreen(screen)}
                disabled={isScreening}
                className="text-xs"
              >
                {screen.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Screen Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Probability Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Minimum Probability</Label>
              <span className="text-sm font-bold text-primary">{filters.minProbability}%</span>
            </div>
            <Slider
              value={[filters.minProbability]}
              onValueChange={([val]) => setFilters(f => ({ ...f, minProbability: val }))}
              min={50}
              max={95}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50%</span>
              <span>95%</span>
            </div>
          </div>

          {/* Basic Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Time Window</Label>
              <Select
                value={String(filters.maxDaysUntil || 'any')}
                onValueChange={(val) => setFilters(f => ({ ...f, maxDaysUntil: val === 'any' ? null : Number(val) }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Time</SelectItem>
                  <SelectItem value="1">Today Only</SelectItem>
                  <SelectItem value="7">This Week</SelectItem>
                  <SelectItem value="14">2 Weeks</SelectItem>
                  <SelectItem value="30">1 Month</SelectItem>
                  <SelectItem value="90">3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Min Sample Size</Label>
              <Select
                value={String(filters.minSampleSize)}
                onValueChange={(val) => setFilters(f => ({ ...f, minSampleSize: Number(val) }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5+ events</SelectItem>
                  <SelectItem value="10">10+ events</SelectItem>
                  <SelectItem value="20">20+ events</SelectItem>
                  <SelectItem value="50">50+ events</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Sort By</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(val) => setFilters(f => ({ ...f, sortBy: val }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="probability_score">Probability</SelectItem>
                  <SelectItem value="expected_return">Expected Return</SelectItem>
                  <SelectItem value="days_until_event">Days Until Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Results Limit</Label>
              <Select
                value={String(filters.limit)}
                onValueChange={(val) => setFilters(f => ({ ...f, limit: Number(val) }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">Top 25</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                  <SelectItem value="200">Top 200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters (Collapsible) */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                Advanced Filters
                {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Event Types */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Event Types</Label>
                <div className="flex flex-wrap gap-2">
                  {allEventTypes.map((et) => (
                    <Badge
                      key={et.value}
                      variant={filters.eventTypes.includes(et.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter(
                        filters.eventTypes,
                        et.value,
                        (arr) => setFilters(f => ({ ...f, eventTypes: arr }))
                      )}
                    >
                      {et.icon} {et.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Market Cap Tiers */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Market Cap</Label>
                <div className="flex flex-wrap gap-2">
                  {allMarketCapTiers.map((mc) => (
                    <Badge
                      key={mc.value}
                      variant={filters.marketCapTiers.includes(mc.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter(
                        filters.marketCapTiers,
                        mc.value,
                        (arr) => setFilters(f => ({ ...f, marketCapTiers: arr }))
                      )}
                    >
                      {mc.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Sectors */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Sectors</Label>
                <div className="flex flex-wrap gap-1">
                  {allSectors.map((sector) => (
                    <Badge
                      key={sector}
                      variant={filters.sectors.includes(sector) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleArrayFilter(
                        filters.sectors,
                        sector,
                        (arr) => setFilters(f => ({ ...f, sectors: arr }))
                      )}
                    >
                      {sector}
                    </Badge>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={() => runScreen()} disabled={isScreening} className="flex-1">
              {isScreening ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Screening...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Screen Universe
                </>
              )}
            </Button>
            {results.length > 0 && (
              <Button variant="outline" onClick={exportToCsv}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      {results.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                High-Probability Opportunities
              </CardTitle>
              <Badge variant="secondary">{results.length} of {totalCount}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[450px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 bg-card z-10">Symbol</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10">Event</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 text-right">Prob %</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 text-right">Exp Ret</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 text-right">Win/Loss</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 text-right">Sample</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 text-center">Conf</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 text-right">Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, idx) => (
                    <TableRow key={`${r.symbol}-${r.event_type}-${idx}`} className="hover:bg-muted/30">
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">{r.symbol}</span>
                            {r.probability_score >= 85 && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                            {r.sector || 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {r.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${getProbabilityColor(r.probability_score)}`}>
                        {r.probability_score.toFixed(1)}%
                      </TableCell>
                      <TableCell className={`text-right font-medium ${getReturnColor(r.expected_return)}`}>
                        {r.expected_return > 0 ? '+' : ''}{r.expected_return.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <span className="text-green-500">+{r.avg_gain?.toFixed(1) || '0'}%</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-red-500">{r.avg_loss?.toFixed(1) || '0'}%</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {r.sample_size}
                      </TableCell>
                      <TableCell className="text-center">
                        {getConfidenceBadge(r.confidence_level, r.sample_size)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={r.days_until_event <= 1 ? 'destructive' : r.days_until_event <= 7 ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {r.days_until_event}d
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {results.length === 0 && !isScreening && (
        <Card className="bg-card/30 border-dashed">
          <CardContent className="py-16 text-center">
            <Globe className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Screen the Entire Market</h3>
            <p className="text-sm text-muted-foreground/70 max-w-md mx-auto mb-4">
              Find high-probability opportunities across 10,000+ tickers. Set your filters and discover
              stocks with the best risk/reward setups.
            </p>
            <Button onClick={() => runScreen()}>
              <Search className="h-4 w-4 mr-2" />
              Run First Screen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
