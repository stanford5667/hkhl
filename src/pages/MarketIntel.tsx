import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Activity, PieChart, Briefcase, Zap, Globe, Target, Building2, BookOpen, 
  Landmark, Users, Sparkles, Bell, RefreshCw, DollarSign, TrendingUp, TrendingDown,
  BarChart3, Shield, AlertTriangle, ArrowUpRight, ArrowDownRight, Home, 
  LineChart, Coins, ChevronRight, AlertCircle, Calendar, ExternalLink,
  Gem, Fuel, Wheat, Banknote
} from 'lucide-react';
import { usePortfolioTotals, useAlerts, useDealPipeline, usePortfolioAssets, useAssetAllocation, useEvents, useEconomicIndicators, useCovenants, useMATransactions, usePEFunds } from '@/hooks/useMarketIntel';
import { LiveMacroContent } from '@/components/markets/LiveMacroContent';
import { useCommodities, useForex, groupCommoditiesByCategory, groupForexByCategory, type CommodityData, type ForexData } from '@/hooks/useForexCommodities';
import { MarketDataDetail, type MarketDataItem } from '@/components/market-intel/MarketDataDetail';

export default function MarketIntel() {
  const [activeTab, setActiveTab] = useState('macro');
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketDataItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleItemClick = (item: MarketDataItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
            <BarChart3 className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
            Market Intelligence
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Portfolio Command Center & PE Industry Research
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm">
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="relative h-8 w-8 p-0">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            {unreadAlerts > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium flex items-center justify-center text-destructive-foreground">
                {unreadAlerts}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Premium Feature
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Upgrade to access real-time data across all markets
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => setShowUpgradeDialog(false)}>
              Upgrade Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex w-full h-auto gap-1 bg-secondary/50 p-1 overflow-x-auto">
          <TabsTrigger value="macro" className="text-xs sm:text-sm flex-1 min-w-0">
            <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 shrink-0" />
            <span className="truncate">Macro</span>
          </TabsTrigger>
          <TabsTrigger value="commodities" className="text-xs sm:text-sm flex-1 min-w-0">
            <Gem className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 shrink-0" />
            <span className="truncate">Commodities</span>
          </TabsTrigger>
          <TabsTrigger value="currencies" className="text-xs sm:text-sm flex-1 min-w-0">
            <Banknote className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 shrink-0" />
            <span className="truncate">Currencies</span>
          </TabsTrigger>
          <TabsTrigger value="funds" className="text-xs sm:text-sm flex-1 min-w-0">
            <Landmark className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 shrink-0" />
            <span className="truncate">Funds</span>
          </TabsTrigger>
        </TabsList>


        <TabsContent value="commodities" className="mt-6">
          <CommoditiesContent onItemClick={handleItemClick} />
        </TabsContent>

        <TabsContent value="currencies" className="mt-6">
          <CurrenciesContent onItemClick={handleItemClick} />
        </TabsContent>

        <TabsContent value="macro" className="mt-6">
          <LiveMacroContent onItemClick={handleItemClick} />
        </TabsContent>

        <TabsContent value="funds" className="mt-6">
          <FundsContent onItemClick={handleItemClick} />
        </TabsContent>

      </Tabs>

      {/* Market Data Detail Sheet */}
      <MarketDataDetail 
        item={selectedItem} 
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
      />
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

function HealthContent() {
  const { data: assets } = usePortfolioAssets();
  const { data: covenants } = useCovenants();
  
  const peAssets = assets?.filter((a: any) => a.asset_type === 'pe') || [];

  return (
    <div className="space-y-6">
      {/* Health Matrix */}
      <Card className="bg-secondary/50 border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Portfolio Health Matrix</h3>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-emerald-500" />Strong</span>
            <span className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-yellow-500" />Monitor</span>
            <span className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-rose-500" />At Risk</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {peAssets.map((a: any) => {
            const score = a.health_score || 50;
            const colorClass = score >= 70 ? 'border-emerald-500/50' : score >= 50 ? 'border-yellow-500/50' : 'border-rose-500/50';
            const textClass = score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-rose-400';
            return (
              <Card key={a.id} className={`bg-card p-4 border ${colorClass}`}>
                <div className="flex justify-between mb-3">
                  <span className="font-medium text-sm">{a.name}</span>
                  <span className={`text-2xl font-bold ${textClass}`}>{score}</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue Growth</span>
                    <span className={a.revenue_growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {a.revenue_growth >= 0 ? '+' : ''}{a.revenue_growth}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EBITDA Margin</span>
                    <span>{a.ebitda_margin}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Debt Service</span>
                    <span>{a.debt_service_coverage}x</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Covenant Tracking */}
      <Card className="bg-secondary/50 border-border p-6">
        <h3 className="text-lg font-medium mb-4">Covenant Tracking</h3>
        <div className="space-y-4">
          {covenants?.map((c: any) => {
            const headroom = Math.round((1 - c.current_value / c.limit_value) * 100);
            return (
              <div key={c.id} className={`p-4 rounded-lg ${c.is_warning ? 'bg-rose-900/20 border border-rose-500/30' : 'bg-card'}`}>
                <div className="flex justify-between mb-2">
                  <div>
                    <span className="font-medium">{c.portfolio_assets?.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">• {c.covenant_type}</span>
                  </div>
                  {c.is_warning && <Badge variant="destructive">Warning</Badge>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${c.is_warning ? 'bg-rose-500' : 'bg-primary'}`} 
                      style={{ width: `${Math.min((c.current_value / c.limit_value) * 100, 100)}%` }} 
                    />
                  </div>
                  <span className="text-sm w-24">{c.current_value}x / {c.limit_value}x</span>
                  <span className={`text-sm w-20 text-right ${headroom < 10 ? 'text-rose-400' : headroom < 25 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {headroom}% room
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Alternative Data */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4">🔍 Employment Signals</h3>
          <p className="text-muted-foreground text-sm mb-4">Data from LinkedIn, job boards</p>
          <div className="space-y-3">
            {peAssets.slice(0, 4).map((a: any, i: number) => {
              const signals = ['Job postings up 45%', '3 key departures', 'Hiring 2 VPs', 'Layoff rumors'];
              const positive = i % 2 === 0;
              return (
                <div key={a.id} className="flex justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm">{a.name.split(' ')[0]}</span>
                    <p className={`text-xs ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>{signals[i]}</p>
                  </div>
                  {positive ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-rose-400" />}
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4">📊 Web & Review Signals</h3>
          <p className="text-muted-foreground text-sm mb-4">Traffic & sentiment analysis</p>
          <div className="space-y-3">
            {peAssets.slice(0, 4).map((a: any, i: number) => {
              const signals = ['Traffic +22% QoQ', 'Reviews down 0.4 stars', 'NPS score 72', 'Site stale 6mo'];
              const positive = i === 0 || i === 2;
              return (
                <div key={a.id} className="flex justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm">{a.name.split(' ')[0]}</span>
                    <p className={`text-xs ${positive ? 'text-emerald-400' : i === 3 ? 'text-muted-foreground' : 'text-rose-400'}`}>{signals[i]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MacroContent() {
  const { data: indicators } = useEconomicIndicators();
  
  const rates = indicators?.filter((i: any) => i.category === 'rates') || [];
  const economic = indicators?.filter((i: any) => i.category === 'economic') || [];
  const markets = indicators?.filter((i: any) => i.category === 'markets') || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-secondary/50 border-border p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-400" />
          Rates & Credit
        </h3>
        <div className="space-y-3">
          {rates.map((r: any) => (
            <div key={r.id} className="flex justify-between py-2 border-b border-border last:border-0">
              <span className="text-muted-foreground text-sm">{r.indicator_name}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.current_value}</span>
                {r.change_value !== 0 && (
                  <span className={`text-xs ${r.change_value > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {r.change_value > 0 ? '+' : ''}{r.change_value}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded text-sm text-blue-400">
          💡 Consider refinancing floating debt
        </div>
      </Card>

      <Card className="bg-secondary/50 border-border p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          Economic
        </h3>
        <div className="space-y-3">
          {economic.map((e: any) => (
            <div key={e.id} className="flex justify-between py-2 border-b border-border last:border-0">
              <span className="text-muted-foreground text-sm">{e.indicator_name}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{e.current_value}</span>
                {e.change_value !== 0 && (
                  <span className={`text-xs ${e.change_value > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {e.change_value > 0 ? '↑' : '↓'}{Math.abs(e.change_value)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-secondary/50 border-border p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <LineChart className="h-5 w-5 text-purple-400" />
          Markets
        </h3>
        <div className="space-y-3">
          {markets.map((m: any) => (
            <div key={m.id} className="flex justify-between py-2 border-b border-border last:border-0">
              <span className="text-muted-foreground text-sm">{m.indicator_name}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{m.current_value}</span>
                {m.change_value !== 0 && (
                  <span className={`text-xs ${m.change_value > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {m.change_value > 0 ? '+' : ''}{m.change_value}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-secondary/50 border-border p-6 md:col-span-2">
        <h3 className="text-lg font-medium mb-4">Sector Performance (YTD)</h3>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { n: 'Technology', c: 38.2 },
            { n: 'Financials', c: 28.1 },
            { n: 'Healthcare', c: 8.4 },
            { n: 'Industrials', c: 15.9 },
            { n: 'Consumer', c: 22.7 },
            { n: 'Energy', c: -2.3 }
          ].map((s) => (
            <div key={s.n} className={`p-3 rounded-lg ${s.c >= 0 ? 'bg-emerald-900/20' : 'bg-rose-900/20'}`}>
              <div className="text-xs text-muted-foreground">{s.n}</div>
              <div className={`text-lg font-bold ${s.c >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {s.c > 0 ? '+' : ''}{s.c}%
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-secondary/50 border-border p-6">
        <h3 className="text-lg font-medium mb-4">Portfolio Sensitivity</h3>
        <div className="space-y-2">
          {[
            { f: '+100bps Rates', i: -12.4 },
            { f: '-100bps Rates', i: 8.2 },
            { f: 'Recession', i: -24.6 }
          ].map((s) => (
            <div key={s.f} className="flex justify-between py-2">
              <span className="text-muted-foreground text-sm">{s.f}</span>
              <span className={s.i >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {s.i > 0 ? '+' : ''}{s.i}% NAV
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function DealsContent() {
  const { data: transactions } = useMATransactions();
  const { data: pipeline } = useDealPipeline();
  const { data: assets } = usePortfolioAssets();
  
  const exitCandidates = assets?.filter((a: any) => a.moic >= 2.0).slice(0, 2) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* M&A Activity */}
      <Card className="bg-secondary/50 border-border p-6 lg:col-span-2">
        <h3 className="text-lg font-medium mb-4">Recent M&A Activity</h3>
        <div className="space-y-3">
          {transactions?.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{t.target_name}</div>
                <div className="text-xs text-muted-foreground">by {t.acquirer_name}</div>
              </div>
              <Badge variant="outline">{t.sector}</Badge>
              <div className="text-right">
                <div>${t.enterprise_value}M</div>
                <div className="text-xs text-muted-foreground">{t.ebitda_multiple}x</div>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(t.transaction_date).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Valuation Benchmarks */}
      <Card className="bg-secondary/50 border-border p-6">
        <h3 className="text-lg font-medium mb-4">Valuation Benchmarks</h3>
        <div className="space-y-3">
          {[
            { s: 'Software', r: '12-16x', t: 'up' },
            { s: 'Healthcare', r: '10-14x', t: 'stable' },
            { s: 'Industrials', r: '7-10x', t: 'down' },
            { s: 'Consumer', r: '8-12x', t: 'stable' }
          ].map((b) => (
            <div key={b.s} className="flex justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                {b.t === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                ) : b.t === 'down' ? (
                  <TrendingDown className="h-3 w-3 text-rose-400" />
                ) : (
                  <Activity className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-sm">{b.s}</span>
              </div>
              <span className="text-muted-foreground">{b.r}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Pipeline */}
      <Card className="bg-secondary/50 border-border p-6 lg:col-span-2">
        <h3 className="text-lg font-medium mb-4">Pipeline Opportunities</h3>
        <div className="space-y-3">
          {pipeline?.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{p.company_name}</div>
                <div className="text-xs text-muted-foreground">{p.sector} • {p.stage}</div>
              </div>
              <div className="text-right">
                <div>${p.revenue}M</div>
                <div className="text-xs text-muted-foreground">Revenue</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400">${p.ebitda}M</div>
                <div className="text-xs text-muted-foreground">EBITDA</div>
              </div>
              <div className="text-right">
                <div>{p.asking_multiple}x</div>
                <div className="text-xs text-muted-foreground">Ask</div>
              </div>
              <Badge className={p.fit_score === 'high' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}>
                {p.fit_score}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Exit Planning */}
      <Card className="bg-secondary/50 border-border p-6">
        <h3 className="text-lg font-medium mb-4">Exit Candidates</h3>
        <div className="space-y-4">
          {exitCandidates.map((e: any) => (
            <div key={e.id} className="p-3 bg-card rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="font-medium">{e.name}</span>
                <Badge variant="secondary">2025</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Hold:</span>
                  <span className="ml-1">{2024 - e.vintage_year} yrs</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Value:</span>
                  <span className="ml-1">${(e.current_value / 1e6).toFixed(0)}M</span>
                </div>
                <div>
                  <span className="text-muted-foreground">MOIC:</span>
                  <span className="text-emerald-400 ml-1">{e.moic}x</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LandscapeContent() {
  const { data: funds } = usePEFunds();
  const closedFunds = funds?.filter((f: any) => f.status === 'closed').slice(0, 4) || [];

  return (
    <div className="space-y-6">
      {/* Industry Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { l: 'Global PE AUM', v: '$8.2T', c: 12 },
          { l: 'Dry Powder', v: '$2.6T', c: 8 },
          { l: '2024 Deal Value', v: '$1.1T', c: -15 },
          { l: 'Deal Count', v: '12,847', c: -22 },
          { l: 'Avg Entry Multiple', v: '11.2x', c: -0.8 },
          { l: 'Avg Hold Period', v: '5.8 yrs', c: 0.6 },
        ].map((s) => (
          <Card key={s.l} className="bg-secondary/50 border-border p-4">
            <div className="text-xs text-muted-foreground mb-1">{s.l}</div>
            <div className="text-2xl font-bold">{s.v}</div>
            <div className={`text-xs mt-1 ${s.c >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {s.c >= 0 ? '↑' : '↓'} {Math.abs(s.c)}% YoY
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Fundraising */}
        <Card className="bg-secondary/50 border-border p-6 lg:col-span-2">
          <h3 className="text-lg font-medium mb-4">2024 Fundraising</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[{ t: 'Buyout', r: 285, f: 142 }, { t: 'Growth', r: 124, f: 198 }, { t: 'Credit', r: 168, f: 87 }, { t: 'Venture', r: 95, f: 412 }].map((x) => (
              <div key={x.t} className="bg-card rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-2">{x.t}</div>
                <div className="text-xl font-bold">${x.r}B</div>
                <div className="text-xs text-muted-foreground">{x.f} funds</div>
              </div>
            ))}
          </div>
          <h4 className="text-sm text-muted-foreground mb-3">Recent Major Closes</h4>
          <div className="space-y-2">
            {closedFunds.map((f: any) => (
              <div key={f.id} className="flex justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm">{f.fund_name}</div>
                  <div className="text-xs text-muted-foreground">{f.fund_type}</div>
                </div>
                <span className="font-medium">${(f.current_size / 1000).toFixed(1)}B</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Returns by Strategy */}
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4">10-Year Returns</h3>
          <div className="space-y-3">
            {[
              { s: 'Lower MM (<$100M)', irr: 21.2, moic: 2.4 },
              { s: 'Growth Equity', irr: 19.8, moic: 2.2 },
              { s: 'Mid-Market', irr: 18.4, moic: 2.1 },
              { s: 'Large Buyout', irr: 16.8, moic: 1.9 },
              { s: 'Mega Buyout', irr: 14.2, moic: 1.8 },
              { s: 'Direct Lending', irr: 9.4, moic: 1.3 },
            ].map((p) => (
              <div key={p.s} className="flex justify-between py-2 border-b border-border last:border-0">
                <span className="text-muted-foreground text-sm">{p.s}</span>
                <div className="flex gap-4">
                  <span className="text-emerald-400">{p.irr}%</span>
                  <span className="text-primary">{p.moic}x</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Industry Trends */}
      <Card className="bg-secondary/50 border-border p-6">
        <h3 className="text-lg font-medium mb-4">Industry Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { t: 'Continuation Funds', d: 'GP-led secondaries at record volumes', i: 'Growing', p: true },
            { t: 'Private Credit', d: 'Direct lenders taking share; $1.7T AUM', i: 'Accelerating', p: true },
            { t: 'AI Integration', d: 'PE firms building internal AI for DD', i: 'Emerging', p: true },
            { t: 'LP Denominator', d: 'Institutional allocations constrained', i: 'Headwind', p: false },
            { t: 'Carve-Outs', d: 'Corporate divestitures increasing', i: 'Growing', p: true },
            { t: 'Regulatory', d: 'SEC focus on fees and valuations', i: 'Increasing', p: false },
            { t: 'ESG', d: 'LP pressure driving reporting', i: 'Maturing', n: true },
            { t: 'Co-Investment', d: 'LPs want more to reduce fees', i: 'Strong', p: true },
          ].map((tr) => (
            <div key={tr.t} className={`rounded-lg p-4 border ${tr.p ? 'border-emerald-500/30 bg-emerald-900/10' : tr.n ? 'border-border bg-card/50' : 'border-rose-500/30 bg-rose-900/10'}`}>
              <div className="flex justify-between mb-2">
                <h4 className="font-medium">{tr.t}</h4>
                <Badge variant="outline" className={tr.p ? 'text-emerald-400' : tr.n ? 'text-muted-foreground' : 'text-rose-400'}>
                  {tr.i}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{tr.d}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Hot/Cold Sectors */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Hot Sectors
          </h3>
          {[{ s: 'Healthcare IT', d: 342, c: 28, m: '14.2x' }, { s: 'Infrastructure Software', d: 287, c: 45, m: '16.8x' }, { s: 'Specialty Insurance', d: 124, c: 32, m: '11.4x' }].map((x) => (
            <div key={x.s} className="flex justify-between py-2 border-b border-border last:border-0">
              <div>
                <div className="text-sm">{x.s}</div>
                <div className="text-xs text-muted-foreground">{x.d} deals</div>
              </div>
              <div className="flex gap-4 items-center">
                <span className="text-emerald-400">+{x.c}%</span>
                <Badge variant="outline">{x.m}</Badge>
              </div>
            </div>
          ))}
        </Card>
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-rose-400" />
            Cooling Sectors
          </h3>
          {[{ s: 'Consumer Retail', d: 156, c: -34, m: '7.2x' }, { s: 'Traditional Media', d: 67, c: -42, m: '6.8x' }, { s: 'Commercial RE', d: 234, c: -28, m: '8.4x' }].map((x) => (
            <div key={x.s} className="flex justify-between py-2 border-b border-border last:border-0">
              <div>
                <div className="text-sm">{x.s}</div>
                <div className="text-xs text-muted-foreground">{x.d} deals</div>
              </div>
              <div className="flex gap-4 items-center">
                <span className="text-rose-400">{x.c}%</span>
                <Badge variant="outline">{x.m}</Badge>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function StrategiesContent() {
  const [strategy, setStrategy] = useState('lbo');
  
  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {[{ id: 'lbo', n: 'LBO', i: '🏦' }, { id: 'growth', n: 'Growth Equity', i: '📈' }, { id: 'credit', n: 'Private Credit', i: '💳' }].map((s) => (
          <Button key={s.id} variant={strategy === s.id ? 'default' : 'outline'} onClick={() => setStrategy(s.id)} className={strategy === s.id ? 'bg-primary' : ''}>
            {s.i} {s.n}
          </Button>
        ))}
      </div>

      {strategy === 'lbo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-secondary/50 border-border p-6 lg:col-span-2">
            <h3 className="text-lg font-medium mb-4">Leveraged Buyout (LBO)</h3>
            <p className="text-muted-foreground text-sm mb-4">Acquire companies using 50-70% debt. Returns from debt paydown, multiple expansion, EBITDA growth.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[{ l: 'Entry Multiple', v: '8-12x' }, { l: 'Target IRR', v: '20-25%' }, { l: 'Hold Period', v: '4-6 yrs' }, { l: 'Leverage', v: '4-6x' }].map((m) => (
                <div key={m.l} className="bg-background rounded p-3"><div className="text-xs text-muted-foreground">{m.l}</div><div className="text-xl font-bold">{m.v}</div></div>
              ))}
            </div>
            <h4 className="text-sm text-muted-foreground mb-3">Value Creation Levers</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[{ t: 'Revenue Growth', items: ['Pricing', 'New customers', 'Expansion'], pct: '20-40%' }, { t: 'Margin', items: ['Procurement', 'Efficiency', 'SG&A'], pct: '25-35%' }, { t: 'Financial', items: ['Debt paydown', 'Refinancing'], pct: '30-50%' }].map((l) => (
                <div key={l.t} className="bg-background rounded p-4">
                  <h5 className="font-medium mb-2">{l.t}</h5>
                  <ul className="text-xs text-muted-foreground mb-2">{l.items.map((i) => <li key={i}>• {i}</li>)}</ul>
                  <Badge variant="outline" className="text-emerald-400">{l.pct}</Badge>
                </div>
              ))}
            </div>
          </Card>
          <Card className="bg-secondary/50 border-border p-6">
            <h3 className="text-lg font-medium mb-4">Success Factors</h3>
            <div className="space-y-2 mb-6">
              {[{ f: 'Stable cash flows', l: 'critical' }, { f: 'Market position', l: 'high' }, { f: 'Strong mgmt', l: 'high' }, { f: 'Multiple exits', l: 'medium' }].map((x) => (
                <div key={x.f} className="flex justify-between py-1">
                  <span className="text-muted-foreground text-sm">{x.f}</span>
                  <Badge variant="outline" className={x.l === 'critical' ? 'text-rose-400' : x.l === 'high' ? 'text-yellow-400' : 'text-blue-400'}>{x.l}</Badge>
                </div>
              ))}
            </div>
            <h4 className="text-sm text-muted-foreground mb-3">Key Risks</h4>
            <div className="space-y-1 text-sm">
              {['Over-leverage', 'Revenue decline', 'Rate exposure', 'Exit compression'].map((r) => (
                <div key={r} className="flex items-center gap-2 text-rose-400"><AlertTriangle className="h-3 w-3" />{r}</div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {strategy === 'growth' && (
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4">Growth Equity</h3>
          <p className="text-muted-foreground mb-4">Minority investments (20-40%) in profitable, growing companies. Little leverage. Returns from top-line growth.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{ l: 'Entry', v: '3-8x Rev' }, { l: 'Target IRR', v: '25-35%' }, { l: 'Hold', v: '4-7 yrs' }, { l: 'Ownership', v: '20-40%' }].map((m) => (
              <div key={m.l} className="bg-background rounded p-3"><div className="text-xs text-muted-foreground">{m.l}</div><div className="text-xl font-bold">{m.v}</div></div>
            ))}
          </div>
        </Card>
      )}

      {strategy === 'credit' && (
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4">Private Credit</h3>
          <p className="text-muted-foreground mb-4">Non-bank lending to middle market. $1.7T+ AUM. Banks retreating since 2008.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[{ t: 'Direct Lending', y: 'SOFR+500-650', r: 'Lower' }, { t: 'Unitranche', y: 'SOFR+575-700', r: 'Medium' }, { t: 'Mezzanine', y: '12-16% PIK', r: 'Higher' }].map((c) => (
              <div key={c.t} className="bg-background rounded p-3">
                <div className="font-medium mb-1">{c.t}</div>
                <div className="flex justify-between text-xs"><span className="text-emerald-400">{c.y}</span><Badge variant="outline">{c.r}</Badge></div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function FundsContent({ onItemClick }: { onItemClick: (item: MarketDataItem) => void }) {
  const { data: funds } = usePEFunds();
  const closed = funds?.filter((f: any) => f.status === 'closed') || [];
  const raising = funds?.filter((f: any) => f.status === 'fundraising') || [];

  const handleFundClick = (fund: any) => {
    onItemClick({
      symbol: fund.id,
      name: fund.fund_name,
      price: fund.current_size || 0,
      change: fund.prior_fund_irr || 0,
      changePercent: fund.prior_fund_moic ? (fund.prior_fund_moic - 1) * 100 : 0,
      type: 'fund',
      category: fund.fund_type,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-secondary/50 border-border p-6 lg:col-span-2">
          <h3 className="text-lg font-medium mb-4">Recently Closed Funds</h3>
          <div className="space-y-3">
            {closed.map((f: any) => (
              <div 
                key={f.id} 
                className="flex items-center justify-between p-3 bg-background/50 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={() => handleFundClick(f)}
              >
                <div><div className="font-medium">{f.fund_name}</div><div className="text-xs text-muted-foreground">{f.manager_name} • {f.fund_type}</div></div>
                <div className="flex gap-6 items-center">
                  <div className="text-right"><div>${(f.current_size / 1000).toFixed(1)}B</div><div className="text-xs text-muted-foreground">Size</div></div>
                  <div className="text-right"><div className="text-emerald-400">{f.prior_fund_irr}%</div><div className="text-xs text-muted-foreground">Prior IRR</div></div>
                  <Badge>Closed</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />In Market</h3>
          <div className="space-y-3">
            {raising.map((f: any) => {
              const pct = (f.current_size / f.target_size) * 100;
              return (
                <div 
                  key={f.id} 
                  className="py-2 border-b border-border last:border-0 cursor-pointer hover:bg-primary/5 rounded px-2 -mx-2 transition-colors"
                  onClick={() => handleFundClick(f)}
                >
                  <div className="flex justify-between mb-1"><span className="text-sm">{f.fund_name}</span><span className="text-xs text-muted-foreground">${f.current_size / 1000}B / ${f.target_size / 1000}B</span></div>
                  <div className="w-full bg-muted rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="bg-secondary/50 border-border p-6">
        <h3 className="text-lg font-medium mb-4">Performance League (2015-2019 Vintage)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { cat: 'Top Buyout', funds: [{ r: '🥇', n: 'Vista VII', irr: 42, m: 3.2 }, { r: '🥈', n: 'Thoma Bravo XIV', irr: 38, m: 2.9 }, { r: '🥉', n: 'Silver Lake V', irr: 34, m: 2.6 }] },
            { cat: 'Top Growth', funds: [{ r: '🥇', n: 'Insight XI', irr: 48, m: 3.8 }, { r: '🥈', n: 'GA 2018', irr: 32, m: 2.8 }, { r: '🥉', n: 'TA XIII', irr: 28, m: 2.4 }] },
            { cat: 'Top Credit', funds: [{ r: '🥇', n: 'Ares III', irr: 14, m: 1.5 }, { r: '🥈', n: 'Owl Rock', irr: 12, m: 1.4 }, { r: '🥉', n: 'Golub XIII', irr: 11, m: 1.4 }] },
          ].map((c) => (
            <div key={c.cat}>
              <h4 className="text-sm text-muted-foreground mb-3">{c.cat}</h4>
              {c.funds.map((f) => (
                <div 
                  key={f.n} 
                  className="flex justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-primary/5 rounded px-2 -mx-2 transition-colors"
                  onClick={() => onItemClick({
                    symbol: f.n.replace(/\s/g, '-'),
                    name: f.n,
                    price: f.irr,
                    change: f.irr,
                    changePercent: (f.m - 1) * 100,
                    type: 'fund',
                    category: c.cat,
                  })}
                >
                  <div className="flex gap-2"><span>{f.r}</span><span className="text-sm">{f.n}</span></div>
                  <span className="text-emerald-400">{f.irr}% / {f.m}x</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LPGPContent() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4">LP Sentiment</h3>
          <div className="space-y-3">
            {[{ t: 'PE Allocation', s: 'maintain', p: 62 }, { t: 'Credit Allocation', s: 'increase', p: 45 }, { t: 'Secondaries', s: 'increase', p: 52 }, { t: 'Co-Investment', s: 'increase', p: 68 }, { t: 'ESG Requirements', s: 'increase', p: 71 }].map((x) => (
              <div key={x.t} className="flex justify-between py-2 border-b border-border last:border-0">
                <span className="text-muted-foreground text-sm">{x.t}</span>
                <div className="flex gap-2"><span className={x.s === 'increase' ? 'text-emerald-400' : 'text-muted-foreground'}>{x.s}</span><Badge variant="outline">{x.p}%</Badge></div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4">Fee & Terms</h3>
          <div className="space-y-3">
            {[{ i: 'Management Fee', c: '1.75-2.0%', n: 'Large LPs get 1.5%' }, { i: 'Carry', c: '20%', n: 'Top performers >20%' }, { i: 'Preferred Return', c: '8%', n: 'Standard' }, { i: 'GP Commit', c: '2-5%', n: 'Trending to 5%+' }, { i: 'Fund Term', c: '10+2+1', n: '12yr common' }].map((x) => (
              <div key={x.i} className="py-2 border-b border-border last:border-0">
                <div className="flex justify-between"><span className="text-sm">{x.i}</span><span className="text-muted-foreground">{x.c}</span></div>
                <div className="text-xs text-muted-foreground">{x.n}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4">LP Universe</h3>
          <div className="space-y-2">
            {[{ t: 'Public Pensions', p: 28, tr: '→' }, { t: 'Sovereign Wealth', p: 18, tr: '↑' }, { t: 'Insurance', p: 14, tr: '↑' }, { t: 'Endowments', p: 12, tr: '→' }, { t: 'Family Offices', p: 10, tr: '↑' }, { t: 'Fund of Funds', p: 8, tr: '↓' }].map((x) => (
              <div key={x.t} className="flex justify-between py-1">
                <span className="text-muted-foreground text-sm">{x.t}</span>
                <div className="flex gap-2"><Badge variant="outline">{x.p}%</Badge><span className={x.tr === '↑' ? 'text-emerald-400' : x.tr === '↓' ? 'text-rose-400' : 'text-muted-foreground'}>{x.tr}</span></div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-secondary/50 border-border p-6 lg:col-span-2">
          <h3 className="text-lg font-medium mb-4">What LPs Want</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{ t: 'Track Record', d: 'Consistent across cycles', p: 'critical' }, { t: 'Differentiation', d: 'Unique strategy', p: 'high' }, { t: 'Team Stability', d: 'Low turnover', p: 'high' }, { t: 'Co-Invest Rights', d: 'Fee-free boost', p: 'high' }, { t: 'Transparency', d: 'Frequent reporting', p: 'high' }, { t: 'ESG', d: 'Formal policy', p: 'medium' }, { t: 'Alignment', d: '5%+ GP commit', p: 'medium' }, { t: 'Fair Terms', d: 'Competitive fees', p: 'medium' }].map((w) => (
              <div key={w.t} className={`bg-background rounded p-3 border ${w.p === 'critical' ? 'border-rose-500/30' : w.p === 'high' ? 'border-yellow-500/30' : 'border-blue-500/30'}`}>
                <div className="flex justify-between mb-1"><span className="font-medium text-sm">{w.t}</span><Badge variant="outline" className="text-xs">{w.p}</Badge></div>
                <p className="text-xs text-muted-foreground">{w.d}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4">LP News</h3>
          <div className="space-y-3">
            {[{ h: 'CalPERS cuts PE to 13%', d: 'Denominator effect' }, { h: 'ADIA $2B to infra', d: 'Digital focus' }, { h: 'Harvard PE returns 11%', d: 'Below benchmark' }, { h: 'OTPP directs program', d: '$5B allocation' }].map((n) => (
              <div key={n.h} className="py-2 border-b border-border last:border-0">
                <div className="text-sm">{n.h}</div>
                <div className="text-xs text-muted-foreground">{n.d}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ResearchContent() {
  const [query, setQuery] = useState('');
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="bg-secondary/50 border-border p-6 lg:col-span-2">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-400" />AI Research Assistant</h3>
        <p className="text-sm text-muted-foreground mb-4">Ask questions about portfolio, markets, or PE industry</p>
        <div className="bg-background rounded-lg p-4 mb-4 min-h-[200px]">
          <div className="text-muted-foreground text-sm">
            <p className="mb-2">Example queries:</p>
            <ul className="space-y-1">
              <li>• "Impact of rising rates on our RE portfolio?"</li>
              <li>• "Compare TechCo margins to software benchmarks"</li>
              <li>• "Recent M&A activity in healthcare services"</li>
              <li>• "Which portfolio companies have covenant risk?"</li>
              <li>• "Generate LP market update memo"</li>
            </ul>
          </div>
        </div>
        <div className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask about portfolio, markets, PE industry..." className="flex-1 bg-background border border-border rounded px-3 py-2" />
          <Button className="bg-purple-600 hover:bg-purple-500"><Sparkles className="h-4 w-4 mr-2" />Ask</Button>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4">Saved Reports</h3>
          <div className="space-y-2">
            {[{ t: 'Q4 Portfolio Review', d: 'Dec 20', ty: 'internal' }, { t: 'Healthcare Deep Dive', d: 'Dec 15', ty: 'research' }, { t: 'Rate Impact Analysis', d: 'Dec 10', ty: 'analysis' }, { t: 'TechCo Competitive', d: 'Dec 5', ty: 'company' }].map((r) => (
              <div key={r.t} className="flex justify-between py-2 border-b border-border last:border-0 hover:bg-background/50 cursor-pointer rounded px-2 -mx-2">
                <div><div className="text-sm">{r.t}</div><div className="text-xs text-muted-foreground">{r.d}</div></div>
                <Badge variant="outline">{r.ty}</Badge>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4" size="sm">+ Generate Report</Button>
        </Card>

        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4">Quick Links</h3>
          <div className="space-y-2">
            {['Federal Reserve', 'SEC EDGAR', 'Pitchbook', 'Capital IQ', 'Bloomberg'].map((l) => (
              <a key={l} href="#" className="flex justify-between py-2 text-muted-foreground hover:text-primary">
                <span className="text-sm">{l}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Commodity price display card
function CommodityPriceCard({ commodity, onClick }: { commodity: CommodityData; onClick?: () => void }) {
  const isUp = commodity.change >= 0;
  
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          commodity.category === 'metals' ? 'bg-yellow-500/10' :
          commodity.category === 'energy' ? 'bg-orange-500/10' :
          'bg-green-500/10'
        }`}>
          {commodity.category === 'metals' ? (
            <Gem className={`h-4 w-4 ${
              commodity.category === 'metals' ? 'text-yellow-500' :
              commodity.category === 'energy' ? 'text-orange-500' :
              'text-green-500'
            }`} />
          ) : commodity.category === 'energy' ? (
            <Fuel className="h-4 w-4 text-orange-500" />
          ) : (
            <Wheat className="h-4 w-4 text-green-500" />
          )}
        </div>
        <div>
          <div className="font-medium text-sm group-hover:text-primary transition-colors">{commodity.name}</div>
          <div className="text-xs text-muted-foreground">
            {commodity.unit && `per ${commodity.unit}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="font-bold tabular-nums">
            ${commodity.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`flex items-center justify-end gap-1 text-xs ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span className="tabular-nums">{isUp ? '+' : ''}{commodity.change.toFixed(2)}</span>
            <span className="tabular-nums">({isUp ? '+' : ''}{commodity.changePercent.toFixed(2)}%)</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}

function CommoditiesContent({ onItemClick }: { onItemClick: (item: MarketDataItem) => void }) {
  const { data, isLoading, error, lastUpdated, refetch } = useCommodities();
  const grouped = groupCommoditiesByCategory(data);

  const handleCommodityClick = (commodity: CommodityData) => {
    onItemClick({
      symbol: commodity.symbol,
      name: commodity.name,
      price: commodity.price,
      change: commodity.change,
      changePercent: commodity.changePercent,
      high: commodity.high,
      low: commodity.low,
      open: commodity.open,
      prevClose: commodity.prevClose,
      timestamp: commodity.timestamp,
      category: commodity.category,
      unit: commodity.unit,
      type: 'commodity',
    });
  };
  
  if (isLoading && data.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-secondary/50 border-border p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} className="h-14 w-full" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="bg-secondary/50 border-border p-6">
        <div className="flex items-center gap-3 text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-medium">Unable to load commodities data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        <Button onClick={refetch} variant="outline" size="sm" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with last updated */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gem className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            Real-time commodity prices from global markets
          </span>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={refetch} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Metals */}
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Gem className="h-5 w-5 text-yellow-400" />
            Precious Metals
          </h3>
          <div className="space-y-2">
            {grouped.metals.length > 0 ? (
              grouped.metals.map((commodity) => (
                <CommodityPriceCard 
                  key={commodity.symbol} 
                  commodity={commodity} 
                  onClick={() => handleCommodityClick(commodity)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>
            )}
          </div>
        </Card>

        {/* Energy */}
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Fuel className="h-5 w-5 text-orange-400" />
            Energy
          </h3>
          <div className="space-y-2">
            {grouped.energy.length > 0 ? (
              grouped.energy.map((commodity) => (
                <CommodityPriceCard 
                  key={commodity.symbol} 
                  commodity={commodity} 
                  onClick={() => handleCommodityClick(commodity)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>
            )}
          </div>
        </Card>

        {/* Agriculture */}
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Wheat className="h-5 w-5 text-green-400" />
            Agriculture
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {grouped.agriculture.length > 0 ? (
              grouped.agriculture.map((commodity) => (
                <CommodityPriceCard 
                  key={commodity.symbol} 
                  commodity={commodity} 
                  onClick={() => handleCommodityClick(commodity)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>
            )}
          </div>
        </Card>
      </div>

      {/* Market Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Gold', value: grouped.metals.find(m => m.name === 'Gold'), color: 'yellow' },
          { label: 'Crude Oil', value: grouped.energy.find(m => m.name === 'Crude Oil WTI'), color: 'orange' },
          { label: 'Natural Gas', value: grouped.energy.find(m => m.name === 'Natural Gas'), color: 'blue' },
          { label: 'Corn', value: grouped.agriculture.find(m => m.name === 'Corn'), color: 'green' },
        ].map((item) => {
          const isUp = item.value && item.value.change >= 0;
          return (
            <Card key={item.label} className="bg-secondary/50 border-border p-4">
              <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className="text-xl font-bold tabular-nums">
                {item.value ? `$${item.value.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '--'}
              </div>
              {item.value && (
                <div className={`text-sm ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isUp ? '+' : ''}{item.value.changePercent.toFixed(2)}%
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Currency pair display card
function ForexPriceCard({ forex, onClick }: { forex: ForexData; onClick?: () => void }) {
  const isUp = forex.change >= 0;
  
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          forex.category === 'major' ? 'bg-blue-500/10' :
          forex.category === 'cross' ? 'bg-purple-500/10' :
          'bg-emerald-500/10'
        }`}>
          <Banknote className={`h-4 w-4 ${
            forex.category === 'major' ? 'text-blue-500' :
            forex.category === 'cross' ? 'text-purple-500' :
            'text-emerald-500'
          }`} />
        </div>
        <div>
          <div className="font-medium text-sm group-hover:text-primary transition-colors">{forex.name}</div>
          <div className="text-xs text-muted-foreground">
            {forex.base}/{forex.quote}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="font-bold tabular-nums text-base">
            {forex.price.toFixed(forex.quote === 'JPY' ? 3 : 5)}
          </div>
          <div className={`flex items-center justify-end gap-1 text-xs ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span className="tabular-nums">{isUp ? '+' : ''}{forex.changePercent.toFixed(2)}%</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}

function CurrenciesContent({ onItemClick }: { onItemClick: (item: MarketDataItem) => void }) {
  const { data, isLoading, error, lastUpdated, refetch } = useForex();
  const grouped = groupForexByCategory(data);

  const handleForexClick = (forex: ForexData) => {
    onItemClick({
      symbol: forex.symbol,
      name: forex.name,
      price: forex.price,
      change: forex.change,
      changePercent: forex.changePercent,
      high: forex.high,
      low: forex.low,
      open: forex.open,
      prevClose: forex.prevClose,
      timestamp: forex.timestamp,
      category: forex.category,
      base: forex.base,
      quote: forex.quote,
      type: 'forex',
    });
  };
  
  if (isLoading && data.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-secondary/50 border-border p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} className="h-14 w-full" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="bg-secondary/50 border-border p-6">
        <div className="flex items-center gap-3 text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-medium">Unable to load forex data</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        <Button onClick={refetch} variant="outline" size="sm" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with last updated */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            Real-time foreign exchange rates
          </span>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={refetch} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Major Pairs */}
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-400" />
            Major Pairs
          </h3>
          <div className="space-y-2">
            {grouped.major.length > 0 ? (
              grouped.major.map((forex) => (
                <ForexPriceCard 
                  key={forex.symbol} 
                  forex={forex} 
                  onClick={() => handleForexClick(forex)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>
            )}
          </div>
        </Card>

        {/* Cross Pairs */}
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-400" />
            Cross Pairs
          </h3>
          <div className="space-y-2">
            {grouped.cross.length > 0 ? (
              grouped.cross.map((forex) => (
                <ForexPriceCard 
                  key={forex.symbol} 
                  forex={forex} 
                  onClick={() => handleForexClick(forex)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>
            )}
          </div>
        </Card>

        {/* Emerging Markets */}
        <Card className="bg-secondary/50 border-border p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-400" />
            Emerging Markets
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {grouped.emerging.length > 0 ? (
              grouped.emerging.map((forex) => (
                <ForexPriceCard 
                  key={forex.symbol} 
                  forex={forex} 
                  onClick={() => handleForexClick(forex)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>
            )}
          </div>
        </Card>
      </div>

      {/* Key Rates Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'EUR/USD', value: grouped.major.find(m => m.name === 'EUR/USD'), color: 'blue' },
          { label: 'GBP/USD', value: grouped.major.find(m => m.name === 'GBP/USD'), color: 'purple' },
          { label: 'USD/JPY', value: grouped.major.find(m => m.name === 'USD/JPY'), color: 'rose' },
          { label: 'USD/CNY', value: grouped.emerging.find(m => m.name === 'USD/CNY'), color: 'emerald' },
        ].map((item) => {
          const isUp = item.value && item.value.change >= 0;
          const decimals = item.value?.quote === 'JPY' ? 3 : 4;
          return (
            <Card key={item.label} className="bg-secondary/50 border-border p-4">
              <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className="text-xl font-bold tabular-nums">
                {item.value ? item.value.price.toFixed(decimals) : '--'}
              </div>
              {item.value && (
                <div className={`text-sm ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isUp ? '+' : ''}{item.value.changePercent.toFixed(2)}%
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* DXY Index Card */}
      <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <DollarSign className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium">US Dollar Index (DXY)</h3>
              <p className="text-sm text-muted-foreground">Trade-weighted dollar strength</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">
              {grouped.major.length > 0 ? '~' : '--'}
            </div>
            <p className="text-xs text-muted-foreground">Based on major pairs</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
