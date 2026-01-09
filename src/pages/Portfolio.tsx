import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, isToday, isBefore, startOfDay, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUnifiedData, AssetClass, CompanyWithRelations, useDashboardData, type TaskWithRelations } from '@/contexts/UnifiedDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgId, useOrganization, AssetType } from '@/contexts/OrganizationContext';
import { useMarketIndices } from '@/hooks/useMarketData';
import { useAlerts, useEvents, useEconomicIndicators } from '@/hooks/useMarketIntel';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { supabase } from '@/integrations/supabase/client';
import { usePositions } from '@/hooks/usePositions';
import { usePortfolioPerformance } from '@/hooks/usePortfolioPerformance';
import { UnifiedAddPositionDialog, EnhancedPortfolioBuilder } from '@/components/portfolio';
import { usePortfolioForVisualizer } from '@/hooks/useUnifiedPortfolio';
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
  Building2,
  Users,
  CheckSquare,
  FileText,
  Upload,
  AlertTriangle,
  Clock,
  Calendar,
  BarChart3,
  Save,
  FolderOpen,
  Zap,
  ChevronRight,
  Activity,
  AlertCircle,
  Home,
  Coins,
  Globe,
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Treemap, AreaChart, Area, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AddAssetWizard } from '@/components/companies/AddAssetWizard';
import { MarketDataPausedBanner } from '@/components/dev/MarketDataPausedBanner';
import { FinnhubApiBanner } from '@/components/shared/FinnhubApiBanner';
import { toast } from 'sonner';
import { CompanyMiniCard } from '@/components/shared/CompanyMiniCard';
import { TaskRow } from '@/components/shared/TaskRow';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import { WidgetConfigDialog } from '@/components/dashboard/WidgetConfigDialog';
import { PortfolioPerformanceCard } from '@/components/dashboard/PortfolioPerformanceCard';
import { PortfolioNews } from '@/components/dashboard/PortfolioNews';
import { useActivePortfolio } from '@/hooks/useActivePortfolio';
import { usePortfolioFromAllocations } from '@/hooks/usePortfolioFromAllocations';
import { PortfolioSwitcher } from '@/components/portfolio/PortfolioSwitcher';
import { CreatePortfolioDialog } from '@/components/portfolio/CreatePortfolioDialog';
import { PortfolioMetricsPanel } from '@/components/portfolio/PortfolioMetricsPanel';
import { RealPerformanceChart } from '@/components/portfolio/RealPerformanceChart';
import { PortfolioAnalysisTabs } from '@/components/portfolio/PortfolioAnalysisTabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Info, BookOpen, Lightbulb, Calculator, ExternalLink } from 'lucide-react';
import { financialTerms } from '@/data/financialTerms';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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

// Sparkline data would require real intraday API data - removed synthetic generation

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Stat Card with Interactive Tooltips, Popover Cards & Data Sources
function StatCard({
  title,
  value,
  displayValue,
  icon: Icon,
  alert,
  alertCount,
  onClick,
  isLoading,
  change,
  changeLabel,
  subtitle,
  termKey,
  dataSource,
}: {
  title: string;
  value?: number;
  displayValue?: string;
  icon: React.ElementType;
  alert?: boolean;
  alertCount?: number;
  onClick?: () => void;
  isLoading?: boolean;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  /** Key from financialTerms for tooltips */
  termKey?: string;
  /** Data source for professional standards */
  dataSource?: string;
}) {
  const [showPopover, setShowPopover] = useState(false);
  const term = termKey ? financialTerms[termKey] : null;
  
  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-12" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = change !== undefined && change >= 0;

  const cardContent = (
    <motion.div variants={itemVariants} className="h-full">
      <Card
        className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] group bg-gradient-to-br from-card to-secondary/20 relative h-full flex flex-col"
        onClick={onClick}
      >
        <CardContent className="p-4 pb-6 flex-1 flex flex-col min-h-[100px]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{title}</span>
              {term && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="text-muted-foreground hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPopover(true);
                      }}
                    >
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{term.definition}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xl font-bold">
            {displayValue !== undefined ? displayValue : value}
          </p>
          <div className="mt-auto">
            {change !== undefined && (
              <p className={cn(
                "text-xs flex items-center gap-1",
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              )}>
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {formatPercent(change)}
                {changeLabel && <span className="text-muted-foreground ml-1">{changeLabel}</span>}
              </p>
            )}
            {alert && alertCount && alertCount > 0 && (
              <Badge variant="destructive" className="text-xs mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {alertCount} overdue
              </Badge>
            )}
            {subtitle && !alert && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          
          {dataSource && (
            <div className="absolute bottom-1 right-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info className="h-2.5 w-2.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>Data Source: {dataSource}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  // Wrap with dialog for detailed impact info
  if (term) {
    return (
      <>
        {cardContent}
        <Dialog open={showPopover} onOpenChange={setShowPopover}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {term.term}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  What is this?
                </h4>
                <p className="text-sm text-foreground/90">{term.definition}</p>
              </div>
              
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="text-xs font-medium text-primary uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Impact on Your Portfolio
                </h4>
                <p className="text-sm text-foreground/90">{term.impact}</p>
              </div>
              
              {term.example && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Real-World Example
                  </h4>
                  <div className="text-sm text-foreground/80 bg-muted/50 rounded-md p-2.5 border border-border/50">
                    {term.example}
                  </div>
                </div>
              )}
              
              {term.learnMoreUrl && (
                <a
                  href={term.learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <span>Learn more</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              
              {dataSource && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Data Source: {dataSource}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return cardContent;
}

// Quick Action Button
function QuickActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

// Tasks Card Component
function TasksCard({
  tasks,
  isLoading,
}: {
  tasks: TaskWithRelations[];
  isLoading: boolean;
}) {
  const now = new Date();
  const todayStart = startOfDay(now);

  const { overdue, today, upcoming } = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'completed');
    
    const overdue = openTasks.filter(t => {
      if (!t.due_date) return false;
      return isBefore(parseISO(t.due_date), todayStart);
    });

    const today = openTasks.filter(t => {
      if (!t.due_date) return false;
      return isToday(parseISO(t.due_date));
    });

    const upcoming = openTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = parseISO(t.due_date);
      return !isBefore(dueDate, todayStart) && !isToday(dueDate);
    }).slice(0, 5);

    return { overdue, today, upcoming };
  }, [tasks, todayStart]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          My Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-xs font-medium text-destructive">Overdue ({overdue.length})</span>
            </div>
            <div className="space-y-1">
              {overdue.slice(0, 3).map(task => (
                <TaskRow
                  key={task.id}
                  task={{
                    ...task,
                    company: task.company ? { id: task.company.id, name: task.company.name } : null,
                    contact: task.contact ? { id: task.contact.id, name: `${task.contact.first_name} ${task.contact.last_name}` } : null,
                  }}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {today.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">Today ({today.length})</span>
            </div>
            <div className="space-y-1">
              {today.slice(0, 3).map(task => (
                <TaskRow
                  key={task.id}
                  task={{
                    ...task,
                    company: task.company ? { id: task.company.id, name: task.company.name } : null,
                    contact: task.contact ? { id: task.contact.id, name: `${task.contact.first_name} ${task.contact.last_name}` } : null,
                  }}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Upcoming</span>
            </div>
            <div className="space-y-1">
              {upcoming.map(task => (
                <TaskRow
                  key={task.id}
                  task={{
                    ...task,
                    company: task.company ? { id: task.company.id, name: task.company.name } : null,
                    contact: task.contact ? { id: task.contact.id, name: `${task.contact.first_name} ${task.contact.last_name}` } : null,
                  }}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {overdue.length === 0 && today.length === 0 && upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming tasks
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Recent Companies Grid
function RecentCompaniesGrid({
  companies,
  isLoading,
}: {
  companies: CompanyWithRelations[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {companies.slice(0, 6).map((company, index) => (
        <motion.div
          key={company.id}
          variants={itemVariants}
          custom={index}
        >
          <CompanyMiniCard
            company={{
              id: company.id,
              name: company.name,
              industry: company.industry,
              company_type: company.company_type,
              pipeline_stage: company.pipeline_stage,
            }}
            variant="detailed"
            counts={{
              tasks: company.openTaskCount,
              contacts: company.contactCount,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

export default function Portfolio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = useOrgId();
  const { currentOrganization, enabledAssetTypes } = useOrganization();
  const { companiesWithRelations, isLoading, refetchAll, tasksWithRelations, pipelineStats } = useUnifiedData();
  const { stats, recentCompanies } = useDashboardData();
  const { widgets, enabledWidgets, toggleWidget, resetToDefaults } = useDashboardWidgets();
  
  // Portfolio management
  const {
    portfolios,
    portfoliosLoading,
    activePortfolioId,
    activePortfolio,
    setActivePortfolio,
    savePortfolio,
    updatePortfolio,
    deletePortfolio,
    duplicatePortfolio,
    isSaving,
    isDeleting,
  } = useActivePortfolio();
  
  // Live metrics calculated from saved portfolio allocations
  // Now includes advanced metrics (CAGR, Sharpe, etc.) matching Portfolio Builder
  const {
    allocations: savedAllocations,
    investableCapital,
    investmentHorizon: allocInvestmentHorizon, // NEW: Get investment horizon
    holdings: allocationHoldings,
    totalValue: allocTotalValue,
    totalCostBasis: allocCostBasis,
    totalGainLoss: allocGainLoss,
    totalGainLossPercent: allocGainLossPercent,
    todayChange: allocTodayChange,
    todayChangePercent: allocTodayChangePercent,
    positionCount: allocPositionCount,
    isLoading: allocLoading,
    isLoadingAdvanced: allocAdvancedLoading,
    // Advanced metrics from same calculation as Portfolio Builder
    advancedMetrics: allocAdvancedMetrics,
    cagr: allocCagr,
    sharpeRatio: allocSharpe,
    maxDrawdown: allocMaxDD,
    volatility: allocVolatility,
    alpha: allocAlpha,
    beta: allocBeta,
    refresh: refreshAllocMetrics,
  } = usePortfolioFromAllocations({
    portfolio: activePortfolio,
    enabled: !!activePortfolio,
  });
  
  // Synced positions from database
  const { positions: syncedPositions, isLoading: positionsLoading, refetch: refetchPositions } = usePositions(activePortfolioId || undefined);
  
  // Real portfolio performance from synced positions
  const {
    totalValue: perfTotalValue,
    totalCostBasis: perfCostBasis,
    todayChange: perfTodayChange,
    todayChangePercent: perfTodayChangePercent,
    totalGainLoss: perfTotalGainLoss,
    totalGainLossPercent: perfTotalGainLossPercent,
    byAssetClass: perfByAssetClass,
    positionCount: perfPositionCount,
    isLoading: perfLoading,
    refresh: refreshPerformance,
  } = usePortfolioPerformance({ portfolioId: activePortfolioId });
  
  const [showCreatePortfolioDialog, setShowCreatePortfolioDialog] = useState(false);
  
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
  
  // Market intel data for bottom sections
  const { data: alerts } = useAlerts();
  const { data: events } = useEvents();
  const { data: economicIndicators } = useEconomicIndicators();

  // Handle creating a new portfolio
  const handleCreatePortfolio = async (data: { name: string; description: string }) => {
    await savePortfolio({
      name: data.name,
      description: data.description,
      allocations: [],
    });
    setShowCreatePortfolioDialog(false);
  };

  // Handle renaming portfolio
  const handleRenamePortfolio = async (id: string, name: string) => {
    await updatePortfolio(id, { name });
  };

  // Greeting
  const greeting = getGreeting();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  // Asset type flags
  const hasPrivateEquity = enabledAssetTypes.includes('private_equity');
  const hasPublicEquity = enabledAssetTypes.includes('public_equity');
  const hasBothTypes = hasPrivateEquity && hasPublicEquity;

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('portfolio-view-mode', viewMode);
  }, [viewMode]);

  // Get portfolio allocations from active portfolio
  const portfolioAllocations = useMemo(() => {
    if (!activePortfolio?.allocations) return null;
    try {
      const allocs = activePortfolio.allocations as { symbol: string; weight: number; assetClass?: string }[];
      if (Array.isArray(allocs) && allocs.length > 0) {
        return allocs;
      }
    } catch {
      // Invalid allocations format
    }
    return null;
  }, [activePortfolio]);

  // Get all portfolio holdings - prioritize saved allocation data when available
  const allHoldings = useMemo(() => {
    const portfolioCompanies = companiesWithRelations.filter(c => c.company_type === 'portfolio');
    const holdingsMap = new Map<string, CompanyWithRelations & { _portfolioWeight?: number; _syncedPosition?: boolean; _fromAllocation?: boolean }>();
    
    // PRIORITY 1: If we have saved allocation holdings with live data, use them
    if (allocationHoldings.length > 0) {
      allocationHoldings.forEach(holding => {
        const symbol = holding.symbol.toUpperCase();
        holdingsMap.set(symbol, {
          id: `alloc-${symbol}`,
          name: holding.name || symbol,
          ticker_symbol: symbol,
          asset_class: holding.assetClass || 'public_equity',
          company_type: 'portfolio' as const,
          status: 'active',
          shares_owned: holding.quantity,
          cost_basis: holding.costBasis,
          current_price: holding.currentPrice,
          market_value: holding.currentValue,
          industry: null,
          description: null,
          website: null,
          exchange: null,
          revenue_ltm: null,
          ebitda_ltm: null,
          pipeline_stage: null,
          deal_lead: null,
          user_id: '',
          organization_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
          price_updated_at: null,
          contacts: [],
          tasks: [],
          documents: [],
          notes: [],
          openTaskCount: 0,
          overdueTaskCount: 0,
          contactCount: 0,
          documentCount: 0,
          lastActivity: null,
          _portfolioWeight: holding.weight,
          _fromAllocation: true,
        } as CompanyWithRelations & { _portfolioWeight?: number; _syncedPosition?: boolean; _fromAllocation?: boolean });
      });
      
      return Array.from(holdingsMap.values());
    }
    
    // FALLBACK: Use synced positions if no allocation holdings
    syncedPositions.forEach(pos => {
      const symbol = pos.symbol.toUpperCase();
      holdingsMap.set(symbol, {
        id: `synced-${pos.id}`,
        name: pos.name || symbol,
        ticker_symbol: symbol,
        asset_class: pos.asset_type === 'etf' ? 'public_equity' : 
                     pos.asset_type === 'bond' ? 'credit' :
                     pos.asset_type === 'crypto' ? 'other' : 'public_equity',
        company_type: 'portfolio' as const,
        status: 'active',
        shares_owned: pos.quantity,
        cost_basis: pos.cost_basis,
        current_price: pos.current_price,
        market_value: pos.current_value,
        industry: null,
        description: null,
        website: null,
        exchange: null,
        revenue_ltm: null,
        ebitda_ltm: null,
        pipeline_stage: null,
        deal_lead: null,
        user_id: pos.user_id,
        organization_id: null,
        created_at: pos.created_at,
        updated_at: pos.updated_at,
        created_by: null,
        price_updated_at: pos.last_price_update,
        contacts: [],
        tasks: [],
        documents: [],
        notes: [],
        openTaskCount: 0,
        overdueTaskCount: 0,
        contactCount: 0,
        documentCount: 0,
        lastActivity: null,
        _syncedPosition: true,
      } as CompanyWithRelations & { _portfolioWeight?: number; _syncedPosition?: boolean });
    });
    
    // Add portfolio allocations if no synced positions found
    if (portfolioAllocations && portfolioAllocations.length > 0 && holdingsMap.size === 0) {
      portfolioAllocations.forEach(alloc => {
        const symbol = alloc.symbol.toUpperCase();
        const existingCompany = portfolioCompanies.find(
          c => c.ticker_symbol?.toUpperCase() === symbol
        );
        
        if (!holdingsMap.has(symbol)) {
          if (existingCompany) {
            holdingsMap.set(symbol, { ...existingCompany, _portfolioWeight: alloc.weight });
          } else {
            holdingsMap.set(symbol, {
              id: `virtual-${alloc.symbol}`,
              name: alloc.symbol,
              ticker_symbol: symbol,
              asset_class: alloc.assetClass || 'public_equity',
              company_type: 'portfolio' as const,
              status: 'active',
              shares_owned: null,
              cost_basis: null,
              current_price: null,
              market_value: null,
              industry: null,
              description: null,
              website: null,
              exchange: null,
              revenue_ltm: null,
              ebitda_ltm: null,
              pipeline_stage: null,
              deal_lead: null,
              user_id: '',
              organization_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: null,
              price_updated_at: null,
              contacts: [],
              tasks: [],
              documents: [],
              notes: [],
              openTaskCount: 0,
              overdueTaskCount: 0,
              contactCount: 0,
              documentCount: 0,
              lastActivity: null,
              _portfolioWeight: alloc.weight,
            } as CompanyWithRelations & { _portfolioWeight?: number });
          }
        }
      });
    }
    
    // Finally, add any remaining portfolio companies not yet included
    portfolioCompanies.forEach(company => {
      const symbol = company.ticker_symbol?.toUpperCase();
      if (symbol && !holdingsMap.has(symbol)) {
        holdingsMap.set(symbol, company);
      }
    });
    
    return Array.from(holdingsMap.values());
  }, [companiesWithRelations, portfolioAllocations, syncedPositions, allocationHoldings]);

  // Filter companies by asset type
  const publicEquities = useMemo(() => 
    companiesWithRelations.filter(c => c.asset_class === 'public_equity'),
    [companiesWithRelations]
  );

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
    await Promise.all([
      refreshIndices(), 
      fetchQuotes(), 
      refetchAll(), 
      refetchPositions(), 
      refreshPerformance(),
      refreshAllocMetrics(),
    ]);
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  // Map market indices - real data only, no synthetic sparklines
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
        // No synthetic sparklines - would require real intraday data
        sparklineData: [],
      };
    });
  }, [marketIndicesData]);

  // Filter and sort holdings
  const filteredHoldings = useMemo(() => {
    let filtered = allHoldings;
    
    if (assetFilter !== 'all') {
      filtered = filtered.filter(h => h.asset_class === assetFilter);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(h => 
        h.name.toLowerCase().includes(q) ||
        h.ticker_symbol?.toLowerCase().includes(q) ||
        h.industry?.toLowerCase().includes(q)
      );
    }
    
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
  const portfolioStats = useMemo(() => {
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
      const rawAssetClass = h.asset_class || 'public_equity';
      // Ensure assetClass is a valid key, fallback to 'other' if not recognized
      const assetClass: AssetClass = byType[rawAssetClass as AssetClass] 
        ? (rawAssetClass as AssetClass) 
        : 'other';
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
    
    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 
      ? (totalGainLoss / totalCostBasis) * 100 
      : 0;
    
    return {
      totalValue,
      totalCostBasis,
      todayChange,
      todayChangePercent,
      totalGainLoss,
      totalGainLossPercent,
      gainersCount,
      losersCount,
      byType,
    };
  }, [allHoldings, liveQuotes]);

  // Allocation chart data
  const allocationData = useMemo(() => {
    return Object.entries(portfolioStats.byType)
      .filter(([_, data]) => data.value > 0)
      .map(([type, data]) => ({
        name: ASSET_CLASS_CONFIG[type as AssetClass].label,
        shortName: ASSET_CLASS_CONFIG[type as AssetClass].shortLabel,
        value: data.value,
        color: ASSET_CLASS_CONFIG[type as AssetClass].chartColor,
        count: data.count,
        id: type,
      }));
  }, [portfolioStats]);

  // Treemap data
  const treemapData = useMemo(() => {
    return filteredHoldings.map(h => {
      const rawAssetClass = h.asset_class || 'public_equity';
      const assetClass: AssetClass = ASSET_CLASS_CONFIG[rawAssetClass as AssetClass] 
        ? (rawAssetClass as AssetClass) 
        : 'other';
      return {
        name: h.ticker_symbol || h.name,
        size: getHoldingValue(h, liveQuotes),
        color: ASSET_CLASS_CONFIG[assetClass].chartColor,
        id: h.id,
      };
    });
  }, [filteredHoldings, liveQuotes]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(option);
      setSortAsc(false);
    }
  };

  // Calculate allocation by asset class for the overview - MUST be before any conditional returns
  const allocationByClass = useMemo(() => {
    const classMap: Record<string, { value: number; cost: number; color: string; icon: React.ElementType }> = {};
    allHoldings.forEach(h => {
      const assetClass = (h.asset_class as AssetClass) || 'other';
      const cfg = ASSET_CLASS_CONFIG[assetClass] || ASSET_CLASS_CONFIG.other;
      if (!classMap[assetClass]) {
        classMap[assetClass] = { value: 0, cost: 0, color: cfg.chartColor, icon: cfg.icon };
      }
      classMap[assetClass].value += getHoldingValue(h, liveQuotes);
      classMap[assetClass].cost += h.cost_basis || 0;
    });
    const total = Object.values(classMap).reduce((sum, c) => sum + c.value, 0);
    return Object.entries(classMap).map(([key, data]) => ({
      asset_type: key,
      label: ASSET_CLASS_CONFIG[key as AssetClass]?.label || key,
      current_value: data.value,
      cost_basis: data.cost,
      allocation_pct: total > 0 ? (data.value / total) * 100 : 0,
      gain_pct: data.cost > 0 ? ((data.value - data.cost) / data.cost) * 100 : 0,
      Icon: data.icon,
      color: data.color,
    })).sort((a, b) => b.current_value - a.current_value);
  }, [allHoldings, liveQuotes]);

  // Top holdings with metrics - MUST be before any conditional returns
  const topHoldings = useMemo(() => {
    return [...allHoldings]
      .sort((a, b) => getHoldingValue(b, liveQuotes) - getHoldingValue(a, liveQuotes))
      .slice(0, 5)
      .map(h => {
        const value = getHoldingValue(h, liveQuotes);
        const cost = h.cost_basis || 0;
        const irr = cost > 0 ? ((value - cost) / cost) * 100 : 0;
        const moic = cost > 0 ? value / cost : 0;
        const healthScore = Math.min(100, Math.max(0, 50 + irr / 2));
        return {
          ...h,
          value,
          irr,
          moic,
          healthScore: Math.round(healthScore),
        };
      });
  }, [allHoldings, liveQuotes]);

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
    <motion.div
      className="p-6 space-y-6 animate-fade-up"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <FinnhubApiBanner />
      <MarketDataPausedBanner />

      {/* Header - Market Intel Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Wallet className="h-7 w-7 text-primary" />
            Portfolio
          </h1>
          <p className="text-muted-foreground mt-1">
            {activePortfolio?.name || 'My Portfolio'} • {perfPositionCount > 0 ? perfPositionCount : allHoldings.length} Holdings
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PortfolioSwitcher
            portfolios={portfolios}
            activePortfolioId={activePortfolioId}
            onSelect={setActivePortfolio}
            onCreateNew={() => setShowCreatePortfolioDialog(true)}
            onDelete={deletePortfolio}
            onDuplicate={duplicatePortfolio}
            onRename={handleRenamePortfolio}
            isLoading={portfoliosLoading}
            isDeleting={isDeleting}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" className="relative">
            <AlertTriangle className="h-4 w-4" />
            {stats.overdueTasks > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium flex items-center justify-center text-destructive-foreground">
                {stats.overdueTasks}
              </span>
            )}
          </Button>
          <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Position
          </Button>
        </div>
      </div>

      {/* Create Portfolio Dialog */}
      <CreatePortfolioDialog
        open={showCreatePortfolioDialog}
        onOpenChange={setShowCreatePortfolioDialog}
        onSave={handleCreatePortfolio}
        isSaving={isSaving}
      />

      {/* Dynamic Stats Row - Now includes Portfolio Builder metrics (CAGR, Sharpe, Max DD) */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 auto-rows-fr">
        <StatCard
          title="Portfolio Value"
          displayValue={formatCurrency(
            allocTotalValue > 0 ? allocTotalValue : (perfTotalValue || portfolioStats.totalValue), 
            true
          )}
          icon={Wallet}
          onClick={() => navigate('/backtester')}
          isLoading={allocLoading || perfLoading || isLoading}
          change={allocTotalValue > 0 ? allocGainLossPercent : (perfTotalGainLossPercent || portfolioStats.totalGainLossPercent)}
          subtitle={`${allocPositionCount > 0 ? allocPositionCount : (perfPositionCount || allHoldings.length)} holdings`}
          termKey="portfolioValue"
          dataSource="Polygon.io"
        />
        <StatCard
          title="Today's P&L"
          displayValue={formatCurrency(
            allocTotalValue > 0 ? allocTodayChange : (perfTodayChange || portfolioStats.todayChange), 
            true
          )}
          icon={(allocTotalValue > 0 ? allocTodayChange : (perfTodayChange || portfolioStats.todayChange)) >= 0 ? TrendingUp : TrendingDown}
          isLoading={allocLoading || perfLoading || isLoading}
          change={allocTotalValue > 0 ? allocTodayChangePercent : (perfTodayChangePercent || portfolioStats.todayChangePercent)}
          onClick={() => {
            document.querySelector('[data-performance-chart]')?.scrollIntoView({ behavior: 'smooth' });
          }}
          termKey="totalReturn"
          dataSource="Polygon.io"
        />
        {/* CAGR - Matches Portfolio Builder */}
        <StatCard
          title="CAGR"
          displayValue={allocCagr !== 0 ? `${allocCagr >= 0 ? '+' : ''}${allocCagr.toFixed(2)}%` : '—'}
          icon={TrendingUp}
          isLoading={allocAdvancedLoading}
          change={allocCagr}
          onClick={() => navigate('/backtester')}
          subtitle="Annualized return"
          termKey="cagr"
          dataSource="Polygon.io"
        />
        {/* Sharpe Ratio - Matches Portfolio Builder */}
        <StatCard
          title="Sharpe Ratio"
          displayValue={allocSharpe !== 0 ? allocSharpe.toFixed(2) : '—'}
          icon={Activity}
          isLoading={allocAdvancedLoading}
          onClick={() => navigate('/backtester')}
          subtitle={allocSharpe >= 1 ? 'Good' : allocSharpe >= 0.5 ? 'Moderate' : 'Low'}
          termKey="sharpeRatio"
          dataSource="Polygon.io"
        />
        {/* Volatility - Matches Portfolio Builder */}
        <StatCard
          title="Volatility"
          displayValue={allocVolatility !== 0 ? `${allocVolatility.toFixed(2)}%` : '—'}
          icon={Activity}
          isLoading={allocAdvancedLoading}
          onClick={() => navigate('/backtester')}
          subtitle="Annualized"
          termKey="volatility"
          dataSource="Polygon.io"
        />
        {/* Max Drawdown - Matches Portfolio Builder */}
        <StatCard
          title="Max Drawdown"
          displayValue={allocMaxDD !== 0 ? `${allocMaxDD.toFixed(2)}%` : '—'}
          icon={TrendingDown}
          isLoading={allocAdvancedLoading}
          onClick={() => navigate('/backtester')}
          subtitle="Peak to trough"
          termKey="maxDrawdown"
          dataSource="Polygon.io"
        />
        <StatCard
          title="Gainers"
          value={portfolioStats.gainersCount}
          icon={ArrowUpRight}
          isLoading={isLoading}
          onClick={() => {
            setSortBy('todayChange');
            setSortAsc(false);
          }}
          subtitle="Today's winners"
          dataSource="Polygon.io"
        />
        <StatCard
          title="Open Tasks"
          value={stats.openTasks}
          icon={CheckSquare}
          alert={stats.overdueTasks > 0}
          alertCount={stats.overdueTasks}
          onClick={() => navigate('/tasks')}
          isLoading={isLoading}
          subtitle={stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : 'All on track'}
        />
      </motion.div>

      {/* CTA Banner - Market Intel Style */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/30 border-primary/20">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Want to optimize your portfolio?</p>
              <p className="text-sm text-muted-foreground">Use our AI-powered Portfolio Builder to analyze and rebalance your positions.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/backtester')} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 shrink-0">
            <span>Open Portfolio Builder</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
      
      {/* Enhanced Portfolio Builder - Unified Position Management */}
      {showAddDialog && (
        <motion.div variants={itemVariants}>
          <EnhancedPortfolioBuilder
            mode="positions"
            positions={[]}
            onPositionAdd={async (data) => {
              // Add position through existing flow
              const { data: position, error } = await supabase
                .from('synced_positions')
                .insert({
                  symbol: data.symbol.toUpperCase(),
                  name: data.name,
                  quantity: data.quantity || 0,
                  cost_basis: data.cost_basis,
                  cost_per_share: data.cost_per_share,
                  asset_type: data.asset_type || 'stock',
                  portfolio_id: activePortfolioId,
                  user_id: user?.id,
                  source: 'manual',
                })
                .select()
                .single();
              
              if (error) throw error;
              
              // Refresh all data sources
              await Promise.all([
                refetchPositions(),
                refetchAll(),
                refreshPerformance(),
              ]);
              
              toast.success(`Added ${data.symbol.toUpperCase()} to portfolio`);
              setShowAddDialog(false);
              return position as any;
            }}
            onPositionsImport={async (positions) => {
              const { data: inserted, error } = await supabase
                .from('synced_positions')
                .insert(
                  positions.map(p => ({
                    symbol: p.symbol.toUpperCase(),
                    name: p.name,
                    quantity: p.quantity || 0,
                    cost_basis: p.cost_basis,
                    cost_per_share: p.cost_per_share,
                    asset_type: p.asset_type || 'stock',
                    portfolio_id: activePortfolioId,
                    user_id: user?.id,
                    source: 'csv',
                  }))
                )
                .select();
              
              if (error) throw error;
              
              // Refresh all data sources
              await Promise.all([
                refetchPositions(),
                refetchAll(),
                refreshPerformance(),
              ]);
              
              toast.success(`Imported ${positions.length} positions`);
              setShowAddDialog(false);
              return inserted as any[];
            }}
            onBrokerageSync={async () => {
              await Promise.all([
                refetchPositions(),
                refetchAll(),
                refreshPerformance(),
              ]);
            }}
            totalValue={perfTotalValue || portfolioStats.totalValue}
          />
        </motion.div>
      )}

      {/* Real Portfolio Performance Chart - Uses actual calculation data */}
      {portfolioAllocations && portfolioAllocations.length > 0 ? (
        <motion.div variants={itemVariants}>
          <RealPerformanceChart
            allocations={portfolioAllocations}
            investableCapital={investableCapital || portfolioStats.totalValue || 100000}
            portfolioName={activePortfolio?.name}
            showMetrics={true}
            investmentHorizon={allocInvestmentHorizon || 5}
            preCalculatedMetrics={allocAdvancedMetrics ? {
              cagr: allocCagr,
              volatility: allocVolatility,
              sharpeRatio: allocSharpe,
              maxDrawdown: allocMaxDD,
              totalReturn: allocAdvancedMetrics.totalReturn,
            } : undefined}
          />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
          <PortfolioPerformanceCard 
            days={30} 
            showAllocation 
            portfolioId={activePortfolioId}
            portfolioName={activePortfolio?.name}
          />
        </motion.div>
      )}

      {/* Portfolio Analysis Tabs - Same tabs as Portfolio Builder */}
      {portfolioAllocations && portfolioAllocations.length > 0 && (
        <motion.div variants={itemVariants}>
          <PortfolioAnalysisTabs
            allocations={portfolioAllocations}
            investableCapital={portfolioStats.totalValue || 100000}
            portfolioName={activePortfolio?.name}
            investmentHorizon={allocInvestmentHorizon || 5}
          />
        </motion.div>
      )}

      {/* Market Indices Row */}
      <motion.div variants={itemVariants} className="flex gap-3 overflow-x-auto pb-1">
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
      </motion.div>

      {/* Asset Allocation + Top Holdings Row - Market Intel Style */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Asset Allocation */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Asset Allocation
            </h3>
            <div className="space-y-4">
              {allocationByClass.length > 0 ? (
                allocationByClass.map((a) => {
                  const IconComponent = a.Icon;
                  return (
                    <div key={a.asset_type} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${a.color}30` }}
                      >
                        <IconComponent className="h-5 w-5" style={{ color: a.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{formatCurrency(a.current_value, true)}</p>
                        <p className="text-sm text-muted-foreground">{a.label}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{a.allocation_pct.toFixed(1)}%</p>
                        <p className={cn(
                          "text-sm",
                          a.gain_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                          {a.gain_pct >= 0 ? '+' : ''}{a.gain_pct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-center py-8">No holdings yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Holdings */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Holdings</h3>
            <div className="space-y-3">
              {topHoldings.length > 0 ? (
                topHoldings.map((h) => (
                  <div 
                    key={h.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group cursor-pointer"
                    onClick={() => {
                      if (h.ticker_symbol) {
                        navigate(`/stock/${h.ticker_symbol}`);
                      } else if (!h.id.startsWith('virtual-')) {
                        navigate(`/companies/${h.id}`);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium group-hover:text-primary transition-colors truncate">
                        {h.ticker_symbol ? `$${h.ticker_symbol}` : h.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.asset_class ? ASSET_CLASS_CONFIG[h.asset_class as AssetClass]?.shortLabel : ''} • {h.industry || h.name || 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right hidden sm:block">
                        <p className="font-medium">{formatCurrency(h.value, true)}</p>
                        <p className="text-xs text-muted-foreground">Value</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className={cn("font-medium", h.irr >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          {h.irr.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">IRR</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="font-medium">{h.moic.toFixed(1)}x</p>
                        <p className="text-xs text-muted-foreground">MOIC</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-medium",
                          h.healthScore >= 70 ? 'text-emerald-400' : h.healthScore >= 50 ? 'text-yellow-400' : 'text-rose-400'
                        )}>
                          {h.healthScore}
                        </p>
                        <p className="text-xs text-muted-foreground">Health</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No holdings yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Alerts + Macro + Upcoming - Market Intel Style */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Alerts */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              Alerts
            </h3>
            <div className="space-y-3">
              {alerts && alerts.length > 0 ? (
                alerts.slice(0, 3).map((a: any) => (
                  <div key={a.id} className="flex gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer">
                    {a.severity === 'critical' ? (
                      <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.description?.substring(0, 50)}...</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No alerts</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Macro Indicators */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Macro
            </h3>
            <div className="space-y-3">
              {economicIndicators && economicIndicators.length > 0 ? (
                economicIndicators.slice(0, 5).map((m: any) => (
                  <div key={m.id} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground truncate">{m.name}</span>
                    <span className="font-medium tabular-nums">{m.current_value?.toFixed(2) || 'N/A'}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming
            </h3>
            <div className="space-y-3">
              {events && events.length > 0 ? (
                events.slice(0, 5).map((e: any) => (
                  <div key={e.id} className="flex justify-between items-center text-sm gap-2">
                    <span className="truncate flex-1">{e.title}</span>
                    <Badge variant="outline" className="shrink-0 text-xs">{e.event_type}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No upcoming events</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks and News Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <motion.div variants={itemVariants}>
            <PortfolioNews />
          </motion.div>
        </div>

        <div>
          <motion.div variants={itemVariants}>
            <TasksCard tasks={tasksWithRelations} isLoading={isLoading} />
          </motion.div>
        </div>
      </div>

      {/* Add Position Dialog */}
      <UnifiedAddPositionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        portfolioId={activePortfolioId || undefined}
        onPositionAdded={() => {
          refetchPositions();
          refetchAll();
        }}
        onPositionsImported={() => {
          refetchPositions();
          refetchAll();
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
                    <RechartsTooltip
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
    </motion.div>
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
  
  const quote = holding.ticker_symbol 
    ? liveQuotes.get(holding.ticker_symbol.toUpperCase()) 
    : null;
  const todayChangePercent = quote?.changePercent || 0;
  const isTodayUp = todayChangePercent >= 0;

  const detailHref = holding.id.startsWith('synced-') && holding.ticker_symbol
    ? `/stock/${holding.ticker_symbol}`
    : `/portfolio/${holding.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link to={detailHref}>
        <Card className="bg-card border-border hover:border-primary/50 transition-all group cursor-pointer relative">
          <CardContent className="p-4">
            {assetClass === 'public_equity' && (
              <div className="absolute top-3 right-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            )}
            
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
            const rawAssetClass = holding.asset_class || 'public_equity';
            const assetClass: AssetClass = ASSET_CLASS_CONFIG[rawAssetClass as AssetClass]
              ? (rawAssetClass as AssetClass)
              : 'other';
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
                onClick={() => {
                  // For synced positions (id starts with 'synced-'), navigate to stock detail page
                  if (holding.id.startsWith('synced-') && holding.ticker_symbol) {
                    navigate(`/stock/${holding.ticker_symbol}`);
                  } else {
                    navigate(`/portfolio/${holding.id}`);
                  }
                }}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-md", config.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      {holding.ticker_symbol ? (
                        <Link 
                          to={`/stock/${holding.ticker_symbol}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ${holding.ticker_symbol}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">
                          {holding.name}
                        </span>
                      )}
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