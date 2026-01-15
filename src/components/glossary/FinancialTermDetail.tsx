/**
 * Financial Term Detail Component
 * 
 * An enhanced, Market Intel-style sheet for financial terms with:
 * - Overview (definition, key points, quick facts)
 * - Charts (historical data, interactive visualizations)
 * - Studies (statistical analysis, scenarios)
 * - Compare (side-by-side with related concepts)
 * - Resources (articles, videos, external links)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Play,
  ArrowRight,
  DollarSign,
  Clock,
  Target,
  Shield,
  LineChart as LineChartIcon,
  Activity,
  Scale,
  Info,
  Globe,
  Building2,
  Gem,
  Home,
  Banknote,
  PieChart,
  RefreshCw,
  Calendar,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Sparkles,
  GitCompare,
  FileText,
  Video,
  FlaskConical,
  Zap,
  Calculator,
  Shuffle,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FINANCIAL_TERMS, TermDefinition, TermItem, TermCategory } from './FinancialGlossaryProvider';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FinancialTermDetailProps {
  term: TermItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTermChange?: (term: TermItem) => void;
}

// Time period options
const TIME_PERIODS = [
  { value: '1M', label: '1M', days: 30 },
  { value: '3M', label: '3M', days: 90 },
  { value: '6M', label: '6M', days: 180 },
  { value: '1Y', label: '1Y', days: 365 },
  { value: '5Y', label: '5Y', days: 1825 },
  { value: '10Y', label: '10Y', days: 3650 },
  { value: 'MAX', label: 'MAX', days: 36500 },
];

// Available studies for different term types
const STUDY_TYPES = {
  'historical_returns': { name: 'Historical Returns', icon: TrendingUp, description: 'Annual and rolling return analysis' },
  'rolling_returns': { name: 'Rolling Returns', icon: RefreshCw, description: '1, 3, 5, 10 year rolling periods' },
  'decade_comparison': { name: 'Decade Comparison', icon: Calendar, description: 'Performance by decade' },
  'volatility_regime': { name: 'Volatility Regimes', icon: Activity, description: 'High/low volatility periods' },
  'correlation_analysis': { name: 'Correlation Analysis', icon: GitCompare, description: 'Relationship with other assets' },
  'drawdown_analysis': { name: 'Drawdown Analysis', icon: TrendingDown, description: 'Historical declines and recovery' },
  'seasonality': { name: 'Seasonality', icon: Calendar, description: 'Monthly and quarterly patterns' },
  'scenario_analysis': { name: 'Scenario Analysis', icon: FlaskConical, description: 'What-if scenarios' },
  'valuation_history': { name: 'Valuation History', icon: Scale, description: 'Historical P/E, yields, etc.' },
  'factor_exposure': { name: 'Factor Exposure', icon: PieChart, description: 'Factor attribution analysis' },
};

// Icon mapping for dynamic icon rendering
const ICON_MAP: Record<string, any> = {
  TrendingUp, TrendingDown, Activity, Scale, Shield, Clock, Globe, Building2,
  Gem, Home, Banknote, PieChart, RefreshCw, Calendar, Target, Calculator,
  Shuffle, Wallet, AlertTriangle, Sparkles, GitCompare, Zap, BookOpen,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const getCategoryColor = (category: TermCategory): string => {
  const colors: Record<TermCategory, string> = {
    metric: '#3b82f6',
    allocation: '#8b5cf6',
    risk: '#ef4444',
    strategy: '#10b981',
    indicator: '#f59e0b',
    instrument: '#06b6d4',
    fundamental: '#f97316',
    technical: '#ec4899',
    macro: '#6366f1',
    behavioral: '#14b8a6',
    general: '#6b7280',
  };
  return colors[category] || '#6b7280';
};

const getCategoryIcon = (category: TermCategory) => {
  const icons: Record<TermCategory, any> = {
    metric: BarChart3,
    allocation: PieChart,
    risk: Shield,
    strategy: Target,
    indicator: Activity,
    instrument: Banknote,
    fundamental: Calculator,
    technical: LineChartIcon,
    macro: Globe,
    behavioral: Sparkles,
    general: BookOpen,
  };
  return icons[category] || BookOpen;
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Generate distribution data for histogram
// ═══════════════════════════════════════════════════════════════════════════════

function generateDistributionData(data: any[]): { range: string; count: number }[] {
  if (data.length < 2) return [];
  
  // Calculate returns
  const returns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const ret = ((data[i].value - data[i-1].value) / data[i-1].value) * 100;
    returns.push(ret);
  }
  
  // Create histogram buckets
  const buckets = [
    { range: '<-10%', min: -Infinity, max: -10, count: 0 },
    { range: '-10 to -5%', min: -10, max: -5, count: 0 },
    { range: '-5 to 0%', min: -5, max: 0, count: 0 },
    { range: '0 to 5%', min: 0, max: 5, count: 0 },
    { range: '5 to 10%', min: 5, max: 10, count: 0 },
    { range: '>10%', min: 10, max: Infinity, count: 0 },
  ];
  
  returns.forEach(ret => {
    for (const bucket of buckets) {
      if (ret >= bucket.min && ret < bucket.max) {
        bucket.count++;
        break;
      }
    }
  });
  
  return buckets.map(b => ({ range: b.range, count: b.count }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function FinancialTermDetail({ 
  term, 
  open, 
  onOpenChange,
  onTermChange,
}: FinancialTermDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timePeriod, setTimePeriod] = useState('5Y');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [runningStudy, setRunningStudy] = useState<string | null>(null);
  const [studyResults, setStudyResults] = useState<Record<string, any>>({});

  // Get the full term definition
  const termDef = useMemo(() => {
    if (!term) return null;
    return FINANCIAL_TERMS[term.id] || null;
  }, [term]);

  // Check if term has chart data
  const hasChart = termDef?.ticker ? true : false;

  // Fetch historical data
  const fetchHistoricalData = useCallback(async () => {
    if (!termDef?.ticker) return;

    setIsLoadingHistory(true);
    try {
      const periodMap: Record<string, string> = {
        '1M': '1m', '3M': '3m', '6M': '6m',
        '1Y': '1y', '5Y': '5y', '10Y': '10y', 'MAX': '30y',
      };

      const { data, error } = await supabase.functions.invoke('fetch-economic-history', {
        body: {
          seriesId: termDef.ticker,
          period: periodMap[timePeriod] || '5y',
        },
      });

      if (error) throw error;

      if (data?.success && data.data?.length > 0) {
        setHistoricalData(data.data);
      } else {
        setHistoricalData([]);
      }
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setHistoricalData([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [termDef, timePeriod]);

  // Run a study
  const runStudy = useCallback(async (studyId: string) => {
    if (!termDef?.ticker) return;

    setRunningStudy(studyId);
    try {
      const { data, error } = await supabase.functions.invoke('run-asset-study', {
        body: {
          ticker: termDef.ticker,
          studyType: studyId,
          params: { period: timePeriod },
        },
      });

      if (error) throw error;

      setStudyResults(prev => ({ ...prev, [studyId]: data }));
      toast.success(`${STUDY_TYPES[studyId as keyof typeof STUDY_TYPES]?.name || studyId} completed`);
    } catch (err) {
      console.error('Study error:', err);
      toast.error('Failed to run study');
    } finally {
      setRunningStudy(null);
    }
  }, [termDef, timePeriod]);

  // Fetch data on open
  useEffect(() => {
    if (open && termDef && hasChart) {
      fetchHistoricalData();
      setStudyResults({});
    }
  }, [open, termDef?.id, timePeriod]);

  // Reset tab on term change
  useEffect(() => {
    if (open) {
      setActiveTab('overview');
    }
  }, [term?.id, open]);

  // Handle clicking related term
  const handleRelatedClick = (relatedTerm: string) => {
    const found = FINANCIAL_TERMS[relatedTerm.toLowerCase().replace(/\s+/g, '-')];
    if (found && onTermChange) {
      onTermChange({
        id: found.id,
        name: found.name,
        category: found.category,
        color: found.color,
      });
    }
  };

  if (!term || !termDef) return null;

  const color = termDef.color || getCategoryColor(termDef.category);
  const IconComponent = ICON_MAP[termDef.icon] || getCategoryIcon(termDef.category);

  // Calculate chart stats
  const chartStats = historicalData.length > 0 ? {
    current: historicalData[historicalData.length - 1]?.value,
    start: historicalData[0]?.value,
    min: Math.min(...historicalData.map(d => d.value)),
    max: Math.max(...historicalData.map(d => d.value)),
    avg: historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length,
    change: ((historicalData[historicalData.length - 1]?.value - historicalData[0]?.value) / historicalData[0]?.value * 100),
  } : null;

  // Get available studies for this term
  const availableStudies = (termDef.availableStudies || [])
    .map(id => ({ id, ...STUDY_TYPES[id as keyof typeof STUDY_TYPES] }))
    .filter(s => s.name);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl lg:max-w-3xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="pb-4 border-b shrink-0">
          <div className="flex items-start gap-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
              style={{ backgroundColor: `${color}20`, border: `2px solid ${color}40` }}
            >
              <IconComponent className="h-7 w-7" style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-2xl mb-1 flex items-center gap-2">
                {termDef.name}
                {term.value && (
                  <span className="text-lg font-normal" style={{ color }}>
                    {term.value}
                  </span>
                )}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <Badge 
                  variant="outline" 
                  className="capitalize"
                  style={{ borderColor: `${color}50`, color }}
                >
                  {termDef.category}
                </Badge>
                <span className="text-muted-foreground text-sm">
                  {termDef.shortDescription}
                </span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-5 shrink-0 mt-4 mb-2">
            <TabsTrigger value="overview" className="gap-1 text-xs px-2">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="gap-1 text-xs px-2" disabled={!hasChart}>
              <LineChartIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Charts</span>
            </TabsTrigger>
            <TabsTrigger value="studies" className="gap-1 text-xs px-2" disabled={availableStudies.length === 0}>
              <FlaskConical className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Studies</span>
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-1 text-xs px-2">
              <GitCompare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Compare</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-1 text-xs px-2">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Learn</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* ══════════════════════════════════════════════════════════════════
                OVERVIEW TAB
            ══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="overview" className="space-y-4 pr-4 mt-0">
              {/* Quick Stats Row */}
              {termDef.benchmarks && termDef.benchmarks.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {termDef.benchmarks.slice(0, 4).map((b, i) => (
                    <Card key={i} className="p-3">
                      <div className="text-lg font-bold" style={{ color }}>{b.value}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{b.name}</div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Definition */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="h-4 w-4" style={{ color }} />
                    Definition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {termDef.fullDescription}
                  </p>
                </CardContent>
              </Card>

              {/* Key Points */}
              {termDef.keyPoints && termDef.keyPoints.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                      Key Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {termDef.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color }} />
                          <span className="text-muted-foreground">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Why It Matters + How To Use */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base text-blue-400">
                      <Target className="h-4 w-4" />
                      Why It Matters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{termDef.whyItMatters}</p>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base text-emerald-400">
                      <Zap className="h-4 w-4" />
                      How To Use
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{termDef.howToUse}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Ranges */}
              {termDef.ranges && termDef.ranges.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4" style={{ color }} />
                      Typical Ranges
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {termDef.ranges.map((range, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: range.color || color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{range.label}</span>
                            <span className="text-xs text-muted-foreground">({range.range})</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{range.meaning}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Common Mistakes + Pro Tips */}
              {(termDef.commonMistakes || termDef.proTips) && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {termDef.commonMistakes && (
                    <Card className="bg-rose-500/5 border-rose-500/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base text-rose-400">
                          <XCircle className="h-4 w-4" />
                          Common Mistakes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {termDef.commonMistakes.map((mistake, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-rose-400 shrink-0">✗</span>
                              <span className="text-muted-foreground">{mistake}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {termDef.proTips && (
                    <Card className="bg-amber-500/5 border-amber-500/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base text-amber-400">
                          <Sparkles className="h-4 w-4" />
                          Pro Tips
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {termDef.proTips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-amber-400 shrink-0">★</span>
                              <span className="text-muted-foreground">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Formula */}
              {termDef.formula && (
                <Card className="bg-violet-500/5 border-violet-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base text-violet-400">
                      <Calculator className="h-4 w-4" />
                      Formula
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <code className="text-lg font-mono text-violet-300 bg-violet-500/10 px-3 py-2 rounded-lg block">
                      {termDef.formula}
                    </code>
                    {termDef.unit && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Unit: <span className="font-medium">{termDef.unit}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Related Terms */}
              {termDef.relatedTerms && termDef.relatedTerms.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ArrowRight className="h-4 w-4" style={{ color }} />
                      Related Concepts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {termDef.relatedTerms.map((related, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-secondary/80 transition-colors"
                          onClick={() => handleRelatedClick(related)}
                        >
                          {related.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════════════
                CHARTS TAB
            ══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="charts" className="space-y-4 pr-4 mt-0">
              {/* Time Period Selector */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {termDef.ticker} Historical Data
                </div>
                <div className="flex gap-1">
                  {TIME_PERIODS.map(p => (
                    <Button
                      key={p.value}
                      variant={timePeriod === p.value ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setTimePeriod(p.value)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Main Chart */}
              <Card className="p-4">
                {isLoadingHistory ? (
                  <div className="h-72 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : historicalData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalData}>
                        <defs>
                          <linearGradient id={`gradient-${term.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
                          }}
                        />
                        <YAxis 
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.9)', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                          }}
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value: number) => [value.toFixed(2), termDef.name]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke={color} 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill={`url(#gradient-${term.id})`}
                        />
                        {chartStats && (
                          <ReferenceLine 
                            y={chartStats.avg} 
                            stroke="rgba(255,255,255,0.3)" 
                            strokeDasharray="5 5"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-72 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No historical data available</p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Stats Grid */}
              {chartStats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Current</div>
                    <div className="text-lg font-bold">{chartStats.current?.toFixed(2)}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Change</div>
                    <div className={cn(
                      "text-lg font-bold",
                      chartStats.change >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {chartStats.change >= 0 ? '+' : ''}{chartStats.change.toFixed(1)}%
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">High</div>
                    <div className="text-lg font-bold text-emerald-400">{chartStats.max?.toFixed(2)}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Low</div>
                    <div className="text-lg font-bold text-rose-400">{chartStats.min?.toFixed(2)}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">Average</div>
                    <div className="text-lg font-bold">{chartStats.avg?.toFixed(2)}</div>
                  </Card>
                </div>
              )}

              {/* Distribution Chart */}
              {historicalData.length > 0 && (
                <Card className="p-4">
                  <CardHeader className="px-0 pt-0 pb-3">
                    <CardTitle className="text-base">Return Distribution</CardTitle>
                    <CardDescription>Monthly returns histogram</CardDescription>
                  </CardHeader>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={generateDistributionData(historicalData)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.9)', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════════════
                STUDIES TAB
            ══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="studies" className="space-y-4 pr-4 mt-0">
              <p className="text-sm text-muted-foreground">
                Run quantitative studies on {termDef.name} to gain deeper insights.
              </p>

              {/* Available Studies */}
              <div className="grid sm:grid-cols-2 gap-3">
                {availableStudies.map((study) => {
                  const isRunning = runningStudy === study.id;
                  const hasResult = !!studyResults[study.id];
                  const StudyIcon = study.icon;

                  return (
                    <Card 
                      key={study.id}
                      className={cn(
                        "p-4 cursor-pointer transition-all hover:border-primary/50",
                        hasResult && "border-emerald-500/50 bg-emerald-500/5"
                      )}
                      onClick={() => !isRunning && runStudy(study.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          {isRunning ? (
                            <Loader2 className="h-5 w-5 animate-spin" style={{ color }} />
                          ) : (
                            <StudyIcon className="h-5 w-5" style={{ color }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {study.name}
                            {hasResult && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {study.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Study Results */}
              {Object.keys(studyResults).length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Study Results</h3>
                  {Object.entries(studyResults).map(([studyId, result]) => (
                    <Card key={studyId} className="p-4">
                      <CardTitle className="text-sm mb-3">
                        {STUDY_TYPES[studyId as keyof typeof STUDY_TYPES]?.name || studyId}
                      </CardTitle>
                      <pre className="text-xs bg-secondary/50 p-3 rounded-lg overflow-auto max-h-48">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════════════
                COMPARE TAB
            ══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="compare" className="space-y-4 pr-4 mt-0">
              <p className="text-sm text-muted-foreground">
                Compare {termDef.name} with related concepts to understand the differences.
              </p>

              {/* Related Terms Comparison */}
              {termDef.relatedTerms && termDef.relatedTerms.length > 0 && (
                <div className="space-y-3">
                  {termDef.relatedTerms.slice(0, 5).map(relatedId => {
                    const related = FINANCIAL_TERMS[relatedId];
                    if (!related) return null;

                    return (
                      <Card 
                        key={relatedId} 
                        className="p-4 cursor-pointer hover:border-primary/50 transition-all"
                        onClick={() => handleRelatedClick(relatedId)}
                      >
                        <div className="flex items-start gap-4">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${related.color}20` }}
                          >
                            {(() => {
                              const RelIcon = ICON_MAP[related.icon] || BookOpen;
                              return <RelIcon className="h-5 w-5" style={{ color: related.color }} />;
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{related.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {related.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {related.shortDescription}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Radar Comparison Chart */}
              {termDef.benchmarks && termDef.benchmarks.length >= 3 && (
                <Card className="p-4">
                  <CardTitle className="text-base mb-4">Benchmark Comparison</CardTitle>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={termDef.benchmarks.map(b => ({
                        name: b.name,
                        value: parseFloat(b.value.replace(/[^0-9.-]/g, '')) || 0,
                      }))}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis 
                          dataKey="name" 
                          tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }}
                        />
                        <PolarRadiusAxis 
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }}
                        />
                        <Radar 
                          name={termDef.name} 
                          dataKey="value" 
                          stroke={color} 
                          fill={color} 
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════════════
                RESOURCES TAB
            ══════════════════════════════════════════════════════════════════ */}
            <TabsContent value="resources" className="space-y-4 pr-4 mt-0">
              {/* All Benchmarks */}
              {termDef.benchmarks && termDef.benchmarks.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4" style={{ color }} />
                      Reference Benchmarks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {termDef.benchmarks.map((benchmark, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div>
                          <p className="font-medium text-sm">{benchmark.name}</p>
                          <p className="text-xs text-muted-foreground">{benchmark.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold" style={{ color }}>{benchmark.value}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Video Placeholder */}
              <Card className="border-dashed border-2">
                <CardContent className="py-8 text-center">
                  <Video className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground font-medium">Educational Video Coming Soon</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    We're creating video content to help you understand {termDef.name.toLowerCase()}.
                  </p>
                </CardContent>
              </Card>

              {/* External Resources */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ExternalLink className="h-4 w-4" style={{ color }} />
                    Learn More
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={`https://www.investopedia.com/terms/${termDef.name.charAt(0).toLowerCase()}/${termDef.name.toLowerCase().replace(/\s+/g, '-')}.asp`} target="_blank" rel="noopener noreferrer">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Investopedia: {termDef.name}
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(termDef.name + ' investing')}`} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Search Google
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Aliases */}
              {termDef.aliases && termDef.aliases.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Info className="h-4 w-4" style={{ color }} />
                      Also Known As
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {termDef.aliases.map((alias, i) => (
                        <Badge key={i} variant="secondary" className="capitalize">
                          {alias}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default FinancialTermDetail;
