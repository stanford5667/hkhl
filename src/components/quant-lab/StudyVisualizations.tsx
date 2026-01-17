/**
 * StudyVisualizations - Dedicated visualizations for each study type
 * Maps exactly to the data returned by the run-asset-study edge function
 */

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid, Area, AreaChart,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Target, Activity, Zap } from 'lucide-react';

interface StudyVisualizationsProps {
  studyId: string;
  result: any;
}

const COLORS = {
  green: 'hsl(142.1 76.2% 36.3%)',
  red: 'hsl(0 84.2% 60.2%)',
  yellow: 'hsl(47.9 95.8% 53.1%)',
  blue: 'hsl(221.2 83.2% 53.3%)',
  purple: 'hsl(262.1 83.3% 57.8%)',
  muted: 'hsl(215.4 16.3% 46.9%)',
  orange: 'hsl(25 95% 53%)',
  cyan: 'hsl(189 94% 43%)',
};

const PIE_COLORS = [COLORS.green, COLORS.red, COLORS.yellow, COLORS.blue];
const BAR_COLORS = [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.green, COLORS.blue, COLORS.purple];

export function StudyVisualizations({ studyId, result }: StudyVisualizationsProps) {
  const visualizations = useMemo(() => {
    if (!result) return null;

    switch (studyId) {
      // Basic Statistics
      case 'daily_close_gt_open':
        return <IntradayDirectionViz result={result} />;
      case 'daily_close_gt_prior':
        return <DailyWinRateViz result={result} />;
      case 'daily_return_distribution':
        return <ReturnDistributionViz result={result} />;
      case 'up_down_streaks':
        return <StreaksViz result={result} />;
      
      // Seasonality
      case 'day_of_week_returns':
        return <DayOfWeekViz result={result} />;
      case 'month_of_year_returns':
        return <MonthOfYearViz result={result} />;
      
      // Technical
      case 'rsi_analysis':
        return <RSIViz result={result} />;
      case 'moving_average_analysis':
        return <MovingAverageViz result={result} />;
      case 'trend_strength':
        return <TrendStrengthViz result={result} />;
      case 'macd_analysis':
        return <MACDViz result={result} />;
      case 'bollinger_analysis':
        return <BollingerViz result={result} />;
      case 'stochastic_analysis':
        return <StochasticViz result={result} />;
      
      // Volatility & Risk
      case 'volatility_analysis':
        return <VolatilityViz result={result} />;
      case 'drawdown_analysis':
        return <DrawdownViz result={result} />;
      case 'mean_reversion':
        return <MeanReversionViz result={result} />;
      
      // Price Patterns
      case 'gap_analysis':
        return <GapAnalysisViz result={result} />;
      case 'range_analysis':
        return <RangeAnalysisViz result={result} />;
      case 'high_low_analysis':
        return <HighLowViz result={result} />;
      case 'close_to_open_analysis':
        return <CloseToOpenViz result={result} />;
      
      // Volume
      case 'volume_analysis':
        return <VolumeViz result={result} />;
      
      // Projections
      case 'price_targets':
        return <PriceTargetsViz result={result} />;
      
      // Conditional Studies
      case 'after_down_x':
      case 'after_up_x':
      case 'after_consecutive_days':
      case 'after_high_volume':
      case 'after_gap':
      case 'below_ma':
      case 'after_drawdown':
        return <ConditionalStudyViz result={result} studyId={studyId} />;
      
      default:
        return <GenericViz result={result} />;
    }
  }, [studyId, result]);

  return <div className="space-y-6">{visualizations}</div>;
}

// ==================== BASIC STATISTICS ====================

function IntradayDirectionViz({ result }: { result: any }) {
  const pieData = [
    { name: 'Up Days', value: result.up_days || 0, color: COLORS.green },
    { name: 'Down Days', value: result.down_days || 0, color: COLORS.red },
    { name: 'Unchanged', value: result.unchanged || 0, color: COLORS.muted },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Intraday Direction Distribution</CardTitle>
          <p className="text-xs text-muted-foreground">Close vs Open comparison</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center space-y-3">
              <div className="text-center p-4 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-xl">
                <p className="text-4xl font-bold text-emerald-600">{(result.percentage || 0).toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Closed Above Open</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-sm">
                <div className="p-2 bg-muted/30 rounded-lg">
                  <p className="font-bold text-emerald-600">{result.up_days}</p>
                  <p className="text-xs text-muted-foreground">Up Days</p>
                </div>
                <div className="p-2 bg-muted/30 rounded-lg">
                  <p className="font-bold text-red-600">{result.down_days}</p>
                  <p className="text-xs text-muted-foreground">Down Days</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DailyWinRateViz({ result }: { result: any }) {
  const pieData = [
    { name: 'Winning Days', value: result.up_days || 0, color: COLORS.green },
    { name: 'Losing Days', value: result.down_days || 0, color: COLORS.red },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Daily Win Rate</CardTitle>
          <p className="text-xs text-muted-foreground">Close vs Prior Close</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center">
              <div className="p-4 bg-gradient-to-r from-blue-500/10 via-yellow-500/10 to-green-500/10 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="font-bold text-2xl">{(result.percentage || 0).toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${result.percentage || 0}%` }} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {result.total_days} total trading days analyzed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReturnDistributionViz({ result }: { result: any }) {
  const histogramData = result.histogram || [];
  const percentiles = result.percentiles || {};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Daily Return Distribution</CardTitle>
          <p className="text-xs text-muted-foreground">Histogram of daily percentage moves</p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [v, 'Days']} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {histogramData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.range >= 0 ? COLORS.green : COLORS.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Mean" value={`${(result.mean || 0).toFixed(3)}%`} color={result.mean >= 0 ? 'green' : 'red'} />
        <StatCard label="Std Dev" value={`${(result.stdDev || 0).toFixed(2)}%`} color="blue" />
        <StatCard label="Median (P50)" value={`${(percentiles.p50 || 0).toFixed(2)}%`} color="purple" />
        <StatCard label="Min" value={`${(result.min || 0).toFixed(2)}%`} color="red" />
        <StatCard label="Max" value={`${(result.max || 0).toFixed(2)}%`} color="green" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="5th Percentile" value={`${(percentiles.p5 || 0).toFixed(2)}%`} color="muted" />
        <StatCard label="25th Percentile" value={`${(percentiles.p25 || 0).toFixed(2)}%`} color="muted" />
        <StatCard label="75th Percentile" value={`${(percentiles.p75 || 0).toFixed(2)}%`} color="muted" />
        <StatCard label="95th Percentile" value={`${(percentiles.p95 || 0).toFixed(2)}%`} color="muted" />
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Skewness</p>
              <p className="font-bold">{(result.skewness || 0).toFixed(3)}</p>
              <p className="text-[10px] text-muted-foreground">{result.skewness > 0.5 ? 'Right-skewed' : result.skewness < -0.5 ? 'Left-skewed' : 'Symmetric'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Kurtosis</p>
              <p className="font-bold">{(result.kurtosis || 0).toFixed(3)}</p>
              <p className="text-[10px] text-muted-foreground">{result.kurtosis > 1 ? 'Fat tails' : result.kurtosis < -1 ? 'Thin tails' : 'Normal'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Annualized Vol</p>
              <p className="font-bold">{(result.annualizedVol || 0).toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">{result.annualizedVol > 30 ? 'High' : result.annualizedVol < 15 ? 'Low' : 'Moderate'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StreaksViz({ result }: { result: any }) {
  const distribution = result.distribution || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Max Win Streak" value={`${result.maxUpStreak} days`} color="green" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Max Loss Streak" value={`${result.maxDownStreak} days`} color="red" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Avg Win Streak" value={`${(result.avgUpStreak || 0).toFixed(1)} days`} color="green" />
        <StatCard label="Avg Loss Streak" value={`${(result.avgDownStreak || 0).toFixed(1)} days`} color="red" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Streak Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="length" tick={{ fontSize: 11 }} label={{ value: 'Streak Length', position: 'bottom', fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="up" name="Up Streaks" fill={COLORS.green} />
                <Bar dataKey="down" name="Down Streaks" fill={COLORS.red} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-sm text-muted-foreground">Current Streak</span>
            <div className="flex items-center gap-2">
              {result.currentDirection === 'up' ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <span className={`font-bold text-lg ${result.currentDirection === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {Math.abs(result.currentStreak)} {result.currentDirection === 'up' ? 'up' : 'down'} days
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== SEASONALITY ====================

function DayOfWeekViz({ result }: { result: any }) {
  const stats = result.stats || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Day of Week Returns</CardTitle>
          <p className="text-xs text-muted-foreground">Average return by weekday</p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [`${v.toFixed(3)}%`, 'Avg Return']} />
                <ReferenceLine y={0} stroke={COLORS.muted} strokeDasharray="3 3" />
                <Bar dataKey="avgReturn" radius={[4, 4, 0, 0]}>
                  {stats.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.avgReturn >= 0 ? COLORS.green : COLORS.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Win Rates by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {stats.map((day: any) => (
              <div key={day.name} className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-medium mb-1">{day.name.slice(0, 3)}</p>
                <p className={`text-lg font-bold ${day.hitRate >= 55 ? 'text-emerald-600' : day.hitRate <= 45 ? 'text-red-600' : 'text-foreground'}`}>
                  {day.hitRate.toFixed(0)}%
                </p>
                <p className="text-[10px] text-muted-foreground">{day.count} days</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MonthOfYearViz({ result }: { result: any }) {
  const stats = result.stats || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Monthly Seasonality</CardTitle>
          <p className="text-xs text-muted-foreground">Average return by month</p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [`${v.toFixed(2)}%`, 'Avg Return']} />
                <ReferenceLine y={0} stroke={COLORS.muted} strokeDasharray="3 3" />
                <Bar dataKey="avgReturn" radius={[4, 4, 0, 0]}>
                  {stats.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.avgReturn >= 0 ? COLORS.green : COLORS.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
        {stats.map((month: any) => (
          <div key={month.name} className={`text-center p-2 rounded-lg ${month.avgReturn >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
            <p className="text-xs font-medium">{month.name}</p>
            <p className={`font-bold ${month.avgReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {month.avgReturn >= 0 ? '+' : ''}{month.avgReturn.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">{month.hitRate.toFixed(0)}% win</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== TECHNICAL ====================

function RSIViz({ result }: { result: any }) {
  const distribution = result.distribution || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">RSI Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.range.includes('0-') || entry.range.includes('20-30') ? COLORS.green : entry.range.includes('70-') || entry.range.includes('80-') ? COLORS.red : COLORS.blue} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-muted/30 rounded-xl text-center">
            <p className="text-sm text-muted-foreground mb-1">Current RSI</p>
            <p className={`text-4xl font-bold ${result.current > 70 ? 'text-red-600' : result.current < 30 ? 'text-emerald-600' : 'text-foreground'}`}>
              {(result.current || 0).toFixed(1)}
            </p>
            <Badge variant={result.current > 70 ? 'destructive' : result.current < 30 ? 'default' : 'secondary'} className="mt-2">
              {result.current > 70 ? 'Overbought' : result.current < 30 ? 'Oversold' : 'Neutral'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-2">After Overbought (RSI &gt; 70)</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Occurrences</span>
                <span className="font-bold">{result.afterOverbought?.count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Return (5d)</span>
                <span className={`font-bold ${(result.afterOverbought?.avgReturn || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(result.afterOverbought?.avgReturn || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-bold">{(result.afterOverbought?.hitRate || 0).toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-2">After Oversold (RSI &lt; 30)</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Occurrences</span>
                <span className="font-bold">{result.afterOversold?.count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Return (5d)</span>
                <span className={`font-bold ${(result.afterOversold?.avgReturn || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(result.afterOversold?.avgReturn || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-bold">{(result.afterOversold?.hitRate || 0).toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MovingAverageViz({ result }: { result: any }) {
  const periods = ['ma20', 'ma50', 'ma200'];
  const maData = periods.map(p => result[p]).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {periods.map(period => {
          const ma = result[period];
          if (!ma) return null;
          const label = period.replace('ma', '') + '-Day';
          return (
            <Card key={period}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm font-medium mb-2">{label} Moving Average</p>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {ma.currentAboveSMA ? (
                      <Badge variant="default" className="bg-emerald-500">Above SMA</Badge>
                    ) : (
                      <Badge variant="destructive">Below SMA</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold">${ma.sma?.toFixed(2)}</p>
                  <p className={`text-sm ${ma.distFromSMA >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {ma.distFromSMA >= 0 ? '+' : ''}{ma.distFromSMA?.toFixed(2)}% from MA
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Above MA {ma.pctAboveSMA?.toFixed(0)}% of time
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {result.crosses && result.crosses.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent MA Crossovers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.crosses.slice(-5).map((cross: any, i: number) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${cross.type === 'golden' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                  <span className="text-sm">{cross.date}</span>
                  <Badge variant={cross.type === 'golden' ? 'default' : 'destructive'}>
                    {cross.type === 'golden' ? '🌟 Golden Cross' : '💀 Death Cross'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-muted-foreground">Current Trend:</span>
            <Badge variant={result.currentTrend === 'bullish' ? 'default' : 'destructive'} className="text-lg px-4 py-1">
              {result.currentTrend === 'bullish' ? '📈 Bullish' : '📉 Bearish'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendStrengthViz({ result }: { result: any }) {
  const score = result.trendScore || 0;
  const maxScore = result.maxScore || 5;
  const percentage = (score / maxScore) * 100;

  const checklistItems = [
    { label: 'Price > 20 SMA', value: result.aboveSMA20 },
    { label: 'Price > 50 SMA', value: result.aboveSMA50 },
    { label: 'Price > 200 SMA', value: result.aboveSMA200 },
    { label: '20 SMA > 50 SMA', value: result.sma20AboveSMA50 },
    { label: '50 SMA > 200 SMA', value: result.sma50AboveSMA200 },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Trend Strength Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <p className={`text-6xl font-bold ${score >= 4 ? 'text-emerald-600' : score <= 1 ? 'text-red-600' : 'text-yellow-600'}`}>
              {score}/{maxScore}
            </p>
            <Badge variant={score >= 4 ? 'default' : score <= 1 ? 'destructive' : 'secondary'} className="mt-2">
              {result.trendDirection?.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <Progress value={percentage} className="h-3" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Trend Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checklistItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <span className="text-sm">{item.label}</span>
                {item.value ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Minus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Higher Highs Rate" value={`${(result.higherHighsRate || 0).toFixed(0)}%`} color={result.higherHighsRate >= 50 ? 'green' : 'red'} />
        <StatCard label="Higher Lows Rate" value={`${(result.higherLowsRate || 0).toFixed(0)}%`} color={result.higherLowsRate >= 50 ? 'green' : 'red'} />
      </div>
    </div>
  );
}

function MACDViz({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="MACD Line" value={(result.current?.macd || 0).toFixed(3)} color={result.current?.macd >= 0 ? 'green' : 'red'} />
        <StatCard label="Signal Line" value={(result.current?.signal || 0).toFixed(3)} color="blue" />
        <StatCard label="Histogram" value={(result.current?.histogram || 0).toFixed(3)} color={result.current?.histogram >= 0 ? 'green' : 'red'} />
        <StatCard label="Trend" value={result.current?.trend || 'N/A'} color={result.current?.trend === 'bullish' ? 'green' : 'red'} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">MACD Crossover Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-center">
              <p className="text-sm font-medium mb-2">Bullish Crossovers</p>
              <p className="text-2xl font-bold">{result.crossovers?.bullish || 0}</p>
              <p className="text-sm text-muted-foreground">Avg Return: {(result.afterBullishCrossover?.avgReturn || 0).toFixed(2)}%</p>
              <p className="text-sm text-muted-foreground">Win Rate: {(result.afterBullishCrossover?.hitRate || 0).toFixed(0)}%</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg text-center">
              <p className="text-sm font-medium mb-2">Bearish Crossovers</p>
              <p className="text-2xl font-bold">{result.crossovers?.bearish || 0}</p>
              <p className="text-sm text-muted-foreground">Avg Return: {(result.afterBearishCrossover?.avgReturn || 0).toFixed(2)}%</p>
              <p className="text-sm text-muted-foreground">Win Rate: {(result.afterBearishCrossover?.hitRate || 0).toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {result.crossovers?.recent && result.crossovers.recent.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Crossovers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.crossovers.recent.map((cross: any, i: number) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${cross.type === 'bullish' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                  <span className="text-sm">{cross.date}</span>
                  <Badge variant={cross.type === 'bullish' ? 'default' : 'destructive'}>{cross.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BollingerViz({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Upper Band" value={`$${(result.bands?.upper || 0).toFixed(2)}`} color="red" />
        <StatCard label="Middle Band" value={`$${(result.bands?.middle || 0).toFixed(2)}`} color="blue" />
        <StatCard label="Lower Band" value={`$${(result.bands?.lower || 0).toFixed(2)}`} color="green" />
        <StatCard label="Band Width" value={`${(result.bandwidth?.current || 0).toFixed(2)}%`} color="purple" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Current Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 bg-muted/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">Price Position Within Bands</p>
            <p className={`text-4xl font-bold ${result.position?.zone === 'upper' ? 'text-red-600' : result.position?.zone === 'lower' ? 'text-emerald-600' : 'text-foreground'}`}>
              {(result.position?.percentB || 0).toFixed(0)}%
            </p>
            <Badge variant={result.position?.zone === 'upper' ? 'destructive' : result.position?.zone === 'lower' ? 'default' : 'secondary'} className="mt-2">
              {result.position?.zone === 'upper' ? 'Near Upper Band' : result.position?.zone === 'lower' ? 'Near Lower Band' : 'Middle Zone'}
            </Badge>
            {result.bandwidth?.isSqueeze && (
              <Badge variant="outline" className="ml-2 border-purple-500 text-purple-500">
                🎯 Squeeze Active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-2">Upper Band Touches</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Count:</span><span className="font-bold">{result.upperBandTouches?.count || 0}</span></div>
              <div className="flex justify-between"><span>Avg 5d Return:</span><span className="font-bold">{(result.upperBandTouches?.avgReturn5d || 0).toFixed(2)}%</span></div>
              <div className="flex justify-between"><span>Reversal Rate:</span><span className="font-bold">{(result.upperBandTouches?.hitRate || 0).toFixed(0)}%</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-2">Lower Band Touches</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Count:</span><span className="font-bold">{result.lowerBandTouches?.count || 0}</span></div>
              <div className="flex justify-between"><span>Avg 5d Return:</span><span className="font-bold">{(result.lowerBandTouches?.avgReturn5d || 0).toFixed(2)}%</span></div>
              <div className="flex justify-between"><span>Bounce Rate:</span><span className="font-bold">{(result.lowerBandTouches?.hitRate || 0).toFixed(0)}%</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StochasticViz({ result }: { result: any }) {
  const zones = result.zones || {};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Current Stochastic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 bg-muted/30 rounded-xl">
              <p className="text-sm text-muted-foreground">%K</p>
              <p className={`text-3xl font-bold ${result.current?.k > 80 ? 'text-red-600' : result.current?.k < 20 ? 'text-emerald-600' : 'text-foreground'}`}>
                {(result.current?.k || 0).toFixed(1)}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-xl">
              <p className="text-sm text-muted-foreground">%D</p>
              <p className="text-3xl font-bold">{(result.current?.d || 0).toFixed(1)}</p>
            </div>
          </div>
          <div className="flex justify-center gap-2">
            <Badge variant={result.current?.zone === 'overbought' ? 'destructive' : result.current?.zone === 'oversold' ? 'default' : 'secondary'}>
              {result.current?.zone}
            </Badge>
            <Badge variant={result.current?.trend === 'bullish' ? 'default' : 'destructive'}>
              {result.current?.trend}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Zone Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Overbought (&gt;80)</span>
                <span className="font-bold">{(zones.overboughtPct || 0).toFixed(1)}%</span>
              </div>
              <Progress value={zones.overboughtPct || 0} className="h-2 bg-muted" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Neutral</span>
                <span className="font-bold">{(zones.neutralPct || 0).toFixed(1)}%</span>
              </div>
              <Progress value={zones.neutralPct || 0} className="h-2 bg-muted" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Oversold (&lt;20)</span>
                <span className="font-bold">{(zones.oversoldPct || 0).toFixed(1)}%</span>
              </div>
              <Progress value={zones.oversoldPct || 0} className="h-2 bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Bullish Crossovers" value={result.crossovers?.bullish || 0} color="green" />
        <StatCard label="Bearish Crossovers" value={result.crossovers?.bearish || 0} color="red" />
      </div>
    </div>
  );
}

// ==================== VOLATILITY & RISK ====================

function VolatilityViz({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Current ATR" value={`$${(result.atr?.current || 0).toFixed(2)}`} color="blue" />
        <StatCard label="Avg ATR" value={`$${(result.atr?.avg || 0).toFixed(2)}`} color="muted" />
        <StatCard label="Daily Range" value={`${(result.dailyRange?.avg || 0).toFixed(2)}%`} color="purple" />
        <StatCard label="Annualized Vol" value={`${(result.annualizedVol?.current || 0).toFixed(1)}%`} color="orange" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Volatility Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span>Current vs Average Volatility</span>
                <span className="font-bold">{((result.annualizedVol?.current / result.annualizedVol?.avg - 1) * 100 || 0).toFixed(0)}%</span>
              </div>
              <Progress value={Math.min((result.annualizedVol?.current / result.annualizedVol?.max) * 100 || 0, 100)} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Min: {(result.annualizedVol?.min || 0).toFixed(1)}%</span>
                <span>Max: {(result.annualizedVol?.max || 0).toFixed(1)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Clustering</p>
                <p className="font-bold">{(result.volatilityClustering || 0).toFixed(0)}%</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Max Daily Range</p>
                <p className="font-bold">{(result.dailyRange?.max || 0).toFixed(2)}%</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Min Daily Range</p>
                <p className="font-bold">{(result.dailyRange?.min || 0).toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DrawdownViz({ result }: { result: any }) {
  const drawdowns = result.significantDrawdowns || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Max Drawdown" value={`-${(result.maxDrawdown || 0).toFixed(1)}%`} color="red" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Current DD" value={`-${(result.currentDrawdown || 0).toFixed(1)}%`} color={result.currentDrawdown > 5 ? 'red' : 'green'} />
        <StatCard label="Avg Drawdown" value={`-${(result.avgDrawdown || 0).toFixed(1)}%`} color="orange" />
        <StatCard label="Avg Recovery" value={`${(result.avgRecoveryDays || 0).toFixed(0)} days`} color="blue" />
      </div>

      {drawdowns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Significant Drawdowns (&gt;5%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {drawdowns.map((dd: any, i: number) => (
                <div key={i} className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{dd.startDate} → {dd.endDate}</span>
                    <Badge variant="destructive">-{dd.maxDrawdown.toFixed(1)}%</Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Duration: {dd.duration} days</span>
                    <span>{dd.recovered ? '✅ Recovered' : '⏳ Not Recovered'}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Drawdowns</p>
              <p className="text-2xl font-bold">{result.totalDrawdowns || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Longest Drawdown</p>
              <p className="text-2xl font-bold">{result.longestDrawdown || 0} days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MeanReversionViz({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Market Regime</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 bg-muted/30 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">Autocorrelation</p>
            <p className="text-4xl font-bold">{(result.autocorrelation || 0).toFixed(3)}</p>
            <Badge variant={result.regime === 'mean_reverting' ? 'default' : result.regime === 'trending' ? 'secondary' : 'outline'} className="mt-3">
              {result.regime === 'mean_reverting' ? '↔️ Mean Reverting' : result.regime === 'trending' ? '📈 Trending' : '🎲 Random Walk'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-2">After Large Up Days</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Occurrences:</span>
                <span className="font-bold">{result.afterLargeUp?.count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Next Day:</span>
                <span className={`font-bold ${(result.afterLargeUp?.avgNextDayReturn || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(result.afterLargeUp?.avgNextDayReturn || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Reversal Rate:</span>
                <span className="font-bold">{(result.afterLargeUp?.reversalRate || 0).toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-2">After Large Down Days</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Occurrences:</span>
                <span className="font-bold">{result.afterLargeDown?.count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Next Day:</span>
                <span className={`font-bold ${(result.afterLargeDown?.avgNextDayReturn || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(result.afterLargeDown?.avgNextDayReturn || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bounce Rate:</span>
                <span className="font-bold">{(result.afterLargeDown?.reversalRate || 0).toFixed(0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== PRICE PATTERNS ====================

function GapAnalysisViz({ result }: { result: any }) {
  const gapsUp = result.gapsUp || {};
  const gapsDown = result.gapsDown || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="pt-4 text-center">
            <TrendingUp className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-emerald-600">{gapsUp.count || 0}</p>
            <p className="text-sm text-muted-foreground">Gap Ups</p>
            <div className="mt-3 space-y-1 text-sm text-left">
              <div className="flex justify-between"><span>Avg Size:</span><span className="font-bold">+{(gapsUp.avgGapSize || 0).toFixed(2)}%</span></div>
              <div className="flex justify-between"><span>Fill Rate:</span><span className="font-bold">{(gapsUp.fillRate || 0).toFixed(0)}%</span></div>
              <div className="flex justify-between"><span>Continuation:</span><span className="font-bold">{(gapsUp.continuationRate || 0).toFixed(0)}%</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-4 text-center">
            <TrendingDown className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-600">{gapsDown.count || 0}</p>
            <p className="text-sm text-muted-foreground">Gap Downs</p>
            <div className="mt-3 space-y-1 text-sm text-left">
              <div className="flex justify-between"><span>Avg Size:</span><span className="font-bold">{(gapsDown.avgGapSize || 0).toFixed(2)}%</span></div>
              <div className="flex justify-between"><span>Fill Rate:</span><span className="font-bold">{(gapsDown.fillRate || 0).toFixed(0)}%</span></div>
              <div className="flex justify-between"><span>Continuation:</span><span className="font-bold">{(gapsDown.continuationRate || 0).toFixed(0)}%</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {result.recentGaps && result.recentGaps.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.recentGaps.slice(-5).map((gap: any, i: number) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${gap.gapPercent > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                  <span className="text-sm">{gap.date}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={gap.gapPercent > 0 ? 'default' : 'destructive'}>
                      {gap.gapPercent > 0 ? '+' : ''}{gap.gapPercent.toFixed(2)}%
                    </Badge>
                    {gap.filled && <Badge variant="outline">Filled</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RangeAnalysisViz({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Avg Daily Range" value={`${(result.avgRangePercent || 0).toFixed(2)}%`} color="blue" />
        <StatCard label="Avg Body %" value={`${(result.avgBodyPercent || 0).toFixed(0)}%`} color="purple" />
        <StatCard label="Doji Rate" value={`${(result.dojiRate || 0).toFixed(1)}%`} color="yellow" />
        <StatCard label="Avg Dollar Range" value={`$${(result.avgDailyRange || 0).toFixed(2)}`} color="muted" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Inside Days
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Count:</span><span className="font-bold">{result.insideDays?.count || 0}</span></div>
              <div className="flex justify-between"><span>Rate:</span><span className="font-bold">{(result.insideDays?.rate || 0).toFixed(1)}%</span></div>
              <div className="flex justify-between">
                <span>Avg Next Day:</span>
                <span className={`font-bold ${(result.insideDays?.avgNextDayReturn || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(result.insideDays?.avgNextDayReturn || 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" /> Outside Days
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Count:</span><span className="font-bold">{result.outsideDays?.count || 0}</span></div>
              <div className="flex justify-between"><span>Rate:</span><span className="font-bold">{(result.outsideDays?.rate || 0).toFixed(1)}%</span></div>
              <div className="flex justify-between">
                <span>Avg Next Day:</span>
                <span className={`font-bold ${(result.outsideDays?.avgNextDayReturn || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(result.outsideDays?.avgNextDayReturn || 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HighLowViz({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="52-Week High" value={`$${(result.yearHigh || 0).toFixed(2)}`} color="green" />
        <StatCard label="52-Week Low" value={`$${(result.yearLow || 0).toFixed(2)}`} color="red" />
        <StatCard label="From High" value={`${(result.distFromHigh || 0).toFixed(1)}%`} color={result.distFromHigh >= 0 ? 'green' : 'red'} />
        <StatCard label="From Low" value={`+${(result.distFromLow || 0).toFixed(1)}%`} color="green" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">After New Highs</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Total:</span><span className="font-bold">{result.newHighs?.count || 0}</span></div>
              <div className="flex justify-between"><span>Rate:</span><span className="font-bold">{(result.newHighs?.rate || 0).toFixed(1)}%</span></div>
              <div className="flex justify-between">
                <span>Avg Return (5d):</span>
                <span className={`font-bold ${(result.newHighs?.avgReturn || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(result.newHighs?.avgReturn || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between"><span>Hit Rate:</span><span className="font-bold">{(result.newHighs?.hitRate || 0).toFixed(0)}%</span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-4">
            <p className="text-sm font-medium mb-3">After New Lows</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Total:</span><span className="font-bold">{result.newLows?.count || 0}</span></div>
              <div className="flex justify-between"><span>Rate:</span><span className="font-bold">{(result.newLows?.rate || 0).toFixed(1)}%</span></div>
              <div className="flex justify-between">
                <span>Avg Return (5d):</span>
                <span className={`font-bold ${(result.newLows?.avgReturn || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(result.newLows?.avgReturn || 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between"><span>Hit Rate:</span><span className="font-bold">{(result.newLows?.hitRate || 0).toFixed(0)}%</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CloseToOpenViz({ result }: { result: any }) {
  const summary = result.summary || {};
  const distribution = result.distribution || [];
  const followThrough = result.followThrough || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Green Days" value={`${(summary.greenDays?.pct || 0).toFixed(1)}%`} color="green" />
        <StatCard label="Red Days" value={`${(summary.redDays?.pct || 0).toFixed(1)}%`} color="red" />
        <StatCard label="Doji Days" value={`${(summary.dojiDays?.pct || 0).toFixed(1)}%`} color="yellow" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Close Position Distribution</CardTitle>
          <p className="text-xs text-muted-foreground">Where does price close within the day's range?</p>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="range" width={100} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {distribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index] || COLORS.blue} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Follow-Through Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">After Near High</p>
              <p className="font-bold">{(followThrough.afterClosedNearHigh?.avgReturn || 0).toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">{(followThrough.afterClosedNearHigh?.hitRate || 0).toFixed(0)}% win</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">After Near Low</p>
              <p className="font-bold">{(followThrough.afterClosedNearLow?.avgReturn || 0).toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">{(followThrough.afterClosedNearLow?.hitRate || 0).toFixed(0)}% win</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">After Doji</p>
              <p className="font-bold">{(followThrough.afterDoji?.avgReturn || 0).toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">{(followThrough.afterDoji?.hitRate || 0).toFixed(0)}% win</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {result.recentPatterns && result.recentPatterns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Last 10 Trading Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1">
              {result.recentPatterns.map((pattern: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="w-full h-16 rounded-md flex flex-col justify-end overflow-hidden bg-muted/30">
                    <div className="w-full transition-all" style={{ height: `${pattern.position}%`, background: pattern.type === 'green' ? COLORS.green : pattern.type === 'red' ? COLORS.red : COLORS.yellow, opacity: 0.8 }} />
                  </div>
                  <span className="text-[8px] text-muted-foreground mt-1">{pattern.move}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== VOLUME ====================

function VolumeViz({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Current Volume" value={formatVolume(result.currentVolume)} color="blue" />
        <StatCard label="Avg Volume" value={formatVolume(result.avgVolume)} color="muted" />
        <StatCard label="Volume Ratio" value={`${(result.volumeRatio || 0).toFixed(2)}x`} color={result.volumeRatio > 1.5 ? 'green' : result.volumeRatio < 0.5 ? 'red' : 'muted'} />
        <StatCard label="Bias" value={result.volumeBias || 'N/A'} color={result.volumeBias === 'accumulation' ? 'green' : 'red'} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Volume Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <p className="text-sm font-medium mb-2">Up Day Volume</p>
              <p className="text-2xl font-bold">{formatVolume(result.upDayAvgVolume)}</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <p className="text-sm font-medium mb-2">Down Day Volume</p>
              <p className="text-2xl font-bold">{formatVolume(result.downDayAvgVolume)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3">High Volume Days Performance</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Count</p>
              <p className="font-bold">{result.highVolumeDays?.count || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Return</p>
              <p className={`font-bold ${(result.highVolumeDays?.avgReturn || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {(result.highVolumeDays?.avgReturn || 0).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hit Rate</p>
              <p className="font-bold">{(result.highVolumeDays?.hitRate || 0).toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== PROJECTIONS ====================

function PriceTargetsViz({ result }: { result: any }) {
  const projections = result.projections || {};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Current Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-4xl font-bold">${(result.currentPrice || 0).toFixed(2)}</p>
            <div className="flex justify-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>Daily Return: {(result.dailyReturn || 0).toFixed(3)}%</span>
              <span>Daily Vol: {(result.dailyVol || 0).toFixed(2)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {projections.days30 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">30-Day Projections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 text-center text-sm">
              <div className="p-2 bg-red-100 dark:bg-red-950/50 rounded">
                <p className="text-xs text-muted-foreground">Worst</p>
                <p className="font-bold text-red-600">${projections.days30.worst?.toFixed(2)}</p>
              </div>
              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded">
                <p className="text-xs text-muted-foreground">Bear</p>
                <p className="font-bold text-red-500">${projections.days30.bear?.toFixed(2)}</p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                <p className="text-xs text-muted-foreground">Expected</p>
                <p className="font-bold">${projections.days30.expected?.toFixed(2)}</p>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                <p className="text-xs text-muted-foreground">Bull</p>
                <p className="font-bold text-emerald-500">${projections.days30.bull?.toFixed(2)}</p>
              </div>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded">
                <p className="text-xs text-muted-foreground">Best</p>
                <p className="font-bold text-emerald-600">${projections.days30.best?.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result.keyLevels && result.keyLevels.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Key Price Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.nearestResistance && (
                <div className="flex justify-between p-2 bg-red-50 dark:bg-red-950/30 rounded">
                  <span className="text-sm">Nearest Resistance</span>
                  <span className="font-bold text-red-600">${result.nearestResistance.toFixed(2)}</span>
                </div>
              )}
              {result.nearestSupport && (
                <div className="flex justify-between p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                  <span className="text-sm">Nearest Support</span>
                  <span className="font-bold text-emerald-600">${result.nearestSupport.toFixed(2)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== CONDITIONAL STUDIES ====================

function ConditionalStudyViz({ result, studyId }: { result: any; studyId: string }) {
  const analysis = result.analysis || [];
  const recentEvents = result.recentEvents || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Forward Return Analysis</CardTitle>
          <p className="text-xs text-muted-foreground">{result.totalOccurrences || 0} total occurrences ({(result.percentOfDays || 0).toFixed(1)}% of days)</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.map((item: any) => (
              <div key={item.days} className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{item.days} Day{item.days > 1 ? 's' : ''} Forward</span>
                  <Badge variant={item.winRate >= 55 ? 'default' : item.winRate <= 45 ? 'destructive' : 'secondary'}>
                    {item.winRate.toFixed(1)}% win rate
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Return</p>
                    <p className={`font-bold ${item.avgReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.avgReturn >= 0 ? '+' : ''}{item.avgReturn.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Median</p>
                    <p className={`font-bold ${item.median >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.median >= 0 ? '+' : ''}{item.median.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Best</p>
                    <p className="font-bold text-emerald-600">+{item.best.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Worst</p>
                    <p className="font-bold text-red-600">{item.worst.toFixed(2)}%</p>
                  </div>
                </div>
                
                {/* Distribution visualization */}
                {item.dataPoints && item.dataPoints.length > 0 && (
                  <div className="mt-3 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={item.dataPoints.map((v: number, i: number) => ({ idx: i, value: v }))}>
                        <Bar dataKey="value" radius={[1, 1, 0, 0]}>
                          {item.dataPoints.map((v: number, i: number) => (
                            <Cell key={i} fill={v >= 0 ? COLORS.green : COLORS.red} />
                          ))}
                        </Bar>
                        <ReferenceLine y={0} stroke={COLORS.muted} strokeDasharray="2 2" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {result.insight && (
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-blue-500 mt-0.5" />
              <p className="text-sm">{result.insight}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {recentEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentEvents.slice(-10).map((event: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                  <span>{event.date}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{event.drop || event.gain || event.gap || 'N/A'}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <span className={`font-bold ${parseFloat(event.nextDay) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {event.nextDay}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== GENERIC FALLBACK ====================

function GenericViz({ result }: { result: any }) {
  const arrayKeys = Object.keys(result).filter(key => Array.isArray(result[key]) && result[key].length > 0);
  
  if (arrayKeys.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <pre className="text-xs overflow-auto max-h-64 bg-muted/30 p-4 rounded-lg">
            {JSON.stringify(result, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }

  const firstArrayKey = arrayKeys[0];
  const data = result[firstArrayKey].slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold capitalize">
          {firstArrayKey.replace(/([A-Z])/g, ' $1').trim()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="value" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== HELPER COMPONENTS ====================

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon?: React.ReactNode }) {
  const colorClass = {
    green: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600',
    red: 'bg-red-50 dark:bg-red-950/30 text-red-600',
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600',
    purple: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600',
    orange: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600',
    muted: 'bg-muted/30 text-foreground',
  }[color] || 'bg-muted/30 text-foreground';

  return (
    <Card className={colorClass}>
      <CardContent className="pt-4 text-center">
        {icon && <div className="flex justify-center mb-1">{icon}</div>}
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="font-bold text-lg">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatVolume(vol: number | undefined): string {
  if (!vol) return '0';
  if (vol >= 1000000000) return (vol / 1000000000).toFixed(1) + 'B';
  if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
  if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
  return vol.toFixed(0);
}
