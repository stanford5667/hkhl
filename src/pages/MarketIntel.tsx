import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Bell,
  Calendar,
  DollarSign,
  Building2,
  Briefcase,
  Activity,
  Shield,
  Target,
  Users,
  FileText,
  Sparkles,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  LineChart,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  BookOpen,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Cell,
  PieChart as RechartsPie,
  Pie,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import {
  usePortfolioAssets,
  useAssetAllocation,
  usePortfolioTotals,
  useCovenants,
  useAlerts,
  useEvents,
  useEconomicIndicators,
  usePEFunds,
  useDealPipeline,
  useMATransactions,
  useMarkAlertRead,
} from "@/hooks/useMarketIntel";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Static data for tabs that don't have database backing
const lpSentimentData = [
  { category: "Very Positive", value: 15 },
  { category: "Positive", value: 35 },
  { category: "Neutral", value: 30 },
  { category: "Cautious", value: 15 },
  { category: "Negative", value: 5 },
];

const strategyReturns = [
  { strategy: "Buyout", irr: 18.5, tvpi: 1.9 },
  { strategy: "Growth", irr: 22.3, tvpi: 2.1 },
  { strategy: "Credit", irr: 12.8, tvpi: 1.4 },
  { strategy: "Venture", irr: 25.1, tvpi: 2.8 },
  { strategy: "Real Assets", irr: 14.2, tvpi: 1.6 },
];

const fundraisingData = [
  { strategy: "Buyout", amount: 320 },
  { strategy: "Growth", amount: 180 },
  { strategy: "Credit", amount: 145 },
  { strategy: "Venture", amount: 210 },
  { strategy: "Secondaries", amount: 95 },
];

export default function MarketIntel() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStrategy, setSelectedStrategy] = useState("lbo");

  // Fetch all data
  const { data: assets, isLoading: loadingAssets } = usePortfolioAssets();
  const { allocation, totalValue } = useAssetAllocation();
  const totals = usePortfolioTotals();
  const { data: covenants, isLoading: loadingCovenants } = useCovenants();
  const { data: alerts, isLoading: loadingAlerts } = useAlerts();
  const { data: events, isLoading: loadingEvents } = useEvents();
  const { data: indicators, isLoading: loadingIndicators } = useEconomicIndicators();
  const { data: funds, isLoading: loadingFunds } = usePEFunds();
  const { data: pipeline, isLoading: loadingPipeline } = useDealPipeline();
  const { data: transactions, isLoading: loadingTransactions } = useMATransactions();
  const markAlertRead = useMarkAlertRead();

  const unreadAlerts = alerts?.filter(a => !a.is_read).length || 0;
  const criticalAlerts = alerts?.filter(a => a.severity === 'critical' && !a.is_read).length || 0;

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="h1 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Market Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Portfolio monitoring, market signals, and PE landscape insights
          </p>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Portfolio Value</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totals.totalValue)}</p>
            <p className={`text-xs ${totals.returnPct >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totals.returnPct >= 0 ? '+' : ''}{totals.returnPct.toFixed(1)}% return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Holdings</span>
            </div>
            <p className="text-xl font-bold">{totals.companyCount}</p>
            <p className="text-xs text-muted-foreground">Avg MOIC: {totals.avgMoic.toFixed(1)}x</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Alerts</span>
            </div>
            <p className="text-xl font-bold">{unreadAlerts}</p>
            <p className="text-xs text-destructive">{criticalAlerts} critical</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Pipeline Deals</span>
            </div>
            <p className="text-xl font-bold">{pipeline?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Active opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Upcoming</span>
            </div>
            <p className="text-xl font-bold">{events?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Events scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Covenants</span>
            </div>
            <p className="text-xl font-bold">{covenants?.filter(c => !c.is_warning).length || 0}/{covenants?.length || 0}</p>
            <p className="text-xs text-success">Compliant</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/50 p-1">
          <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
          <TabsTrigger value="health" className="text-sm">Health</TabsTrigger>
          <TabsTrigger value="signals" className="text-sm">Signals</TabsTrigger>
          <TabsTrigger value="macro" className="text-sm">Macro</TabsTrigger>
          <TabsTrigger value="deals" className="text-sm">Deals</TabsTrigger>
          <TabsTrigger value="landscape" className="text-sm">PE Landscape</TabsTrigger>
          <TabsTrigger value="strategies" className="text-sm">Strategies</TabsTrigger>
          <TabsTrigger value="funds" className="text-sm">Funds</TabsTrigger>
          <TabsTrigger value="lpgp" className="text-sm">LP/GP</TabsTrigger>
          <TabsTrigger value="research" className="text-sm">Research</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset Allocation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Asset Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAssets ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : allocation.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={allocation}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          labelLine={false}
                        >
                          {allocation.map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No portfolio data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Holdings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Top Holdings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingAssets ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))
                ) : assets?.slice(0, 5).map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <div>
                      <p className="font-medium text-sm">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.sector || asset.asset_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{formatCurrency(asset.current_value)}</p>
                      <p className={`text-xs ${asset.moic && asset.moic > 1 ? 'text-success' : 'text-destructive'}`}>
                        {asset.moic ? `${asset.moic.toFixed(1)}x MOIC` : '—'}
                      </p>
                    </div>
                  </div>
                ))}
                {!loadingAssets && (!assets || assets.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">No holdings data</p>
                )}
              </CardContent>
            </Card>

            {/* Critical Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingAlerts ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : alerts?.filter(a => a.severity === 'critical' || a.severity === 'warning').slice(0, 4).map((alert) => (
                  <div 
                    key={alert.id} 
                    className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                    onClick={() => markAlertRead.mutate(alert.id)}
                  >
                    <div className="flex items-start gap-2">
                      <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                        {alert.severity}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {!loadingAlerts && (!alerts || alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length === 0) && (
                  <p className="text-muted-foreground text-center py-8">No critical alerts</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Macro Snapshot */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Macro Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {loadingIndicators ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))
                  ) : indicators?.slice(0, 4).map((ind) => (
                    <div key={ind.id} className="p-3 rounded-lg bg-secondary/30">
                      <p className="text-xs text-muted-foreground">{ind.indicator_name}</p>
                      <p className="text-lg font-bold">{ind.current_value}</p>
                      {ind.change_value !== null && (
                        <p className={`text-xs flex items-center gap-1 ${ind.change_value >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {ind.change_value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(ind.change_value).toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingEvents ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))
                ) : events?.slice(0, 4).map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">{format(new Date(event.event_date), 'MMM')}</span>
                      <span className="text-lg font-bold text-primary">{format(new Date(event.event_date), 'd')}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{event.title}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{event.event_type}</Badge>
                  </div>
                ))}
                {!loadingEvents && (!events || events.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">No upcoming events</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Portfolio Health Matrix */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Portfolio Health Matrix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loadingAssets ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))
                  ) : assets?.map((asset) => (
                    <div key={asset.id} className="p-3 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">{asset.sector || asset.asset_type}</p>
                        </div>
                        <Badge variant={asset.health_score && asset.health_score >= 70 ? 'outline' : 'destructive'}>
                          {asset.health_score || 0}% Health
                        </Badge>
                      </div>
                      <Progress value={asset.health_score || 0} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Covenant Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Covenant Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingCovenants ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))
                ) : covenants?.map((cov) => (
                  <div key={cov.id} className="p-3 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {cov.is_warning ? (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        )}
                        <span className="font-medium text-sm">{cov.portfolio_assets?.name || 'Unknown'}</span>
                      </div>
                      <Badge variant={cov.is_warning ? 'destructive' : 'outline'}>
                        {cov.is_warning ? 'Warning' : 'Compliant'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{cov.covenant_type}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Progress value={(cov.current_value / cov.limit_value) * 100} className="h-2" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {cov.current_value.toFixed(1)}x / {cov.limit_value.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                ))}
                {!loadingCovenants && (!covenants || covenants.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">No covenant data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Signals Tab */}
        <TabsContent value="signals" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Alert Feed */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Alert Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                {loadingAlerts ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : alerts?.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      alert.is_read ? 'border-border/30 bg-secondary/20' : 'border-primary/30 bg-primary/5'
                    }`}
                    onClick={() => !alert.is_read && markAlertRead.mutate(alert.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant={getSeverityColor(alert.severity)} className="text-xs shrink-0">
                        {alert.severity}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${alert.is_read ? 'text-muted-foreground' : ''}`}>
                          {alert.title}
                        </p>
                        {alert.description && (
                          <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {alert.portfolio_assets && (
                            <Badge variant="outline" className="text-xs">{alert.portfolio_assets.name}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!loadingAlerts && (!alerts || alerts.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">No alerts</p>
                )}
              </CardContent>
            </Card>

            {/* Alert Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alert Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {['Covenant Breaches', 'Revenue Decline', 'Market Moves', 'News Mentions', 'Employee Changes'].map((setting) => (
                  <div key={setting} className="flex items-center justify-between">
                    <span className="text-sm">{setting}</span>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Macro Tab */}
        <TabsContent value="macro" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Economic Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Economic Indicators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {loadingIndicators ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))
                  ) : indicators?.map((ind) => (
                    <div key={ind.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">{ind.indicator_name}</p>
                      <p className="text-2xl font-bold">{ind.current_value}</p>
                      {ind.change_value !== null && (
                        <div className={`flex items-center gap-1 text-sm ${ind.change_value >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {ind.change_value >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          {Math.abs(ind.change_value).toFixed(2)} change
                        </div>
                      )}
                      {ind.category && (
                        <p className="text-xs text-muted-foreground mt-2 capitalize">{ind.category}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Portfolio Sensitivity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Portfolio Sensitivity
                </CardTitle>
                <CardDescription>Impact of rate changes on portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { scenario: '+100bps Rate Increase', impact: -8.5, type: 'negative' },
                    { scenario: '-100bps Rate Decrease', impact: 6.2, type: 'positive' },
                    { scenario: 'Credit Spread Widening', impact: -5.3, type: 'negative' },
                    { scenario: 'GDP Growth +1%', impact: 4.8, type: 'positive' },
                  ].map((item) => (
                    <div key={item.scenario} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <span className="text-sm">{item.scenario}</span>
                      <span className={`font-medium ${item.type === 'positive' ? 'text-success' : 'text-destructive'}`}>
                        {item.impact > 0 ? '+' : ''}{item.impact}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent M&A Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Recent M&A Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingTransactions ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))
                ) : transactions?.map((tx) => (
                  <div key={tx.id} className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{tx.target_name}</p>
                        <p className="text-xs text-muted-foreground">Acquired by {tx.acquirer_name || 'Undisclosed'}</p>
                      </div>
                      <Badge variant="outline">{tx.sector || 'N/A'}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {tx.enterprise_value && <span>{formatCurrency(tx.enterprise_value * 1e6)}</span>}
                      {tx.ebitda_multiple && <span>{tx.ebitda_multiple.toFixed(1)}x EV/EBITDA</span>}
                    </div>
                    {tx.transaction_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(tx.transaction_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                ))}
                {!loadingTransactions && (!transactions || transactions.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">No transaction data</p>
                )}
              </CardContent>
            </Card>

            {/* Pipeline Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Pipeline Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingPipeline ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))
                ) : pipeline?.map((deal) => (
                  <div key={deal.id} className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{deal.company_name}</p>
                        <p className="text-xs text-muted-foreground">{deal.sector || 'N/A'}</p>
                      </div>
                      <Badge variant={deal.fit_score === 'high' ? 'default' : 'secondary'}>
                        {deal.fit_score || 'N/A'} fit
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline" className="text-xs">{deal.stage}</Badge>
                      {deal.revenue && <span className="text-xs text-muted-foreground">${deal.revenue}M Rev</span>}
                      {deal.asking_multiple && <span className="text-xs text-muted-foreground">{deal.asking_multiple.toFixed(1)}x ask</span>}
                    </div>
                  </div>
                ))}
                {!loadingPipeline && (!pipeline || pipeline.length === 0) && (
                  <p className="text-muted-foreground text-center py-8">No pipeline data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PE Landscape Tab */}
        <TabsContent value="landscape" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Global PE AUM', value: '$8.2T', change: '+12%' },
              { label: 'Dry Powder', value: '$2.6T', change: '+8%' },
              { label: 'Avg Deal Size', value: '$485M', change: '+15%' },
              { label: 'Avg Hold Period', value: '5.2 yrs', change: '+0.3' },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-success">{stat.change} YoY</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fundraising by Strategy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2024 Fundraising by Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fundraisingData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis dataKey="strategy" type="category" tick={{ fill: "hsl(var(--muted-foreground))" }} width={80} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        formatter={(value: number) => [`$${value}B`, 'Raised']}
                      />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Fund Closes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Recent Fund Closes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingFunds ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : funds?.filter(f => f.status === 'closed').slice(0, 5).map((fund) => (
                  <div key={fund.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="font-medium text-sm">{fund.fund_name}</p>
                      <p className="text-xs text-muted-foreground">{fund.manager_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency((fund.current_size || 0) * 1e6)}</p>
                      <Badge variant="outline" className="text-xs">{fund.fund_type}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Returns by Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">10-Year Returns by Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={strategyReturns}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="strategy" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="irr" name="IRR %" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="tvpi" name="TVPI" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strategies Tab */}
        <TabsContent value="strategies" className="mt-6 space-y-6">
          <div className="flex gap-2 mb-4">
            {['lbo', 'growth', 'credit'].map((strat) => (
              <Button
                key={strat}
                variant={selectedStrategy === strat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStrategy(strat)}
              >
                {strat.toUpperCase()}
              </Button>
            ))}
          </div>

          {selectedStrategy === 'lbo' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">LBO Strategy Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Target IRR', value: '20-25%' },
                      { label: 'Hold Period', value: '4-6 years' },
                      { label: 'Leverage', value: '4-6x EBITDA' },
                      { label: 'Equity Check', value: '$50-500M' },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-lg font-bold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Value Creation Levers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { lever: 'Revenue Growth', contribution: 35 },
                    { lever: 'Margin Expansion', contribution: 25 },
                    { lever: 'Multiple Expansion', contribution: 20 },
                    { lever: 'Deleveraging', contribution: 20 },
                  ].map((item) => (
                    <div key={item.lever}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.lever}</span>
                        <span>{item.contribution}%</span>
                      </div>
                      <Progress value={item.contribution} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {selectedStrategy === 'growth' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Growth Equity Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Target IRR', value: '25-30%' },
                    { label: 'Revenue Growth', value: '>30% CAGR' },
                    { label: 'Ownership', value: '15-40%' },
                    { label: 'Check Size', value: '$25-200M' },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-secondary/30">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedStrategy === 'credit' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Credit Strategy Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Target Yield', value: '10-14%' },
                    { label: 'Duration', value: '3-5 years' },
                    { label: 'LTV', value: '<65%' },
                    { label: 'Coverage', value: '>1.5x' },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-secondary/30">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Funds Tab */}
        <TabsContent value="funds" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recently Closed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Recently Closed Funds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingFunds ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : funds?.filter(f => f.status === 'closed').map((fund) => (
                  <div key={fund.id} className="p-3 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{fund.fund_name}</p>
                        <p className="text-xs text-muted-foreground">{fund.manager_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency((fund.current_size || 0) * 1e6)}</p>
                        <Badge variant="outline" className="text-xs">{fund.fund_type}</Badge>
                      </div>
                    </div>
                    {fund.prior_fund_irr && (
                      <div className="flex gap-4 mt-2 text-xs">
                        <span>Prior IRR: {fund.prior_fund_irr}%</span>
                        {fund.prior_fund_moic && <span>Prior MOIC: {fund.prior_fund_moic}x</span>}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* In Market */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Funds in Market
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingFunds ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))
                ) : funds?.filter(f => f.status === 'fundraising').map((fund) => (
                  <div key={fund.id} className="p-3 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{fund.fund_name}</p>
                        <p className="text-xs text-muted-foreground">{fund.fund_type}</p>
                      </div>
                      <Badge variant="secondary">Raising</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{formatCurrency((fund.current_size || 0) * 1e6)} raised</span>
                        <span>Target: {formatCurrency((fund.target_size || 0) * 1e6)}</span>
                      </div>
                      <Progress value={fund.target_size ? ((fund.current_size || 0) / fund.target_size) * 100 : 0} className="h-2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* LP/GP Tab */}
        <TabsContent value="lpgp" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LP Sentiment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  LP Sentiment Survey
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={lpSentimentData}
                        dataKey="value"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ category, value }) => `${category}: ${value}%`}
                      >
                        {lpSentimentData.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* What LPs Want */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What LPs Want</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { item: 'Track record transparency', priority: 95 },
                  { item: 'ESG integration', priority: 82 },
                  { item: 'Co-investment opportunities', priority: 78 },
                  { item: 'Lower fees for larger commitments', priority: 75 },
                  { item: 'Better alignment of interests', priority: 72 },
                ].map((item) => (
                  <div key={item.item}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.item}</span>
                      <span className="text-muted-foreground">{item.priority}%</span>
                    </div>
                    <Progress value={item.priority} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Fee Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fee & Terms Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Avg Mgmt Fee', value: '1.75%', trend: 'down' },
                  { label: 'Avg Carry', value: '20%', trend: 'stable' },
                  { label: 'Hurdle Rate', value: '8%', trend: 'stable' },
                  { label: 'GP Commit', value: '3-5%', trend: 'up' },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-xl font-bold">{item.value}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {item.trend === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                      {item.trend === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                      {item.trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-muted-foreground">{item.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Research Tab */}
        <TabsContent value="research" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Research Assistant */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Research Assistant
                </CardTitle>
                <CardDescription>Ask questions about market data, trends, and opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Ask about market trends, comparable deals, industry analysis..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <Button>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Ask AI
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-dashed border-border">
                    <p className="text-sm text-muted-foreground text-center">
                      AI research results will appear here. Try asking about industry multiples, 
                      comparable transactions, or market trends.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: 'Preqin PE Report', url: '#' },
                  { label: 'Pitchbook Market Data', url: '#' },
                  { label: 'Bain Global PE Report', url: '#' },
                  { label: 'McKinsey PE Review', url: '#' },
                  { label: 'Cambridge Associates', url: '#' },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors group"
                  >
                    <span className="text-sm">{link.label}</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Saved Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Saved Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'Q4 2024 Market Overview', date: 'Dec 15, 2024', type: 'Market Analysis' },
                  { title: 'Healthcare Sector Deep Dive', date: 'Dec 10, 2024', type: 'Sector Analysis' },
                  { title: 'LP Commitment Analysis', date: 'Dec 5, 2024', type: 'LP Research' },
                ].map((report) => (
                  <div key={report.title} className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                    <FileText className="h-8 w-8 text-primary mb-2" />
                    <p className="font-medium text-sm">{report.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{report.type}</Badge>
                      <span className="text-xs text-muted-foreground">{report.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
