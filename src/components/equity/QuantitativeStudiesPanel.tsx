import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Activity,
  Target,
  Loader2,
  Play,
  BookOpen,
  AlertCircle,
  Zap,
  ArrowUpDown,
  LineChart,
  Volume2,
  Gauge,
  Layers,
  Mountain,
  Crosshair,
  ArrowLeftRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';

interface QuantitativeStudiesPanelProps {
  ticker: string;
  companyName: string;
}

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

const MATH_EXPLANATIONS: Record<string, { formula: string; explanation: string }> = {
  daily_close_gt_open: {
    formula: 'Percentage = (Days where Close > Open) / Total Days × 100',
    explanation: 'Measures intraday directional bias. A value above 50% suggests the asset tends to gain during trading hours.'
  },
  daily_close_gt_prior: {
    formula: 'Percentage = (Days where Closeₜ > Closeₜ₋₁) / Total Days × 100',
    explanation: 'Measures the frequency of positive daily returns. A value significantly above 50% indicates bullish momentum.'
  },
  daily_return_distribution: {
    formula: 'Return = (Closeₜ - Closeₜ₋₁) / Closeₜ₋₁ × 100\nMean = Σ(Returns) / n\nStdDev = √(Σ(Return - Mean)² / n)',
    explanation: 'The distribution shows how returns are spread. Skewness measures asymmetry; kurtosis measures tail risk.'
  },
  up_down_streaks: {
    formula: 'Streak = consecutive days in same direction\nMax Streak = max(all streaks)\nAvg Streak = Σ(streak lengths) / count',
    explanation: 'Reveals momentum patterns. Long winning streaks may indicate trend persistence.'
  },
  day_of_week_returns: {
    formula: 'Avg Return(day) = Σ(returns on day) / count\nHit Rate = Positive days / Total days × 100',
    explanation: 'Some assets exhibit day-of-week effects. Fridays often show positive bias due to position unwinding.'
  },
  month_of_year_returns: {
    formula: 'Monthly Return = (Close_end - Close_start) / Close_start × 100',
    explanation: 'Seasonality patterns like "Sell in May" and "Santa Rally" are well-known. This quantifies which months historically outperform.'
  },
  gap_analysis: {
    formula: 'Gap % = (Openₜ - Closeₜ₋₁) / Closeₜ₋₁ × 100\nFill Rate = Gaps that filled / Total gaps',
    explanation: 'Gap fills occur when price retraces to the prior close. Unfilled gaps often indicate strong momentum.'
  },
  volatility_analysis: {
    formula: 'ATR = EMA(max(H-L, |H-C₋₁|, |L-C₋₁|), 14)\nAnnualized Vol = Daily StdDev × √252',
    explanation: 'ATR measures average price movement. Volatility clustering means high-vol days tend to follow high-vol days.'
  },
  drawdown_analysis: {
    formula: 'Drawdown = (Peak - Current) / Peak × 100\nMax DD = max(all drawdowns)',
    explanation: 'Drawdowns measure peak-to-trough declines. Recovery time shows how long it takes to make new highs.'
  },
  moving_average_analysis: {
    formula: 'SMA = Σ(Close, n) / n\nEMA = Closeₜ × k + EMAₜ₋₁ × (1-k), k = 2/(n+1)',
    explanation: 'Golden Cross (50 > 200) is bullish; Death Cross (50 < 200) is bearish. Distance from MA indicates overbought/oversold.'
  },
  volume_analysis: {
    formula: 'Volume Ratio = Current Vol / Avg Vol\nAccumulation = Up Day Vol > Down Day Vol',
    explanation: 'Higher volume on up days suggests accumulation (buying); higher volume on down days suggests distribution (selling).'
  },
  rsi_analysis: {
    formula: 'RS = Avg Gain / Avg Loss\nRSI = 100 - (100 / (1 + RS))',
    explanation: 'RSI > 70 is overbought; RSI < 30 is oversold. This shows how often those conditions occur and what follows.'
  },
  mean_reversion: {
    formula: 'Autocorrelation = Σ((Rₜ - μ)(Rₜ₋₁ - μ)) / (n × σ²)',
    explanation: 'Negative autocorrelation suggests mean reversion (reversals); positive suggests momentum (continuation).'
  },
  range_analysis: {
    formula: 'Range % = (High - Low) / Close × 100\nBody % = |Close - Open| / Range × 100',
    explanation: 'Inside days (range within prior range) often precede breakouts. Doji (small body) indicates indecision.'
  },
  high_low_analysis: {
    formula: '20-Day High = Close > max(High, 20 days)\nDistance from High = (Current - 52W High) / 52W High × 100',
    explanation: 'New highs often continue (momentum). Distance from 52-week high shows how extended or beaten-down a stock is.'
  },
  trend_strength: {
    formula: 'Score = Points above SMA20 + SMA50 + SMA200 + (SMA20 > SMA50) + (SMA50 > SMA200)',
    explanation: 'Multi-factor trend scoring combines price position and moving average alignment. Higher score = stronger uptrend.'
  },
  price_targets: {
    formula: 'Expected = Price × (1 + μ)^n\nBull = Price × (1 + μ + σ)^n\nBear = Price × (1 + μ - σ)^n',
    explanation: 'Statistical projections based on historical return distribution. Not predictions, but probability-based scenarios.'
  },
};

export function QuantitativeStudiesPanel({ ticker, companyName }: QuantitativeStudiesPanelProps) {
  const [selectedStudy, setSelectedStudy] = useState<string | null>(null);
  const [period, setPeriod] = useState('3y');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [barsAnalyzed, setBarsAnalyzed] = useState(0);
  const [usedMockData, setUsedMockData] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState('basic');

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
          endDate
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

  const renderResult = () => {
    if (!result) return null;

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
      default:
        return <pre className="text-xs overflow-auto p-4 bg-muted rounded-lg">{JSON.stringify(result, null, 2)}</pre>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Quantitative Studies
          </CardTitle>
          <CardDescription>
            Run statistical analysis on {ticker} historical data using Polygon.io
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
              {Object.entries(STUDY_CATEGORIES).map(([key, category]) => (
                <TabsTrigger key={key} value={key} className="gap-1.5 text-xs">
                  <category.icon className="h-3.5 w-3.5" />
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(STUDY_CATEGORIES).map(([key, category]) => (
              <TabsContent key={key} value={key} className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.studies.map((study) => (
                    <button
                      key={study.id}
                      onClick={() => setSelectedStudy(study.id)}
                      className={cn(
                        "p-4 rounded-lg border text-left transition-all hover:border-primary/50",
                        selectedStudy === study.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <study.icon className={cn(
                          "h-4 w-4",
                          selectedStudy === study.id ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className="font-medium text-sm">{study.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{study.description}</p>
                    </button>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex items-center gap-4 pt-2 border-t">
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

      {(isRunning || result) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Results: {getSelectedStudyName()}
              </span>
              <div className="flex items-center gap-2">
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
              </div>
            </CardTitle>
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
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Result Components
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox value={`${result.annualizedVol?.toFixed(1) || 'N/A'}%`} label="Annual Vol" />
        <StatBox value={result.skewness?.toFixed(2) || 'N/A'} label="Skewness" />
        <StatBox value={result.kurtosis?.toFixed(2) || 'N/A'} label="Kurtosis" />
        <StatBox value={result.count} label="Observations" />
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={result.histogram}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="range" tickFormatter={(v) => `${v}%`} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip formatter={(value) => [value, 'Count']} />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {result.histogram.map((entry: any, index: number) => (
                <Cell key={index} fill={entry.range >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'} />
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
        <StatBox value={result.avgUpStreak.toFixed(1)} label="Avg Up Streak" />
        <StatBox value={result.avgDownStreak.toFixed(1)} label="Avg Down Streak" />
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
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={result.stats}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} className="text-xs" />
            <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Avg Return']} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
            <Bar dataKey="avgReturn" radius={[4, 4, 0, 0]}>
              {result.stats?.map((entry: any, index: number) => (
                <Cell key={index} fill={entry.avgReturn >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {result.stats?.map((s: any) => (
          <div key={s.name} className={cn("p-2 rounded-lg border text-center", s.avgReturn >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20")}>
            <p className="font-medium text-sm">{s.name}</p>
            <p className={cn("text-lg font-bold", s.avgReturn >= 0 ? "text-emerald-500" : "text-rose-500")}>
              {s.avgReturn >= 0 ? '+' : ''}{s.avgReturn.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">{s.hitRate?.toFixed(0)}% hit</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GapAnalysisResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Gap Ups ({result.gapsUp.count})</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Avg Size:</span><span>+{result.gapsUp.avgGapSize.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span>Fill Rate:</span><span>{result.gapsUp.fillRate.toFixed(0)}%</span></div>
            <div className="flex justify-between"><span>Continuation:</span><span>{result.gapsUp.continuationRate.toFixed(0)}%</span></div>
          </CardContent>
        </Card>
        <Card className="bg-rose-500/5 border-rose-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Gap Downs ({result.gapsDown.count})</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Avg Size:</span><span>{result.gapsDown.avgGapSize.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span>Fill Rate:</span><span>{result.gapsDown.fillRate.toFixed(0)}%</span></div>
            <div className="flex justify-between"><span>Continuation:</span><span>{result.gapsDown.continuationRate.toFixed(0)}%</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VolatilityResult({ result }: { result: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatBox value={`$${result.atr.current?.toFixed(2)}`} label="Current ATR" />
      <StatBox value={`$${result.atr.avg?.toFixed(2)}`} label="Avg ATR" />
      <StatBox value={`${result.annualizedVol.current?.toFixed(1)}%`} label="Current Vol" />
      <StatBox value={`${result.annualizedVol.avg?.toFixed(1)}%`} label="Avg Vol" />
    </div>
  );
}

function DrawdownResult({ result }: { result: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatBox value={`-${result.maxDrawdown?.toFixed(1)}%`} label="Max Drawdown" color="rose" />
      <StatBox value={`-${result.currentDrawdown?.toFixed(1)}%`} label="Current DD" color={result.currentDrawdown > 5 ? 'rose' : undefined} />
      <StatBox value={result.avgRecoveryDays?.toFixed(0)} label="Avg Recovery" />
      <StatBox value={result.totalDrawdowns} label="Total DDs" />
    </div>
  );
}

function MovingAverageResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      {result.currentTrend && (
        <div className={cn("p-4 rounded-lg border text-center", result.currentTrend === 'bullish' ? "bg-emerald-500/10" : "bg-rose-500/10")}>
          <p className={cn("text-2xl font-bold", result.currentTrend === 'bullish' ? "text-emerald-500" : "text-rose-500")}>
            {result.currentTrend === 'bullish' ? '🐂 Bullish' : '🐻 Bearish'}
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {['ma20', 'ma50', 'ma200'].filter(p => result[p]).map(period => {
          const ma = result[period];
          return (
            <Card key={period} className={ma.currentAboveSMA ? "bg-emerald-500/5" : "bg-rose-500/5"}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{period.replace('ma', '')}-Day MA</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between"><span>SMA:</span><span>${ma.sma?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Distance:</span><span className={ma.distFromSMA >= 0 ? "text-emerald-500" : "text-rose-500"}>{ma.distFromSMA?.toFixed(1)}%</span></div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function VolumeResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className={cn("p-4 rounded-lg border text-center", result.volumeBias === 'accumulation' ? "bg-emerald-500/10" : "bg-rose-500/10")}>
        <p className={cn("text-2xl font-bold", result.volumeBias === 'accumulation' ? "text-emerald-500" : "text-rose-500")}>
          {result.volumeBias === 'accumulation' ? '📈 Accumulation' : '📉 Distribution'}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox value={`${(result.avgVolume / 1000000).toFixed(1)}M`} label="Avg Volume" />
        <StatBox value={`${result.volumeRatio?.toFixed(2)}x`} label="Vol Ratio" />
        <StatBox value={`${result.volumeTrend?.toFixed(0)}%`} label="Vol Trend" color={result.volumeTrend > 0 ? 'emerald' : 'rose'} />
        <StatBox value={`${result.highVolumeDays?.hitRate?.toFixed(0)}%`} label="High Vol Hit" />
      </div>
    </div>
  );
}

function RSIResult({ result }: { result: any }) {
  const status = result.current > 70 ? 'overbought' : result.current < 30 ? 'oversold' : 'neutral';
  return (
    <div className="space-y-4">
      <div className={cn("p-6 rounded-lg border text-center", status === 'overbought' ? "bg-rose-500/10" : status === 'oversold' ? "bg-emerald-500/10" : "bg-muted/50")}>
        <p className={cn("text-5xl font-bold", status === 'overbought' ? "text-rose-500" : status === 'oversold' ? "text-emerald-500" : "")}>
          {result.current?.toFixed(1)}
        </p>
        <Badge className="mt-2" variant={status === 'neutral' ? 'secondary' : status === 'overbought' ? 'destructive' : 'default'}>{status.toUpperCase()}</Badge>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox value={`${result.overboughtPct?.toFixed(0)}%`} label="% Overbought" color="rose" />
        <StatBox value={`${result.oversoldPct?.toFixed(0)}%`} label="% Oversold" color="emerald" />
        <StatBox value={`${result.afterOversold?.avgReturn?.toFixed(2)}%`} label="After Oversold" />
        <StatBox value={`${result.afterOversold?.hitRate?.toFixed(0)}%`} label="Hit Rate" />
      </div>
    </div>
  );
}

function MeanReversionResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="p-6 rounded-lg border text-center bg-muted/50">
        <p className="text-sm text-muted-foreground mb-2">Market Regime</p>
        <p className="text-2xl font-bold capitalize">{result.regime?.replace('_', ' ')}</p>
        <p className="text-sm text-muted-foreground">Autocorrelation: {result.autocorrelation?.toFixed(3)}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm">After Large Up</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="flex justify-between"><span>Count:</span><span>{result.afterLargeUp?.count}</span></div>
            <div className="flex justify-between"><span>Reversal Rate:</span><span>{result.afterLargeUp?.reversalRate?.toFixed(0)}%</span></div>
          </CardContent>
        </Card>
        <Card className="bg-rose-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm">After Large Down</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="flex justify-between"><span>Count:</span><span>{result.afterLargeDown?.count}</span></div>
            <div className="flex justify-between"><span>Reversal Rate:</span><span>{result.afterLargeDown?.reversalRate?.toFixed(0)}%</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RangeResult({ result }: { result: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatBox value={`${result.avgRangePercent?.toFixed(2)}%`} label="Avg Range" />
      <StatBox value={`${result.avgBodyPercent?.toFixed(0)}%`} label="Avg Body" />
      <StatBox value={`${result.dojiRate?.toFixed(1)}%`} label="Doji Rate" />
      <StatBox value={result.insideDays?.count} label="Inside Days" />
    </div>
  );
}

function HighLowResult({ result }: { result: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatBox value={`$${result.yearHigh?.toFixed(2)}`} label="52W High" color="emerald" />
      <StatBox value={`$${result.yearLow?.toFixed(2)}`} label="52W Low" color="rose" />
      <StatBox value={`${result.distFromHigh?.toFixed(1)}%`} label="From High" />
      <StatBox value={`+${result.distFromLow?.toFixed(1)}%`} label="From Low" />
    </div>
  );
}

function TrendStrengthResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className={cn("p-6 rounded-lg border text-center", result.trendDirection?.includes('up') ? "bg-emerald-500/10" : result.trendDirection?.includes('down') ? "bg-rose-500/10" : "bg-muted/50")}>
        <p className={cn("text-5xl font-bold", result.trendDirection?.includes('up') ? "text-emerald-500" : result.trendDirection?.includes('down') ? "text-rose-500" : "")}>
          {result.trendScore} / {result.maxScore}
        </p>
        <Progress value={(result.trendScore / result.maxScore) * 100} className="h-3 mt-4" />
        <Badge className="mt-3">{result.trendDirection?.replace('_', ' ').toUpperCase()}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatBox value={`${result.higherHighsRate?.toFixed(0)}%`} label="Higher Highs" color="emerald" />
        <StatBox value={`${result.higherLowsRate?.toFixed(0)}%`} label="Higher Lows" color="emerald" />
      </div>
    </div>
  );
}

function PriceTargetsResult({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted/50 border text-center">
        <p className="text-sm text-muted-foreground">Current Price</p>
        <p className="text-4xl font-bold">${result.currentPrice?.toFixed(2)}</p>
      </div>
      {['days30', 'days90', 'days252'].map(period => {
        const proj = result.projections?.[period];
        if (!proj) return null;
        const label = period === 'days30' ? '30 Days' : period === 'days90' ? '90 Days' : '1 Year';
        return (
          <Card key={period}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
            <CardContent className="flex justify-between">
              <div className="text-center"><p className="text-xs text-rose-500">Bear</p><p className="font-bold">${proj.bear?.toFixed(2)}</p></div>
              <div className="text-center"><p className="text-xs">Expected</p><p className="font-bold text-lg">${proj.expected?.toFixed(2)}</p></div>
              <div className="text-center"><p className="text-xs text-emerald-500">Bull</p><p className="font-bold">${proj.bull?.toFixed(2)}</p></div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default QuantitativeStudiesPanel;
