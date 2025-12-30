import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Activity, PieChart, Briefcase, Zap, Globe, Target, Building2, BookOpen, 
  Landmark, Users, Sparkles, Bell, RefreshCw, DollarSign, TrendingUp, 
  BarChart3, Shield, AlertTriangle, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { usePortfolioTotals, useAlerts, useDealPipeline, usePortfolioAssets } from '@/hooks/useMarketIntel';

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
          <Card className="p-8 text-center text-muted-foreground">
            <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Overview Tab</p>
            <p>Portfolio allocation, top holdings, and key metrics</p>
          </Card>
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
