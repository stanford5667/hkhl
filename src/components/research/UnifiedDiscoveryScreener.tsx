import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, Activity, Zap, Flame, BarChart3, Filter, X, ChevronDown,
  Building2, DollarSign, Percent, Scale, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { screenStocksFromPolygon, QUICK_SCREENS, MARKET_CAP_TIERS, type ScreenerResult, type ScreenerFilters } from '@/services/polygonScreenerService';

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
// Filter Configurations
// =====================

const MARKET_CAP_OPTIONS = [
  { value: 'all', label: 'Any Market Cap' },
  { value: 'mega', label: 'Mega ($200B+)', min: 200_000_000_000, max: undefined },
  { value: 'large', label: 'Large ($10B-$200B)', min: 10_000_000_000, max: 200_000_000_000 },
  { value: 'mid', label: 'Mid ($2B-$10B)', min: 2_000_000_000, max: 10_000_000_000 },
  { value: 'small', label: 'Small ($300M-$2B)', min: 300_000_000, max: 2_000_000_000 },
  { value: 'micro', label: 'Micro (<$300M)', min: 0, max: 300_000_000 },
];

const PE_RATIO_OPTIONS = [
  { value: 'all', label: 'Any P/E' },
  { value: 'under10', label: 'Under 10', max: 10 },
  { value: '10to20', label: '10-20', min: 10, max: 20 },
  { value: '20to35', label: '20-35', min: 20, max: 35 },
  { value: 'over35', label: 'Over 35', min: 35 },
  { value: 'negative', label: 'Negative (Loss)', max: 0 },
];

const OP_MARGIN_OPTIONS = [
  { value: 'all', label: 'Any Margin' },
  { value: 'over30', label: '30%+ (Excellent)', min: 30 },
  { value: '20to30', label: '20-30% (Strong)', min: 20, max: 30 },
  { value: '10to20', label: '10-20% (Good)', min: 10, max: 20 },
  { value: '0to10', label: '0-10% (Fair)', min: 0, max: 10 },
  { value: 'negative', label: 'Negative', max: 0 },
];

const DEBT_EQUITY_OPTIONS = [
  { value: 'all', label: 'Any D/E' },
  { value: 'under0.5', label: 'Under 0.5 (Low)', max: 0.5 },
  { value: '0.5to1', label: '0.5-1.0 (Moderate)', min: 0.5, max: 1 },
  { value: '1to2', label: '1.0-2.0 (High)', min: 1, max: 2 },
  { value: 'over2', label: 'Over 2.0 (Very High)', min: 2 },
];

const BEAT_PROBABILITY_OPTIONS = [
  { value: 'all', label: 'Any Probability' },
  { value: 'high', label: 'High (70%+)', min: 70 },
  { value: 'medium', label: 'Medium (50-70%)', min: 50, max: 70 },
  { value: 'low', label: 'Low (<50%)', max: 50 },
];

interface FilterState {
  marketCap: string;
  peRatio: string;
  opMargin: string;
  debtEquity: string;
  beatProbability: string;
}

const DEFAULT_FILTERS: FilterState = {
  marketCap: 'all',
  peRatio: 'all',
  opMargin: 'all',
  debtEquity: 'all',
  beatProbability: 'all',
};

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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(
        "h-8 text-xs gap-1.5 min-w-[120px]",
        isFiltered && "border-primary bg-primary/5"
      )}>
        <Icon className="h-3 w-3 text-muted-foreground" />
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
  
  if (filters.marketCap !== 'all') {
    const opt = MARKET_CAP_OPTIONS.find(o => o.value === filters.marketCap);
    if (opt) activeFilters.push({ key: 'marketCap', label: opt.label });
  }
  if (filters.peRatio !== 'all') {
    const opt = PE_RATIO_OPTIONS.find(o => o.value === filters.peRatio);
    if (opt) activeFilters.push({ key: 'peRatio', label: `P/E: ${opt.label}` });
  }
  if (filters.opMargin !== 'all') {
    const opt = OP_MARGIN_OPTIONS.find(o => o.value === filters.opMargin);
    if (opt) activeFilters.push({ key: 'opMargin', label: `Margin: ${opt.label}` });
  }
  if (filters.debtEquity !== 'all') {
    const opt = DEBT_EQUITY_OPTIONS.find(o => o.value === filters.debtEquity);
    if (opt) activeFilters.push({ key: 'debtEquity', label: `D/E: ${opt.label}` });
  }
  if (filters.beatProbability !== 'all') {
    const opt = BEAT_PROBABILITY_OPTIONS.find(o => o.value === filters.beatProbability);
    if (opt) activeFilters.push({ key: 'beatProbability', label: `Beat: ${opt.label}` });
  }

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 border-b border-border bg-muted/20">
      <span className="text-[10px] text-muted-foreground mr-1">Active:</span>
      {activeFilters.map(({ key, label }) => (
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
      {activeFilters.length > 1 && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-5 text-[10px] px-2"
          onClick={onClearAll}
        >
          Clear All
        </Button>
      )}
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

  const hasActiveFilters = useMemo(() => 
    Object.values(filters).some(v => v !== 'all'),
    [filters]
  );

  // Build query filters based on active tab + fundamental filters
  const buildQueryFilters = (tabFilters: ScreenerFilters): ScreenerFilters => {
    const combined: ScreenerFilters = { ...tabFilters };
    
    // Market Cap filter
    const mcOption = MARKET_CAP_OPTIONS.find(o => o.value === filters.marketCap);
    if (mcOption && filters.marketCap !== 'all') {
      if (mcOption.min !== undefined) combined.minMarketCap = mcOption.min;
      if (mcOption.max !== undefined) combined.maxMarketCap = mcOption.max;
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
            Market Discovery
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
              <Badge variant="secondary" className="h-4 w-4 p-0 text-[9px] flex items-center justify-center">
                {Object.values(filters).filter(v => v !== 'all').length}
              </Badge>
            )}
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

        {/* Filter Panel */}
        {showFilters && (
          <div className="pt-3 border-t border-border mt-3">
            <div className="flex flex-wrap gap-2">
              <FilterDropdown
                label="Market Cap"
                value={filters.marketCap}
                options={MARKET_CAP_OPTIONS}
                onChange={handleFilterChange('marketCap')}
                icon={Building2}
              />
              <FilterDropdown
                label="P/E Ratio"
                value={filters.peRatio}
                options={PE_RATIO_OPTIONS}
                onChange={handleFilterChange('peRatio')}
                icon={DollarSign}
              />
              <FilterDropdown
                label="Op Margin"
                value={filters.opMargin}
                options={OP_MARGIN_OPTIONS}
                onChange={handleFilterChange('opMargin')}
                icon={Percent}
              />
              <FilterDropdown
                label="Debt/Equity"
                value={filters.debtEquity}
                options={DEBT_EQUITY_OPTIONS}
                onChange={handleFilterChange('debtEquity')}
                icon={Scale}
              />
              <FilterDropdown
                label="Beat Prob"
                value={filters.beatProbability}
                options={BEAT_PROBABILITY_OPTIONS}
                onChange={handleFilterChange('beatProbability')}
                icon={Target}
              />
            </div>
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
