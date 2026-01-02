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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';
import { 
  ArrowUpRight, ArrowDownRight, Plus, RefreshCw, LayoutGrid, 
  List, Search, ArrowUpDown, ChevronDown, ChevronUp,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { AddAssetWizard } from '@/components/companies/AddAssetWizard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgId } from '@/contexts/OrganizationContext';
import { useMarketIndices } from '@/hooks/useMarketData';
import { MarketDataPausedBanner } from '@/components/dev/MarketDataPausedBanner';
import { FinnhubApiBanner } from '@/components/shared/FinnhubApiBanner';

// Types
interface MarketIndex {
  symbol: string;
  name: string;
  shortName: string;
  price: number;
  change: number;
  changePercent: number;
  sparklineData?: { v: number }[];
}

interface ConsolidatedHolding {
  ticker: string;
  name: string;
  companyIds: string[];
  shares: number;
  costBasis: number;
  avgCost: number;
  marketValue: number;
  livePrice: number;
  liveChange: number;
  liveChangePercent: number;
  todayGainLoss: number;
  gainLoss: number;
  gainLossPercent: number;
  isLoading: boolean;
}

type SortKey = 'value' | 'gainLoss' | 'todayChange' | 'name' | 'ticker';
type SortDirection = 'asc' | 'desc';

// Market indices symbols
const MARKET_INDICES_SYMBOLS = [
  { symbol: 'SPY', name: 'S&P 500', shortName: 'S&P' },
  { symbol: 'QQQ', name: 'NASDAQ', shortName: 'NDX' },
  { symbol: 'DIA', name: 'DOW', shortName: 'DOW' },
  { symbol: 'IWM', name: 'Russell 2000', shortName: 'RUT' },
  { symbol: 'VIX', name: 'VIX', shortName: 'VIX' },
];

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

export default function MarketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = useOrgId();
  const { companies, refetchAll, isLoading: isDataLoading } = useUnifiedData();
  
  const [viewMode, setViewMode] = useState<string>(() => {
    return localStorage.getItem('markets-view-mode') || 'grid';
  });
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<MarketIndex | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [holdingsData, setHoldingsData] = useState<Map<string, { price: number; change: number; changePercent: number }>>(new Map());
  const [holdingsLoading, setHoldingsLoading] = useState(false);

  // Filter public equity holdings
  const publicEquityHoldings = useMemo(() => {
    return companies.filter(c => 
      c.asset_class === 'public_equity' && 
      c.company_type === 'portfolio' &&
      c.ticker_symbol
    );
  }, [companies]);

  // Watchlist
  const watchlist = useMemo(() => {
    return companies.filter(c => 
      c.asset_class === 'public_equity' && 
      (c.company_type === 'prospect' || c.company_type === 'pipeline') &&
      c.ticker_symbol
    );
  }, [companies]);

  // Market indices hook
  const { 
    indices: marketIndicesData, 
    isLoading: indicesLoading, 
    refresh: refreshIndices,
  } = useMarketIndices();

  // Map indices with sparklines
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

  // Fetch quotes for holdings
  const fetchHoldingQuotes = useCallback(async () => {
    if (publicEquityHoldings.length === 0) return;

    setHoldingsLoading(true);
    const tickers = [...new Set(publicEquityHoldings
      .filter(h => h.ticker_symbol)
      .map(h => h.ticker_symbol!.toUpperCase()))];

    const quotes = await getCachedQuotes(tickers);
    setHoldingsData(quotes);
    setHoldingsLoading(false);
    setLastRefresh(new Date());
  }, [publicEquityHoldings]);

  // Consolidate holdings by ticker
  const consolidatedHoldings = useMemo<ConsolidatedHolding[]>(() => {
    const tickerMap = new Map<string, ConsolidatedHolding>();

    publicEquityHoldings.forEach(company => {
      const ticker = company.ticker_symbol!.toUpperCase();
      const quote = holdingsData.get(ticker);
      const livePrice = quote?.price || company.current_price || 0;
      const liveChange = quote?.change || 0;
      const liveChangePercent = quote?.changePercent || 0;
      const shares = company.shares_owned || 0;
      const costBasis = company.cost_basis || 0;
      
      if (tickerMap.has(ticker)) {
        const existing = tickerMap.get(ticker)!;
        const totalShares = existing.shares + shares;
        const totalCost = existing.costBasis + costBasis;
        const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
        const marketValue = totalShares * livePrice;
        const gainLoss = marketValue - totalCost;
        const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
        const todayGainLoss = totalShares * liveChange;

        tickerMap.set(ticker, {
          ...existing,
          companyIds: [...existing.companyIds, company.id],
          shares: totalShares,
          costBasis: totalCost,
          avgCost,
          marketValue,
          todayGainLoss,
          gainLoss,
          gainLossPercent,
        });
      } else {
        const marketValue = shares * livePrice;
        const gainLoss = marketValue - costBasis;
        const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
        const avgCost = shares > 0 ? costBasis / shares : 0;

        tickerMap.set(ticker, {
          ticker,
          name: company.name,
          companyIds: [company.id],
          shares,
          costBasis,
          avgCost,
          marketValue,
          livePrice,
          liveChange,
          liveChangePercent,
          todayGainLoss: shares * liveChange,
          gainLoss,
          gainLossPercent,
          isLoading: holdingsLoading,
        });
      }
    });

    return Array.from(tickerMap.values());
  }, [publicEquityHoldings, holdingsData, holdingsLoading]);

  // Fetch quotes on mount
  useEffect(() => {
    if (publicEquityHoldings.length > 0) {
      fetchHoldingQuotes();
    }
  }, [publicEquityHoldings.length]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshIndices(), fetchHoldingQuotes()]);
    setIsRefreshing(false);
    toast.success('Prices updated');
  };

  // Save view mode
  useEffect(() => {
    localStorage.setItem('markets-view-mode', viewMode);
  }, [viewMode]);

  // Portfolio totals
  const totals = useMemo(() => {
    const totalValue = consolidatedHoldings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalCost = consolidatedHoldings.reduce((sum, h) => sum + h.costBasis, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const todayChange = consolidatedHoldings.reduce((sum, h) => sum + h.todayGainLoss, 0);
    const todayChangePercent = totalValue > 0 ? (todayChange / (totalValue - todayChange)) * 100 : 0;

    return { totalValue, totalCost, totalGainLoss, totalGainLossPercent, todayChange, todayChangePercent, positions: consolidatedHoldings.length };
  }, [consolidatedHoldings]);

  // Sort and filter
  const sortedHoldings = useMemo(() => {
    let filtered = consolidatedHoldings;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = consolidatedHoldings.filter(h => 
        h.ticker.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortKey) {
        case 'value': aVal = a.marketValue; bVal = b.marketValue; break;
        case 'gainLoss': aVal = a.gainLoss; bVal = b.gainLoss; break;
        case 'todayChange': aVal = a.todayGainLoss; bVal = b.todayGainLoss; break;
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        case 'ticker': aVal = a.ticker; bVal = b.ticker; break;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
    });
  }, [consolidatedHoldings, searchQuery, sortKey, sortDirection]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <FinnhubApiBanner />
      <MarketDataPausedBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Markets</h1>
          <p className="text-sm text-muted-foreground">
            Updated {lastRefresh.toLocaleTimeString()}
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

      {/* Consolidated Portfolio Pulse Header */}
      <div className="bg-gradient-to-r from-card to-card/50 rounded-xl p-6 border border-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Primary: Total Value with today's change pill */}
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium mb-1">Portfolio Value</p>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
                {formatCurrency(totals.totalValue)}
              </span>
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
                totals.todayChange >= 0 
                  ? "bg-emerald-500/10 text-emerald-500" 
                  : "bg-rose-500/10 text-rose-500"
              )}>
                {totals.todayChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {formatCurrency(Math.abs(totals.todayChange))} ({formatPercent(totals.todayChangePercent)})
                <span className="text-xs opacity-70 ml-1">today</span>
              </div>
            </div>
          </div>
          
          {/* Secondary metrics */}
          <div className="flex gap-8 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Return</p>
              <p className={cn("text-xl font-semibold tabular-nums", totals.totalGainLoss >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {formatCurrency(totals.totalGainLoss)} <span className="text-sm opacity-70">{formatPercent(totals.totalGainLossPercent)}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cost Basis</p>
              <p className="text-xl font-semibold tabular-nums text-foreground">
                {formatCurrency(totals.totalCost)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Positions</p>
              <p className="text-xl font-semibold tabular-nums text-foreground">
                {totals.positions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Market Indices with Sparklines */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {indicesLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
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
                      {isUp ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                      {formatPercent(idx.changePercent)}
                    </div>
                  </div>
                  {/* Sparkline */}
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

      {/* Holdings Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">Holdings</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-9 w-40"
              />
            </div>
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v)}>
              <ToggleGroupItem value="grid" size="sm">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" size="sm">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Sort Options (Grid mode) */}
        {viewMode === 'grid' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort:</span>
            {(['value', 'gainLoss', 'todayChange', 'ticker'] as SortKey[]).map((key) => (
              <Button
                key={key}
                variant={sortKey === key ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => toggleSort(key)}
                className="gap-1 capitalize h-7 px-2"
              >
                {key === 'gainLoss' ? 'Return' : key === 'todayChange' ? 'Today' : key}
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
                  key={holding.ticker}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <HoldingCard 
                    holding={holding} 
                    onClick={() => navigate(`/portfolio/${holding.companyIds[0]}`)}
                    formatCurrency={formatCurrency}
                    formatPrice={formatPrice}
                    formatPercent={formatPercent}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {sortedHoldings.length === 0 && !isDataLoading && (
              <Card className="col-span-full p-8 text-center">
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
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
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
                      Today
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
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('gainLoss')}>
                    <div className="flex items-center justify-end gap-1">
                      Return
                      {sortKey === 'gainLoss' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.map((holding) => {
                  const isUp = holding.liveChangePercent >= 0;
                  const isGainUp = holding.gainLoss >= 0;

                  return (
                    <TableRow 
                      key={holding.ticker} 
                      className="cursor-pointer"
                      onClick={() => navigate(`/portfolio/${holding.companyIds[0]}`)}
                    >
                      <TableCell>
                        <span className="font-semibold text-foreground">{holding.ticker}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {holding.name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {holdingsLoading ? <Skeleton className="h-4 w-16 ml-auto" /> : formatPrice(holding.livePrice)}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", isUp ? "text-emerald-500" : "text-rose-500")}>
                        {formatPercent(holding.liveChangePercent)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {holding.shares.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(holding.marketValue)}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", isGainUp ? "text-emerald-500" : "text-rose-500")}>
                        {formatPercent(holding.gainLossPercent)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sortedHoldings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No holdings found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Watchlist */}
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
                      className="p-3 hover:border-primary/50 transition-all cursor-pointer"
                      onClick={() => navigate(`/portfolio/${item.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{item.ticker_symbol}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{item.name}</p>
                        </div>
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

// Holding Card with live pulse indicator and hover effects
function HoldingCard({
  holding,
  onClick,
  formatCurrency,
  formatPrice,
  formatPercent,
}: {
  holding: ConsolidatedHolding;
  onClick: () => void;
  formatCurrency: (v: number) => string;
  formatPrice: (v: number) => string;
  formatPercent: (v: number) => string;
}) {
  const isUp = holding.liveChangePercent >= 0;
  const isGainUp = holding.gainLoss >= 0;

  return (
    <Card 
      className="relative p-4 cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-all group"
      onClick={onClick}
    >
      {/* Chart Button - shows on hover */}
      <button 
        className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition z-10"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      {/* Header: Ticker + Live Pulse + Price */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">{holding.ticker}</span>
            {/* Live pulse indicator */}
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground truncate max-w-[140px]">{holding.name}</p>
        </div>
        <div className="text-right">
          {holding.isLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <>
              <p className="text-lg font-semibold tabular-nums text-foreground">{formatPrice(holding.livePrice)}</p>
              <div className={cn(
                "text-sm font-medium flex items-center justify-end gap-0.5",
                isUp ? "text-emerald-500" : "text-rose-500"
              )}>
                {isUp ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                  </svg>
                )}
                {formatPercent(holding.liveChangePercent)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border mb-3" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Value</span>
          <div className="font-medium tabular-nums text-foreground">{formatCurrency(holding.marketValue)}</div>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Return</span>
          <div className={cn("font-medium tabular-nums", isGainUp ? "text-emerald-500" : "text-rose-500")}>
            {isGainUp ? '+' : ''}{formatCurrency(holding.gainLoss)}
          </div>
        </div>
      </div>

      {/* Hover Arrow */}
      <svg 
        className="absolute bottom-4 right-3 w-4 h-4 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 text-muted-foreground transition-all" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Card>
  );
}
