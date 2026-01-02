import { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, isToday, isBefore, startOfDay, parseISO, subDays } from 'date-fns';
import {
  Building2,
  Briefcase,
  Users,
  CheckSquare,
  FileText,
  Plus,
  RefreshCw,
  AlertTriangle,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Upload,
  DollarSign,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useOrganization, AssetType } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData, useUnifiedData, type CompanyWithRelations, type TaskWithRelations } from '@/contexts/UnifiedDataContext';
import { CompanyMiniCard } from '@/components/shared/CompanyMiniCard';
import { TaskRow } from '@/components/shared/TaskRow';
import { supabase } from '@/integrations/supabase/client';
import { FinnhubApiBanner } from '@/components/shared/FinnhubApiBanner';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import { WidgetConfigDialog } from '@/components/dashboard/WidgetConfigDialog';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

// Dynamic stat card that can show value or currency
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
}) {
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

  return (
    <motion.div variants={itemVariants}>
      <Card
        className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] group"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{title}</span>
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {displayValue !== undefined ? displayValue : value}
            </span>
            {alert && alertCount && alertCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {alertCount} overdue
              </Badge>
            )}
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {formatPercent(change)}
              {changeLabel && <span className="text-muted-foreground ml-1">{changeLabel}</span>}
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

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

// Markets ticker for public equities
function MarketsTicker({
  publicEquities,
  isLoading,
}: {
  publicEquities: CompanyWithRelations[];
  isLoading: boolean;
}) {
  const [indices, setIndices] = useState<{ symbol: string; name: string; price: number; change: number }[]>([
    { symbol: 'SPY', name: 'S&P 500', price: 0, change: 0 },
    { symbol: 'QQQ', name: 'NASDAQ', price: 0, change: 0 },
    { symbol: 'DIA', name: 'DOW', price: 0, change: 0 },
  ]);

  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const { getCachedQuotes } = await import('@/services/quoteCacheService');
        const quotes = await getCachedQuotes(['SPY', 'QQQ', 'DIA', 'IWM']);
        
        const spyQuote = quotes.get('SPY');
        const qqqQuote = quotes.get('QQQ');
        const diaQuote = quotes.get('DIA');
        const iwmQuote = quotes.get('IWM');
        
        setIndices([
          { symbol: 'SPY', name: 'S&P 500', price: spyQuote?.price || 0, change: spyQuote?.changePercent || 0 },
          { symbol: 'QQQ', name: 'NASDAQ', price: qqqQuote?.price || 0, change: qqqQuote?.changePercent || 0 },
          { symbol: 'DIA', name: 'DOW', price: diaQuote?.price || 0, change: diaQuote?.changePercent || 0 },
          { symbol: 'IWM', name: 'Russell', price: iwmQuote?.price || 0, change: iwmQuote?.changePercent || 0 },
        ]);
      } catch (error) {
        console.error('Error fetching indices:', error);
      }
    };
    fetchIndices();
  }, []);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-32 flex-shrink-0" />
        ))}
      </div>
    );
  }

  const topHoldings = publicEquities
    .filter(c => c.market_value && c.market_value > 0)
    .sort((a, b) => (b.market_value || 0) - (a.market_value || 0))
    .slice(0, 5);

  const tickerItems = [
    ...indices,
    ...topHoldings.map(h => ({
      symbol: h.ticker_symbol || h.name,
      name: h.name,
      price: h.current_price || 0,
      change: 0, // Would need real-time data
    })),
  ];

  return (
    <div className="bg-muted/50 rounded-lg p-3 overflow-hidden">
      <div className="flex gap-6 overflow-x-auto scrollbar-hide">
        {tickerItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 flex-shrink-0">
            <span className="font-semibold text-sm">{item.symbol}</span>
            <span className="text-sm text-muted-foreground">{formatCurrency(item.price)}</span>
            <span className={`text-xs ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(item.change)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Re-export the new PortfolioPerformanceCard
import { PortfolioPerformanceCard } from '@/components/dashboard/PortfolioPerformanceCard';

// Enhanced Activity Feed with asset-type specific activities
function EnhancedActivityFeed({
  companies,
  tasks,
  enabledAssetTypes,
  isLoading,
}: {
  companies: CompanyWithRelations[];
  tasks: TaskWithRelations[];
  enabledAssetTypes: AssetType[];
  isLoading: boolean;
}) {
  const activities = useMemo(() => {
    const items: { 
      id: string; 
      type: string; 
      title: string; 
      time: Date; 
      icon: React.ElementType;
      assetType?: string;
      color?: string;
    }[] = [];

    // Recent companies by type
    companies.slice(0, 5).forEach(c => {
      const isPublic = c.asset_class === 'public_equity';
      items.push({
        id: `company-${c.id}`,
        type: isPublic ? 'position' : 'company',
        title: isPublic 
          ? `Added ${c.ticker_symbol || c.name} to portfolio`
          : `${c.name} added to ${c.company_type || 'pipeline'}`,
        time: new Date(c.created_at),
        icon: isPublic ? TrendingUp : Building2,
        assetType: c.asset_class || 'private_equity',
        color: isPublic ? 'text-blue-500' : 'text-purple-500',
      });
    });

    // Stage changes (simulate from recent updates)
    companies
      .filter(c => c.company_type === 'pipeline' && c.pipeline_stage)
      .slice(0, 2)
      .forEach(c => {
        items.push({
          id: `stage-${c.id}`,
          type: 'stage_change',
          title: `${c.name} moved to ${c.pipeline_stage}`,
          time: new Date(c.updated_at),
          icon: ArrowUpRight,
          assetType: 'private_equity',
          color: 'text-amber-500',
        });
      });

    // Completed tasks
    tasks
      .filter(t => t.status === 'done' || t.status === 'completed')
      .slice(0, 3)
      .forEach(t => {
        items.push({
          id: `task-${t.id}`,
          type: 'task',
          title: `Completed: ${t.title}`,
          time: new Date(t.completed_at || t.updated_at),
          icon: CheckSquare,
          color: 'text-green-500',
        });
      });

    return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8);
  }, [companies, tasks]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map(activity => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`p-1.5 rounded-full bg-muted ${activity.color || ''}`}>
                <activity.icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(activity.time, 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

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

// Private Equity Pipeline Mini Chart
function PipelineFunnelChart({
  pipelineStats,
  isLoading,
}: {
  pipelineStats: ReturnType<typeof useUnifiedData>['pipelineStats'];
  isLoading: boolean;
}) {
  const stages = [
    { key: 'sourcing', label: 'Sourcing', color: 'hsl(var(--chart-1))' },
    { key: 'screening', label: 'Screening', color: 'hsl(var(--chart-2))' },
    { key: 'diligence', label: 'Diligence', color: 'hsl(var(--chart-3))' },
    { key: 'negotiation', label: 'Negotiation', color: 'hsl(var(--chart-4))' },
    { key: 'closing', label: 'Closing', color: 'hsl(var(--chart-5))' },
  ];

  const chartData = stages.map(stage => ({
    name: stage.label,
    value: pipelineStats.byStage[stage.key]?.count || 0,
    fill: stage.color,
  }));

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Public Equity Top Movers
function TopMoversCard({
  publicEquities,
  isLoading,
}: {
  publicEquities: CompanyWithRelations[];
  isLoading: boolean;
}) {
  // In a real app, this would fetch real-time price changes
  const movers = useMemo(() => {
    return publicEquities
      .map(eq => ({
        ...eq,
        changePercent: (Math.random() - 0.5) * 10, // Mock data
      }))
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 5);
  }, [publicEquities]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (movers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No public equity positions
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {movers.map(mover => (
        <Link
          key={mover.id}
          to={`/assets/${mover.id}`}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{mover.ticker_symbol || mover.name}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {mover.name}
            </span>
          </div>
          <div className={`text-sm font-medium ${mover.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {mover.changePercent >= 0 ? '+' : ''}{mover.changePercent.toFixed(2)}%
          </div>
        </Link>
      ))}
    </div>
  );
}

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

export default function EnhancedDashboard() {
  const navigate = useNavigate();
  const { currentOrganization, enabledAssetTypes } = useOrganization();
  const { user } = useAuth();
  const { stats, recentCompanies, upcomingTasks, isLoading } = useDashboardData();
  const { pipelineStats, tasksWithRelations, companiesWithRelations, refetchAll, dashboardStats } = useUnifiedData();
  const { widgets, enabledWidgets, toggleWidget, resetToDefaults } = useDashboardWidgets();

  const greeting = getGreeting();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  // Determine which asset types are enabled
  const hasPrivateEquity = enabledAssetTypes.includes('private_equity');
  const hasPublicEquity = enabledAssetTypes.includes('public_equity');
  const hasBothTypes = hasPrivateEquity && hasPublicEquity;

  // Filter companies by asset type
  const publicEquities = useMemo(() => 
    companiesWithRelations.filter(c => c.asset_class === 'public_equity'),
    [companiesWithRelations]
  );
  
  const privateEquities = useMemo(() => 
    companiesWithRelations.filter(c => !c.asset_class || c.asset_class === 'private_equity'),
    [companiesWithRelations]
  );

  // Calculate totals
  const publicEquityValue = publicEquities.reduce((sum, c) => sum + (c.market_value || 0), 0);
  const publicEquityCostBasis = publicEquities.reduce((sum, c) => sum + (c.cost_basis || 0), 0);
  const publicEquityGainLoss = publicEquityValue - publicEquityCostBasis;
  const publicEquityGainLossPercent = publicEquityCostBasis > 0 
    ? (publicEquityGainLoss / publicEquityCostBasis) * 100 
    : 0;

  // Mock today's change (would come from real-time data)
  const todaysChange = publicEquityValue * 0.0085; // Mock 0.85% gain
  const todaysChangePercent = 0.85;

  return (
    <motion.div
      className="p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}, {userName}!
          </h1>
          <p className="text-muted-foreground">
            {currentDate}
            {currentOrganization && (
              <span className="ml-2">• {currentOrganization.name}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <WidgetConfigDialog
            widgets={widgets}
            onToggle={toggleWidget}
            onReset={resetToDefaults}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={refetchAll}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Finnhub API Banner (if public equities enabled) */}
      {hasPublicEquity && (
        <motion.div variants={itemVariants}>
          <FinnhubApiBanner />
        </motion.div>
      )}

      {/* Markets Ticker (if public equities enabled) */}
      {hasPublicEquity && (
        <motion.div variants={itemVariants}>
          <MarketsTicker publicEquities={publicEquities} isLoading={isLoading} />
        </motion.div>
      )}

      {/* Context-Aware Quick Actions */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
        {hasPrivateEquity && (
          <QuickActionButton
            icon={Briefcase}
            label="Add Deal"
            onClick={() => navigate('/companies?create=true&assetType=private_equity')}
          />
        )}
        {hasPublicEquity && (
          <QuickActionButton
            icon={TrendingUp}
            label="Add Position"
            onClick={() => navigate('/markets?create=true')}
          />
        )}
        <QuickActionButton
          icon={Plus}
          label="New Task"
          onClick={() => navigate('/tasks?create=true')}
        />
        <QuickActionButton
          icon={Users}
          label="Add Contact"
          onClick={() => navigate('/contacts?create=true')}
        />
        <QuickActionButton
          icon={Upload}
          label="Upload Docs"
          onClick={() => navigate('/documents?upload=true')}
        />
      </motion.div>

      {/* Dynamic Stats Row */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Combined view */}
        {hasBothTypes && (
          <>
            <StatCard
              title="Total Value"
              displayValue={formatCurrency(publicEquityValue + (stats.portfolioCount * 10000000))}
              icon={Wallet}
              onClick={() => navigate('/portfolio')}
              isLoading={isLoading}
              subtitle="All holdings"
            />
            <StatCard
              title="Public Equities"
              displayValue={formatCurrency(publicEquityValue)}
              icon={TrendingUp}
              onClick={() => navigate('/markets')}
              isLoading={isLoading}
              change={publicEquityGainLossPercent}
            />
            <StatCard
              title="Private Equity"
              value={stats.portfolioCount}
              icon={Building2}
              onClick={() => navigate('/portfolio?assetType=private_equity')}
              isLoading={isLoading}
              subtitle={`${stats.pipelineCount} in pipeline`}
            />
            <StatCard
              title="Today's Change"
              displayValue={formatCurrency(todaysChange)}
              icon={todaysChange >= 0 ? TrendingUp : TrendingDown}
              isLoading={isLoading}
              change={todaysChangePercent}
            />
            <StatCard
              title="Open Tasks"
              value={stats.openTasks}
              icon={CheckSquare}
              alert={stats.overdueTasks > 0}
              alertCount={stats.overdueTasks}
              onClick={() => navigate('/tasks')}
              isLoading={isLoading}
            />
          </>
        )}

        {/* Private equity only view */}
        {hasPrivateEquity && !hasPublicEquity && (
          <>
            <StatCard
              title="Pipeline"
              value={stats.pipelineCount}
              icon={Briefcase}
              onClick={() => navigate('/pipeline')}
              isLoading={isLoading}
            />
            <StatCard
              title="Portfolio"
              value={stats.portfolioCount}
              icon={Building2}
              onClick={() => navigate('/portfolio')}
              isLoading={isLoading}
            />
            <StatCard
              title="Prospects"
              value={stats.prospectCount}
              icon={Users}
              onClick={() => navigate('/companies?type=prospect')}
              isLoading={isLoading}
            />
            <StatCard
              title="Open Tasks"
              value={stats.openTasks}
              icon={CheckSquare}
              alert={stats.overdueTasks > 0}
              alertCount={stats.overdueTasks}
              onClick={() => navigate('/tasks')}
              isLoading={isLoading}
            />
            <StatCard
              title="Documents"
              value={stats.totalDocuments}
              icon={FileText}
              onClick={() => navigate('/documents')}
              isLoading={isLoading}
            />
          </>
        )}

        {/* Public equity only view */}
        {hasPublicEquity && !hasPrivateEquity && (
          <>
            <StatCard
              title="Portfolio Value"
              displayValue={formatCurrency(publicEquityValue)}
              icon={Wallet}
              onClick={() => navigate('/portfolio')}
              isLoading={isLoading}
              change={publicEquityGainLossPercent}
            />
            <StatCard
              title="Today's Change"
              displayValue={formatCurrency(todaysChange)}
              icon={todaysChange >= 0 ? TrendingUp : TrendingDown}
              isLoading={isLoading}
              change={todaysChangePercent}
            />
            <StatCard
              title="Positions"
              value={publicEquities.length}
              icon={BarChart3}
              onClick={() => navigate('/markets')}
              isLoading={isLoading}
            />
            <StatCard
              title="Open Tasks"
              value={stats.openTasks}
              icon={CheckSquare}
              alert={stats.overdueTasks > 0}
              alertCount={stats.overdueTasks}
              onClick={() => navigate('/tasks')}
              isLoading={isLoading}
            />
            <StatCard
              title="Contacts"
              value={stats.totalContacts}
              icon={Users}
              onClick={() => navigate('/contacts')}
              isLoading={isLoading}
            />
          </>
        )}
      </motion.div>

      {/* Portfolio Performance Card (if multiple asset types or public equities) */}
      {(hasBothTypes || hasPublicEquity) && (
        <motion.div variants={itemVariants}>
          <PortfolioPerformanceCard days={30} showAllocation />
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
            </div>
            <RecentCompaniesGrid companies={recentCompanies} isLoading={isLoading} />
          </motion.div>

          <motion.div variants={itemVariants}>
            <EnhancedActivityFeed
              companies={companiesWithRelations}
              tasks={tasksWithRelations}
              enabledAssetTypes={enabledAssetTypes}
              isLoading={isLoading}
            />
          </motion.div>
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <TasksCard tasks={tasksWithRelations} isLoading={isLoading} />
          </motion.div>

          {/* Quick Stats by Asset Type */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={hasPrivateEquity ? 'private' : 'public'}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    {hasPrivateEquity && (
                      <TabsTrigger value="private" className="text-xs">
                        Private Equity
                      </TabsTrigger>
                    )}
                    {hasPublicEquity && (
                      <TabsTrigger value="public" className="text-xs">
                        Public Equity
                      </TabsTrigger>
                    )}
                  </TabsList>
                  
                  {hasPrivateEquity && (
                    <TabsContent value="private">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Pipeline Funnel</span>
                          <Link to="/pipeline">
                            <Button variant="ghost" size="sm" className="h-6 text-xs">
                              View All
                            </Button>
                          </Link>
                        </div>
                        <PipelineFunnelChart pipelineStats={pipelineStats} isLoading={isLoading} />
                      </div>
                    </TabsContent>
                  )}
                  
                  {hasPublicEquity && (
                    <TabsContent value="public">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Top Movers Today</span>
                          <Link to="/markets">
                            <Button variant="ghost" size="sm" className="h-6 text-xs">
                              View All
                            </Button>
                          </Link>
                        </div>
                        <TopMoversCard publicEquities={publicEquities} isLoading={isLoading} />
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
