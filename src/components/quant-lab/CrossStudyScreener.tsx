import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Globe, TrendingUp, TrendingDown, Target, Percent, Calendar, Search, Filter, 
  ArrowUpDown, Loader2, BarChart3, Download, Zap, Play, ExternalLink,
  ChevronDown, ChevronUp, Star, Activity, Gauge, LineChart, Volume2,
  Shield, Layers, Mountain, GitBranch
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// All Quant Lab study categories - MUST match exactly with STUDY_DEFINITIONS in QuantLab.tsx
// These are the real, runnable studies in the system
const STUDY_CATEGORIES = [
  {
    id: 'conditional',
    name: 'Conditional',
    icon: GitBranch,
    color: 'text-purple-500',
    studies: [
      { id: 'after_down_x', name: 'After Down X%', description: 'What happens after X% drops?' },
      { id: 'after_up_x', name: 'After Up X%', description: 'What happens after X% gains?' },
      { id: 'after_consecutive_days', name: 'After Consecutive Days', description: 'After N up/down days in a row' },
      { id: 'after_high_volume', name: 'After High Volume', description: 'After volume spike days' },
      { id: 'after_gap', name: 'After Gap', description: 'After gap up/down' },
      { id: 'below_ma', name: 'Extended from MA', description: 'When extended from moving average' },
    ]
  },
  {
    id: 'basic',
    name: 'Basic Stats',
    icon: BarChart3,
    color: 'text-blue-500',
    studies: [
      { id: 'daily_close_gt_open', name: 'Intraday Direction', description: 'How often closes above open?' },
      { id: 'daily_close_gt_prior', name: 'Daily Win Rate', description: 'How often up vs prior day?' },
      { id: 'daily_return_distribution', name: 'Return Profile', description: 'Daily return distribution' },
      { id: 'up_down_streaks', name: 'Win & Loss Streaks', description: 'Streak patterns' },
    ]
  },
  {
    id: 'technical',
    name: 'Technical',
    icon: LineChart,
    color: 'text-cyan-500',
    studies: [
      { id: 'rsi_analysis', name: 'RSI (Overbought/Oversold)', description: 'RSI momentum indicator' },
      { id: 'moving_average_analysis', name: 'Moving Averages', description: 'Price vs MA trend' },
      { id: 'trend_strength', name: 'Trend Strength Score', description: 'Current trend strength' },
      { id: 'macd_analysis', name: 'MACD Momentum', description: 'MACD crossovers' },
      { id: 'bollinger_analysis', name: 'Bollinger Bands', description: 'Price extremes' },
      { id: 'stochastic_analysis', name: 'Stochastic Oscillator', description: 'Range position' },
    ]
  },
  {
    id: 'volatility',
    name: 'Risk',
    icon: Shield,
    color: 'text-orange-500',
    studies: [
      { id: 'volatility_analysis', name: 'Volatility Profile', description: 'How much it moves' },
      { id: 'drawdown_analysis', name: 'Drawdown Analysis', description: 'Max loss from peak' },
      { id: 'mean_reversion', name: 'Mean Reversion', description: 'Do big moves reverse?' },
    ]
  },
  {
    id: 'patterns',
    name: 'Patterns',
    icon: Layers,
    color: 'text-emerald-500',
    studies: [
      { id: 'gap_analysis', name: 'Gap Analysis', description: 'Do gaps fill?' },
      { id: 'range_analysis', name: 'Range Patterns', description: 'Inside/outside days' },
      { id: 'high_low_analysis', name: 'Breakout Analysis', description: 'After new highs/lows' },
      { id: 'close_to_open_analysis', name: 'Close vs Open', description: 'Where price closes in range' },
    ]
  },
  {
    id: 'seasonality',
    name: 'Timing',
    icon: Calendar,
    color: 'text-pink-500',
    studies: [
      { id: 'day_of_week_returns', name: 'Best Days of the Week', description: 'Which weekdays perform best?' },
      { id: 'month_of_year_returns', name: 'Best Months', description: 'Monthly patterns' },
    ]
  },
  {
    id: 'volume',
    name: 'Volume',
    icon: Volume2,
    color: 'text-indigo-500',
    studies: [
      { id: 'volume_analysis', name: 'Volume Profile', description: 'Accumulation vs distribution' },
    ]
  },
  {
    id: 'projections',
    name: 'Projections',
    icon: Target,
    color: 'text-amber-500',
    studies: [
      { id: 'price_targets', name: 'Price Targets', description: 'Statistical price projections' },
    ]
  },
];

// Flatten all studies for quick lookup
const ALL_STUDIES = STUDY_CATEGORIES.flatMap(cat => 
  cat.studies.map(s => ({ ...s, category: cat.id, categoryName: cat.name, color: cat.color, Icon: cat.icon }))
);

interface ScreenerFilters {
  minProbability: number;
  maxProbability: number;
  minExpectedReturn: number | null;
  maxExpectedReturn: number | null;
  minSampleSize: number;
  studyCategories: string[];
  studyTypes: string[];
  sectors: string[];
  marketCapTiers: string[];
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  limit: number;
  // NEW: Enhanced filters
  onlyActiveSignals: boolean;
  lookforwardDays: number;
  minConfluence: number | null;
}

interface ScreenedStudyResult {
  symbol: string;
  name: string;
  sector: string | null;
  market_cap_tier: string | null;
  study_id: string;
  study_name: string;
  study_category: string;
  probability_score: number;
  expected_return: number;
  sample_size: number;
  win_rate: number;
  avg_gain: number;
  avg_loss: number;
  confidence_level: string;
  last_signal_date: string | null;
  signal_active: boolean;
  // Params used in the screener - pass these to the study for consistent results
  study_params?: Record<string, any>;
}

interface CrossStudyScreenerProps {
  // Updated callback signature to include params for reproducible results
  onRunStudy?: (studyId: string, ticker: string, params?: Record<string, any>) => void;
  onSelectTicker?: (ticker: string) => void;
}

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
  { 
    name: '🔥 Top Win Rates',
    minProb: 80, 
    studyCategories: [],
    description: 'Studies with 80%+ historical win rates'
  },
  { 
    name: '🟢 Active Signals',
    minProb: 70, 
    studyCategories: ['conditional'],
    onlyActiveSignals: true,
    description: 'Currently triggered conditions'
  },
  { 
    name: '📈 Momentum Signals',
    minProb: 70, 
    studyCategories: ['conditional', 'technical'],
    description: 'Technical & conditional setups'
  },
  { 
    name: '💰 High Return Setups',
    minProb: 65, 
    minReturn: 5,
    description: 'Expected return >5%'
  },
  { 
    name: '📊 Pattern Setups',
    minProb: 70, 
    studyCategories: ['patterns', 'volatility'],
    description: 'Price pattern & risk studies'
  },
];

export function CrossStudyScreener({ onRunStudy, onSelectTicker }: CrossStudyScreenerProps) {
  const { toast } = useToast();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isScreening, setIsScreening] = useState(false);
  const [results, setResults] = useState<ScreenedStudyResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  const [filters, setFilters] = useState<ScreenerFilters>({
    minProbability: 70,
    maxProbability: 100,
    minExpectedReturn: null,
    maxExpectedReturn: null,
    minSampleSize: 10,
    studyCategories: [],
    studyTypes: [],
    sectors: [],
    marketCapTiers: [],
    sortBy: 'probability_score',
    sortOrder: 'DESC',
    limit: 50,
    // NEW: Enhanced filters
    onlyActiveSignals: false,
    lookforwardDays: 5,
    minConfluence: null,
  });

  const runScreen = async (customFilters?: Partial<ScreenerFilters>) => {
    const activeFilters = { ...filters, ...customFilters };
    setIsScreening(true);

    try {
      const { data, error } = await supabase.functions.invoke('screen-probability', {
        body: {
          mode: 'cross_study',
          // IMPORTANT: force real study execution so results are never mocked
          // (the backend will still prefer cached database scores when available)
          runRealStudies: true,

          minProbability: activeFilters.minProbability,
          maxProbability: activeFilters.maxProbability,
          minExpectedReturn: activeFilters.minExpectedReturn,
          maxExpectedReturn: activeFilters.maxExpectedReturn,
          minSampleSize: activeFilters.minSampleSize,
          studyCategories: activeFilters.studyCategories.length > 0 ? activeFilters.studyCategories : null,
          studyTypes: activeFilters.studyTypes.length > 0 ? activeFilters.studyTypes : null,
          sectors: activeFilters.sectors.length > 0 ? activeFilters.sectors : null,
          marketCapTiers: activeFilters.marketCapTiers.length > 0 ? activeFilters.marketCapTiers : null,
          sortBy: activeFilters.sortBy,
          sortOrder: activeFilters.sortOrder,
          limit: activeFilters.limit,
          onlyActiveSignals: activeFilters.onlyActiveSignals,
          lookforwardDays: activeFilters.lookforwardDays,
          minConfluence: activeFilters.minConfluence,
        }
      });

      if (error) throw error;

      // Transform results to include study metadata
      const enrichedResults = (data.results || []).map((r: any) => {
        const studyInfo = ALL_STUDIES.find(s => s.id === r.study_id) || {
          name: r.study_name || r.event_type || 'Unknown',
          category: r.study_category || 'basic',
          categoryName: 'Basic Stats'
        };
        return {
          ...r,
          study_name: studyInfo.name,
          study_category: studyInfo.category,
        };
      });

      setResults(enrichedResults);
      setTotalCount(data.totalCount || enrichedResults.length);

      toast({
        title: 'Cross-Study Screen Complete',
        description: `Found ${enrichedResults.length} high-probability study setups`,
      });
    } catch (err) {
      console.error('Cross-study screening error:', err);
      // CRITICAL: never show random demo results; surface the error instead
      setResults([]);
      setTotalCount(0);
      toast({
        title: 'Screen failed',
        description: 'Could not run the cross-study screen. Please retry in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsScreening(false);
    }
  };

  const generateDemoResults = () => {
    const demoTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'JNJ', 'UNH', 'XOM', 'PG', 'HD', 'MA'];
    const demoResults: ScreenedStudyResult[] = [];
    
    demoTickers.forEach(ticker => {
      // Pick 2-4 random studies for each ticker
      const studyCount = 2 + Math.floor(Math.random() * 3);
      const shuffledStudies = [...ALL_STUDIES].sort(() => Math.random() - 0.5).slice(0, studyCount);
      
      shuffledStudies.forEach(study => {
        const probability = filters.minProbability + Math.random() * (100 - filters.minProbability);
        if (probability >= filters.minProbability) {
          demoResults.push({
            symbol: ticker,
            name: `${ticker} Inc.`,
            sector: allSectors[Math.floor(Math.random() * allSectors.length)],
            market_cap_tier: allMarketCapTiers[Math.floor(Math.random() * allMarketCapTiers.length)].value,
            study_id: study.id,
            study_name: study.name,
            study_category: study.category,
            probability_score: probability,
            expected_return: (Math.random() * 10) - 1,
            sample_size: 10 + Math.floor(Math.random() * 50),
            win_rate: probability - Math.random() * 5,
            avg_gain: 2 + Math.random() * 6,
            avg_loss: -(1 + Math.random() * 3),
            confidence_level: probability >= 80 ? 'high' : probability >= 65 ? 'medium' : 'low',
            last_signal_date: new Date().toISOString(),
            signal_active: Math.random() > 0.3,
          });
        }
      });
    });
    
    // Sort by probability and limit
    const sortedResults = demoResults
      .sort((a, b) => b.probability_score - a.probability_score)
      .slice(0, filters.limit);
    
    setResults(sortedResults);
    setTotalCount(sortedResults.length);
    
    toast({
      title: 'Demo Results Generated',
      description: `Showing ${sortedResults.length} sample study setups. Connect real data for live results.`,
    });
  };

  const applyQuickScreen = (screen: typeof quickScreens[0]) => {
    const newFilters: Partial<ScreenerFilters> = {
      minProbability: screen.minProb,
      studyCategories: screen.studyCategories || [],
    };
    if ('minReturn' in screen && screen.minReturn) newFilters.minExpectedReturn = screen.minReturn;
    
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

  const handleRowClick = (result: ScreenedStudyResult) => {
    if (onSelectTicker) {
      onSelectTicker(result.symbol);
    }
    if (onRunStudy) {
      // Pass the study_params from the screener result so the study runs with identical settings
      onRunStudy(result.study_id, result.symbol, result.study_params);
    }
  };

  const exportToCsv = () => {
    if (results.length === 0) return;
    
    const headers = ['Symbol', 'Name', 'Sector', 'Study', 'Category', 'Probability', 'Expected Return', 'Win Rate', 'Avg Gain', 'Avg Loss', 'Sample Size', 'Signal Active'];
    const rows = results.map(r => [
      r.symbol,
      r.name,
      r.sector || '',
      r.study_name,
      r.study_category,
      r.probability_score.toFixed(1),
      r.expected_return.toFixed(2),
      r.win_rate.toFixed(1),
      r.avg_gain.toFixed(2),
      r.avg_loss.toFixed(2),
      r.sample_size,
      r.signal_active ? 'Yes' : 'No'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cross-study-screen-${new Date().toISOString().split('T')[0]}.csv`;
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
    if (ret >= 5) return 'text-green-500';
    if (ret >= 2) return 'text-emerald-500';
    if (ret > 0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCategoryInfo = (categoryId: string) => {
    const cat = STUDY_CATEGORIES.find(c => c.id === categoryId);
    return cat || { name: categoryId, color: 'text-muted-foreground', icon: BarChart3 };
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Studies</span>
            </div>
            <p className="text-lg font-semibold mt-1">{ALL_STUDIES.length}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Found</span>
            </div>
            <p className="text-lg font-semibold mt-1">{totalCount}</p>
            <p className="text-xs text-muted-foreground">Setups</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Min Win</span>
            </div>
            <p className="text-lg font-semibold mt-1">{filters.minProbability}%</p>
            <p className="text-xs text-muted-foreground">Threshold</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Categories</span>
            </div>
            <p className="text-lg font-semibold mt-1">{filters.studyCategories.length || 'All'}</p>
            <p className="text-xs text-muted-foreground">Selected</p>
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
                title={screen.description}
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
            Screen All Studies
          </CardTitle>
          <CardDescription>
            Find high-probability setups across ALL quantitative studies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Probability Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Minimum Win Rate</Label>
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

          {/* Study Categories Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Study Categories</Label>
            <div className="flex flex-wrap gap-2">
              {STUDY_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Badge
                    key={cat.id}
                    variant={filters.studyCategories.includes(cat.id) ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer transition-colors",
                      filters.studyCategories.includes(cat.id) && "bg-primary"
                    )}
                    onClick={() => toggleArrayFilter(
                      filters.studyCategories,
                      cat.id,
                      (arr) => setFilters(f => ({ ...f, studyCategories: arr }))
                    )}
                  >
                    <Icon className={cn("h-3 w-3 mr-1", !filters.studyCategories.includes(cat.id) && cat.color)} />
                    {cat.name}
                  </Badge>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {filters.studyCategories.length === 0 ? 'All categories selected' : `${filters.studyCategories.length} categories selected`}
            </p>
          </div>

          {/* Basic Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Min Sample</Label>
              <Select
                value={String(filters.minSampleSize)}
                onValueChange={(val) => setFilters(f => ({ ...f, minSampleSize: Number(val) }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5+ occurrences</SelectItem>
                  <SelectItem value="10">10+ occurrences</SelectItem>
                  <SelectItem value="20">20+ occurrences</SelectItem>
                  <SelectItem value="50">50+ occurrences</SelectItem>
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
                  <SelectItem value="probability_score">Win Rate</SelectItem>
                  <SelectItem value="expected_return">Expected Return</SelectItem>
                  <SelectItem value="sample_size">Sample Size</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Results</Label>
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Order</Label>
              <Select
                value={filters.sortOrder}
                onValueChange={(val: 'ASC' | 'DESC') => setFilters(f => ({ ...f, sortOrder: val }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESC">Highest First</SelectItem>
                  <SelectItem value="ASC">Lowest First</SelectItem>
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
                  Screening All Studies...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Screen All Studies
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
                High-Probability Study Setups
              </CardTitle>
              <Badge variant="secondary">{results.length} results</Badge>
            </div>
            <CardDescription className="text-xs">
              Click any row to run that study on the ticker
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[450px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 bg-card z-10">Ticker</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10">Study</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 text-right">Win %</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 text-right">Exp Ret</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 text-right">Sample</TableHead>
                    <TableHead className="sticky top-0 bg-card z-10 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, idx) => {
                    const catInfo = getCategoryInfo(r.study_category);
                    const CatIcon = catInfo.icon;
                    return (
                      <TableRow 
                        key={`${r.symbol}-${r.study_id}-${idx}`} 
                        className="hover:bg-muted/30 cursor-pointer group"
                        onClick={() => handleRowClick(r)}
                      >
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
                          <div className="flex items-center gap-2">
                            <CatIcon className={cn("h-4 w-4", catInfo.color)} />
                            <div>
                              <p className="text-sm font-medium">{r.study_name}</p>
                              <p className="text-xs text-muted-foreground">{catInfo.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-bold ${getProbabilityColor(r.probability_score)}`}>
                          {r.probability_score.toFixed(1)}%
                        </TableCell>
                        <TableCell className={`text-right font-medium ${getReturnColor(r.expected_return)}`}>
                          {r.expected_return > 0 ? '+' : ''}{r.expected_return.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {r.sample_size}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(r);
                            }}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Run
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Screen Across All Studies</h3>
            <p className="text-sm text-muted-foreground/70 max-w-md mx-auto mb-4">
              Find the highest probability setups across {ALL_STUDIES.length} quantitative studies.
              Each result connects directly to a runnable study.
            </p>
            <Button onClick={() => runScreen()}>
              <Search className="h-4 w-4 mr-2" />
              Run Cross-Study Screen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
