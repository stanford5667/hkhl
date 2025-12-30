import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, PieChart, Briefcase, Zap, Globe, Target, Building2, BookOpen, 
  Landmark, Users, Sparkles, Bell, RefreshCw, DollarSign, TrendingUp, 
  BarChart3, Shield, AlertTriangle, ArrowUpRight, ArrowDownRight, Home, 
  LineChart, Coins, ChevronRight, AlertCircle, Calendar
} from 'lucide-react';
import { usePortfolioTotals, useAlerts, useDealPipeline, usePortfolioAssets, useAssetAllocation, useEvents, useEconomicIndicators } from '@/hooks/useMarketIntel';

export default function MarketIntel() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: totals } = usePortfolioTotals();
  const { data: alerts } = useAlerts();
  const { data: deals } = useDealPipeline();
  const { data: assets } = usePortfolioAssets();
  
  const unreadAlerts = alerts?.filter(a => !a.is_read).length || 0;
  const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;
  const activeDeals = deals?.filter(d => d.stage !== 'passed').length || 0;
  const totalValue = totals?.totalValue || 0;
  const totalCost = totals?.totalCost || 0;
  const returnPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  const avgMoic = totals?.avgMoic || 0;
  const companyCount = assets?.length || 0;

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            Market Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Portfolio Command Center & PE Industry Research
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {unreadAlerts > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium flex items-center justify-center text-destructive-foreground">
                {unreadAlerts}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard 
          label="Portfolio Value" 
          value={formatCurrency(totalValue)} 
          change={returnPct} 
          icon={<DollarSign className="h-4 w-4" />} 
        />
        <StatCard 
          label="Avg MOIC" 
          value={`${avgMoic.toFixed(1)}x`} 
          subtitle={`${companyCount} holdings`}
          icon={<TrendingUp className="h-4 w-4" />} 
        />
        <StatCard 
          label="Avg IRR" 
          value={`${(totals?.avgIrr || 0).toFixed(1)}%`} 
          icon={<Activity className="h-4 w-4" />} 
        />
        <StatCard 
          label="Active Deals" 
          value={activeDeals.toString()} 
          subtitle="In pipeline"
          icon={<Target className="h-4 w-4" />} 
        />
        <StatCard 
          label="Unread Alerts" 
          value={unreadAlerts.toString()} 
          subtitle="Pending review"
          icon={<Bell className="h-4 w-4" />} 
          color="text-yellow-400" 
        />
        <StatCard 
          label="Critical" 
          value={criticalAlerts.toString()} 
          subtitle="Need attention"
          icon={<AlertTriangle className="h-4 w-4" />} 
          color="text-rose-400" 
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/50 p-1">
          <TabsTrigger value="overview" className="text-sm">
            <PieChart className="h-4 w-4 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="health" className="text-sm">
            <Activity className="h-4 w-4 mr-1.5" />
            Health
          </TabsTrigger>
          <TabsTrigger value="signals" className="text-sm">
            <Zap className="h-4 w-4 mr-1.5" />
            Signals
          </TabsTrigger>
          <TabsTrigger value="macro" className="text-sm">
            <Globe className="h-4 w-4 mr-1.5" />
            Macro
          </TabsTrigger>
          <TabsTrigger value="deals" className="text-sm">
            <Briefcase className="h-4 w-4 mr-1.5" />
            Deals
          </TabsTrigger>
          <TabsTrigger value="landscape" className="text-sm">
            <Building2 className="h-4 w-4 mr-1.5" />
            PE Landscape
          </TabsTrigger>
          <TabsTrigger value="strategies" className="text-sm">
            <Target className="h-4 w-4 mr-1.5" />
            Strategies
          </TabsTrigger>
          <TabsTrigger value="funds" className="text-sm">
            <Landmark className="h-4 w-4 mr-1.5" />
            Funds
          </TabsTrigger>
          <TabsTrigger value="lpgp" className="text-sm">
            <Users className="h-4 w-4 mr-1.5" />
            LP/GP
          </TabsTrigger>
          <TabsTrigger value="research" className="text-sm">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Research
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewContent />
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <Card className="p-8 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Health Tab</p>
            <p>Portfolio health matrix and covenant tracking</p>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="mt-6">
          <Card className="p-8 text-center text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Signals Tab</p>
            <p>Alert feed and notification settings</p>
          </Card>
        </TabsContent>

        <TabsContent value="macro" className="mt-6">
          <Card className="p-8 text-center text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Macro Tab</p>
            <p>Economic indicators and portfolio sensitivity</p>
          </Card>
        </TabsContent>

        <TabsContent value="deals" className="mt-6">
          <Card className="p-8 text-center text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Deals Tab</p>
            <p>M&A transactions and pipeline opportunities</p>
          </Card>
        </TabsContent>

        <TabsContent value="landscape" className="mt-6">
          <Card className="p-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">PE Landscape Tab</p>
            <p>Industry stats and fundraising trends</p>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="mt-6">
          <Card className="p-8 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Strategies Tab</p>
            <p>LBO, Growth, and Credit strategy overviews</p>
          </Card>
        </TabsContent>

        <TabsContent value="funds" className="mt-6">
          <Card className="p-8 text-center text-muted-foreground">
            <Landmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Funds Tab</p>
            <p>Recently closed funds and funds in market</p>
          </Card>
        </TabsContent>

        <TabsContent value="lpgp" className="mt-6">
          <Card className="p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">LP/GP Tab</p>
            <p>LP sentiment and fee trends</p>
          </Card>
        </TabsContent>

        <TabsContent value="research" className="mt-6">
          <Card className="p-8 text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Research Tab</p>
            <p>AI research assistant and saved reports</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
}

function StatCard({ label, value, change, subtitle, icon, color = 'text-primary' }: StatCardProps) {
  return (
    <Card className="bg-gradient-to-br from-card to-secondary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={color}>{icon}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
        {change !== undefined && (
          <p className={`text-xs flex items-center gap-1 ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </p>
        )}
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function OverviewContent() {
  const { data: allocation } = useAssetAllocation();
  const { data: assets } = usePortfolioAssets();
  const { data: alerts } = useAlerts();
  const { data: events } = useEvents();
  const { data: indicators } = useEconomicIndicators();

  const typeConfig: Record<string, { name: string; color: string; Icon: React.ElementType }> = {
    pe: { name: 'Private Equity', color: 'bg-blue-500', Icon: Building2 },
    real_estate: { name: 'Real Estate', color: 'bg-emerald-500', Icon: Home },
    public_equity: { name: 'Public Equities', color: 'bg-purple-500', Icon: LineChart },
    credit: { name: 'Credit', color: 'bg-yellow-500', Icon: Coins },
    alternatives: { name: 'Alternatives', color: 'bg-pink-500', Icon: Sparkles },
  };

  return (
    <div className="space-y-6">
      {/* Top Row - Allocation + Top Holdings */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Asset Allocation */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Asset Allocation</h3>
            <div className="space-y-4">
              {allocation?.map((a: any) => {
                const cfg = typeConfig[a.asset_type] || { name: a.asset_type, color: 'bg-slate-500', Icon: Building2 };
                const IconComponent = cfg.Icon;
                return (
                  <div key={a.asset_type} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className={`w-10 h-10 rounded-lg ${cfg.color} flex items-center justify-center`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">${(a.current_value / 1e6).toFixed(1)}M</p>
                      <p className="text-sm text-muted-foreground">{cfg.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{a.allocation_pct.toFixed(1)}%</p>
                      <p className={`text-sm ${a.gain_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {a.gain_pct >= 0 ? '+' : ''}{a.gain_pct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Holdings */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Holdings</h3>
            <div className="space-y-3">
              {assets?.slice(0, 5).map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group cursor-pointer">
                  <div className="flex-1">
                    <p className="font-medium group-hover:text-primary transition-colors">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.asset_type} • {h.sector}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-medium">${(h.current_value / 1e6).toFixed(1)}M</p>
                      <p className="text-xs text-muted-foreground">Value</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{h.irr?.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">IRR</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{h.moic?.toFixed(1)}x</p>
                      <p className="text-xs text-muted-foreground">MOIC</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${h.health_score >= 70 ? 'text-emerald-400' : h.health_score >= 50 ? 'text-yellow-400' : 'text-rose-400'}`}>
                        {h.health_score}
                      </p>
                      <p className="text-xs text-muted-foreground">Health</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Alerts + Macro + Events */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Alerts */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Alerts</h3>
            <div className="space-y-3">
              {alerts?.slice(0, 3).map((a: any) => (
                <div key={a.id} className="flex gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer">
                  {a.severity === 'critical' ? (
                    <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.description?.substring(0, 60)}...</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Macro */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Macro</h3>
            <div className="space-y-3">
              {indicators?.slice(0, 5).map((m: any) => (
                <div key={m.id} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{m.indicator_name}</span>
                  <span className="font-medium">{m.current_value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Upcoming</h3>
            <div className="space-y-3">
              {events?.map((e: any) => (
                <div key={e.id} className="flex justify-between items-center text-sm">
                  <span className="truncate flex-1">{e.title}</span>
                  <Badge variant="outline" className="ml-2 shrink-0">{e.event_type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
