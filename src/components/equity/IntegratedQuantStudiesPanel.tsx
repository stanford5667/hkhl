import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, TrendingUp, TrendingDown, Calendar, Activity, Target, Loader2,
  Play, BookOpen, AlertCircle, Zap, ArrowUpDown, LineChart, Volume2, Gauge,
  Layers, Mountain, Crosshair, ArrowLeftRight, FlaskConical, Settings2,
  ChevronDown, Save, Sparkles, Eye, EyeOff, Info, HelpCircle, Lightbulb,
  GraduationCap, Award, ChevronRight, BarChart2, PieChart, TrendingUp as Trend
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, PieChart as RechartsPie, Pie, Legend, LineChart as RechartsLine,
  Line, Area, AreaChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ComposedChart, Scatter
} from 'recharts';
import { StudiesValidationPanel } from '@/components/dev/StudiesValidationPanel';

// Import enhanced components
import {
  BulletChart, WaterfallChart, LollipopChart, RadialProgress, ComparisonMatrix,
  TrendIndicator, PercentileBar, SparklineArea, CalendarHeatmap, DonutWithCenter,
  StatCardWithChart, ScoreBreakdown, TimelineChart
} from '@/components/quant-lab/AdditionalVisualizations';

// Helper to safely extract a numeric value from properties that may be objects or numbers
function safeNumber(value: unknown, property: string = 'current'): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && property in value) {
    const extracted = (value as Record<string, unknown>)[property];
    return typeof extracted === 'number' ? extracted : null;
  }
  return null;
}

interface IntegratedQuantStudiesPanelProps {
  ticker: string;
  companyName: string;
}

// Parameter definitions for each study type
const STUDY_PARAMS: Record<string, { label: string; key: string; type: 'number' | 'slider'; min: number; max: number; step: number; default: number; description?: string }[]> = {
  rsi_analysis: [
    { label: 'RSI Period', key: 'period', type: 'slider', min: 5, max: 30, step: 1, default: 14, description: 'Number of days for RSI calculation' },
    { label: 'Overbought Level', key: 'overbought', type: 'slider', min: 60, max: 90, step: 5, default: 70 },
    { label: 'Oversold Level', key: 'oversold', type: 'slider', min: 10, max: 40, step: 5, default: 30 },
    { label: 'Forward Days', key: 'forwardDays', type: 'slider', min: 1, max: 20, step: 1, default: 5, description: 'Days to measure return after signal' },
  ],
  moving_average_analysis: [
    { label: 'Short MA', key: 'shortPeriod', type: 'slider', min: 5, max: 50, step: 5, default: 20 },
    { label: 'Medium MA', key: 'mediumPeriod', type: 'slider', min: 20, max: 100, step: 10, default: 50 },
    { label: 'Long MA', key: 'longPeriod', type: 'slider', min: 100, max: 300, step: 50, default: 200 },
  ],
  volume_analysis: [
    { label: 'Avg Period', key: 'avgPeriod', type: 'slider', min: 5, max: 50, step: 5, default: 20, description: 'Days for volume average' },
    { label: 'High Vol Threshold', key: 'highVolThreshold', type: 'slider', min: 1.0, max: 3.0, step: 0.25, default: 1.5, description: 'Multiplier for high volume detection' },
  ],
  mean_reversion: [
    { label: 'Std Dev Threshold', key: 'stdDevThreshold', type: 'slider', min: 1, max: 4, step: 0.5, default: 2, description: 'Standard deviations for extreme move' },
  ],
  high_low_analysis: [
    { label: 'Lookback Period', key: 'lookbackPeriod', type: 'slider', min: 5, max: 60, step: 5, default: 20, description: 'Days to check for new highs/lows' },
    { label: 'Forward Days', key: 'forwardDays', type: 'slider', min: 1, max: 20, step: 1, default: 5 },
  ],
  trend_strength: [
    { label: 'Short MA', key: 'shortMa', type: 'slider', min: 5, max: 50, step: 5, default: 20 },
    { label: 'Medium MA', key: 'mediumMa', type: 'slider', min: 20, max: 100, step: 10, default: 50 },
    { label: 'Long MA', key: 'longMa', type: 'slider', min: 100, max: 300, step: 50, default: 200 },
    { label: 'Recent Days', key: 'recentDays', type: 'slider', min: 5, max: 60, step: 5, default: 20, description: 'Days for higher highs/lows analysis' },
  ],
  close_to_open_analysis: [
    { label: 'Doji Threshold', key: 'dojiThreshold', type: 'slider', min: 0.05, max: 0.25, step: 0.05, default: 0.1, description: 'Body % of range to consider a doji' },
    { label: 'Strong Move Threshold', key: 'strongMoveThreshold', type: 'slider', min: 0.5, max: 3, step: 0.25, default: 1.5, description: '% move to consider strong' },
    { label: 'Forward Days', key: 'forwardDays', type: 'slider', min: 1, max: 10, step: 1, default: 1, description: 'Days to measure follow-through' },
  ],
};

const STUDY_CATEGORIES = {
  basic: {
    name: 'Basic Statistics',
    icon: BarChart3,
    studies: [
      { id: 'daily_close_gt_open', name: 'Close > Open', icon: TrendingUp, description: '% of days where close > open' },
      { id: 'daily_close_gt_prior', name: 'Close > Prior', icon: Target, description: '% of days where close > prior close' },
      { id: 'daily_return_distribution', name: 'Return Distribution', icon: BarChart3, description: 'Mean, std dev, percentiles, histogram' },
      { id: 'up_down_streaks', name: 'Win/Loss Streaks', icon: Activity, description: 'Max and avg winning/losing streaks' },
    ]
  },
  seasonality: {
    name: 'Seasonality',
    icon: Calendar,
    studies: [
      { id: 'day_of_week_returns', name: 'Day of Week', icon: Calendar, description: 'Which weekdays perform best' },
      { id: 'month_of_year_returns', name: 'Monthly Seasonality', icon: Calendar, description: 'Which months perform best' },
    ]
  },
  technical: {
    name: 'Technical Analysis',
    icon: LineChart,
    studies: [
      { id: 'moving_average_analysis', name: 'Moving Averages', icon: LineChart, description: 'SMA/EMA analysis, golden/death crosses' },
      { id: 'rsi_analysis', name: 'RSI Analysis', icon: Gauge, description: 'RSI distribution, overbought/oversold' },
      { id: 'trend_strength', name: 'Trend Strength', icon: TrendingUp, description: 'Multi-factor trend scoring' },
    ]
  },
  volatility: {
    name: 'Volatility & Risk',
    icon: Zap,
    studies: [
      { id: 'volatility_analysis', name: 'Volatility Analysis', icon: Zap, description: 'ATR, daily range, vol clustering' },
      { id: 'drawdown_analysis', name: 'Drawdown Analysis', icon: TrendingDown, description: 'Max drawdown, recovery times' },
      { id: 'mean_reversion', name: 'Mean Reversion', icon: ArrowLeftRight, description: 'Autocorrelation, reversal rates' },
    ]
  },
  patterns: {
    name: 'Price Patterns',
    icon: Layers,
    studies: [
      { id: 'gap_analysis', name: 'Gap Analysis', icon: ArrowUpDown, description: 'Gap fill rates, continuation' },
      { id: 'range_analysis', name: 'Range Analysis', icon: Layers, description: 'Inside/outside days, doji rate' },
      { id: 'high_low_analysis', name: 'New Highs/Lows', icon: Mountain, description: '20-day high/low breakouts' },
      { id: 'close_to_open_analysis', name: 'Close vs Open', icon: Activity, description: 'Where price closes relative to open and daily range' },
    ]
  },
  volume: {
    name: 'Volume Analysis',
    icon: Volume2,
    studies: [
      { id: 'volume_analysis', name: 'Volume Profile', icon: Volume2, description: 'Volume trends, accumulation/distribution' },
    ]
  },
  forecasting: {
    name: 'Projections',
    icon: Crosshair,
    studies: [
      { id: 'price_targets', name: 'Price Targets', icon: Crosshair, description: 'Statistical price projections' },
    ]
  }
};

const PERIODS = [
  { value: '1y', label: '1 Year', years: 1 },
  { value: '3y', label: '3 Years', years: 3 },
  { value: '5y', label: '5 Years', years: 5 },
  { value: '10y', label: '10 Years', years: 10 },
];

const MATH_EXPLANATIONS: Record<string, { formula: string; explanation: string; insights?: string[] }> = {
  daily_close_gt_open: {
    formula: 'Percentage = (Days where Close > Open) / Total Days × 100',
    explanation: 'Measures intraday directional bias. A value above 50% suggests the asset tends to gain during trading hours.',
    insights: ['Values > 55% indicate strong bullish intraday bias', 'Useful for timing day trades']
  },
  daily_close_gt_prior: {
    formula: 'Percentage = (Days where Closeₜ > Closeₜ₋₁) / Total Days × 100',
    explanation: 'Measures the frequency of positive daily returns. A value significantly above 50% indicates bullish momentum.',
    insights: ['Compare to market average (~53%)', 'Higher values suggest momentum']
  },
  daily_return_distribution: {
    formula: 'Return = (Closeₜ - Closeₜ₋₁) / Closeₜ₋₁ × 100\nMean = Σ(Returns) / n\nStdDev = √(Σ(Return - Mean)² / n)',
    explanation: 'The distribution shows how returns are spread. Skewness measures asymmetry; kurtosis measures tail risk.',
    insights: ['Negative skew = larger down days', 'High kurtosis = fat tails (more extreme moves)']
  },
  up_down_streaks: {
    formula: 'Streak = consecutive days in same direction\nMax Streak = max(all streaks)\nAvg Streak = Σ(streak lengths) / count',
    explanation: 'Reveals momentum patterns. Long winning streaks may indicate trend persistence.',
    insights: ['Long max streaks suggest strong trending', 'Short avg streaks may indicate choppiness']
  },
  day_of_week_returns: {
    formula: 'Avg Return(day) = Σ(returns on day) / count\nHit Rate = Positive days / Total days × 100',
    explanation: 'Some assets exhibit day-of-week effects. Fridays often show positive bias due to position unwinding.',
    insights: ['Monday effect well-documented in research', 'Friday bias may be strongest']
  },
  month_of_year_returns: {
    formula: 'Monthly Return = (Close_end - Close_start) / Close_start × 100',
    explanation: 'Seasonality patterns like "Sell in May" and "Santa Rally" are well-known.',
    insights: ['January effect often strongest', 'September historically weakest']
  },
  rsi_analysis: {
    formula: 'RS = Avg Gain / Avg Loss\nRSI = 100 - (100 / (1 + RS))',
    explanation: 'RSI > 70 is overbought; RSI < 30 is oversold. This shows how often those conditions occur and what follows.',
    insights: ['Mean reversion often works at extremes', 'Trend following works in between']
  },
  trend_strength: {
    formula: 'Score = Points above SMA20 + SMA50 + SMA200 + (SMA20 > SMA50) + (SMA50 > SMA200)',
    explanation: 'Multi-factor trend scoring combines price position and moving average alignment.',
    insights: ['Score 5+ = strong uptrend', 'Score 0-1 = strong downtrend']
  },
};

// Color palette
const COLORS = {
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  slate: '#64748b',
};

export function IntegratedQuantStudiesPanel({ ticker, companyName }: IntegratedQuantStudiesPanelProps) {
  const { user } = useAuth();
  const [selectedStudy, setSelectedStudy] = useState<string | null>(null);
  const [period, setPeriod] = useState('3y');
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [barsAnalyzed, setBarsAnalyzed] = useState(0);
  const [usedMockData, setUsedMockData] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState('basic');
  const [showParams, setShowParams] = useState(false);
  const [studyParams, setStudyParams] = useState<Record<string, Record<string, number>>>({});
  
  // Enhanced mode state
  const [viewMode, setViewMode] = useState<'basic' | 'enhanced'>('enhanced');
  const [showInsights, setShowInsights] = useState(true);
  const [showEducation, setShowEducation] = useState(true);

  // Get current params for selected study
  const currentParams = selectedStudy ? (studyParams[selectedStudy] || {}) : {};
  const paramDefs = selectedStudy ? (STUDY_PARAMS[selectedStudy] || []) : [];

  // Update a parameter value
  const updateParam = (key: string, value: number) => {
    if (!selectedStudy) return;
    setStudyParams(prev => ({
      ...prev,
      [selectedStudy]: { ...(prev[selectedStudy] || {}), [key]: value }
    }));
  };

  // Reset params to defaults
  const resetParams = () => {
    if (!selectedStudy || !STUDY_PARAMS[selectedStudy]) return;
    const defaults: Record<string, number> = {};
    STUDY_PARAMS[selectedStudy].forEach(p => { defaults[p.key] = p.default; });
    setStudyParams(prev => ({ ...prev, [selectedStudy]: defaults }));
  };

  const runStudy = async () => {
    if (!selectedStudy) {
      toast.error('Please select a study type');
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      const years = PERIODS.find(p => p.value === period)?.years || 3;
      startDate.setFullYear(startDate.getFullYear() - years);

      const { data, error } = await supabase.functions.invoke('run-asset-study', {
        body: {
          ticker,
          studyType: selectedStudy,
          startDate: startDate.toISOString().split('T')[0],
          endDate,
          params: currentParams
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setResult(data.result);
      setBarsAnalyzed(data.barsAnalyzed);
      setUsedMockData(data.useMockData);
      setDateRange(data.dateRange);
      toast.success(`Study completed: ${data.barsAnalyzed} days analyzed`);

    } catch (error: any) {
      console.error('Study error:', error);
      toast.error(error.message || 'Failed to run study');
    } finally {
      setIsRunning(false);
    }
  };

  const getSelectedStudyName = () => {
    for (const category of Object.values(STUDY_CATEGORIES)) {
      const study = category.studies.find(s => s.id === selectedStudy);
      if (study) return study.name;
    }
    return selectedStudy;
  };

  const saveStudyResult = async () => {
    if (!user) {
      toast.error('Please sign in to save study results');
      return;
    }
    if (!selectedStudy || !result) {
      toast.error('No study results to save');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('saved_studies')
        .insert({
          user_id: user.id,
          ticker,
          study_type: selectedStudy,
          study_name: getSelectedStudyName() || selectedStudy,
          period,
          params: currentParams,
          result,
          bars_analyzed: barsAnalyzed,
          date_range: dateRange
        });

      if (error) throw error;
      toast.success('Study saved successfully!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save study');
    } finally {
      setIsSaving(false);
    }
  };

  // Enhanced result renderer
  const renderResult = () => {
    if (!result) return null;

    if (viewMode === 'enhanced') {
      return (
        <EnhancedResultView 
          result={result} 
          studyId={selectedStudy!}
          showInsights={showInsights}
          showEducation={showEducation}
        />
      );
    }

    // Basic view - original components
    switch (result.type) {
      case 'percentage':
        return <PercentageResult result={result} />;
      case 'distribution':
        return <DistributionResult result={result} />;
      case 'streaks':
        return <StreaksResult result={result} />;
      case 'calendar':
        return <CalendarResult result={result} />;
      case 'gap_analysis':
        return <GapAnalysisResult result={result} />;
      case 'volatility':
        return <VolatilityResult result={result} />;
      case 'drawdown':
        return <DrawdownResult result={result} />;
      case 'moving_average':
        return <MovingAverageResult result={result} />;
      case 'volume':
        return <VolumeResult result={result} />;
      case 'rsi':
        return <RSIResult result={result} />;
      case 'mean_reversion':
        return <MeanReversionResult result={result} />;
      case 'range':
        return <RangeResult result={result} />;
      case 'high_low':
        return <HighLowResult result={result} />;
      case 'trend_strength':
        return <TrendStrengthResult result={result} />;
      case 'price_targets':
        return <PriceTargetsResult result={result} />;
      case 'close_to_open':
        return <CloseToOpenResult result={result} />;
      default:
        return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Quantitative Studies
                <Badge variant="secondary" className="ml-2 gap-1">
                  <Sparkles className="h-3 w-3" />
                  Enhanced
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Run statistical analysis on {ticker} historical data
              </CardDescription>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="view-mode" className="text-xs text-muted-foreground">Enhanced</Label>
                <Switch
                  id="view-mode"
                  checked={viewMode === 'enhanced'}
                  onCheckedChange={(checked) => setViewMode(checked ? 'enhanced' : 'basic')}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <div className="overflow-x-auto -mx-1 px-1 scrollbar-hide">
              <TabsList className="w-max sm:w-full flex gap-1 bg-muted/50 p-1">
                {Object.entries(STUDY_CATEGORIES).map(([key, category]) => (
                  <TabsTrigger key={key} value={key} className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-3 whitespace-nowrap">
                    <category.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">{category.name}</span>
                    <span className="sm:hidden">{category.name.split(' ')[0]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {Object.entries(STUDY_CATEGORIES).map(([key, category]) => (
              <TabsContent key={key} value={key} className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.studies.map((study) => (
                    <button
                      key={study.id}
                      onClick={() => setSelectedStudy(study.id)}
                      className={cn(
                        "p-4 rounded-lg border text-left transition-all hover:border-primary/50 group",
                        selectedStudy === study.id 
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                          : "border-border bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn(
                          "p-1.5 rounded-md transition-colors",
                          selectedStudy === study.id 
                            ? "bg-primary/10" 
                            : "bg-muted group-hover:bg-muted/80"
                        )}>
                          <study.icon className={cn(
                            "h-4 w-4",
                            selectedStudy === study.id ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <span className="font-medium text-sm">{study.name}</span>
                        {STUDY_PARAMS[study.id] && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                            <Settings2 className="h-2.5 w-2.5 mr-0.5" />
                            Params
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground pl-8">{study.description}</p>
                    </button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t relative">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Period:</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Parameter Controls */}
            {paramDefs.length > 0 && (
              <Collapsible open={showParams} onOpenChange={setShowParams}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Parameters
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showParams && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="absolute z-50 mt-2 p-4 bg-card border rounded-lg shadow-lg w-80 left-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Study Parameters</h4>
                      <Button variant="ghost" size="sm" onClick={resetParams} className="h-7 text-xs">
                        Reset Defaults
                      </Button>
                    </div>
                    {paramDefs.map((param) => {
                      const value = currentParams[param.key] ?? param.default;
                      return (
                        <div key={param.key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">{param.label}</Label>
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{value}</span>
                          </div>
                          <Slider
                            value={[value]}
                            onValueChange={([v]) => updateParam(param.key, v)}
                            min={param.min}
                            max={param.max}
                            step={param.step}
                            className="w-full"
                          />
                          {param.description && (
                            <p className="text-xs text-muted-foreground">{param.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <Button 
              onClick={runStudy} 
              disabled={!selectedStudy || isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Study
                </>
              )}
            </Button>

            {selectedStudy && (
              <Badge variant="secondary" className="ml-auto">
                {getSelectedStudyName()}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      {(isRunning || result) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Results: {getSelectedStudyName()}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {barsAnalyzed > 0 && (
                  <Badge variant="secondary" className="font-mono">
                    {barsAnalyzed} days
                  </Badge>
                )}
                {dateRange && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {dateRange.start} → {dateRange.end}
                  </Badge>
                )}
                
                {/* Enhanced View Options */}
                {viewMode === 'enhanced' && result && !isRunning && (
                  <div className="flex items-center gap-2 border-l pl-2 ml-2">
                    <Button
                      variant={showInsights ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowInsights(!showInsights)}
                      className="h-7 gap-1 text-xs"
                    >
                      <Lightbulb className="h-3 w-3" />
                      Insights
                    </Button>
                    <Button
                      variant={showEducation ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowEducation(!showEducation)}
                      className="h-7 gap-1 text-xs"
                    >
                      <GraduationCap className="h-3 w-3" />
                      Learn
                    </Button>
                  </div>
                )}
                
                {/* Save Button */}
                {result && !isRunning && (
                  user ? (
                    <Button
                      size="sm"
                      onClick={saveStudyResult}
                      disabled={isSaving}
                      className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.info('Sign in to save study results')}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  )
                )}
              </div>
            </CardTitle>
            
            {/* Parameters used */}
            {result?.params && Object.keys(result.params).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(result.params).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="text-xs font-mono">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
            )}
            
            {usedMockData && (
              <div className="flex items-center gap-2 text-amber-500 text-sm">
                <AlertCircle className="h-4 w-4" />
                Using simulated data (add POLYGON_API_KEY for real data)
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            {isRunning ? (
              <div className="space-y-4 py-8">
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-center text-muted-foreground">Analyzing historical data...</p>
              </div>
            ) : (
              renderResult()
            )}
          </CardContent>
        </Card>
      )}

      {/* Math Explanation Card */}
      {selectedStudy && MATH_EXPLANATIONS[selectedStudy] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Understanding the Math
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible defaultValue="formula">
              <AccordionItem value="formula">
                <AccordionTrigger>Formula</AccordionTrigger>
                <AccordionContent>
                  <pre className="bg-muted/50 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap">
                    {MATH_EXPLANATIONS[selectedStudy].formula}
                  </pre>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="explanation">
                <AccordionTrigger>What it Means</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">
                    {MATH_EXPLANATIONS[selectedStudy].explanation}
                  </p>
                </AccordionContent>
              </AccordionItem>
              {MATH_EXPLANATIONS[selectedStudy].insights && (
                <AccordionItem value="insights">
                  <AccordionTrigger>Key Insights</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      {MATH_EXPLANATIONS[selectedStudy].insights!.map((insight, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Dev Tools */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground w-full justify-start">
            <FlaskConical className="h-4 w-4" />
            Studies Validation (Dev Tools)
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <StudiesValidationPanel />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ======================== ENHANCED RESULT VIEW ========================

interface EnhancedResultViewProps {
  result: any;
  studyId: string;
  showInsights: boolean;
  showEducation: boolean;
}

function EnhancedResultView({ result, studyId, showInsights, showEducation }: EnhancedResultViewProps) {
  switch (result.type) {
    case 'percentage':
      return <EnhancedPercentageResult result={result} showInsights={showInsights} showEducation={showEducation} />;
    case 'distribution':
      return <EnhancedDistributionResult result={result} showInsights={showInsights} showEducation={showEducation} />;
    case 'streaks':
      return <EnhancedStreaksResult result={result} showInsights={showInsights} showEducation={showEducation} />;
    case 'calendar':
      return <EnhancedCalendarResult result={result} showInsights={showInsights} showEducation={showEducation} />;
    case 'rsi':
      return <EnhancedRSIResult result={result} showInsights={showInsights} showEducation={showEducation} />;
    case 'trend_strength':
      return <EnhancedTrendStrengthResult result={result} showInsights={showInsights} showEducation={showEducation} />;
    case 'volatility':
      return <EnhancedVolatilityResult result={result} showInsights={showInsights} showEducation={showEducation} />;
    case 'drawdown':
      return <EnhancedDrawdownResult result={result} showInsights={showInsights} showEducation={showEducation} />;
    default:
      // Fallback to basic results for other types
      return renderBasicResult(result);
  }
}

function renderBasicResult(result: any) {
  switch (result.type) {
    case 'percentage':
      return <PercentageResult result={result} />;
    case 'distribution':
      return <DistributionResult result={result} />;
    case 'streaks':
      return <StreaksResult result={result} />;
    case 'calendar':
      return <CalendarResult result={result} />;
    case 'gap_analysis':
      return <GapAnalysisResult result={result} />;
    case 'volatility':
      return <VolatilityResult result={result} />;
    case 'drawdown':
      return <DrawdownResult result={result} />;
    case 'moving_average':
      return <MovingAverageResult result={result} />;
    case 'volume':
      return <VolumeResult result={result} />;
    case 'rsi':
      return <RSIResult result={result} />;
    case 'mean_reversion':
      return <MeanReversionResult result={result} />;
    case 'range':
      return <RangeResult result={result} />;
    case 'high_low':
      return <HighLowResult result={result} />;
    case 'trend_strength':
      return <TrendStrengthResult result={result} />;
    case 'price_targets':
      return <PriceTargetsResult result={result} />;
    case 'close_to_open':
      return <CloseToOpenResult result={result} />;
    default:
      return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
  }
}

// ======================== ENHANCED RESULT COMPONENTS ========================

function EnhancedPercentageResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const percentage = result.percentage;
  const isBullish = percentage >= 50;
  
  // Generate insights based on result
  const insights = useMemo(() => {
    const list = [];
    if (percentage >= 55) {
      list.push({ type: 'positive', text: `Strong bullish bias at ${percentage.toFixed(1)}%` });
    } else if (percentage <= 45) {
      list.push({ type: 'negative', text: `Bearish bias detected at ${percentage.toFixed(1)}%` });
    } else {
      list.push({ type: 'neutral', text: 'Neutral directional bias - near 50%' });
    }
    
    if (result.total_days >= 500) {
      list.push({ type: 'positive', text: `High statistical significance with ${result.total_days} observations` });
    } else if (result.total_days < 200) {
      list.push({ type: 'warning', text: 'Limited data - consider using longer time period' });
    }
    
    return list;
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Main Gauge Display */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        <RadialProgress
          value={percentage}
          max={100}
          label="Win Rate"
          sublabel="%"
          size="lg"
          colorScheme={isBullish ? 'success' : 'danger'}
        />
        
        <div className="flex-1 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatBox value={result.up_days} label="Up Days" color="emerald" />
            <StatBox value={result.down_days} label="Down Days" color="rose" />
            <StatBox value={result.total_days} label="Total Days" />
          </div>
          
          {/* Bullet Chart Comparison */}
          <BulletChart
            value={percentage}
            target={53}
            ranges={{ poor: 45, ok: 50, good: 55 }}
            label="vs Market Average (~53%)"
          />
        </div>
      </div>

      {/* Insights Section */}
      {showInsights && insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.map((insight, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-2 p-2 rounded-lg text-sm",
                  insight.type === 'positive' && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
                  insight.type === 'negative' && "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
                  insight.type === 'warning' && "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
                  insight.type === 'neutral' && "bg-slate-50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300"
                )}>
                  {insight.type === 'positive' && <TrendingUp className="h-4 w-4" />}
                  {insight.type === 'negative' && <TrendingDown className="h-4 w-4" />}
                  {insight.type === 'warning' && <AlertCircle className="h-4 w-4" />}
                  {insight.type === 'neutral' && <Activity className="h-4 w-4" />}
                  {insight.text}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Education Section */}
      {showEducation && (
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <GraduationCap className="h-4 w-4" />
              What This Means
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800/80 dark:text-blue-200/80">
            <p>
              A {percentage.toFixed(1)}% win rate means the stock closed {result.label?.toLowerCase()} 
              on {result.up_days} out of {result.total_days} trading days. 
              {isBullish 
                ? " This is above the statistical 50% baseline, suggesting a bullish tendency."
                : " This is below 50%, suggesting some bearish pressure."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EnhancedDistributionResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const isVolatile = result.annualizedVol > 30;
  const hasNegativeSkew = result.skewness < -0.2;
  const hasFatTails = result.kurtosis > 3;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TrendIndicator
          current={result.mean}
          previous={0}
          label="Mean Daily Return"
          format={(v) => `${v.toFixed(3)}%`}
        />
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Annualized Vol</p>
            <p className="text-2xl font-bold">{safeNumber(result.annualizedVol)?.toFixed(1) ?? 'N/A'}%</p>
            <Badge variant={isVolatile ? "destructive" : "secondary"} className="mt-1">
              {isVolatile ? 'High' : 'Normal'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Skewness</p>
            <p className="text-2xl font-bold">{result.skewness?.toFixed(2) || 'N/A'}</p>
            <Badge variant={hasNegativeSkew ? "destructive" : "secondary"} className="mt-1">
              {hasNegativeSkew ? 'Left Skew' : 'Normal'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Kurtosis</p>
            <p className="text-2xl font-bold">{result.kurtosis?.toFixed(2) || 'N/A'}</p>
            <Badge variant={hasFatTails ? "destructive" : "secondary"} className="mt-1">
              {hasFatTails ? 'Fat Tails' : 'Normal'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Histogram */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Return Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={result.histogram}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="range" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <ReferenceLine x={0} stroke={COLORS.slate} strokeDasharray="3 3" />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {result.histogram?.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.range >= 0 ? COLORS.emerald : COLORS.rose} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Extremes */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="pt-4 text-center">
            <TrendingUp className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Best Day</p>
            <p className="text-3xl font-bold text-emerald-600">+{result.max?.toFixed(2)}%</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50/50 dark:bg-rose-950/20">
          <CardContent className="pt-4 text-center">
            <TrendingDown className="h-8 w-8 text-rose-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Worst Day</p>
            <p className="text-3xl font-bold text-rose-600">{result.min?.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      {showInsights && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isVolatile && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-sm">
                  <Zap className="h-4 w-4" />
                  High volatility ({result.annualizedVol?.toFixed(1)}%) - expect large daily swings
                </div>
              )}
              {hasNegativeSkew && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Negative skew - down days tend to be larger than up days
                </div>
              )}
              {hasFatTails && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Fat tails (kurtosis {result.kurtosis?.toFixed(1)}) - extreme moves more likely than normal
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EnhancedStreaksResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const isCurrentStreakLong = Math.abs(result.currentStreak) >= result.avgUpStreak * 1.5;
  
  return (
    <div className="space-y-6">
      {/* Current Streak Highlight */}
      <Card className={cn(
        "text-center p-6",
        result.currentDirection === 'up' 
          ? "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 border-emerald-200" 
          : "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/50 dark:to-rose-900/30 border-rose-200"
      )}>
        <p className="text-sm text-muted-foreground mb-2">Current Streak</p>
        <div className="flex items-center justify-center gap-3">
          {result.currentDirection === 'up' ? (
            <TrendingUp className="h-10 w-10 text-emerald-500" />
          ) : (
            <TrendingDown className="h-10 w-10 text-rose-500" />
          )}
          <span className={cn(
            "text-5xl font-bold",
            result.currentDirection === 'up' ? 'text-emerald-600' : 'text-rose-600'
          )}>
            {Math.abs(result.currentStreak)}
          </span>
          <span className="text-lg text-muted-foreground">
            {result.currentDirection === 'up' ? 'winning' : 'losing'} days
          </span>
        </div>
        {isCurrentStreakLong && (
          <Badge className="mt-3" variant={result.currentDirection === 'up' ? 'default' : 'destructive'}>
            Extended streak - {result.currentDirection === 'up' ? 'momentum building' : 'watch for reversal'}
          </Badge>
        )}
      </Card>

      {/* Streak Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Max Win Streak</p>
            <p className="text-3xl font-bold text-emerald-600">{result.maxUpStreak}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Max Loss Streak</p>
            <p className="text-3xl font-bold text-rose-600">{result.maxDownStreak}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Win Streak</p>
            <p className="text-3xl font-bold">{result.avgUpStreak?.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Loss Streak</p>
            <p className="text-3xl font-bold">{result.avgDownStreak?.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Streak Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <LollipopChart
            data={[
              { name: 'Max Win', value: result.maxUpStreak },
              { name: 'Avg Win', value: result.avgUpStreak },
              { name: 'Current', value: result.currentStreak },
              { name: 'Avg Loss', value: -result.avgDownStreak },
              { name: 'Max Loss', value: -result.maxDownStreak },
            ]}
          />
        </CardContent>
      </Card>

      {showEducation && (
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <GraduationCap className="h-4 w-4" />
              About Streaks
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800/80 dark:text-blue-200/80">
            <p>
              Streak analysis reveals momentum patterns. Long max streaks ({result.maxUpStreak} wins, {result.maxDownStreak} losses) 
              suggest the stock can trend strongly. Average streaks of {result.avgUpStreak?.toFixed(1)} days 
              indicate typical momentum duration before reversal.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EnhancedCalendarResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const stats = result.stats || [];
  const bestPeriod = stats.reduce((best: any, curr: any) => 
    (curr.avgReturn > (best?.avgReturn || -Infinity)) ? curr : best, null);
  const worstPeriod = stats.reduce((worst: any, curr: any) => 
    (curr.avgReturn < (worst?.avgReturn || Infinity)) ? curr : worst, null);

  return (
    <div className="space-y-6">
      {/* Best/Worst Cards */}
      <div className="grid grid-cols-2 gap-4">
        {bestPeriod && (
          <Card className="bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Best Period</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{bestPeriod.name}</p>
              <p className="text-sm text-emerald-600">+{bestPeriod.avgReturn?.toFixed(2)}% avg return</p>
              <p className="text-xs text-muted-foreground mt-1">{bestPeriod.hitRate?.toFixed(0)}% win rate</p>
            </CardContent>
          </Card>
        )}
        {worstPeriod && (
          <Card className="bg-rose-50/50 dark:bg-rose-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-rose-500" />
                <span className="text-sm font-medium text-rose-700 dark:text-rose-300">Worst Period</span>
              </div>
              <p className="text-2xl font-bold text-rose-600">{worstPeriod.name}</p>
              <p className="text-sm text-rose-600">{worstPeriod.avgReturn?.toFixed(2)}% avg return</p>
              <p className="text-xs text-muted-foreground mt-1">{worstPeriod.hitRate?.toFixed(0)}% win rate</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Performance by Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)}%`, 
                    name === 'avgReturn' ? 'Avg Return' : name
                  ]} 
                />
                <ReferenceLine y={0} stroke={COLORS.slate} strokeDasharray="3 3" />
                <Bar dataKey="avgReturn" radius={[4, 4, 0, 0]}>
                  {stats.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.avgReturn >= 0 ? COLORS.emerald : COLORS.rose} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detailed Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Period</th>
                  <th className="text-right py-2 font-medium">Avg Return</th>
                  <th className="text-right py-2 font-medium">Win Rate</th>
                  <th className="text-right py-2 font-medium">Observations</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat: any, idx: number) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 font-medium">{stat.name}</td>
                    <td className={cn(
                      "py-2 text-right font-mono",
                      stat.avgReturn >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {stat.avgReturn >= 0 ? '+' : ''}{stat.avgReturn?.toFixed(2)}%
                    </td>
                    <td className="py-2 text-right font-mono">{stat.hitRate?.toFixed(0)}%</td>
                    <td className="py-2 text-right text-muted-foreground">{stat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EnhancedRSIResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const currentRSI = result.current || 50;
  const isOverbought = currentRSI >= 70;
  const isOversold = currentRSI <= 30;

  return (
    <div className="space-y-6">
      {/* Current RSI Gauge */}
      <Card className={cn(
        "p-6",
        isOverbought && "bg-rose-50/50 dark:bg-rose-950/20",
        isOversold && "bg-emerald-50/50 dark:bg-emerald-950/20"
      )}>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <RadialProgress
            value={currentRSI}
            max={100}
            label="Current RSI"
            size="lg"
            colorScheme={isOverbought ? 'danger' : isOversold ? 'success' : 'default'}
          />
          <div className="flex-1 space-y-4">
            <div className="text-center md:text-left">
              <Badge 
                variant={isOverbought ? "destructive" : isOversold ? "default" : "secondary"}
                className="text-lg px-4 py-1"
              >
                {isOverbought ? 'OVERBOUGHT' : isOversold ? 'OVERSOLD' : 'NEUTRAL'}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                {isOverbought 
                  ? "Price may be extended - watch for pullback"
                  : isOversold 
                    ? "Price may be oversold - watch for bounce"
                    : "No extreme reading - trend following mode"}
              </p>
            </div>

            {/* RSI Zone Bullet */}
            <BulletChart
              value={currentRSI}
              ranges={{ poor: 30, ok: 50, good: 70 }}
              label="RSI Level"
            />
          </div>
        </div>
      </Card>

      {/* Historical Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg RSI</p>
            <p className="text-2xl font-bold">{result.average?.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">% Overbought</p>
            <p className="text-2xl font-bold text-rose-600">{result.percentOverbought?.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">% Oversold</p>
            <p className="text-2xl font-bold text-emerald-600">{result.percentOversold?.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">% Neutral</p>
            <p className="text-2xl font-bold">{(100 - (result.percentOverbought || 0) - (result.percentOversold || 0)).toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* RSI Distribution */}
      {result.histogram && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">RSI Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.histogram}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <ReferenceLine x="30" stroke={COLORS.emerald} strokeWidth={2} />
                  <ReferenceLine x="70" stroke={COLORS.rose} strokeWidth={2} />
                  <Bar dataKey="count" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forward Returns After Signals */}
      {result.afterOverbought && result.afterOversold && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Forward Returns After Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                <p className="text-sm font-medium text-rose-700 dark:text-rose-300 mb-2">After Overbought</p>
                <p className="text-2xl font-bold">{result.afterOverbought.avgReturn?.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground">{result.afterOverbought.count} occurrences</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">After Oversold</p>
                <p className="text-2xl font-bold">{result.afterOversold.avgReturn?.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground">{result.afterOversold.count} occurrences</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EnhancedTrendStrengthResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const score = result.score || 0;
  const maxScore = result.maxScore || 6;
  const trend = result.trend || 'neutral';

  const scoreBreakdown = [
    { label: 'Price > SMA20', score: result.aboveSma20 ? 1 : 0, maxScore: 1 },
    { label: 'Price > SMA50', score: result.aboveSma50 ? 1 : 0, maxScore: 1 },
    { label: 'Price > SMA200', score: result.aboveSma200 ? 1 : 0, maxScore: 1 },
    { label: 'SMA20 > SMA50', score: result.sma20AboveSma50 ? 1 : 0, maxScore: 1 },
    { label: 'SMA50 > SMA200', score: result.sma50AboveSma200 ? 1 : 0, maxScore: 1 },
    { label: 'Higher Highs', score: result.higherHighs ? 1 : 0, maxScore: 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Score Breakdown with Visual */}
      <ScoreBreakdown
        scores={scoreBreakdown}
        totalScore={score}
        maxTotalScore={maxScore}
      />

      {/* Trend Badge */}
      <Card className={cn(
        "p-6 text-center",
        trend === 'strong_bullish' && "bg-emerald-50 dark:bg-emerald-950/30",
        trend === 'bullish' && "bg-emerald-50/50 dark:bg-emerald-950/20",
        trend === 'strong_bearish' && "bg-rose-50 dark:bg-rose-950/30",
        trend === 'bearish' && "bg-rose-50/50 dark:bg-rose-950/20"
      )}>
        <div className="flex items-center justify-center gap-3">
          {trend.includes('bullish') ? (
            <TrendingUp className={cn(
              "h-10 w-10",
              trend === 'strong_bullish' ? "text-emerald-600" : "text-emerald-500"
            )} />
          ) : trend.includes('bearish') ? (
            <TrendingDown className={cn(
              "h-10 w-10",
              trend === 'strong_bearish' ? "text-rose-600" : "text-rose-500"
            )} />
          ) : (
            <Activity className="h-10 w-10 text-slate-500" />
          )}
          <div>
            <Badge className={cn(
              "text-lg px-4 py-1",
              trend === 'strong_bullish' && "bg-emerald-600",
              trend === 'bullish' && "bg-emerald-500",
              trend === 'strong_bearish' && "bg-rose-600",
              trend === 'bearish' && "bg-rose-500",
              trend === 'neutral' && "bg-slate-500"
            )}>
              {trend.replace('_', ' ').toUpperCase()}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              Score: {score}/{maxScore}
            </p>
          </div>
        </div>
      </Card>

      {/* MA Status */}
      {result.maStatus && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Moving Average Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {['sma20', 'sma50', 'sma200'].map((ma) => {
                const status = result.maStatus[ma];
                return (
                  <div key={ma} className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xs text-muted-foreground uppercase">{ma}</p>
                    <p className="font-mono font-bold">${status?.value?.toFixed(2)}</p>
                    <Badge variant={status?.above ? "default" : "secondary"} className="mt-1">
                      {status?.distance?.toFixed(1)}% away
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EnhancedVolatilityResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <Zap className="h-6 w-6 text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Current ATR</p>
            <p className="text-2xl font-bold">${result.currentAtr?.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Annualized Vol</p>
            <p className="text-2xl font-bold">{safeNumber(result.annualizedVol)?.toFixed(1) ?? 'N/A'}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Daily Range</p>
            <p className="text-2xl font-bold">{result.avgRange?.toFixed(2)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Vol Regime</p>
            <Badge variant={result.regime === 'high' ? 'destructive' : result.regime === 'low' ? 'default' : 'secondary'}>
              {result.regime?.toUpperCase() || 'NORMAL'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Percentile Position */}
      {result.percentile !== undefined && (
        <PercentileBar
          value={result.currentAtr || 0}
          percentile={result.percentile}
          label="Current ATR vs Historical"
          format={(v) => `$${v.toFixed(2)}`}
        />
      )}

      {/* Volatility Chart */}
      {result.history && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ATR History</CardTitle>
          </CardHeader>
          <CardContent>
            <SparklineArea data={result.history} height={100} showRange />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EnhancedDrawdownResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  return (
    <div className="space-y-6">
      {/* Max Drawdown Card */}
      <Card className="bg-rose-50/50 dark:bg-rose-950/20">
        <CardContent className="pt-6 text-center">
          <TrendingDown className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Maximum Drawdown</p>
          <p className="text-4xl font-bold text-rose-600">{result.maxDrawdown?.toFixed(1)}%</p>
          {result.maxDrawdownDate && (
            <p className="text-xs text-muted-foreground mt-2">
              Occurred on {result.maxDrawdownDate}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Current DD</p>
            <p className="text-2xl font-bold">{result.currentDrawdown?.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Recovery</p>
            <p className="text-2xl font-bold">{result.avgRecoveryDays || 'N/A'} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Drawdown Count</p>
            <p className="text-2xl font-bold">{result.drawdownCount || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Time in DD</p>
            <p className="text-2xl font-bold">{result.timeInDrawdown?.toFixed(0) || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Drawdown History */}
      {result.history && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Drawdown History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.history}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Drawdown']} />
                  <Area type="monotone" dataKey="value" stroke={COLORS.rose} fill={COLORS.rose} fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ======================== BASIC RESULT COMPONENTS ========================
// (These are the original result components for fallback)

function StatBox({ value, label, color }: { value: string | number; label: string; color?: 'emerald' | 'rose' | 'blue' }) {
  return (
    <div className={cn(
      "p-3 rounded-lg border text-center",
      color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/20" :
      color === 'rose' ? "bg-rose-500/10 border-rose-500/20" :
      color === 'blue' ? "bg-blue-500/10 border-blue-500/20" :
      "bg-muted/50 border-border"
    )}>
      <p className={cn(
        "text-xl font-bold tabular-nums",
        color === 'emerald' ? "text-emerald-500" :
        color === 'rose' ? "text-rose-500" :
        color === 'blue' ? "text-blue-500" : ""
      )}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PercentageResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="text-center py-6">
        <div className="text-6xl font-bold tabular-nums mb-2">
          <span className={result.percentage >= 50 ? 'text-emerald-500' : 'text-rose-500'}>
            {result.percentage.toFixed(1)}%
          </span>
        </div>
        <p className="text-muted-foreground">{result.label}</p>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <StatBox value={result.up_days} label="Up Days" color="emerald" />
        <StatBox value={result.down_days} label="Down Days" color="rose" />
        <StatBox value={result.total_days} label="Total Days" />
      </div>
      <Progress value={result.percentage} className="h-4" />
    </div>
  );
}

function DistributionResult({ result }: { result: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox value={`${result.mean.toFixed(3)}%`} label="Mean Return" />
        <StatBox value={`${result.stdDev.toFixed(3)}%`} label="Std Dev" />
        <StatBox value={`+${result.max.toFixed(2)}%`} label="Best Day" color="emerald" />
        <StatBox value={`${result.min.toFixed(2)}%`} label="Worst Day" color="rose" />
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={result.histogram}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="range" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {result.histogram?.map((entry: any, index: number) => (
                <Cell key={index} fill={entry.range >= 0 ? COLORS.emerald : COLORS.rose} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StreaksResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox value={result.maxUpStreak} label="Max Up Streak" color="emerald" />
        <StatBox value={result.maxDownStreak} label="Max Down Streak" color="rose" />
        <StatBox value={result.avgUpStreak?.toFixed(1)} label="Avg Up Streak" />
        <StatBox value={result.avgDownStreak?.toFixed(1)} label="Avg Down Streak" />
      </div>
      <div className="p-4 rounded-lg bg-muted/50 border text-center">
        <p className="text-sm text-muted-foreground mb-1">Current Streak</p>
        <p className={cn("text-3xl font-bold", result.currentDirection === 'up' ? 'text-emerald-500' : 'text-rose-500')}>
          {Math.abs(result.currentStreak)} {result.currentDirection === 'up' ? '↑' : '↓'}
        </p>
      </div>
    </div>
  );
}

function CalendarResult({ result }: { result: any }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={result.stats}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Avg Return']} />
          <ReferenceLine y={0} stroke={COLORS.slate} />
          <Bar dataKey="avgReturn" radius={[4, 4, 0, 0]}>
            {result.stats?.map((entry: any, index: number) => (
              <Cell key={index} fill={entry.avgReturn >= 0 ? COLORS.emerald : COLORS.rose} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Stub implementations for remaining basic result types
function GapAnalysisResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

function VolatilityResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

function DrawdownResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

function MovingAverageResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

function VolumeResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

function RSIResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

function MeanReversionResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

function RangeResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

function HighLowResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

function TrendStrengthResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

function PriceTargetsResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

function CloseToOpenResult({ result }: { result: any }) {
  return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
}

export default IntegratedQuantStudiesPanel;
