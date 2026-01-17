/**
 * Enhanced Result Views for Quant Lab
 * 
 * These components provide rich visualizations with AI insights,
 * educational content, and professional-grade charts.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, AlertCircle, Activity, Lightbulb,
  GraduationCap, Zap, Award
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, ComposedChart
} from 'recharts';
import {
  BulletChart, LollipopChart, RadialProgress, TrendIndicator
} from '@/components/quant-lab/AdditionalVisualizations';

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

// StatBox helper component
function StatBox({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn(
          "text-2xl font-bold",
          color === 'emerald' && "text-emerald-600",
          color === 'rose' && "text-rose-600"
        )}>{value}</p>
      </CardContent>
    </Card>
  );
}

interface EnhancedResultViewProps {
  result: any;
  studyId: string;
  showInsights?: boolean;
  showEducation?: boolean;
}

export function EnhancedResultView({ result, studyId, showInsights = true, showEducation = true }: EnhancedResultViewProps) {
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
      // For types without enhanced view, show a styled fallback
      return <GenericEnhancedResult result={result} showInsights={showInsights} showEducation={showEducation} />;
  }
}

// ======================== ENHANCED RESULT COMPONENTS ========================

function EnhancedPercentageResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const percentage = result.percentage;
  const isBullish = percentage >= 50;
  
  const insights = useMemo(() => {
    const list: Array<{ type: string; text: string }> = [];
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
  }, [result, percentage]);

  return (
    <div className="space-y-6">
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
          <div className="grid grid-cols-3 gap-3">
            <StatBox value={result.up_days} label="Up Days" color="emerald" />
            <StatBox value={result.down_days} label="Down Days" color="rose" />
            <StatBox value={result.total_days} label="Total Days" />
          </div>
          
          <BulletChart
            value={percentage}
            target={53}
            ranges={{ poor: 45, ok: 50, good: 55 }}
            label="vs Market Average (~53%)"
          />
        </div>
      </div>

      {showInsights && insights.length > 0 && (
        <InsightsCard insights={insights} />
      )}

      {showEducation && (
        <EducationCard>
          A {percentage.toFixed(1)}% win rate means the stock closed {result.label?.toLowerCase()} 
          on {result.up_days} out of {result.total_days} trading days. 
          {isBullish 
            ? " This is above the statistical 50% baseline, suggesting a bullish tendency."
            : " This is below 50%, suggesting some bearish pressure."}
        </EducationCard>
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

      {result.histogram && (
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
      )}

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
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            Risk Assessment
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {isVolatile && (
              <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                <Zap className="h-3.5 w-3.5" />
                High volatility ({safeNumber(result.annualizedVol)?.toFixed(1) ?? 'N/A'}%) - expect large daily swings
              </span>
            )}
            {hasNegativeSkew && (
              <span className="inline-flex items-center gap-1.5 text-sm text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                Negative skew - down days tend to be larger than up days
              </span>
            )}
            {hasFatTails && (
              <span className="inline-flex items-center gap-1.5 text-sm text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                Fat tails (kurtosis {result.kurtosis?.toFixed(1)}) - extreme moves more likely than normal
              </span>
            )}
            {!isVolatile && !hasNegativeSkew && !hasFatTails && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                Normal risk profile - typical return distribution
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EnhancedStreaksResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const isCurrentStreakLong = Math.abs(result.currentStreak) >= (result.avgUpStreak || 2) * 1.5;
  
  return (
    <div className="space-y-6">
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
        <EducationCard title="About Streaks">
          Streak analysis reveals momentum patterns. Long max streaks ({result.maxUpStreak} wins, {result.maxDownStreak} losses) 
          suggest the stock can trend strongly. Average streaks of {result.avgUpStreak?.toFixed(1)} days 
          indicate typical momentum duration before reversal.
        </EducationCard>
      )}
    </div>
  );
}

function EnhancedCalendarResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const stats = result.stats || result.dayStats || result.monthStats || [];
  const bestPeriod = stats.reduce((best: any, curr: any) => 
    (curr.avgReturn > (best?.avgReturn || -Infinity)) ? curr : best, null);
  const worstPeriod = stats.reduce((worst: any, curr: any) => 
    (curr.avgReturn < (worst?.avgReturn || Infinity)) ? curr : worst, null);

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Performance by Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                <Bar dataKey="avgReturn" radius={[4, 4, 0, 0]}>
                  {stats.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.avgReturn >= 0 ? COLORS.emerald : COLORS.rose} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {showEducation && (
        <EducationCard>
          Seasonality patterns reveal which time periods tend to perform best. 
          {bestPeriod && ` ${bestPeriod.name} shows the strongest historical performance with an average return of ${bestPeriod.avgReturn?.toFixed(2)}%.`}
          {worstPeriod && ` ${worstPeriod.name} has been the weakest period historically.`}
        </EducationCard>
      )}
    </div>
  );
}

function EnhancedRSIResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const currentRSI = result.currentRSI || 50;
  const isOverbought = currentRSI >= 70;
  const isOversold = currentRSI <= 30;
  
  return (
    <div className="space-y-6">
      <Card className={cn(
        "text-center p-6",
        isOverbought ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200" :
        isOversold ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200" :
        ""
      )}>
        <p className="text-sm text-muted-foreground mb-2">Current RSI</p>
        <p className={cn(
          "text-5xl font-bold",
          isOverbought ? "text-rose-600" : isOversold ? "text-emerald-600" : ""
        )}>{currentRSI.toFixed(1)}</p>
        <Badge className="mt-2" variant={isOverbought ? "destructive" : isOversold ? "default" : "secondary"}>
          {isOverbought ? "Overbought" : isOversold ? "Oversold" : "Neutral"}
        </Badge>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">% Time Overbought</p>
            <p className="text-2xl font-bold">{result.pctOverbought?.toFixed(1) || '0'}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">% Time Oversold</p>
            <p className="text-2xl font-bold">{result.pctOversold?.toFixed(1) || '0'}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg RSI</p>
            <p className="text-2xl font-bold">{result.avgRSI?.toFixed(1) || '50'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">RSI Period</p>
            <p className="text-2xl font-bold">{result.period || 14}</p>
          </CardContent>
        </Card>
      </div>

      {showEducation && (
        <EducationCard>
          RSI (Relative Strength Index) measures momentum on a 0-100 scale.
          Values above 70 suggest the stock may be overbought and due for a pullback.
          Values below 30 suggest oversold conditions and potential bounce.
          Current RSI of {currentRSI.toFixed(1)} indicates {isOverbought ? "overbought conditions" : isOversold ? "oversold conditions" : "neutral momentum"}.
        </EducationCard>
      )}
    </div>
  );
}

function EnhancedTrendStrengthResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const score = result.score || 0;
  const maxScore = result.maxScore || 5;
  const percentage = (score / maxScore) * 100;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <RadialProgress
          value={percentage}
          max={100}
          label="Trend Score"
          sublabel={`${score}/${maxScore}`}
          size="lg"
          colorScheme={score >= 4 ? 'success' : score <= 1 ? 'danger' : 'warning'}
        />
        
        <div className="flex-1 space-y-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">Trend Direction</p>
              <div className="flex items-center gap-2">
                {score >= 3 ? (
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                ) : score <= 2 ? (
                  <TrendingDown className="h-6 w-6 text-rose-500" />
                ) : (
                  <Activity className="h-6 w-6 text-amber-500" />
                )}
                <span className="text-xl font-bold">
                  {score >= 4 ? 'Strong Uptrend' : score >= 3 ? 'Uptrend' : score <= 1 ? 'Strong Downtrend' : score <= 2 ? 'Downtrend' : 'Mixed'}
                </span>
              </div>
            </CardContent>
          </Card>
          
          {result.components && (
            <div className="grid grid-cols-2 gap-2">
              {result.components.map((comp: any, i: number) => (
                <div key={i} className={cn(
                  "p-2 rounded-lg text-sm flex items-center gap-2",
                  comp.met ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted/50"
                )}>
                  {comp.met ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <Activity className="h-4 w-4 text-muted-foreground" />}
                  <span>{comp.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showEducation && (
        <EducationCard>
          Trend strength is scored from 0-{maxScore} based on multiple factors:
          price above/below moving averages and moving average alignment.
          A score of {score} indicates {score >= 4 ? 'strong bullish momentum' : score >= 3 ? 'bullish conditions' : score <= 1 ? 'strong bearish momentum' : score <= 2 ? 'bearish conditions' : 'mixed signals'}.
        </EducationCard>
      )}
    </div>
  );
}

function EnhancedVolatilityResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const annualizedVolValue = safeNumber(result.annualizedVol);
  const isHighVol = (annualizedVolValue ?? 0) > 30;
  const dailyRangeValue = typeof result.dailyRange === 'object' ? result.dailyRange?.avg : result.avgDailyRange;
  const atrValue = typeof result.atr === 'object' ? result.atr?.current : result.atr14;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={cn(isHighVol && "border-amber-300 dark:border-amber-700")}>
          <CardContent className="pt-4 text-center">
            <Zap className={cn("h-6 w-6 mx-auto mb-2", isHighVol ? "text-amber-500" : "text-muted-foreground")} />
            <p className="text-xs text-muted-foreground">Annualized Vol</p>
            <p className="text-2xl font-bold">{annualizedVolValue?.toFixed(1) ?? 'N/A'}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Daily Range</p>
            <p className="text-2xl font-bold">{dailyRangeValue?.toFixed(2) ?? 'N/A'}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">ATR (14)</p>
            <p className="text-2xl font-bold">${atrValue?.toFixed(2) ?? 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Vol Clustering</p>
            <p className="text-2xl font-bold">{result.volatilityClustering?.toFixed(1) ?? 'N/A'}%</p>
          </CardContent>
        </Card>
      </div>

      {showInsights && (
        <InsightsCard insights={[
          isHighVol 
            ? { type: 'warning', text: `High volatility (${annualizedVolValue?.toFixed(1) ?? 'N/A'}%) - expect larger daily moves` }
            : { type: 'positive', text: 'Normal volatility levels - typical trading conditions' }
        ]} />
      )}

      {showEducation && (
        <EducationCard>
          Volatility measures how much price fluctuates. Higher volatility means larger potential gains 
          but also larger potential losses. An annualized volatility of {annualizedVolValue?.toFixed(1) ?? 'N/A'}% 
          means you can expect the stock to move roughly this much over a year (in standard deviation terms).
        </EducationCard>
      )}
    </div>
  );
}

function EnhancedDrawdownResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  const isSevere = result.maxDrawdown > 30;
  
  return (
    <div className="space-y-6">
      <Card className={cn(
        "text-center p-6",
        isSevere ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200" : ""
      )}>
        <TrendingDown className="h-10 w-10 mx-auto mb-2 text-rose-500" />
        <p className="text-sm text-muted-foreground mb-2">Maximum Drawdown</p>
        <p className="text-5xl font-bold text-rose-600">-{result.maxDrawdown?.toFixed(1)}%</p>
        {result.maxDrawdownDate && (
          <p className="text-xs text-muted-foreground mt-2">on {result.maxDrawdownDate}</p>
        )}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Drawdown</p>
            <p className="text-2xl font-bold">-{result.avgDrawdown?.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Recovery</p>
            <p className="text-2xl font-bold">{result.avgRecoveryDays?.toFixed(0)} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Current Drawdown</p>
            <p className="text-2xl font-bold">-{result.currentDrawdown?.toFixed(1) || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {showEducation && (
        <EducationCard>
          Drawdown measures peak-to-trough decline. A max drawdown of {result.maxDrawdown?.toFixed(1)}% 
          means at worst, the stock fell this much from its high before recovering. 
          {isSevere && " This is a significant drawdown - consider position sizing accordingly."}
        </EducationCard>
      )}
    </div>
  );
}

function GenericEnhancedResult({ result, showInsights, showEducation }: { result: any; showInsights: boolean; showEducation: boolean }) {
  // Extract numeric values for display
  const metrics = Object.entries(result)
    .filter(([key, value]) => 
      typeof value === 'number' && 
      !['type'].includes(key)
    )
    .slice(0, 8);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {metrics.map(([key, value]) => (
          <div key={key} className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-[10px] text-muted-foreground capitalize truncate">
              {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
            </p>
            <p className="text-lg font-bold font-mono">
              {typeof value === 'number' 
                ? value % 1 === 0 
                  ? value 
                  : value.toFixed(2)
                : String(value)}
            </p>
          </div>
        ))}
      </div>

      {result.interpretation && showInsights && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          <Lightbulb className="inline h-3 w-3 text-amber-500 mr-1" />
          {result.interpretation}
        </p>
      )}
    </div>
  );
}

// ======================== HELPER COMPONENTS ========================

function InsightsCard({ insights }: { insights: Array<{ type: string; text: string }> }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
        Insights
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {insights.map((insight, i) => (
          <span key={i} className={cn(
            "inline-flex items-center gap-1.5 text-sm",
            insight.type === 'positive' && "text-emerald-600 dark:text-emerald-400",
            insight.type === 'negative' && "text-rose-600 dark:text-rose-400",
            insight.type === 'warning' && "text-amber-600 dark:text-amber-400",
            insight.type === 'neutral' && "text-muted-foreground"
          )}>
            {insight.type === 'positive' && <TrendingUp className="h-3.5 w-3.5" />}
            {insight.type === 'negative' && <TrendingDown className="h-3.5 w-3.5" />}
            {insight.type === 'warning' && <AlertCircle className="h-3.5 w-3.5" />}
            {insight.type === 'neutral' && <Activity className="h-3.5 w-3.5" />}
            {insight.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function InsightRow({ type, icon, children }: { type: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg text-sm",
      type === 'positive' && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
      type === 'negative' && "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
      type === 'warning' && "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
    )}>
      {icon}
      {children}
    </div>
  );
}

function EducationCard({ title = "What This Means", children }: { title?: string; children: React.ReactNode }) {
  return (
    <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <GraduationCap className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-blue-800/80 dark:text-blue-200/80">
        <p>{children}</p>
      </CardContent>
    </Card>
  );
}
