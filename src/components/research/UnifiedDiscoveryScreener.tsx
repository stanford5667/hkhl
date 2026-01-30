import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, Activity, Zap, Flame, BarChart3, Filter, X, ChevronDown, ChevronUp,
  Building2, DollarSign, Percent, Scale, Target, LineChart, AlertTriangle,
  Clock, Volume2, Gauge, TrendingDown, Calculator, Ratio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { screenStocksFromPolygon, QUICK_SCREENS, type ScreenerResult, type ScreenerFilters } from '@/services/polygonScreenerService';

// =====================
// Tab Configuration
// =====================

const SCREENER_TABS = [
  { id: 'topGainers', label: 'Top Gainers', icon: TrendingUp },
  { id: 'mostActive', label: 'Most Active', icon: Activity },
  { id: 'momentum', label: 'Momentum', icon: Flame },
  { id: 'unusualVolume', label: 'Unusual Vol', icon: Zap },
] as const;

type TabId = typeof SCREENER_TABS[number]['id'];

// =====================
// Filter Configurations - All 19 Metrics
// =====================

const MARKET_CAP_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'mega', label: 'Mega ($200B+)', min: 200_000_000_000, max: undefined },
  { value: 'large', label: 'Large ($10B-$200B)', min: 10_000_000_000, max: 200_000_000_000 },
  { value: 'mid', label: 'Mid ($2B-$10B)', min: 2_000_000_000, max: 10_000_000_000 },
  { value: 'small', label: 'Small ($300M-$2B)', min: 300_000_000, max: 2_000_000_000 },
  { value: 'micro', label: 'Micro (<$300M)', min: 0, max: 300_000_000 },
];

const PE_RATIO_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under10', label: '<10', max: 10 },
  { value: '10to20', label: '10-20', min: 10, max: 20 },
  { value: '20to35', label: '20-35', min: 20, max: 35 },
  { value: 'over35', label: '>35', min: 35 },
  { value: 'negative', label: 'Negative', max: 0 },
];

const FORWARD_PE_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under15', label: '<15', max: 15 },
  { value: '15to25', label: '15-25', min: 15, max: 25 },
  { value: '25to40', label: '25-40', min: 25, max: 40 },
  { value: 'over40', label: '>40', min: 40 },
];

const PEG_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under1', label: '<1 (Undervalued)', max: 1 },
  { value: '1to2', label: '1-2 (Fair)', min: 1, max: 2 },
  { value: 'over2', label: '>2 (Expensive)', min: 2 },
];

const PRICE_TO_BOOK_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under1', label: '<1 (Below Book)', max: 1 },
  { value: '1to3', label: '1-3', min: 1, max: 3 },
  { value: '3to10', label: '3-10', min: 3, max: 10 },
  { value: 'over10', label: '>10', min: 10 },
];

const PRICE_TO_CASH_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under5', label: '<5', max: 5 },
  { value: '5to15', label: '5-15', min: 5, max: 15 },
  { value: '15to30', label: '15-30', min: 15, max: 30 },
  { value: 'over30', label: '>30', min: 30 },
];

const OP_MARGIN_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over30', label: '>30% (Excellent)', min: 30 },
  { value: '20to30', label: '20-30% (Strong)', min: 20, max: 30 },
  { value: '10to20', label: '10-20% (Good)', min: 10, max: 20 },
  { value: '0to10', label: '0-10% (Fair)', min: 0, max: 10 },
  { value: 'negative', label: 'Negative', max: 0 },
];

const EPS_GROWTH_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over50', label: '>50%', min: 50 },
  { value: '20to50', label: '20-50%', min: 20, max: 50 },
  { value: '0to20', label: '0-20%', min: 0, max: 20 },
  { value: 'negative', label: 'Negative', max: 0 },
];

const REVENUE_GROWTH_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over30', label: '>30%', min: 30 },
  { value: '15to30', label: '15-30%', min: 15, max: 30 },
  { value: '0to15', label: '0-15%', min: 0, max: 15 },
  { value: 'negative', label: 'Declining', max: 0 },
];

const EPS_STDDEV_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'low', label: 'Low (<$0.10)', max: 0.10 },
  { value: 'medium', label: 'Medium ($0.10-$0.30)', min: 0.10, max: 0.30 },
  { value: 'high', label: 'High (>$0.30)', min: 0.30 },
];

const DEBT_EQUITY_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under0.5', label: '<0.5 (Low)', max: 0.5 },
  { value: '0.5to1', label: '0.5-1.0 (Moderate)', min: 0.5, max: 1 },
  { value: '1to2', label: '1.0-2.0 (High)', min: 1, max: 2 },
  { value: 'over2', label: '>2.0 (Very High)', min: 2 },
];

const QUICK_RATIO_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over2', label: '>2 (Strong)', min: 2 },
  { value: '1to2', label: '1-2 (Healthy)', min: 1, max: 2 },
  { value: 'under1', label: '<1 (Weak)', max: 1 },
];

const EV_EBITDA_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under10', label: '<10 (Cheap)', max: 10 },
  { value: '10to15', label: '10-15 (Fair)', min: 10, max: 15 },
  { value: '15to25', label: '15-25 (Pricey)', min: 15, max: 25 },
  { value: 'over25', label: '>25 (Expensive)', min: 25 },
];

const VOLATILITY_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under20', label: '<20% (Low)', max: 20 },
  { value: '20to40', label: '20-40% (Medium)', min: 20, max: 40 },
  { value: '40to60', label: '40-60% (High)', min: 40, max: 60 },
  { value: 'over60', label: '>60% (Very High)', min: 60 },
];

const MAX_DRAWDOWN_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under10', label: '<-10% (Minimal)', max: -10 },
  { value: '10to25', label: '-10 to -25%', max: -25, min: -10 },
  { value: '25to50', label: '-25 to -50%', max: -50, min: -25 },
  { value: 'over50', label: '>-50% (Severe)', min: -50 },
];

const SHARPE_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over2', label: '>2 (Excellent)', min: 2 },
  { value: '1to2', label: '1-2 (Good)', min: 1, max: 2 },
  { value: '0to1', label: '0-1 (Fair)', min: 0, max: 1 },
  { value: 'negative', label: '<0 (Poor)', max: 0 },
];

const BETA_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under0.5', label: '<0.5 (Defensive)', max: 0.5 },
  { value: '0.5to1', label: '0.5-1.0 (Low Vol)', min: 0.5, max: 1 },
  { value: '1to1.5', label: '1.0-1.5 (Market)', min: 1, max: 1.5 },
  { value: 'over1.5', label: '>1.5 (Aggressive)', min: 1.5 },
];

const AVG_VOLUME_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over10m', label: '>10M', min: 10_000_000 },
  { value: '5to10m', label: '5-10M', min: 5_000_000, max: 10_000_000 },
  { value: '1to5m', label: '1-5M', min: 1_000_000, max: 5_000_000 },
  { value: '500kto1m', label: '500K-1M', min: 500_000, max: 1_000_000 },
  { value: 'under500k', label: '<500K', max: 500_000 },
];

const BEAT_PROBABILITY_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'high', label: 'High (70%+)', min: 70 },
  { value: 'medium', label: 'Medium (50-70%)', min: 50, max: 70 },
  { value: 'low', label: 'Low (<50%)', max: 50 },
];

const PERFORMANCE_PERIOD_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
  { value: '2w', label: '2 Weeks' },
  { value: '1m', label: '1 Month' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: '2y', label: '2 Years' },
  { value: '3y', label: '3 Years' },
  { value: '5y', label: '5 Years' },
];

const PERFORMANCE_DIRECTION_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'up50', label: '>+50%', min: 50 },
  { value: 'up20', label: '>+20%', min: 20 },
  { value: 'up10', label: '>+10%', min: 10 },
  { value: 'up0', label: 'Positive', min: 0 },
  { value: 'down0', label: 'Negative', max: 0 },
  { value: 'down10', label: '<-10%', max: -10 },
  { value: 'down20', label: '<-20%', max: -20 },
];

// =====================
// Filter State Interface
// =====================

interface FilterState {
  // Valuation
  marketCap: string;
  peRatio: string;
  forwardPE: string;
  peg: string;
  priceToBook: string;
  priceToCash: string;
  evEbitda: string;
  // Profitability & Growth
  opMargin: string;
  epsGrowth: string;
  revenueGrowth: string;
  epsStdDev: string;
  // Stability
  debtEquity: string;
  quickRatio: string;
  // Risk
  volatility: string;
  maxDrawdown: string;
  sharpe: string;
  beta: string;
  // Volume & Earnings
  avgVolume: string;
  beatProbability: string;
  // Performance
  performancePeriod: string;
  performanceDirection: string;
}

const DEFAULT_FILTERS: FilterState = {
  marketCap: 'all',
  peRatio: 'all',
  forwardPE: 'all',
  peg: 'all',
  priceToBook: 'all',
  priceToCash: 'all',
  evEbitda: 'all',
  opMargin: 'all',
  epsGrowth: 'all',
  revenueGrowth: 'all',
  epsStdDev: 'all',
  debtEquity: 'all',
  quickRatio: 'all',
  volatility: 'all',
  maxDrawdown: 'all',
  sharpe: 'all',
  beta: 'all',
  avgVolume: 'all',
  beatProbability: 'all',
  performancePeriod: 'all',
  performanceDirection: 'all',
};

// Filter metadata for display
const FILTER_CONFIG: Record<keyof FilterState, { label: string; options: { value: string; label: string; min?: number; max?: number }[]; icon: React.ElementType; category: string }> = {
  marketCap: { label: 'Market Cap', options: MARKET_CAP_OPTIONS, icon: Building2, category: 'Valuation' },
  peRatio: { label: 'P/E', options: PE_RATIO_OPTIONS, icon: DollarSign, category: 'Valuation' },
  forwardPE: { label: 'Forward P/E', options: FORWARD_PE_OPTIONS, icon: DollarSign, category: 'Valuation' },
  peg: { label: 'PEG', options: PEG_OPTIONS, icon: Ratio, category: 'Valuation' },
  priceToBook: { label: 'P/B', options: PRICE_TO_BOOK_OPTIONS, icon: Calculator, category: 'Valuation' },
  priceToCash: { label: 'P/Cash', options: PRICE_TO_CASH_OPTIONS, icon: DollarSign, category: 'Valuation' },
  evEbitda: { label: 'EV/EBITDA', options: EV_EBITDA_OPTIONS, icon: Calculator, category: 'Valuation' },
  opMargin: { label: 'Op Margin', options: OP_MARGIN_OPTIONS, icon: Percent, category: 'Profitability' },
  epsGrowth: { label: 'EPS Growth', options: EPS_GROWTH_OPTIONS, icon: TrendingUp, category: 'Growth' },
  revenueGrowth: { label: 'Rev Growth', options: REVENUE_GROWTH_OPTIONS, icon: TrendingUp, category: 'Growth' },
  epsStdDev: { label: 'EPS Std Dev', options: EPS_STDDEV_OPTIONS, icon: Gauge, category: 'Stability' },
  debtEquity: { label: 'D/E', options: DEBT_EQUITY_OPTIONS, icon: Scale, category: 'Stability' },
  quickRatio: { label: 'Quick Ratio', options: QUICK_RATIO_OPTIONS, icon: Gauge, category: 'Stability' },
  volatility: { label: 'Volatility', options: VOLATILITY_OPTIONS, icon: Activity, category: 'Risk' },
  maxDrawdown: { label: 'Max DD', options: MAX_DRAWDOWN_OPTIONS, icon: TrendingDown, category: 'Risk' },
  sharpe: { label: 'Sharpe', options: SHARPE_OPTIONS, icon: LineChart, category: 'Risk' },
  beta: { label: 'Beta', options: BETA_OPTIONS, icon: Activity, category: 'Risk' },
  avgVolume: { label: 'Avg Volume', options: AVG_VOLUME_OPTIONS, icon: Volume2, category: 'Volume' },
  beatProbability: { label: 'Beat Prob', options: BEAT_PROBABILITY_OPTIONS, icon: Target, category: 'Earnings' },
  performancePeriod: { label: 'Perf Period', options: PERFORMANCE_PERIOD_OPTIONS, icon: Clock, category: 'Performance' },
  performanceDirection: { label: 'Perf Range', options: PERFORMANCE_DIRECTION_OPTIONS, icon: TrendingUp, category: 'Performance' },
};

// Group filters by category
const FILTER_CATEGORIES = [
  { 
    name: 'Valuation', 
    filters: ['marketCap', 'peRatio', 'forwardPE', 'peg', 'priceToBook', 'priceToCash', 'evEbitda'] as (keyof FilterState)[]
  },
  { 
    name: 'Profitability & Growth', 
    filters: ['opMargin', 'epsGrowth', 'revenueGrowth'] as (keyof FilterState)[]
  },
  { 
    name: 'Stability', 
    filters: ['debtEquity', 'quickRatio', 'epsStdDev'] as (keyof FilterState)[]
  },
  { 
    name: 'Risk', 
    filters: ['volatility', 'maxDrawdown', 'sharpe', 'beta'] as (keyof FilterState)[]
  },
  { 
    name: 'Volume & Earnings', 
    filters: ['avgVolume', 'beatProbability'] as (keyof FilterState)[]
  },
  { 
    name: 'Performance', 
    filters: ['performancePeriod', 'performanceDirection'] as (keyof FilterState)[]
  },
];

// =====================
// Utility Functions
// =====================

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toString();
}

function formatMarketCap(value: number | null): string {
  if (!value) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

// =====================
// Components
// =====================

function StockRow({ stock, onClick }: { stock: ScreenerResult; onClick: () => void }) {
  const isPositive = stock.changePercent >= 0;
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 py-2.5 px-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
    >
      <div className="w-14">
        <span className="text-sm font-semibold text-primary">{stock.symbol}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground truncate block">{stock.name}</span>
      </div>
      <div className="w-16 text-right">
        <span className="text-xs font-medium text-foreground tabular-nums">
          ${stock.price.toFixed(2)}
        </span>
      </div>
      <div className="w-16 text-right hidden sm:block">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {formatMarketCap(stock.marketCap)}
        </span>
      </div>
      <div className="w-14 text-right">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {formatVolume(stock.volume)}
        </span>
      </div>
      <div className={cn(
        'w-16 text-right text-xs font-semibold tabular-nums',
        isPositive ? 'text-emerald-500' : 'text-destructive'
      )}>
        {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
      </div>
    </button>
  );
}

function StockList({ 
  stocks, 
  isLoading, 
  onStockClick 
}: { 
  stocks: ScreenerResult[] | undefined; 
  isLoading: boolean;
  onStockClick: (symbol: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-1 p-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stocks || stocks.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No stocks found matching your filters
      </div>
    );
  }

  return (
    <div className="max-h-[500px] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border sticky top-0 z-10">
        <span className="w-14 text-[10px] font-medium text-muted-foreground">Symbol</span>
        <span className="flex-1 text-[10px] font-medium text-muted-foreground">Name</span>
        <span className="w-16 text-right text-[10px] font-medium text-muted-foreground">Price</span>
        <span className="w-16 text-right text-[10px] font-medium text-muted-foreground hidden sm:block">Mkt Cap</span>
        <span className="w-14 text-right text-[10px] font-medium text-muted-foreground">Volume</span>
        <span className="w-16 text-right text-[10px] font-medium text-muted-foreground">Change</span>
      </div>
      {stocks.map(stock => (
        <StockRow 
          key={stock.symbol} 
          stock={stock} 
          onClick={() => onStockClick(stock.symbol)} 
        />
      ))}
    </div>
  );
}

function FilterDropdown({ 
  label, 
  value, 
  options, 
  onChange,
  icon: Icon
}: { 
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon: React.ElementType;
}) {
  const selectedLabel = options.find(o => o.value === value)?.label || label;
  const isFiltered = value !== 'all';
  
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(
          "h-7 text-[11px] w-full min-w-[100px]",
          isFiltered && "border-primary bg-primary/5"
        )}>
          <SelectValue placeholder={label}>
            <span className={cn(isFiltered && "text-primary font-medium")}>
              {selectedLabel}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ActiveFilterBadges({ 
  filters, 
  onClearFilter,
  onClearAll 
}: { 
  filters: FilterState;
  onClearFilter: (key: keyof FilterState) => void;
  onClearAll: () => void;
}) {
  const activeFilters: { key: keyof FilterState; label: string }[] = [];
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== 'all') {
      const config = FILTER_CONFIG[key as keyof FilterState];
      const opt = config.options.find(o => o.value === value);
      if (opt) {
        activeFilters.push({ 
          key: key as keyof FilterState, 
          label: `${config.label}: ${opt.label}` 
        });
      }
    }
  });

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 border-b border-border bg-muted/20">
      <span className="text-[10px] text-muted-foreground mr-1">Active ({activeFilters.length}):</span>
      {activeFilters.slice(0, 5).map(({ key, label }) => (
        <Badge 
          key={key} 
          variant="secondary" 
          className="h-5 text-[10px] gap-1 cursor-pointer hover:bg-destructive/20"
          onClick={() => onClearFilter(key)}
        >
          {label}
          <X className="h-2.5 w-2.5" />
        </Badge>
      ))}
      {activeFilters.length > 5 && (
        <Badge variant="outline" className="h-5 text-[10px]">
          +{activeFilters.length - 5} more
        </Badge>
      )}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-5 text-[10px] px-2 ml-auto"
        onClick={onClearAll}
      >
        Clear All
      </Button>
    </div>
  );
}

function FilterCategory({ 
  name, 
  filterKeys, 
  filters, 
  onFilterChange 
}: { 
  name: string;
  filterKeys: (keyof FilterState)[];
  filters: FilterState;
  onFilterChange: (key: keyof FilterState) => (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{name}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {filterKeys.map(key => {
          const config = FILTER_CONFIG[key];
          return (
            <FilterDropdown
              key={key}
              label={config.label}
              value={filters[key]}
              options={config.options}
              onChange={onFilterChange(key)}
              icon={config.icon}
            />
          );
        })}
      </div>
    </div>
  );
}

// =====================
// Main Component
// =====================

export function UnifiedDiscoveryScreener() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('topGainers');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const activeFilterCount = useMemo(() => 
    Object.values(filters).filter(v => v !== 'all').length,
    [filters]
  );

  const hasActiveFilters = activeFilterCount > 0;

  // Build query filters based on active tab + fundamental filters
  const buildQueryFilters = (tabFilters: ScreenerFilters): ScreenerFilters => {
    const combined: ScreenerFilters = { ...tabFilters };
    
    // Market Cap filter
    const mcOption = MARKET_CAP_OPTIONS.find(o => o.value === filters.marketCap);
    if (mcOption && filters.marketCap !== 'all') {
      if (mcOption.min !== undefined) combined.minMarketCap = mcOption.min;
      if (mcOption.max !== undefined) combined.maxMarketCap = mcOption.max;
    }

    // Volume filter
    const volOption = AVG_VOLUME_OPTIONS.find(o => o.value === filters.avgVolume);
    if (volOption && filters.avgVolume !== 'all') {
      if (volOption.min !== undefined) combined.minVolume = volOption.min;
    }
    
    return combined;
  };

  // Top Gainers query
  const { data: gainers, isLoading: loadingGainers } = useQuery({
    queryKey: ['screener', 'topGainers-full', filters],
    queryFn: async () => {
      const baseFilters: ScreenerFilters = {
        minChange1D: 2,
        minPrice: 2,
        minVolume: 500000,
        sortBy: 'change',
        sortDirection: 'desc',
        limit: 50,
      };
      const result = await screenStocksFromPolygon(buildQueryFilters(baseFilters));
      return result.results;
    },
    staleTime: 60000,
    enabled: activeTab === 'topGainers',
  });

  // Most Active query
  const { data: mostActive, isLoading: loadingActive } = useQuery({
    queryKey: ['screener', 'mostActive-full', filters],
    queryFn: async () => {
      const baseFilters: ScreenerFilters = {
        minPrice: 1,
        minVolume: 1000000,
        sortBy: 'volume',
        sortDirection: 'desc',
        limit: 50,
      };
      const result = await screenStocksFromPolygon(buildQueryFilters(baseFilters));
      return result.results;
    },
    staleTime: 60000,
    enabled: activeTab === 'mostActive',
  });

  // Momentum query
  const { data: momentum, isLoading: loadingMomentum } = useQuery({
    queryKey: ['screener', 'smallCapMomentum-full', filters],
    queryFn: async () => {
      const screenConfig = QUICK_SCREENS['smallCapMomentum'];
      if (!screenConfig) return [];
      const result = await screenStocksFromPolygon(buildQueryFilters(screenConfig.filters));
      return result.results;
    },
    staleTime: 60000,
    enabled: activeTab === 'momentum',
  });

  // Unusual Volume query
  const { data: unusualVol, isLoading: loadingUnusual } = useQuery({
    queryKey: ['screener', 'unusualVolume-full', filters],
    queryFn: async () => {
      const screenConfig = QUICK_SCREENS['unusualVolume'];
      if (!screenConfig) return [];
      const result = await screenStocksFromPolygon(buildQueryFilters(screenConfig.filters));
      return result.results;
    },
    staleTime: 60000,
    enabled: activeTab === 'unusualVolume',
  });

  const handleStockClick = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  const handleFilterChange = (key: keyof FilterState) => (value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilter = (key: keyof FilterState) => {
    setFilters(prev => ({ ...prev, [key]: 'all' }));
  };

  const handleClearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'topGainers':
        return { stocks: gainers, isLoading: loadingGainers };
      case 'mostActive':
        return { stocks: mostActive, isLoading: loadingActive };
      case 'momentum':
        return { stocks: momentum, isLoading: loadingMomentum };
      case 'unusualVolume':
        return { stocks: unusualVol, isLoading: loadingUnusual };
      default:
        return { stocks: undefined, isLoading: false };
    }
  };

  const { stocks, isLoading } = getTabData();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Market Screener
          </CardTitle>
          <Button 
            variant={showFilters ? 'secondary' : 'ghost'}
            size="sm" 
            className={cn(
              "text-xs h-7 gap-1.5",
              hasActiveFilters && "text-primary"
            )}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3 w-3" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="h-4 min-w-4 p-0 text-[9px] flex items-center justify-center">
                {activeFilterCount}
              </Badge>
            )}
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-1 pt-2 flex-wrap">
          {SCREENER_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 text-xs gap-1.5 transition-all',
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Filter Panel - Expanded with all 19 filters */}
        {showFilters && (
          <div className="pt-3 border-t border-border mt-3 space-y-4">
            {FILTER_CATEGORIES.map(category => (
              <FilterCategory
                key={category.name}
                name={category.name}
                filterKeys={category.filters}
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            ))}
            
            {hasActiveFilters && (
              <div className="flex justify-end pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-7"
                  onClick={handleClearAllFilters}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0 pt-0">
        <ActiveFilterBadges 
          filters={filters}
          onClearFilter={handleClearFilter}
          onClearAll={handleClearAllFilters}
        />
        <StockList 
          stocks={stocks} 
          isLoading={isLoading} 
          onStockClick={handleStockClick} 
        />
      </CardContent>
    </Card>
  );
}
