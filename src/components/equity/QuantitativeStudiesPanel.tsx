import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  ChevronRight,
  AlertCircle
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

const STUDY_TYPES = [
  { id: 'daily_close_gt_open', name: 'Days Closing Above Open', icon: TrendingUp, description: '% of days where close > open' },
  { id: 'daily_close_gt_prior', name: 'Days Closing Above Prior', icon: Target, description: '% of days where close > prior close' },
  { id: 'daily_return_distribution', name: 'Return Distribution', icon: BarChart3, description: 'Mean, std dev, percentiles, histogram' },
  { id: 'up_down_streaks', name: 'Win/Loss Streaks', icon: Activity, description: 'Max and avg winning/losing streaks' },
  { id: 'day_of_week_returns', name: 'Day of Week Analysis', icon: Calendar, description: 'Which weekdays perform best' },
  { id: 'month_of_year_returns', name: 'Monthly Seasonality', icon: Calendar, description: 'Which months perform best' },
];

const PERIODS = [
  { value: '1y', label: '1 Year', years: 1 },
  { value: '3y', label: '3 Years', years: 3 },
  { value: '5y', label: '5 Years', years: 5 },
  { value: '10y', label: '10 Years', years: 10 },
];

const MATH_EXPLANATIONS: Record<string, { formula: string; explanation: string }> = {
  daily_close_gt_open: {
    formula: 'Percentage = (Days where Close > Open) / Total Days × 100',
    explanation: 'This measures the frequency of positive intraday moves. A value above 50% suggests the asset tends to gain during trading hours.'
  },
  daily_close_gt_prior: {
    formula: 'Percentage = (Days where Closeₜ > Closeₜ₋₁) / Total Days × 100',
    explanation: 'This measures the frequency of positive daily returns. A value significantly above 50% indicates a tendency to move up over time.'
  },
  daily_return_distribution: {
    formula: 'Return = (Closeₜ - Closeₜ₋₁) / Closeₜ₋₁ × 100\nMean = Σ(Returns) / n\nStdDev = √(Σ(Return - Mean)² / n)',
    explanation: 'The distribution shows how returns are spread. A normal distribution with positive mean indicates steady gains; fat tails indicate extreme moves occur more often than expected.'
  },
  up_down_streaks: {
    formula: 'Streak = consecutive days in same direction\nMax Streak = max(all streaks)\nAvg Streak = Σ(streak lengths) / count',
    explanation: 'Streaks reveal momentum patterns. Long winning streaks may indicate trend persistence; knowing average streak length helps set realistic expectations.'
  },
  day_of_week_returns: {
    formula: 'Avg Return(day) = Σ(returns on day) / count\nHit Rate = Positive days / Total days × 100',
    explanation: 'Some assets exhibit day-of-week effects. Historically, Fridays often show positive bias due to position unwinding, while Mondays can be volatile.'
  },
  month_of_year_returns: {
    formula: 'Monthly Return = (Close_end - Close_start) / Close_start × 100\nAvg(month) = Σ(monthly returns) / years',
    explanation: 'Seasonality patterns exist in markets. "Sell in May" and "Santa Rally" are well-known effects. This study quantifies which months historically outperform.'
  },
};

export function QuantitativeStudiesPanel({ ticker, companyName }: QuantitativeStudiesPanelProps) {
  const [selectedStudy, setSelectedStudy] = useState<string | null>(null);
  const [period, setPeriod] = useState('3y');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [barsAnalyzed, setBarsAnalyzed] = useState(0);
  const [usedMockData, setUsedMockData] = useState(false);

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
      toast.success(`Study completed: ${data.barsAnalyzed} days analyzed`);

    } catch (error: any) {
      console.error('Study error:', error);
      toast.error(error.message || 'Failed to run study');
    } finally {
      setIsRunning(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    switch (result.type) {
      case 'percentage':
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
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-500">{result.up_days}</p>
                <p className="text-xs text-muted-foreground">Up Days</p>
              </div>
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <p className="text-2xl font-bold text-rose-500">{result.down_days}</p>
                <p className="text-xs text-muted-foreground">Down Days</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-2xl font-bold">{result.total_days}</p>
                <p className="text-xs text-muted-foreground">Total Days</p>
              </div>
            </div>
            
            <Progress 
              value={result.percentage} 
              className="h-4"
            />
          </div>
        );

      case 'distribution':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-lg font-bold tabular-nums">{result.mean.toFixed(3)}%</p>
                <p className="text-xs text-muted-foreground">Mean Return</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-lg font-bold tabular-nums">{result.stdDev.toFixed(3)}%</p>
                <p className="text-xs text-muted-foreground">Std Dev</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-lg font-bold tabular-nums text-emerald-500">+{result.max.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground">Best Day</p>
              </div>
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                <p className="text-lg font-bold tabular-nums text-rose-500">{result.min.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground">Worst Day</p>
              </div>
            </div>
            
            {result.histogram && result.histogram.length > 0 && (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.histogram}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="range" tickFormatter={(v) => `${v}%`} className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Days']}
                      labelFormatter={(label) => `Return: ${label}% to ${(parseFloat(label) + 0.5).toFixed(1)}%`}
                    />
                    <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {result.histogram.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.range >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-muted/30">
                <p className="font-mono">{result.percentiles.p5.toFixed(2)}%</p>
                <p className="text-muted-foreground">5th</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="font-mono">{result.percentiles.p25.toFixed(2)}%</p>
                <p className="text-muted-foreground">25th</p>
              </div>
              <div className="p-2 rounded bg-primary/10 border border-primary/20">
                <p className="font-mono font-bold">{result.percentiles.p50.toFixed(2)}%</p>
                <p className="text-muted-foreground">Median</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="font-mono">{result.percentiles.p75.toFixed(2)}%</p>
                <p className="text-muted-foreground">75th</p>
              </div>
              <div className="p-2 rounded bg-muted/30">
                <p className="font-mono">{result.percentiles.p95.toFixed(2)}%</p>
                <p className="text-muted-foreground">95th</p>
              </div>
            </div>
          </div>
        );

      case 'streaks':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-500 mb-2" />
                <p className="text-3xl font-bold text-emerald-500">{result.maxUpStreak}</p>
                <p className="text-xs text-muted-foreground">Max Winning Streak</p>
                <p className="text-sm mt-1">Avg: {result.avgUpStreak.toFixed(1)} days</p>
              </div>
              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <TrendingDown className="h-5 w-5 text-rose-500 mb-2" />
                <p className="text-3xl font-bold text-rose-500">{result.maxDownStreak}</p>
                <p className="text-xs text-muted-foreground">Max Losing Streak</p>
                <p className="text-sm mt-1">Avg: {result.avgDownStreak.toFixed(1)} days</p>
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className={cn(
                "text-2xl font-bold",
                result.currentDirection === 'up' ? 'text-emerald-500' : 'text-rose-500'
              )}>
                {result.currentStreak} {result.currentDirection === 'up' ? 'winning' : 'losing'} days
              </p>
            </div>
          </div>
        );

      case 'calendar':
        const chartData = result.stats?.map((s: any) => ({
          name: s.name,
          avgReturn: s.avgReturn,
          hitRate: s.hitRate
        })) || [];

        return (
          <div className="space-y-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis tickFormatter={(v) => `${v.toFixed(1)}%`} className="text-xs" />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)}%`, 
                      name === 'avgReturn' ? 'Avg Return' : 'Hit Rate'
                    ]}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                  <Bar dataKey="avgReturn" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.avgReturn >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-1))'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {result.stats?.map((s: any) => (
                <div 
                  key={s.name}
                  className={cn(
                    "p-2 rounded-lg border text-center",
                    s.avgReturn >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
                  )}
                >
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className={cn(
                    "text-lg font-bold tabular-nums",
                    s.avgReturn >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {s.avgReturn >= 0 ? '+' : ''}{s.avgReturn.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground">{s.hitRate.toFixed(0)}% hit rate</p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Study Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Quantitative Studies
          </CardTitle>
          <CardDescription>
            Run statistical analysis on {ticker} historical data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {STUDY_TYPES.map((study) => (
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

          <div className="flex items-center gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {(isRunning || result) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Results: {STUDY_TYPES.find(s => s.id === selectedStudy)?.name}
              </span>
              {barsAnalyzed > 0 && (
                <Badge variant="secondary" className="font-mono">
                  {barsAnalyzed} days analyzed
                </Badge>
              )}
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

      {/* Math Explanations */}
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
