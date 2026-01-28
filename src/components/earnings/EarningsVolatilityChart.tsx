// src/components/earnings/EarningsVolatilityChart.tsx

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface VolatilityMetrics {
  avgSurprise: number;
  stdDev: number;
  consistencyScore: number;
  recentTrend: number;
  volatilityChange: number;
}

interface Props {
  history: Array<{
    report_date: string;
    eps_surprise_pct: number | null;
    fiscal_period: string | null;
  }>;
}

export const EarningsVolatilityChart = ({ history }: Props) => {
  const metrics = useMemo(() => {
    if (!history || history.length < 4) return null;

    const surprises = history.map(h => h.eps_surprise_pct || 0);
    
    // Calculate all metrics
    const avgSurprise = surprises.reduce((sum, val) => sum + val, 0) / surprises.length;
    
    const variance = surprises.reduce((sum, val) => 
      sum + Math.pow(val - avgSurprise, 2), 0) / surprises.length;
    const stdDev = Math.sqrt(variance);
    
    const consistencyScore = Math.max(0, Math.min(1, 1 - (stdDev / 20)));
    
    // Recent trend (last 4 quarters)
    const recentSurprises = surprises.slice(0, Math.min(4, surprises.length));
    const recentAvg = recentSurprises.reduce((sum, val) => sum + val, 0) / recentSurprises.length;
    const recentTrend = recentAvg - avgSurprise;
    
    // Recent volatility
    let recentVolatility = 0;
    if (recentSurprises.length >= 3) {
      const recentVariance = recentSurprises.reduce((sum, val) => 
        sum + Math.pow(val - recentAvg, 2), 0) / recentSurprises.length;
      recentVolatility = Math.sqrt(recentVariance);
    }
    const volatilityChange = recentVolatility - stdDev;

    return {
      avgSurprise,
      stdDev,
      consistencyScore,
      recentTrend,
      volatilityChange,
    };
  }, [history]);

  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .map(h => ({
        date: format(parseISO(h.report_date), 'MMM yy'),
        fullDate: h.report_date,
        surprise: h.eps_surprise_pct || 0,
        period: h.fiscal_period || '',
      }));
  }, [history]);

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Insufficient data for volatility analysis (minimum 4 quarters required)
        </CardContent>
      </Card>
    );
  }

  const getConsistencyBadge = () => {
    const score = metrics.consistencyScore;
    if (score >= 0.7) return { variant: 'default' as const, label: 'Highly Consistent', color: 'text-green-600' };
    if (score >= 0.5) return { variant: 'secondary' as const, label: 'Moderately Consistent', color: 'text-yellow-600' };
    return { variant: 'destructive' as const, label: 'Volatile', color: 'text-red-600' };
  };

  const getTrendIndicator = () => {
    if (metrics.recentTrend > 2) return { icon: TrendingUp, color: 'text-green-600', label: 'Improving' };
    if (metrics.recentTrend < -2) return { icon: TrendingDown, color: 'text-red-600', label: 'Declining' };
    return { icon: Activity, color: 'text-muted-foreground', label: 'Stable' };
  };

  const consistencyBadge = getConsistencyBadge();
  const trendIndicator = getTrendIndicator();
  const TrendIcon = trendIndicator.icon;

  return (
    <div className="space-y-4">
      {/* Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Consistency Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {(metrics.consistencyScore * 100).toFixed(0)}%
              </div>
              <Badge variant={consistencyBadge.variant} className="text-xs">
                {consistencyBadge.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                σ = {metrics.stdDev.toFixed(2)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Recent Trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendIcon className={`h-6 w-6 ${trendIndicator.color}`} />
                <span className={`text-2xl font-bold ${trendIndicator.color}`}>
                  {metrics.recentTrend > 0 ? '+' : ''}
                  {metrics.recentTrend.toFixed(1)}%
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {trendIndicator.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                vs historical avg
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Volatility Regime</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {metrics.volatilityChange > 0 ? '+' : ''}
                {metrics.volatilityChange.toFixed(2)}%
              </div>
              <Badge 
                variant={Math.abs(metrics.volatilityChange) < 2 ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {Math.abs(metrics.volatilityChange) < 2 ? 'Stable' : 'Changing'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                recent vs historical σ
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Surprise History Chart with Bands */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Earnings Surprise History</CardTitle>
          <CardDescription>
            Historical performance with ±1σ bands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'currentColor', fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'currentColor', fontSize: 12 }}
                label={{ value: 'Surprise %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold">{data.period}</p>
                      <p className="text-sm text-muted-foreground">{data.date}</p>
                      <p className="text-sm font-mono mt-1">
                        Surprise: {data.surprise > 0 ? '+' : ''}{data.surprise.toFixed(2)}%
                      </p>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={0} stroke="currentColor" strokeDasharray="3 3" />
              <ReferenceLine 
                y={metrics.avgSurprise} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5"
                label={{ value: 'Avg', position: 'right', fill: 'hsl(var(--primary))' }}
              />
              <ReferenceLine 
                y={metrics.avgSurprise + metrics.stdDev} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="2 2"
                strokeOpacity={0.5}
              />
              <ReferenceLine 
                y={metrics.avgSurprise - metrics.stdDev} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="2 2"
                strokeOpacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="surprise"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Volatility Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volatility Analysis</CardTitle>
          <CardDescription>
            Understanding earnings predictability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between items-start py-2 border-b">
            <div>
              <p className="font-medium">Standard Deviation</p>
              <p className="text-xs text-muted-foreground">
                Measure of earnings surprise volatility
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono font-semibold">{metrics.stdDev.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">
                {metrics.stdDev < 5 ? 'Very low' : metrics.stdDev < 10 ? 'Low' : metrics.stdDev < 15 ? 'Moderate' : 'High'}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-start py-2 border-b">
            <div>
              <p className="font-medium">Historical Average</p>
              <p className="text-xs text-muted-foreground">
                Long-term surprise tendency
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono font-semibold">
                {metrics.avgSurprise > 0 ? '+' : ''}{metrics.avgSurprise.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.avgSurprise > 5 ? 'Beat bias' : metrics.avgSurprise < -5 ? 'Miss bias' : 'Neutral'}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-start py-2">
            <div>
              <p className="font-medium">Predictability Rating</p>
              <p className="text-xs text-muted-foreground">
                Based on consistency and volatility
              </p>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${consistencyBadge.color}`}>
                {consistencyBadge.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.consistencyScore >= 0.7 ? 'High confidence' : 
                 metrics.consistencyScore >= 0.5 ? 'Moderate confidence' : 
                 'Low confidence'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
