import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetTypeFilter, useAssetTypeFilter } from '@/components/shared/AssetTypeFilter';
import { useUnifiedData, AssetClass, CompanyWithRelations } from '@/contexts/UnifiedDataContext';
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
  Star,
} from "lucide-react";
import { useWatchlist } from '@/hooks/useWatchlist';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

type SortOption = 'value' | 'performance' | 'name' | 'type' | 'date';
type ViewMode = 'cards' | 'table' | 'treemap';
type AllocationView = 'type' | 'sector';

export default function Portfolio() {
  const { companiesWithRelations, isLoading, dashboardStats, getCompaniesByAssetClass } = useUnifiedData();
  const assetTypeFilter = useAssetTypeFilter();
  
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortBy, setSortBy] = useState<SortOption>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [allocationView, setAllocationView] = useState<AllocationView>('type');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  // Get holdings (portfolio companies) filtered by asset type
  const holdings = useMemo(() => {
    const filtered = assetTypeFilter === 'all' 
      ? companiesWithRelations
      : getCompaniesByAssetClass(assetTypeFilter as AssetClass);
    let portfolioHoldings = filtered.filter(c => c.company_type === 'portfolio');
    
    // Apply segment filter if selected
    if (selectedSegment) {
      if (allocationView === 'type') {
        portfolioHoldings = portfolioHoldings.filter(h => 
          (h.asset_class || 'private_equity') === selectedSegment
        );
      } else {
        portfolioHoldings = portfolioHoldings.filter(h => 
          (h.industry || 'Unknown') === selectedSegment
        );
      }
    }
    
    // Sort holdings
    return portfolioHoldings.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'value':
          comparison = (getHoldingValue(b) - getHoldingValue(a));
          break;
        case 'performance':
          comparison = (getGainLossPercent(b) - getGainLossPercent(a));
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = (a.asset_class || 'other').localeCompare(b.asset_class || 'other');
          break;
        case 'date':
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
      }
      return sortAsc ? -comparison : comparison;
    });
  }, [companiesWithRelations, assetTypeFilter, getCompaniesByAssetClass, selectedSegment, allocationView, sortBy, sortAsc]);

  // Calculate stats by asset class
  const stats = useMemo(() => {
    const allHoldings = companiesWithRelations.filter(c => c.company_type === 'portfolio');
    
    const byType: Record<AssetClass, { value: number; costBasis: number; count: number }> = {
      private_equity: { value: 0, costBasis: 0, count: 0 },
      public_equity: { value: 0, costBasis: 0, count: 0 },
      real_estate: { value: 0, costBasis: 0, count: 0 },
      credit: { value: 0, costBasis: 0, count: 0 },
      other: { value: 0, costBasis: 0, count: 0 },
    };
    
    const bySector: Record<string, { value: number; count: number }> = {};
    let todayChange = 0;
    
    allHoldings.forEach(h => {
      const assetClass = (h.asset_class || 'private_equity') as AssetClass;
      const value = getHoldingValue(h);
      const costBasis = h.cost_basis || 0;
      
      byType[assetClass].value += value;
      byType[assetClass].costBasis += costBasis;
      byType[assetClass].count += 1;
      
      const sector = h.industry || 'Unknown';
      if (!bySector[sector]) {
        bySector[sector] = { value: 0, count: 0 };
      }
      bySector[sector].value += value;
      bySector[sector].count += 1;
      
      // For public equities, estimate today's change (simplified)
      if (assetClass === 'public_equity' && h.market_value && h.cost_basis) {
        todayChange += (h.market_value * 0.01); // Placeholder - would need real-time data
      }
    });
    
    const totalValue = Object.values(byType).reduce((sum, t) => sum + t.value, 0);
    
    return {
      total: totalValue,
      byType,
      bySector,
      todayChange,
      todayChangePercent: totalValue > 0 ? (todayChange / totalValue) * 100 : 0,
    };
  }, [companiesWithRelations]);

  // Allocation chart data
  const allocationData = useMemo(() => {
    if (allocationView === 'type') {
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
    } else {
      const sectorColors = [
        'hsl(217, 91%, 60%)',
        'hsl(160, 84%, 39%)',
        'hsl(38, 92%, 50%)',
        'hsl(280, 65%, 60%)',
        'hsl(350, 89%, 60%)',
        'hsl(190, 80%, 50%)',
        'hsl(45, 90%, 55%)',
        'hsl(300, 70%, 50%)',
      ];
      return Object.entries(stats.bySector)
        .sort(([_, a], [__, b]) => b.value - a.value)
        .slice(0, 8)
        .map(([sector, data], index) => ({
          name: sector,
          shortName: sector.length > 12 ? sector.slice(0, 12) + '...' : sector,
          value: data.value,
          color: sectorColors[index % sectorColors.length],
          count: data.count,
          id: sector,
        }));
    }
  }, [stats, allocationView]);

  // Treemap data
  const treemapData = useMemo(() => {
    return holdings.map(h => ({
      name: h.ticker_symbol || h.name,
      size: getHoldingValue(h),
      color: ASSET_CLASS_CONFIG[(h.asset_class || 'private_equity') as AssetClass].chartColor,
      id: h.id,
    }));
  }, [holdings]);

  const formatCurrency = (value: number, compact = false) => {
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
  };

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
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-80 col-span-1" />
          <Skeleton className="h-80 col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Holdings</h1>
          <p className="text-muted-foreground mt-1">
            Unified view of all owned assets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard
          label="Total Holdings"
          value={formatCurrency(stats.total, true)}
          icon={<Wallet className="h-4 w-4" />}
          primary
        />
        <SummaryCard
          label="Private Equity"
          value={formatCurrency(stats.byType.private_equity.value, true)}
          count={stats.byType.private_equity.count}
          icon={<Briefcase className="h-4 w-4" />}
          color="purple"
        />
        <SummaryCard
          label="Public Equities"
          value={formatCurrency(stats.byType.public_equity.value, true)}
          count={stats.byType.public_equity.count}
          icon={<LineChart className="h-4 w-4" />}
          color="emerald"
        />
        <SummaryCard
          label="Other Assets"
          value={formatCurrency(
            stats.byType.real_estate.value + stats.byType.credit.value + stats.byType.other.value, 
            true
          )}
          count={
            stats.byType.real_estate.count + stats.byType.credit.count + stats.byType.other.count
          }
          icon={<Package className="h-4 w-4" />}
          color="amber"
        />
        <SummaryCard
          label="Today's Change"
          value={`${stats.todayChange >= 0 ? '+' : ''}${formatCurrency(stats.todayChange, true)}`}
          subtitle={`${stats.todayChangePercent >= 0 ? '+' : ''}${stats.todayChangePercent.toFixed(2)}%`}
          icon={stats.todayChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          trend={stats.todayChange >= 0 ? 'up' : 'down'}
        />
      </div>

      {/* Asset Type Filter */}
      <AssetTypeFilter />

      {/* Allocation Chart + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Chart */}
        <Card className="bg-card border-border lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Allocation</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant={allocationView === 'type' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setAllocationView('type'); setSelectedSegment(null); }}
                >
                  Type
                </Button>
                <Button
                  variant={allocationView === 'sector' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setAllocationView('sector'); setSelectedSegment(null); }}
                >
                  Sector
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(data) => setSelectedSegment(
                      selectedSegment === data.id ? null : data.id
                    )}
                    style={{ cursor: 'pointer' }}
                  >
                    {allocationData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke={selectedSegment === entry.id ? 'hsl(var(--foreground))' : 'transparent'}
                        strokeWidth={2}
                        opacity={selectedSegment && selectedSegment !== entry.id ? 0.4 : 1}
                      />
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
                            <p className="text-xs text-muted-foreground">
                              {data.count} holding{data.count !== 1 ? 's' : ''}
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
            <div className="mt-4 space-y-2">
              {allocationData.map((item) => {
                const total = allocationData.reduce((sum, d) => sum + d.value, 0);
                const percent = ((item.value / total) * 100).toFixed(1);
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedSegment(selectedSegment === item.id ? null : item.id)}
                    className={cn(
                      "w-full flex items-center justify-between text-sm p-2 rounded-md transition-all",
                      selectedSegment === item.id 
                        ? "bg-secondary" 
                        : "hover:bg-secondary/50",
                      selectedSegment && selectedSegment !== item.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-foreground">{item.shortName}</span>
                    </div>
                    <span className="text-muted-foreground tabular-nums">{percent}%</span>
                  </button>
                );
              })}
            </div>
            
            {selectedSegment && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-muted-foreground"
                onClick={() => setSelectedSegment(null)}
              >
                Clear filter
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Holdings List */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-medium text-foreground">
                Holdings
                <span className="text-muted-foreground font-normal ml-2">
                  ({holdings.length})
                </span>
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {/* Sort Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      <span className="capitalize">{sortBy}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(['value', 'performance', 'name', 'type', 'date'] as SortOption[]).map((option) => (
                      <DropdownMenuItem 
                        key={option}
                        onClick={() => handleSort(option)}
                        className="capitalize"
                      >
                        {option}
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
              {holdings.length === 0 ? (
                <EmptyState />
              ) : viewMode === 'cards' ? (
                <HoldingsGrid holdings={holdings} formatCurrency={formatCurrency} />
              ) : viewMode === 'table' ? (
                <HoldingsTable 
                  holdings={holdings} 
                  formatCurrency={formatCurrency}
                  onSort={handleSort}
                  sortBy={sortBy}
                  sortAsc={sortAsc}
                />
              ) : (
                <HoldingsTreemap data={treemapData} formatCurrency={formatCurrency} />
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper functions
function getHoldingValue(holding: CompanyWithRelations): number {
  if (holding.market_value) return holding.market_value;
  if (holding.current_price && holding.shares_owned) {
    return holding.current_price * holding.shares_owned;
  }
  return holding.ebitda_ltm || holding.cost_basis || 0;
}

function getGainLossPercent(holding: CompanyWithRelations): number {
  const value = getHoldingValue(holding);
  const costBasis = holding.cost_basis || 0;
  if (costBasis <= 0) return 0;
  return ((value - costBasis) / costBasis) * 100;
}

// Summary Card Component
interface SummaryCardProps {
  label: string;
  value: string;
  count?: number;
  subtitle?: string;
  icon: React.ReactNode;
  primary?: boolean;
  color?: 'purple' | 'emerald' | 'amber' | 'blue';
  trend?: 'up' | 'down';
}

function SummaryCard({ label, value, count, subtitle, icon, primary, color, trend }: SummaryCardProps) {
  const colorClasses = {
    purple: 'text-purple-400',
    emerald: 'text-success',
    amber: 'text-warning',
    blue: 'text-primary',
  };
  
  return (
    <Card className={cn(
      "bg-card border-border",
      primary && "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={cn(
            "text-xs font-medium uppercase tracking-wider",
            color ? colorClasses[color] : "text-muted-foreground"
          )}>
            {label}
          </span>
          <span className={cn(
            "p-1.5 rounded-md",
            color ? `bg-${color}-500/10` : "bg-muted"
          )}>
            {icon}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-xl font-bold tabular-nums",
            trend === 'up' && "text-success",
            trend === 'down' && "text-destructive",
            !trend && "text-foreground"
          )}>
            {value}
          </span>
          {count !== undefined && (
            <span className="text-xs text-muted-foreground">
              {count} asset{count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {subtitle && (
          <span className={cn(
            "text-sm",
            trend === 'up' && "text-success",
            trend === 'down' && "text-destructive",
            !trend && "text-muted-foreground"
          )}>
            {subtitle}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

// Holdings Grid Component
function HoldingsGrid({ 
  holdings, 
  formatCurrency 
}: { 
  holdings: CompanyWithRelations[]; 
  formatCurrency: (v: number, c?: boolean) => string;
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
          formatCurrency={formatCurrency}
          index={index}
        />
      ))}
    </motion.div>
  );
}

// Holding Card Component
function HoldingCard({ 
  holding, 
  formatCurrency,
  index,
}: { 
  holding: CompanyWithRelations; 
  formatCurrency: (v: number, c?: boolean) => string;
  index: number;
}) {
  const assetClass = (holding.asset_class || 'private_equity') as AssetClass;
  const config = ASSET_CLASS_CONFIG[assetClass];
  const Icon = config.icon;
  
  const value = getHoldingValue(holding);
  const gainLossPercent = getGainLossPercent(holding);
  const isPositive = gainLossPercent >= 0;

  const { isInWatchlist, toggleWatchlist, isToggling } = useWatchlist();
  
  const itemType = assetClass === 'public_equity' ? 'stock' : 'company';
  const itemId = holding.ticker_symbol || holding.id;
  const isWatched = isInWatchlist(itemType, itemId);

  const handleToggleWatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist({
      itemType,
      itemId,
      itemName: holding.name,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/companies/${holding.id}`}>
        <Card className="bg-card border-border hover:border-primary/50 transition-all group cursor-pointer">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", config.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
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
              
              {/* Watchlist Star Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleToggleWatch}
                disabled={isToggling}
              >
                <Star className={cn(
                  "h-4 w-4 transition-colors",
                  isWatched ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground hover:text-yellow-500"
                )} />
              </Button>
            </div>
            
            {/* Value */}
            <div className="mb-3">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(value, true)}
              </span>
            </div>
            
            {/* Performance */}
            <div className="flex items-center justify-between">
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {isPositive ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span className="tabular-nums">
                  {isPositive ? '+' : ''}{gainLossPercent.toFixed(1)}%
                </span>
              </div>
              
              {/* Type-specific details */}
              <div className="text-xs text-muted-foreground">
                {assetClass === 'public_equity' && holding.shares_owned && (
                  <span>{holding.shares_owned.toLocaleString()} shares</span>
                )}
                {assetClass === 'private_equity' && holding.pipeline_stage && (
                  <span className="capitalize">{holding.pipeline_stage}</span>
                )}
                {assetClass === 'real_estate' && holding.industry && (
                  <span>{holding.industry}</span>
                )}
              </div>
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
  formatCurrency,
  onSort,
  sortBy,
  sortAsc,
}: { 
  holdings: CompanyWithRelations[]; 
  formatCurrency: (v: number, c?: boolean) => string;
  onSort: (option: SortOption) => void;
  sortBy: SortOption;
  sortAsc: boolean;
}) {
  const columns = [
    { key: 'name', label: 'Asset', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'value', label: 'Value', sortable: true, align: 'right' as const },
    { key: 'costBasis', label: 'Cost Basis', align: 'right' as const },
    { key: 'performance', label: 'Return', sortable: true, align: 'right' as const },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="overflow-x-auto"
    >
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider",
                  col.align === 'right' ? 'text-right' : 'text-left',
                  col.sortable && 'cursor-pointer hover:text-foreground'
                )}
                onClick={() => col.sortable && onSort(col.key as SortOption)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortBy === col.key && (
                    <span>{sortAsc ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => {
            const assetClass = (holding.asset_class || 'private_equity') as AssetClass;
            const config = ASSET_CLASS_CONFIG[assetClass];
            const Icon = config.icon;
            const value = getHoldingValue(holding);
            const gainLossPercent = getGainLossPercent(holding);
            const isPositive = gainLossPercent >= 0;

            return (
              <tr
                key={holding.id}
                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <td className="py-3 px-4">
                  <Link to={`/companies/${holding.id}`} className="flex items-center gap-3 group">
                    <div className={cn("p-1.5 rounded-md", config.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {holding.ticker_symbol || holding.name}
                      </span>
                      {holding.ticker_symbol && (
                        <p className="text-xs text-muted-foreground">{holding.name}</p>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className={cn("text-xs", config.color)}>
                    {config.shortLabel}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right font-mono text-foreground">
                  {formatCurrency(value, true)}
                </td>
                <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                  {holding.cost_basis ? formatCurrency(holding.cost_basis, true) : '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={cn(
                    "flex items-center justify-end gap-1 font-mono",
                    isPositive ? "text-success" : "text-destructive"
                  )}>
                    {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {isPositive ? '+' : ''}{gainLossPercent.toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </motion.div>
  );
}

// Holdings Treemap Component
function HoldingsTreemap({ 
  data, 
  formatCurrency 
}: { 
  data: { name: string; size: number; color: string; id: string }[];
  formatCurrency: (v: number, c?: boolean) => string;
}) {
  // Custom treemap cell component
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
            to={`/companies/${item.id}`}
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
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-12"
    >
      <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
      <p className="text-foreground font-medium">No holdings found</p>
      <p className="text-sm text-muted-foreground mt-1">
        Add assets with "Portfolio" status to see them here
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/companies">Browse Assets</Link>
      </Button>
    </motion.div>
  );
}
