import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUnifiedData, AssetClass, CompanyWithRelations } from '@/contexts/UnifiedDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgId } from '@/contexts/OrganizationContext';
import { useMarketIndices } from '@/hooks/useMarketData';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown,
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Briefcase,
  LineChart,
  Building,
  CreditCard,
  Package,
  LayoutGrid,
  TableIcon,
  LayoutDashboard,
  ArrowUpDown,
  Download,
  Plus,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Treemap, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AddAssetWizard } from '@/components/companies/AddAssetWizard';
import { MarketDataPausedBanner } from '@/components/dev/MarketDataPausedBanner';
import { FinnhubApiBanner } from '@/components/shared/FinnhubApiBanner';
import { toast } from 'sonner';

// Asset class configuration
const ASSET_CLASS_CONFIG: Record<AssetClass, { 
  label: string; 
  shortLabel: string;
  icon: React.ElementType; 
  color: string;
  chartColor: string;
}> = {
  private_equity: { 
    label: 'Private Equity', 
    shortLabel: 'PE',
    icon: Briefcase, 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    chartColor: 'hsl(280, 65%, 60%)',
  },
  public_equity: { 
    label: 'Public Equities', 
    shortLabel: 'Public',
    icon: LineChart, 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    chartColor: 'hsl(160, 84%, 39%)',
  },
  real_estate: { 
    label: 'Real Estate', 
    shortLabel: 'RE',
    icon: Building, 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    chartColor: 'hsl(38, 92%, 50%)',
  },
  credit: { 
    label: 'Credit', 
    shortLabel: 'Credit',
    icon: CreditCard, 
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    chartColor: 'hsl(217, 91%, 60%)',
  },
  other: { 
    label: 'Other', 
    shortLabel: 'Other',
    icon: Package, 
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    chartColor: 'hsl(215, 20%, 55%)',
  },
};

// Market indices configuration
const MARKET_INDICES_SYMBOLS = [
  { symbol: 'SPY', name: 'S&P 500', shortName: 'S&P' },
  { symbol: 'QQQ', name: 'NASDAQ', shortName: 'NDX' },
  { symbol: 'DIA', name: 'DOW', shortName: 'DOW' },
  { symbol: 'IWM', name: 'Russell 2000', shortName: 'RUT' },
];

interface MarketIndex {
  symbol: string;
  name: string;
  shortName: string;
  price: number;
  change: number;
  changePercent: number;
  sparklineData?: { v: number }[];
}

type SortOption = 'value' | 'performance' | 'name' | 'type' | 'todayChange';
type ViewMode = 'cards' | 'table' | 'treemap';
type AssetFilter = 'all' | AssetClass;

// Generate synthetic sparkline data
function generateSparkline(basePrice: number, changePercent: number): { v: number }[] {
  const points = 12;
  const data: { v: number }[] = [];
  const startPrice = basePrice / (1 + changePercent / 100);
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const noise = (Math.random() - 0.5) * basePrice * 0.005;
    const v = startPrice + (basePrice - startPrice) * progress + noise;
    data.push({ v });
  }
  return data;
}

export default function Portfolio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = useOrgId();
  const { companiesWithRelations, isLoading, refetchAll } = useUnifiedData();
  
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('portfolio-view-mode') as ViewMode) || 'cards';
  });
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<MarketIndex | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Live quotes state
  const [liveQuotes, setLiveQuotes] = useState<Map<string, { price: number; change: number; changePercent: number }>>(new Map());
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Market indices
  const { indices: marketIndicesData, isLoading: indicesLoading, refresh: refreshIndices } = useMarketIndices();

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('portfolio-view-mode', viewMode);
  }, [viewMode]);

  // Get all portfolio holdings
  const allHoldings = useMemo(() => {
    return companiesWithRelations.filter(c => c.company_type === 'portfolio');
  }, [companiesWithRelations]);

  // Get unique tickers for public equities
  const publicEquityTickers = useMemo(() => {
    return [...new Set(
      allHoldings
        .filter(h => h.asset_class === 'public_equity' && h.ticker_symbol)
        .map(h => h.ticker_symbol!.toUpperCase())
    )];
  }, [allHoldings]);

  // Fetch live quotes for public equities
  const fetchQuotes = useCallback(async () => {
    if (publicEquityTickers.length === 0) return;
    
    setQuotesLoading(true);
    try {
      const quotes = await getCachedQuotes(publicEquityTickers);
      setLiveQuotes(quotes);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
    } finally {
      setQuotesLoading(false);
    }
  }, [publicEquityTickers]);

  // Initial quote fetch
  useEffect(() => {
    if (publicEquityTickers.length > 0) {
      fetchQuotes();
    }
  }, [publicEquityTickers.length]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshIndices(), fetchQuotes()]);
    setIsRefreshing(false);
    toast.success('Prices updated');
  };

  // Map market indices with sparklines
  const indices = useMemo<MarketIndex[]>(() => {
    return MARKET_INDICES_SYMBOLS.map((idx) => {
      const apiIndex = marketIndicesData?.find(
        mi => mi.symbol === idx.symbol || mi.name.includes(idx.name.split(' ')[0])
      );
      const price = apiIndex?.value || 0;
      const change = apiIndex?.change || 0;
      const changePercent = apiIndex?.changePercent || 0;
      
      return {
        ...idx,
        price,
        change,
        changePercent,
        sparklineData: price > 0 ? generateSparkline(price, changePercent) : [],
      };
    });
  }, [marketIndicesData]);

  // Filter and sort holdings
  const filteredHoldings = useMemo(() => {
    let filtered = allHoldings;
    
    // Apply asset class filter
    if (assetFilter !== 'all') {
      filtered = filtered.filter(h => h.asset_class === assetFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(h => 
        h.name.toLowerCase().includes(q) ||
        h.ticker_symbol?.toLowerCase().includes(q) ||
        h.industry?.toLowerCase().includes(q)
      );
    }
    
    // Sort holdings
    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'value':
          comparison = getHoldingValue(a, liveQuotes) - getHoldingValue(b, liveQuotes);
          break;
        case 'performance':
          comparison = getGainLossPercent(a, liveQuotes) - getGainLossPercent(b, liveQuotes);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = (a.asset_class || 'other').localeCompare(b.asset_class || 'other');
          break;
        case 'todayChange':
          comparison = getTodayChange(a, liveQuotes) - getTodayChange(b, liveQuotes);
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [allHoldings, assetFilter, searchQuery, sortBy, sortAsc, liveQuotes]);

  // Calculate portfolio stats
  const stats = useMemo(() => {
    let totalValue = 0;
    let totalCostBasis = 0;
    let todayChange = 0;
    let gainersCount = 0;
    let losersCount = 0;
    
    const byType: Record<AssetClass, { value: number; count: number }> = {
      private_equity: { value: 0, count: 0 },
      public_equity: { value: 0, count: 0 },
      real_estate: { value: 0, count: 0 },
      credit: { value: 0, count: 0 },
      other: { value: 0, count: 0 },
    };
    
    allHoldings.forEach(h => {
      const assetClass = (h.asset_class || 'private_equity') as AssetClass;
      const value = getHoldingValue(h, liveQuotes);
      const costBasis = h.cost_basis || 0;
      const dayChange = getTodayChange(h, liveQuotes);
      
      totalValue += value;
      totalCostBasis += costBasis;
      todayChange += dayChange;
      
      if (dayChange > 0) gainersCount++;
      else if (dayChange < 0) losersCount++;
      
      byType[assetClass].value += value;
      byType[assetClass].count += 1;
    });
    
    const todayChangePercent = (totalValue - todayChange) > 0 
      ? (todayChange / (totalValue - todayChange)) * 100 
      : 0;
    
    return {
      totalValue,
      totalCostBasis,
      todayChange,
      todayChangePercent,
      gainersCount,
      losersCount,
      byType,
    };
  }, [allHoldings, liveQuotes]);

  // Allocation chart data
  const allocationData = useMemo(() => {
    return Object.entries(stats.byType)
      .filter(([_, data]) => data.value > 0)
      .map(([type, data]) => ({
        name: ASSET_CLASS_CONFIG[type as AssetClass].label,
        shortName: ASSET_CLASS_CONFIG[type as AssetClass].shortLabel,
        value: data.value,
        color: ASSET_CLASS_CONFIG[type as AssetClass].chartColor,
        count: data.count,
        id: type,
      }));
  }, [stats]);

  // Treemap data
  const treemapData = useMemo(() => {
    return filteredHoldings.map(h => ({
      name: h.ticker_symbol || h.name,
      size: getHoldingValue(h, liveQuotes),
      color: ASSET_CLASS_CONFIG[(h.asset_class || 'private_equity') as AssetClass].chartColor,
      id: h.id,
    }));
  }, [filteredHoldings, liveQuotes]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(option);
      setSortAsc(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-32 flex-shrink-0" />)}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <FinnhubApiBanner />
      <MarketDataPausedBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
            <p className="text-sm text-muted-foreground">
              Updated {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          {/* Portfolio Selector - placeholder for multi-portfolio support */}
          <Select defaultValue="main">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select portfolio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main">Main Portfolio</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Position
          </Button>
        </div>
      </div>

      {/* Market Indices Row */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {indicesLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-32 flex-shrink-0 rounded-lg" />
          ))
        ) : (
          indices.map((idx) => {
            const isUp = idx.changePercent >= 0;
            const color = isUp ? '#10b981' : '#f43f5e';
            
            return (
              <button
                key={idx.symbol}
                className="flex-shrink-0 px-4 py-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/30 transition group text-left"
                onClick={() => setSelectedIndex(idx)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">{idx.shortName}</div>
                    <div className="text-lg font-semibold tabular-nums text-foreground">{formatPrice(idx.price)}</div>
                    <div className={cn(
                      "text-xs font-medium flex items-center gap-0.5",
                      isUp ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {formatPercent(idx.changePercent)}
                    </div>
                  </div>
                  {idx.sparklineData && idx.sparklineData.length > 0 && (
                    <div className="w-16 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={idx.sparklineData}>
                          <defs>
                            <linearGradient id={`sparkline-${idx.symbol}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke={color} fill={`url(#sparkline-${idx.symbol})`} strokeWidth={1.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Value</span>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(stats.totalValue, true)}
            </span>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Day Change</span>
              {stats.todayChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-500" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-2xl font-bold tabular-nums",
                stats.todayChange >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {stats.todayChange >= 0 ? '+' : ''}{formatCurrency(stats.todayChange, true)}
              </span>
              <span className={cn(
                "text-sm",
                stats.todayChange >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {formatPercent(stats.todayChangePercent)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Gainers</span>
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-bold tabular-nums text-emerald-500">
              {stats.gainersCount}
            </span>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Losers</span>
              <ArrowDownRight className="h-4 w-4 text-rose-500" />
            </div>
            <span className="text-2xl font-bold tabular-nums text-rose-500">
              {stats.losersCount}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Asset Class Filter Tabs */}
      <Tabs value={assetFilter} onValueChange={(v) => setAssetFilter(v as AssetFilter)} className="w-full">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">{allHoldings.length}</Badge>
          </TabsTrigger>
          {Object.entries(ASSET_CLASS_CONFIG).map(([key, config]) => {
            const count = stats.byType[key as AssetClass]?.count || 0;
            if (count === 0) return null;
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="gap-2">
                <Icon className="h-3.5 w-3.5" />
                {config.shortLabel}
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Allocation Chart */}
        <Card className="bg-card border-border lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.[0]) {
                        const data = payload[0].payload;
                        const total = allocationData.reduce((sum, d) => sum + d.value, 0);
                        const percent = ((data.value / total) * 100).toFixed(1);
                        return (
                          <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-medium text-foreground">{data.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(data.value, true)} ({percent}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="space-y-2">
              {allocationData.map((item) => {
                const total = allocationData.reduce((sum, d) => sum + d.value, 0);
                const percent = ((item.value / total) * 100).toFixed(1);
                return (
                  <button
                    key={item.id}
                    onClick={() => setAssetFilter(item.id as AssetFilter)}
                    className={cn(
                      "w-full flex items-center justify-between text-sm p-2 rounded-md transition-all",
                      assetFilter === item.id ? "bg-secondary" : "hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-foreground">{item.shortName}</span>
                    </div>
                    <span className="text-muted-foreground tabular-nums">{percent}%</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Holdings List */}
        <Card className="bg-card border-border lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Holdings
                <span className="text-muted-foreground font-normal ml-2">
                  ({filteredHoldings.length})
                </span>
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="pl-9 w-40 h-8"
                  />
                </div>

                {/* Sort Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      <span className="capitalize">{sortBy}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(['value', 'performance', 'todayChange', 'name', 'type'] as SortOption[]).map((option) => (
                      <DropdownMenuItem 
                        key={option}
                        onClick={() => handleSort(option)}
                        className="capitalize"
                      >
                        {option === 'todayChange' ? 'Today' : option}
                        {sortBy === option && (
                          <span className="ml-2">{sortAsc ? '↑' : '↓'}</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* View Toggle */}
                <div className="flex items-center border border-border rounded-md">
                  {([
                    { mode: 'cards', icon: LayoutGrid },
                    { mode: 'table', icon: TableIcon },
                    { mode: 'treemap', icon: LayoutDashboard },
                  ] as { mode: ViewMode; icon: React.ElementType }[]).map(({ mode, icon: Icon }) => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-8 w-8 p-0 rounded-none first:rounded-l-md last:rounded-r-md"
                      onClick={() => setViewMode(mode)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <AnimatePresence mode="wait">
              {filteredHoldings.length === 0 ? (
                <EmptyState onAdd={() => setShowAddDialog(true)} />
              ) : viewMode === 'cards' ? (
                <HoldingsGrid 
                  holdings={filteredHoldings} 
                  liveQuotes={liveQuotes}
                  quotesLoading={quotesLoading}
                />
              ) : viewMode === 'table' ? (
                <HoldingsTable 
                  holdings={filteredHoldings}
                  liveQuotes={liveQuotes}
                  quotesLoading={quotesLoading}
                  onSort={handleSort}
                  sortBy={sortBy}
                  sortAsc={sortAsc}
                />
              ) : (
                <HoldingsTreemap data={treemapData} />
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* Add Asset Wizard */}
      <AddAssetWizard
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onComplete={() => {
          refetchAll();
          toast.success('Position added');
        }}
        onCreate={async (data) => {
          if (!user) return null;
          const { data: newCompany, error } = await supabase
            .from('companies')
            .insert({
              ...data,
              user_id: user.id,
              organization_id: orgId || null,
            } as any)
            .select()
            .single();
          if (error) {
            toast.error('Failed to create position');
            return null;
          }
          return newCompany as any;
        }}
      />

      {/* Index Chart Modal */}
      <Dialog open={!!selectedIndex} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedIndex?.name} ({selectedIndex?.symbol})</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold tabular-nums">{formatPrice(selectedIndex?.price || 0)}</span>
              <span className={cn(
                "text-lg font-medium",
                (selectedIndex?.changePercent || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                {formatPercent(selectedIndex?.changePercent || 0)}
              </span>
            </div>
            {selectedIndex?.sparklineData && selectedIndex.sparklineData.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedIndex.sparklineData}>
                    <defs>
                      <linearGradient id="modalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={(selectedIndex.changePercent || 0) >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={(selectedIndex.changePercent || 0) >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis hide />
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [formatPrice(value), 'Price']}
                    />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={(selectedIndex.changePercent || 0) >= 0 ? '#10b981' : '#f43f5e'}
                      strokeWidth={2}
                      fill="url(#modalGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper functions
function getHoldingValue(
  holding: CompanyWithRelations, 
  liveQuotes: Map<string, { price: number; change: number; changePercent: number }>
): number {
  if (holding.asset_class === 'public_equity' && holding.ticker_symbol) {
    const quote = liveQuotes.get(holding.ticker_symbol.toUpperCase());
    if (quote && holding.shares_owned) {
      return quote.price * holding.shares_owned;
    }
  }
  if (holding.market_value) return holding.market_value;
  if (holding.current_price && holding.shares_owned) {
    return holding.current_price * holding.shares_owned;
  }
  return holding.ebitda_ltm || holding.cost_basis || 0;
}

function getGainLossPercent(
  holding: CompanyWithRelations,
  liveQuotes: Map<string, { price: number; change: number; changePercent: number }>
): number {
  const value = getHoldingValue(holding, liveQuotes);
  const costBasis = holding.cost_basis || 0;
  if (costBasis <= 0) return 0;
  return ((value - costBasis) / costBasis) * 100;
}

function getTodayChange(
  holding: CompanyWithRelations,
  liveQuotes: Map<string, { price: number; change: number; changePercent: number }>
): number {
  if (holding.asset_class === 'public_equity' && holding.ticker_symbol && holding.shares_owned) {
    const quote = liveQuotes.get(holding.ticker_symbol.toUpperCase());
    if (quote) {
      return quote.change * holding.shares_owned;
    }
  }
  return 0;
}

function formatCurrency(value: number, compact = false) {
  if (compact) {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Holdings Grid Component
function HoldingsGrid({ 
  holdings, 
  liveQuotes,
  quotesLoading,
}: { 
  holdings: CompanyWithRelations[];
  liveQuotes: Map<string, { price: number; change: number; changePercent: number }>;
  quotesLoading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {holdings.map((holding, index) => (
        <HoldingCard 
          key={holding.id} 
          holding={holding} 
          liveQuotes={liveQuotes}
          quotesLoading={quotesLoading}
          index={index}
        />
      ))}
    </motion.div>
  );
}

// Holding Card Component
function HoldingCard({ 
  holding, 
  liveQuotes,
  quotesLoading,
  index,
}: { 
  holding: CompanyWithRelations;
  liveQuotes: Map<string, { price: number; change: number; changePercent: number }>;
  quotesLoading: boolean;
  index: number;
}) {
  const assetClass = (holding.asset_class || 'private_equity') as AssetClass;
  const config = ASSET_CLASS_CONFIG[assetClass];
  const Icon = config.icon;
  
  const value = getHoldingValue(holding, liveQuotes);
  const gainLossPercent = getGainLossPercent(holding, liveQuotes);
  const isPositive = gainLossPercent >= 0;
  
  // Get live quote for public equities
  const quote = holding.ticker_symbol 
    ? liveQuotes.get(holding.ticker_symbol.toUpperCase()) 
    : null;
  const todayChangePercent = quote?.changePercent || 0;
  const isTodayUp = todayChangePercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={`/portfolio/${holding.id}`}>
        <Card className="bg-card border-border hover:border-primary/50 transition-all group cursor-pointer relative">
          <CardContent className="p-4">
            {/* Live indicator for public equities */}
            {assetClass === 'public_equity' && (
              <div className="absolute top-3 right-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            )}
            
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className={cn("p-2 rounded-lg", config.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {holding.ticker_symbol ? (
                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                      {holding.ticker_symbol}
                    </span>
                  ) : (
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {holding.name}
                    </span>
                  )}
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.color)}>
                    {config.shortLabel}
                  </Badge>
                </div>
                {holding.ticker_symbol && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{holding.name}</p>
                )}
              </div>
            </div>
            
            {/* Value and Price */}
            <div className="flex items-end justify-between mb-3">
              <div>
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {formatCurrency(value, true)}
                </span>
              </div>
              {quote && (
                <div className="text-right">
                  {quotesLoading ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <>
                      <p className="text-sm font-medium tabular-nums text-foreground">
                        {formatPrice(quote.price)}
                      </p>
                      <p className={cn(
                        "text-xs font-medium",
                        isTodayUp ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {formatPercent(todayChangePercent)}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Performance */}
            <div className="flex items-center justify-between">
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                isPositive ? "text-emerald-500" : "text-rose-500"
              )}>
                {isPositive ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span className="tabular-nums">
                  {isPositive ? '+' : ''}{gainLossPercent.toFixed(1)}%
                </span>
                <span className="text-muted-foreground font-normal">return</span>
              </div>
              
              {holding.shares_owned && (
                <span className="text-xs text-muted-foreground">
                  {holding.shares_owned.toLocaleString()} shares
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

// Holdings Table Component
function HoldingsTable({ 
  holdings, 
  liveQuotes,
  quotesLoading,
  onSort,
  sortBy,
  sortAsc,
}: { 
  holdings: CompanyWithRelations[];
  liveQuotes: Map<string, { price: number; change: number; changePercent: number }>;
  quotesLoading: boolean;
  onSort: (option: SortOption) => void;
  sortBy: SortOption;
  sortAsc: boolean;
}) {
  const navigate = useNavigate();
  
  const columns = [
    { key: 'name', label: 'Asset', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'price', label: 'Price', align: 'right' as const },
    { key: 'todayChange', label: 'Today', sortable: true, align: 'right' as const },
    { key: 'value', label: 'Value', sortable: true, align: 'right' as const },
    { key: 'performance', label: 'Return', sortable: true, align: 'right' as const },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="overflow-x-auto"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  col.align === 'right' && 'text-right',
                  col.sortable && 'cursor-pointer hover:text-foreground'
                )}
                onClick={() => col.sortable && onSort(col.key as SortOption)}
              >
                <div className={cn("flex items-center gap-1", col.align === 'right' && "justify-end")}>
                  {col.label}
                  {col.sortable && sortBy === col.key && (
                    sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((holding) => {
            const assetClass = (holding.asset_class || 'private_equity') as AssetClass;
            const config = ASSET_CLASS_CONFIG[assetClass];
            const Icon = config.icon;
            const value = getHoldingValue(holding, liveQuotes);
            const gainLossPercent = getGainLossPercent(holding, liveQuotes);
            const isPositive = gainLossPercent >= 0;
            
            const quote = holding.ticker_symbol 
              ? liveQuotes.get(holding.ticker_symbol.toUpperCase()) 
              : null;
            const todayChangePercent = quote?.changePercent || 0;
            const isTodayUp = todayChangePercent >= 0;

            return (
              <TableRow
                key={holding.id}
                className="cursor-pointer"
                onClick={() => navigate(`/portfolio/${holding.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-md", config.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        {holding.ticker_symbol || holding.name}
                      </span>
                      {holding.ticker_symbol && (
                        <p className="text-xs text-muted-foreground">{holding.name}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", config.color)}>
                    {config.shortLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {quote ? (
                    quotesLoading ? (
                      <Skeleton className="h-4 w-16 ml-auto" />
                    ) : (
                      formatPrice(quote.price)
                    )
                  ) : '—'}
                </TableCell>
                <TableCell className={cn("text-right tabular-nums", isTodayUp ? "text-emerald-500" : "text-rose-500")}>
                  {quote ? formatPercent(todayChangePercent) : '—'}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-foreground">
                  {formatCurrency(value, true)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "flex items-center justify-end gap-1 tabular-nums",
                    isPositive ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {isPositive ? '+' : ''}{gainLossPercent.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </motion.div>
  );
}

// Holdings Treemap Component
function HoldingsTreemap({ 
  data,
}: { 
  data: { name: string; size: number; color: string; id: string }[];
}) {
  const TreemapCell = (props: any) => {
    const { x, y, width, height, name, color } = props;
    const item = data.find(d => d.name === name);
    
    if (!item || width < 40 || height < 30) return null;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color || item.color}
          opacity={0.9}
          rx={4}
          style={{ cursor: 'pointer' }}
        />
        {width > 60 && (
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="white"
            fontSize={12}
            fontWeight="bold"
          >
            {name}
          </text>
        )}
        {width > 80 && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="rgba(255,255,255,0.7)"
            fontSize={10}
          >
            {formatCurrency(item.size, true)}
          </text>
        )}
      </g>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-[400px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          stroke="hsl(var(--border))"
          fill="hsl(var(--primary))"
          content={<TreemapCell />}
        />
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {data.map((item) => (
          <Link 
            key={item.id} 
            to={`/portfolio/${item.id}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span 
              className="inline-block w-2 h-2 rounded-full mr-1" 
              style={{ backgroundColor: item.color }}
            />
            {item.name}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

// Empty State Component
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-12"
    >
      <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
      <p className="text-foreground font-medium">No holdings found</p>
      <p className="text-muted-foreground text-sm mb-4">
        Add your first position to get started
      </p>
      <Button onClick={onAdd} variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Add Position
      </Button>
    </motion.div>
  );
}
