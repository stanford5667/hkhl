import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid, Area, AreaChart,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
};

const PIE_COLORS = [COLORS.green, COLORS.red, COLORS.yellow];
const BAR_COLORS = [
  'hsl(0 84.2% 60.2%)',      // red (low)
  'hsl(25 95% 53%)',         // orange
  'hsl(47.9 95.8% 53.1%)',   // yellow
  'hsl(142.1 70% 45%)',      // light green
  'hsl(142.1 76.2% 36.3%)',  // green
  'hsl(142.1 80% 28%)',      // dark green (high)
];

export function StudyVisualizations({ studyId, result }: StudyVisualizationsProps) {
  const visualizations = useMemo(() => {
    if (!result) return null;

    switch (studyId) {
      case 'close_to_open_analysis':
        return <CloseToOpenVisualizations result={result} />;
      case 'daily_win_rate':
        return <DailyWinRateVisualizations result={result} />;
      case 'volatility_analysis':
        return <VolatilityVisualizations result={result} />;
      case 'gap_analysis':
        return <GapAnalysisVisualizations result={result} />;
      case 'rsi_analysis':
        return <RSIVisualizations result={result} />;
      case 'monthly_seasonality':
      case 'day_of_week':
        return <SeasonalityVisualizations result={result} studyId={studyId} />;
      default:
        return <GenericVisualizations result={result} />;
    }
  }, [studyId, result]);

  return (
    <div className="space-y-6">
      {visualizations}
    </div>
  );
}

// Close vs Open Study Visualizations
function CloseToOpenVisualizations({ result }: { result: any }) {
  // Distribution chart data
  const distributionData = result.distribution || [];
  
  // Day type pie chart data
  const dayTypeData = [
    { name: 'Green Days', value: result.greenDays?.count || 0, color: COLORS.green },
    { name: 'Red Days', value: result.redDays?.count || 0, color: COLORS.red },
    { name: 'Doji Days', value: result.dojiDays?.count || 0, color: COLORS.yellow },
  ];

  // Follow-through data
  const followThroughData = [
    { 
      name: 'After Near High', 
      avgReturn: result.followThrough?.afterClosedNearHigh?.avgReturn || 0,
      hitRate: result.followThrough?.afterClosedNearHigh?.hitRate || 0,
      count: result.followThrough?.afterClosedNearHigh?.count || 0
    },
    { 
      name: 'After Near Low', 
      avgReturn: result.followThrough?.afterClosedNearLow?.avgReturn || 0,
      hitRate: result.followThrough?.afterClosedNearLow?.hitRate || 0,
      count: result.followThrough?.afterClosedNearLow?.count || 0
    },
    { 
      name: 'After Strong Green', 
      avgReturn: result.followThrough?.afterStrongGreen?.avgReturn || 0,
      hitRate: result.followThrough?.afterStrongGreen?.hitRate || 0,
      count: result.followThrough?.afterStrongGreen?.count || 0
    },
    { 
      name: 'After Strong Red', 
      avgReturn: result.followThrough?.afterStrongRed?.avgReturn || 0,
      hitRate: result.followThrough?.afterStrongRed?.hitRate || 0,
      count: result.followThrough?.afterStrongRed?.count || 0
    },
    { 
      name: 'After Doji', 
      avgReturn: result.followThrough?.afterDoji?.avgReturn || 0,
      hitRate: result.followThrough?.afterDoji?.hitRate || 0,
      count: result.followThrough?.afterDoji?.count || 0
    },
  ];

  // Recent patterns visual
  const recentPatterns = result.recentPatterns || [];

  return (
    <div className="space-y-6">
      {/* Close Position Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Close Position Distribution</CardTitle>
          <p className="text-xs text-muted-foreground">Where does price close within the daily range?</p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="range" width={100} tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => [`${value} days`, 'Count']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {distributionData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index] || COLORS.blue} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Day Types Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Day Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dayTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {dayTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => [`${value} days`, '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Move Size Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Move Size Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Average Move</span>
                <span className="font-bold font-mono">{(result.moveSizeDistribution?.avgMove || 0).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Avg Up
                </span>
                <span className="font-bold font-mono text-emerald-600">+{(result.moveSizeDistribution?.avgUp || 0).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" /> Avg Down
                </span>
                <span className="font-bold font-mono text-red-600">-{(result.moveSizeDistribution?.avgDown || 0).toFixed(2)}%</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="text-center p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Largest Up</p>
                  <p className="font-bold text-emerald-600">+{(result.moveSizeDistribution?.largestUp || 0).toFixed(2)}%</p>
                </div>
                <div className="text-center p-2 bg-red-100 dark:bg-red-950/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Largest Down</p>
                  <p className="font-bold text-red-600">{(result.moveSizeDistribution?.largestDown || 0).toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-Through Analysis */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Follow-Through Analysis</CardTitle>
          <p className="text-xs text-muted-foreground">What happens the next day after each pattern?</p>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={followThroughData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={(v) => `${v.toFixed(2)}%`} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number, name: string) => [
                    name === 'avgReturn' ? `${value.toFixed(3)}%` : `${value.toFixed(1)}%`,
                    name === 'avgReturn' ? 'Avg Return' : 'Hit Rate'
                  ]}
                />
                <Bar dataKey="avgReturn" name="Avg Return" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Hit Rates */}
          <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t">
            {followThroughData.map((item) => (
              <div key={item.name} className="text-center p-2 bg-muted/30 rounded-lg">
                <p className="text-[10px] text-muted-foreground truncate">{item.name.replace('After ', '')}</p>
                <p className="font-bold text-sm">{item.hitRate.toFixed(0)}%</p>
                <p className="text-[10px] text-muted-foreground">win rate</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Pattern Strip */}
      {recentPatterns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Last 10 Trading Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1.5">
              {recentPatterns.map((pattern: any, i: number) => (
                <div 
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1.5"
                >
                  {/* Candle visual */}
                  <div 
                    className="relative w-full h-24 rounded-md flex flex-col justify-end overflow-hidden"
                    style={{ background: 'hsl(var(--muted)/0.3)' }}
                  >
                    <div 
                      className="w-full transition-all"
                      style={{ 
                        height: `${pattern.position}%`,
                        background: pattern.type === 'green' ? COLORS.green : 
                                   pattern.type === 'red' ? COLORS.red : COLORS.yellow,
                        opacity: 0.8
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono">{pattern.move}</span>
                  <span className="text-[8px] text-muted-foreground">{pattern.date?.slice(5)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Daily Win Rate Visualizations
function DailyWinRateVisualizations({ result }: { result: any }) {
  const winLossData = [
    { name: 'Winning Days', value: result.winningDays || 0, color: COLORS.green },
    { name: 'Losing Days', value: result.losingDays || 0, color: COLORS.red },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Win/Loss Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winLossData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Win Rate Gauge */}
          <div className="mt-4 p-4 bg-gradient-to-r from-red-500/10 via-yellow-500/10 to-green-500/10 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Win Rate</span>
              <span className="font-bold text-xl">{(result.winRate || 0).toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                style={{ width: `${result.winRate || 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900">
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Avg Gain</p>
              <p className="text-2xl font-bold text-emerald-600">+{(result.avgGain || 0).toFixed(2)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingDown className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Avg Loss</p>
              <p className="text-2xl font-bold text-red-600">{(result.avgLoss || 0).toFixed(2)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Volatility Visualizations
function VolatilityVisualizations({ result }: { result: any }) {
  const volatilityBuckets = result.volatilityBuckets || [];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Volatility Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={volatilityBuckets}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              />
              <Area type="monotone" dataKey="count" fill={COLORS.purple} fillOpacity={0.6} stroke={COLORS.purple} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Gap Analysis Visualizations
function GapAnalysisVisualizations({ result }: { result: any }) {
  const gapData = [
    { name: 'Gap Up', value: result.gapUpCount || 0, fill: result.gapUpFillRate || 0 },
    { name: 'Gap Down', value: result.gapDownCount || 0, fill: result.gapDownFillRate || 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-emerald-50 dark:bg-emerald-950/30">
        <CardContent className="pt-6 text-center">
          <TrendingUp className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-3xl font-bold text-emerald-600">{result.gapUpCount || 0}</p>
          <p className="text-sm text-muted-foreground">Gap Ups</p>
          <Badge variant="secondary" className="mt-2">
            {(result.gapUpFillRate || 0).toFixed(0)}% fill rate
          </Badge>
        </CardContent>
      </Card>
      <Card className="bg-red-50 dark:bg-red-950/30">
        <CardContent className="pt-6 text-center">
          <TrendingDown className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-3xl font-bold text-red-600">{result.gapDownCount || 0}</p>
          <p className="text-sm text-muted-foreground">Gap Downs</p>
          <Badge variant="secondary" className="mt-2">
            {(result.gapDownFillRate || 0).toFixed(0)}% fill rate
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

// RSI Visualizations
function RSIVisualizations({ result }: { result: any }) {
  const zoneData = [
    { name: 'Oversold (<30)', value: result.oversoldCount || 0, color: COLORS.green },
    { name: 'Neutral (30-70)', value: result.neutralCount || 0, color: COLORS.muted },
    { name: 'Overbought (>70)', value: result.overboughtCount || 0, color: COLORS.red },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">RSI Zone Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={zoneData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {zoneData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Current RSI */}
        <div className="mt-4 p-4 bg-muted/30 rounded-xl text-center">
          <p className="text-sm text-muted-foreground mb-1">Current RSI</p>
          <p className="text-3xl font-bold">{(result.currentRSI || 0).toFixed(1)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Seasonality Visualizations
function SeasonalityVisualizations({ result, studyId }: { result: any; studyId: string }) {
  const isMonthly = studyId === 'monthly_seasonality';
  const data = isMonthly ? result.monthlyReturns : result.dayOfWeekReturns;

  if (!data || !Array.isArray(data)) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          {isMonthly ? 'Monthly Returns' : 'Day of Week Returns'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey={isMonthly ? 'month' : 'day'} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip 
                contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Avg Return']}
              />
              <Bar dataKey="avgReturn" radius={[4, 4, 0, 0]}>
                {data.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.avgReturn >= 0 ? COLORS.green : COLORS.red} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Generic fallback visualizations
function GenericVisualizations({ result }: { result: any }) {
  // Try to find any array data to visualize
  const arrayKeys = Object.keys(result).filter(key => Array.isArray(result[key]));
  
  if (arrayKeys.length === 0) return null;

  const firstArrayKey = arrayKeys[0];
  const data = result[firstArrayKey];

  if (data.length === 0) return null;

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
            <BarChart data={data.slice(0, 10)}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="value" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
