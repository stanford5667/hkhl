import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TriggerBanner } from '@/components/dashboard/TriggerBanner';
import { AIInsightCard } from '@/components/dashboard/AIInsightCard';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ActionItemsCard } from '@/components/dashboard/ActionItemsCard';
import { PortfolioNews } from '@/components/dashboard/PortfolioNews';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { RecentCompaniesCard } from '@/components/dashboard/RecentCompaniesCard';
import { StatCard, HealthScore, PriceChange, SectionHeader } from '@/components/ui/design-system';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useAppData';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, DollarSign, TrendingUp, Activity, Target, Bell,
  Building2, Home, LineChart, Coins, Sparkles, AlertCircle
} from 'lucide-react';
import { 
  usePortfolioTotals, useAlerts, useDealPipeline, usePortfolioAssets, 
  useAssetAllocation, useEvents, useEconomicIndicators 
} from '@/hooks/useMarketIntel';

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentOrganization, userProfile } = useOrganization();
  const { user } = useAuth();
  const { stats, isLoading } = useDashboardStats();
  
  // Market Intel data
  const { data: totals } = usePortfolioTotals();
  const { data: alerts } = useAlerts();
  const { data: deals } = useDealPipeline();
  const { data: assets } = usePortfolioAssets();
  const { data: allocation } = useAssetAllocation();
  const { data: events } = useEvents();
  const { data: indicators } = useEconomicIndicators();
  
  const unreadAlerts = alerts?.filter(a => !a.is_read).length || 0;
  const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;
  const activeDeals = deals?.filter(d => d.stage !== 'passed').length || 0;
  const totalValue = totals?.totalValue || 0;
  const totalCost = totals?.totalCost || 0;
  const returnPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  const avgMoic = totals?.avgMoic || 0;
  const companyCount = assets?.length || 0;
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const userName = userProfile?.full_name || user?.user_metadata?.full_name || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${userName}!`;
    if (hour < 18) return `Good afternoon, ${userName}!`;
    return `Good evening, ${userName}!`;
  };

  const alertCount = stats.overdueTasks;

  const typeConfig: Record<string, { name: string; color: string; Icon: React.ElementType }> = {
    pe: { name: 'Private Equity', color: 'bg-blue-500', Icon: Building2 },
    real_estate: { name: 'Real Estate', color: 'bg-emerald-500', Icon: Home },
    public_equity: { name: 'Public Equities', color: 'bg-purple-500', Icon: LineChart },
    credit: { name: 'Credit', color: 'bg-yellow-500', Icon: Coins },
    alternatives: { name: 'Alternatives', color: 'bg-pink-500', Icon: Sparkles },
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header with Streak */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{currentDate}</div>
          {currentOrganization && (
            <div className="text-xs text-muted-foreground/70 mt-0.5">
              {currentOrganization.name}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {stats.overdueTasks > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.overdueTasks} overdue
            </Badge>
          )}
          <StreakCounter days={5} />
        </div>
      </div>

      {/* Trigger Banner */}
      <TriggerBanner
        greeting={getGreeting()}
        alertCount={alertCount}
        portfolioNews={stats.portfolio > 0 ? `${stats.portfolio} portfolio companies` : undefined}
        onReview={() => navigate('/companies')}
      />

      {/* Portfolio Quick Stats */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 stagger-children"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {isLoading ? (
          [...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : (
          <>
            <StatCard 
              label="Portfolio Value" 
              value={formatCurrency(totalValue)} 
              change={returnPct} 
              icon={<DollarSign className="h-4 w-4" />}
              termKey="portfolioValue"
            />
            <StatCard 
              label="Avg MOIC" 
              value={`${avgMoic.toFixed(1)}x`} 
              icon={<TrendingUp className="h-4 w-4" />}
              termKey="moic"
            />
            <StatCard 
              label="Avg IRR" 
              value={`${(totals?.avgIrr || 0).toFixed(1)}%`} 
              icon={<Activity className="h-4 w-4" />}
              termKey="irr"
            />
            <StatCard 
              label="Active Deals" 
              value={activeDeals.toString()} 
              icon={<Target className="h-4 w-4" />}
              termKey="activeDeals"
            />
            <StatCard 
              label="Unread Alerts" 
              value={unreadAlerts.toString()} 
              icon={<Bell className="h-4 w-4" />}
            />
            <StatCard 
              label="Critical" 
              value={criticalAlerts.toString()} 
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </>
        )}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Primary Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Allocation + Top Holdings Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Asset Allocation */}
            <Card variant="surface" className="card-glow">
              <CardContent className="p-6">
                <SectionHeader title="Asset Allocation" subtitle="By asset class" />
                <div className="space-y-3 mt-4">
                  {allocation?.slice(0, 4).map((a: any, index: number) => {
                    const cfg = typeConfig[a.asset_type] || { name: a.asset_type, color: 'bg-slate-500', Icon: Building2 };
                    const IconComponent = cfg.Icon;
                    return (
                      <motion.div 
                        key={a.asset_type} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors hover-lift"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className={`w-10 h-10 rounded-lg ${cfg.color} flex items-center justify-center`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{cfg.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{formatCurrency(a.current_value)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm font-mono">{a.allocation_pct.toFixed(0)}%</p>
                          <PriceChange value={a.gain_pct} size="sm" />
                        </div>
                      </motion.div>
                    );
                  })}
                  {(!allocation || allocation.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No allocation data</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Holdings */}
            <Card variant="surface" className="card-glow">
              <CardContent className="p-6">
                <SectionHeader title="Top Holdings" subtitle="By value" />
                <div className="space-y-3 mt-4">
                  {assets?.slice(0, 4).map((h: any, index: number) => (
                    <motion.div 
                      key={h.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer hover-lift"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{h.sector}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <p className="font-medium font-mono">{formatCurrency(h.current_value)}</p>
                          <p className="text-muted-foreground">Value</p>
                        </div>
                        <HealthScore score={h.health_score || 0} size="sm" />
                      </div>
                    </motion.div>
                  ))}
                  {(!assets || assets.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No holdings data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <RecentCompaniesCard />
          <AIInsightCard />
          <PortfolioNews />
        </div>

        {/* Right Column - Secondary */}
        <div className="space-y-6">
          {/* Alerts Card */}
          <Card variant="surface" className="card-glow">
            <CardContent className="p-6">
              <SectionHeader title="Alerts" subtitle="Recent notifications" />
              <div className="space-y-3 mt-4">
                {alerts?.slice(0, 4).map((a: any, index: number) => (
                  <motion.div 
                    key={a.id} 
                    className={`flex gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer relative ${
                      a.severity === 'critical' ? 'accent-bar-negative' : 'accent-bar-warning'
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {a.severity === 'critical' ? (
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{a.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.description?.substring(0, 50)}...</p>
                    </div>
                  </motion.div>
                ))}
                {(!alerts || alerts.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No alerts</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Macro Indicators */}
          <Card variant="surface" className="card-glow">
            <CardContent className="p-6">
              <SectionHeader title="Macro Indicators" subtitle="Economic data" />
              <div className="space-y-3 mt-4">
                {indicators?.slice(0, 5).map((m: any, index: number) => (
                  <motion.div 
                    key={m.id} 
                    className="flex justify-between items-center text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span className="text-muted-foreground">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono">{m.current_value}{m.unit || ''}</span>
                      {m.change_percent != null && (
                        <PriceChange value={m.change_percent} size="sm" />
                      )}
                    </div>
                  </motion.div>
                ))}
                {(!indicators || indicators.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No macro data</p>
                )}
              </div>
            </CardContent>
          </Card>

          <ActionItemsCard />
          <UpcomingEvents />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <QuickActions
        onAddCompany={() => navigate('/companies?create=true')}
        onCreateModel={() => navigate('/models')}
        onUploadFiles={() => navigate('/documents')}
      />
    </div>
  );
}
