import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { useUnifiedData, Company } from '@/contexts/UnifiedDataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  TrendingUp, TrendingDown, Plus, RefreshCw, Grid3X3, 
  List, Search, ArrowUpDown, ChevronDown, ChevronUp,
  Eye, Star, StarOff, MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from 'recharts';
import { AddAssetWizard } from '@/components/companies/AddAssetWizard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgId } from '@/contexts/OrganizationContext';
import { useMarketIndices, useStockQuote } from '@/hooks/useMarketData';
import { MarketIndexSkeleton, PriceUnavailable } from '@/components/markets/MarketSkeletons';
import { MarketDataPausedBanner } from '@/components/dev/MarketDataPausedBanner';
import { FinnhubApiBanner } from '@/components/shared/FinnhubApiBanner';

// Types
interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  chartData?: { time: string; price: number }[];
}

interface HoldingWithQuote extends Company {
  livePrice?: number;
  liveChange?: number;
  liveChangePercent?: number;
  todayGainLoss?: number;
  todayGainLossPercent?: number;
  sparklineData?: { time: string; price: number }[];
  isLoading?: boolean;
}

type SortKey = 'value' | 'gainLoss' | 'todayChange' | 'name' | 'ticker';
type SortDirection = 'asc' | 'desc';

// Market indices symbols
const MARKET_INDICES_SYMBOLS = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'NASDAQ' },
  { symbol: 'DIA', name: 'DOW' },
  { symbol: 'IWM', name: 'Russell 2000' },
  { symbol: 'VIX', name: 'VIX' },
];

export default function MarketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = useOrgId();
  const { companies, refetchAll, isLoading: isDataLoading } = useUnifiedData();
  
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('markets-view-mode') as 'grid' | 'table') || 'grid';
  });
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [holdings, setHoldings] = useState<HoldingWithQuote[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<MarketIndex | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter public equity holdings
  const publicEquityHoldings = useMemo(() => {
    return companies.filter(c => 
      c.asset_class === 'public_equity' && 
      c.company_type === 'portfolio' &&
      c.ticker_symbol
    );
  }, [companies]);

  // Watchlist (public equities marked as prospect)
  const watchlist = useMemo(() => {
    return companies.filter(c => 
      c.asset_class === 'public_equity' && 
      (c.company_type === 'prospect' || c.company_type === 'pipeline') &&
      c.ticker_symbol
    );
  }, [companies]);

  // Use market indices hook - NO automatic polling
  const { 
    indices: marketIndicesData, 
    isLoading: indicesLoading, 
    refresh: refreshIndices,
    error: indicesError,
    lastUpdated: indicesLastUpdated
  } = useMarketIndices();

  // Map the hook data to our local format
  const indices = useMemo<MarketIndex[]>(() => {
    if (!marketIndicesData || marketIndicesData.length === 0) {
      // Fallback to manual fetch if hook returns empty
      return [];
    }
    return MARKET_INDICES_SYMBOLS.map((idx) => {
      const apiIndex = marketIndicesData.find(
        mi => mi.symbol === idx.symbol || mi.name.includes(idx.name.split(' ')[0])
      );
      return {
        ...idx,
        price: apiIndex?.value || 0,
        change: apiIndex?.change || 0,
        changePercent: apiIndex?.changePercent || 0,
      };
    });
  }, [marketIndicesData]);

  // Fallback fetch for indices using cached Finnhub
  const fetchIndicesFallback = useCallback(async () => {
    if (marketIndicesData && marketIndicesData.length > 0) return;
    
    try {
      const quotes = await getCachedQuotes(MARKET_INDICES_SYMBOLS.map(idx => idx.symbol));
      const results = MARKET_INDICES_SYMBOLS.map(idx => {
        const quote = quotes.get(idx.symbol);
        return {
          ...idx,
          price: quote?.price || 0,
          change: quote?.change || 0,
          changePercent: quote?.changePercent || 0,
        };
      });
      console.log('[Markets] Cached indices fetched:', results.length);
    } catch (err) {
      console.error('[Markets] Cached indices error:', err);
    }
  }, [marketIndicesData]);

  // Fetch quotes for holdings using Finnhub
  const fetchHoldingQuotes = useCallback(async () => {
    if (publicEquityHoldings.length === 0) {
      setHoldings([]);
      return;
    }

    // Initialize with loading state
    setHoldings(publicEquityHoldings.map(h => ({ ...h, isLoading: true })));

    const tickers = publicEquityHoldings
      .filter(h => h.ticker_symbol)
      .map(h => h.ticker_symbol!);

    const quotes = await getCachedQuotes(tickers);

    const updatedHoldings = publicEquityHoldings.map(holding => {
      if (!holding.ticker_symbol) return { ...holding, isLoading: false };
      
      const quote = quotes.get(holding.ticker_symbol.toUpperCase());
      if (!quote) return { ...holding, isLoading: false };

      const shares = holding.shares_owned || 0;
      const liveValue = shares * quote.price;
      const todayGainLoss = shares * quote.change;
      const todayGainLossPercent = quote.changePercent;

      return {
        ...holding,
        livePrice: quote.price,
        liveChange: quote.change,
        liveChangePercent: quote.changePercent,
        todayGainLoss,
        todayGainLossPercent,
        isLoading: false,
        market_value: liveValue,
      };
    });

    setHoldings(updatedHoldings);
    setLastRefresh(new Date());
  }, [publicEquityHoldings]);

  // Fetch quotes on mount
  useEffect(() => {
    if (publicEquityHoldings.length > 0) {
      fetchHoldingQuotes();
    } else {
      setHoldings([]);
    }
  }, [publicEquityHoldings]);

  // NO automatic polling - manual refresh only

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshIndices(), fetchHoldingQuotes()]);
    setIsRefreshing(false);
    setLastRefresh(new Date());
    toast.success('Prices updated');
  };

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('markets-view-mode', viewMode);
  }, [viewMode]);

  // Calculate portfolio totals
  const portfolioTotals = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => sum + (h.market_value || 0), 0);
    const totalCost = holdings.reduce((sum, h) => sum + (h.cost_basis || 0), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const todayChange = holdings.reduce((sum, h) => sum + (h.todayGainLoss || 0), 0);
    const todayChangePercent = totalValue > 0 ? (todayChange / (totalValue - todayChange)) * 100 : 0;

    return { totalValue, totalCost, totalGainLoss, totalGainLossPercent, todayChange, todayChangePercent };
  }, [holdings]);

  // Sort and filter holdings
  const sortedHoldings = useMemo(() => {
    let filtered = holdings;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = holdings.filter(h => 
        h.ticker_symbol?.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortKey) {
        case 'value':
          aVal = a.market_value || 0;
          bVal = b.market_value || 0;
          break;
        case 'gainLoss':
          aVal = (a.market_value || 0) - (a.cost_basis || 0);
          bVal = (b.market_value || 0) - (b.cost_basis || 0);
          break;
        case 'todayChange':
          aVal = a.todayGainLoss || 0;
          bVal = b.todayGainLoss || 0;
          break;
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'ticker':
          aVal = a.ticker_symbol || '';
          bVal = b.ticker_symbol || '';
          break;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
    });
  }, [holdings, searchQuery, sortKey, sortDirection]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPrice = (value: number | null | undefined) => {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value == null) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Finnhub API Banner */}
      <FinnhubApiBanner />

      {/* Market Data Paused Banner */}
      <MarketDataPausedBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Markets</h1>
          <p className="text-sm text-muted-foreground">
            Public equities portfolio • Last updated {lastRefresh.toLocaleTimeString()}
          </p>
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
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Position
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {formatCurrency(portfolioTotals.totalValue)}
          </p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Today's Change</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums",
            portfolioTotals.todayChange >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {portfolioTotals.todayChange >= 0 ? '+' : ''}{formatCurrency(portfolioTotals.todayChange)}
          </p>
          <p className={cn(
            "text-sm tabular-nums",
            portfolioTotals.todayChange >= 0 ? "text-emerald-400/70" : "text-rose-400/70"
          )}>
            {formatPercent(portfolioTotals.todayChangePercent)}
          </p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Total Gain/Loss</p>
          <p className={cn(
            "text-2xl font-bold tabular-nums",
            portfolioTotals.totalGainLoss >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {portfolioTotals.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(portfolioTotals.totalGainLoss)}
          </p>
          <p className={cn(
            "text-sm tabular-nums",
            portfolioTotals.totalGainLoss >= 0 ? "text-emerald-400/70" : "text-rose-400/70"
          )}>
            {formatPercent(portfolioTotals.totalGainLossPercent)}
          </p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Positions</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {holdings.length}
          </p>
          <p className="text-sm text-muted-foreground">
            Cost: {formatCurrency(portfolioTotals.totalCost)}
          </p>
        </Card>
      </div>

      {/* Market Indices */}
      <div className="overflow-x-auto -mx-6 px-6">
        <div className="flex gap-3 pb-2">
          {indicesLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-40 shrink-0 rounded-lg" />
            ))
          ) : (
            indices.map((index) => (
              <Card
                key={index.symbol}
                className={cn(
                  "p-3 shrink-0 w-40 cursor-pointer transition-all hover:border-primary/50",
                  "bg-card border-border"
                )}
                onClick={() => setSelectedIndex(index)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{index.name}</p>
                    <p className="font-semibold text-foreground tabular-nums">
                      {formatPrice(index.price)}
                    </p>
                  </div>
                  {index.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-400" />
                  )}
                </div>
                <p className={cn(
                  "text-sm font-medium tabular-nums",
                  index.change >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)} ({formatPercent(index.changePercent)})
                </p>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Holdings Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">Holdings</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search holdings..."
                className="pl-9 w-48"
              />
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sort Options (Grid mode) */}
        {viewMode === 'grid' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort:</span>
            {(['value', 'gainLoss', 'todayChange', 'name'] as SortKey[]).map((key) => (
              <Button
                key={key}
                variant={sortKey === key ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => toggleSort(key)}
                className="gap-1 capitalize"
              >
                {key === 'gainLoss' ? 'Gain/Loss' : key === 'todayChange' ? 'Today' : key}
                {sortKey === key && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
              </Button>
            ))}
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {sortedHoldings.map((holding) => (
                <motion.div
                  key={holding.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <HoldingCard 
                    holding={holding} 
                    onClick={() => navigate(`/portfolio/${holding.id}`)}
                    formatCurrency={formatCurrency}
                    formatPrice={formatPrice}
                    formatPercent={formatPercent}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {sortedHoldings.length === 0 && !isDataLoading && (
              <Card className="col-span-full p-8 text-center bg-card border-border">
                <p className="text-muted-foreground mb-4">No public equity holdings yet</p>
                <Button onClick={() => setShowAddDialog(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first position
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Card className="bg-card border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('ticker')}>
                    <div className="flex items-center gap-1">
                      Ticker
                      {sortKey === 'ticker' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-1">
                      Name
                      {sortKey === 'name' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('todayChange')}>
                    <div className="flex items-center justify-end gap-1">
                      Change
                      {sortKey === 'todayChange' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('value')}>
                    <div className="flex items-center justify-end gap-1">
                      Value
                      {sortKey === 'value' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('gainLoss')}>
                    <div className="flex items-center justify-end gap-1">
                      Gain/Loss
                      {sortKey === 'gainLoss' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </TableHead>
                  <TableHead className="w-24">Chart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.map((holding) => {
                  const gainLoss = (holding.market_value || 0) - (holding.cost_basis || 0);
                  const gainLossPercent = holding.cost_basis ? (gainLoss / holding.cost_basis) * 100 : 0;
                  const isPositive = (holding.liveChange || 0) >= 0;
                  const isGainPositive = gainLoss >= 0;

                  return (
                    <TableRow 
                      key={holding.id} 
                      className="border-border cursor-pointer hover:bg-muted/30"
                      onClick={() => navigate(`/portfolio/${holding.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{holding.ticker_symbol}</span>
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            holding.isLoading ? "bg-muted animate-pulse" : "bg-emerald-400"
                          )} title="Live price" />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {holding.name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {holding.isLoading ? <Skeleton className="h-4 w-16 ml-auto" /> : formatPrice(holding.livePrice)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right tabular-nums",
                        isPositive ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {holding.isLoading ? (
                          <Skeleton className="h-4 w-20 ml-auto" />
                        ) : (
                          <>
                            {isPositive ? '+' : ''}{holding.liveChange?.toFixed(2)} ({formatPercent(holding.liveChangePercent)})
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(holding.shares_owned)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(holding.market_value)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(holding.cost_basis)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right tabular-nums",
                        isGainPositive ? "text-emerald-400" : "text-rose-400"
                      )}>
                        <div>
                          {isGainPositive ? '+' : ''}{formatCurrency(gainLoss)}
                        </div>
                        <div className="text-xs opacity-70">
                          {formatPercent(gainLossPercent)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {holding.sparklineData && holding.sparklineData.length > 0 && (
                          <div className="h-8 w-20">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={holding.sparklineData}>
                                <Line
                                  type="monotone"
                                  dataKey="price"
                                  stroke={isPositive ? '#10b981' : '#f43f5e'}
                                  strokeWidth={1.5}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sortedHoldings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No public equity holdings found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Watchlist Section */}
      {watchlist.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowWatchlist(!showWatchlist)}
            className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors"
          >
            <Star className="h-5 w-5" />
            Watchlist
            {showWatchlist ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <Badge variant="secondary" className="ml-2">{watchlist.length}</Badge>
          </button>
          
          <AnimatePresence>
            {showWatchlist && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-3 flex-wrap">
                  {watchlist.map((item) => (
                    <Card
                      key={item.id}
                      className="p-3 bg-card border-border hover:border-primary/50 transition-all cursor-pointer"
                      onClick={() => navigate(`/portfolio/${item.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{item.ticker_symbol}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{item.name}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info('Quick buy coming soon');
                          }}
                        >
                          Buy
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
              <span className="text-3xl font-bold">{formatPrice(selectedIndex?.price)}</span>
              <span className={cn(
                "text-lg font-medium",
                (selectedIndex?.change || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {(selectedIndex?.change || 0) >= 0 ? '+' : ''}{selectedIndex?.change?.toFixed(2)} ({formatPercent(selectedIndex?.changePercent)})
              </span>
            </div>
            {selectedIndex?.chartData && selectedIndex.chartData.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedIndex.chartData}>
                    <defs>
                      <linearGradient id="indexGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={(selectedIndex.change || 0) >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={(selectedIndex.change || 0) >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#64748b" />
                    <YAxis domain={['dataMin', 'dataMax']} tick={{ fontSize: 10 }} stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8' }}
                      formatter={(value: number) => [formatPrice(value), 'Price']}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={(selectedIndex.change || 0) >= 0 ? '#10b981' : '#f43f5e'}
                      strokeWidth={2}
                      fill="url(#indexGradient)"
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

// Holding Card Component
function HoldingCard({
  holding,
  onClick,
  formatCurrency,
  formatPrice,
  formatPercent,
}: {
  holding: HoldingWithQuote;
  onClick: () => void;
  formatCurrency: (v: number | null | undefined) => string;
  formatPrice: (v: number | null | undefined) => string;
  formatPercent: (v: number | null | undefined) => string;
}) {
  const gainLoss = (holding.market_value || 0) - (holding.cost_basis || 0);
  const gainLossPercent = holding.cost_basis ? (gainLoss / holding.cost_basis) * 100 : 0;
  const isPositive = (holding.liveChange || 0) >= 0;
  const isGainPositive = gainLoss >= 0;

  return (
    <Card 
      className="p-4 bg-card border-border hover:border-primary/50 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">{holding.ticker_symbol}</span>
              <span className={cn(
                "w-2 h-2 rounded-full",
                holding.isLoading ? "bg-muted animate-pulse" : "bg-emerald-400"
              )} title="Live price" />
            </div>
            <p className="text-sm text-muted-foreground truncate max-w-[160px]">{holding.name}</p>
          </div>
          {holding.isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <span className="text-lg font-semibold text-foreground tabular-nums">
              {formatPrice(holding.livePrice)}
            </span>
          )}
        </div>

        {/* Today's Change */}
        <div className={cn(
          "text-sm font-medium tabular-nums",
          isPositive ? "text-emerald-400" : "text-rose-400"
        )}>
          {holding.isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <>
              {isPositive ? <TrendingUp className="inline h-3 w-3 mr-1" /> : <TrendingDown className="inline h-3 w-3 mr-1" />}
              {isPositive ? '+' : ''}{holding.liveChange?.toFixed(2)} ({formatPercent(holding.liveChangePercent)}) today
            </>
          )}
        </div>

        {/* Sparkline */}
        {holding.sparklineData && holding.sparklineData.length > 0 && (
          <div className="h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={holding.sparklineData}>
                <defs>
                  <linearGradient id={`card-gradient-${holding.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isPositive ? '#10b981' : '#f43f5e'}
                  strokeWidth={1.5}
                  fill={`url(#card-gradient-${holding.id})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Position Info */}
        <div className="pt-2 border-t border-border space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {holding.shares_owned?.toLocaleString()} shares
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(holding.market_value)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total gain/loss</span>
            <span className={cn(
              "font-medium tabular-nums",
              isGainPositive ? "text-emerald-400" : "text-rose-400"
            )}>
              {isGainPositive ? '+' : ''}{formatCurrency(gainLoss)} ({formatPercent(gainLossPercent)})
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
