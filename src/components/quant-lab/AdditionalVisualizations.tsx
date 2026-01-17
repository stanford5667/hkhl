import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, Area, AreaChart,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, ReferenceLine, Scatter, ScatterChart, ZAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, Minus, Activity, 
  Target, AlertTriangle, CheckCircle, XCircle,
  ArrowUp, ArrowDown, Zap, Calendar, Clock,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Color palette
const COLORS = {
  primary: 'hsl(var(--primary))',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  pink: '#ec4899',
  slate: '#64748b',
  gradient: ['#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b']
};

// ==================== BULLET CHART ====================
interface BulletChartProps {
  value: number;
  target?: number;
  ranges: { poor: number; ok: number; good: number };
  label: string;
  max?: number;
}

export function BulletChart({ value, target, ranges, label, max = 100 }: BulletChartProps) {
  const width = 100;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-mono font-bold">{value.toFixed(1)}</span>
      </div>
      <div className="relative h-6 bg-muted rounded overflow-hidden">
        {/* Poor range */}
        <div 
          className="absolute h-full bg-rose-200 dark:bg-rose-900/50"
          style={{ width: `${(ranges.poor / max) * 100}%` }}
        />
        {/* OK range */}
        <div 
          className="absolute h-full bg-amber-200 dark:bg-amber-900/50"
          style={{ left: `${(ranges.poor / max) * 100}%`, width: `${((ranges.ok - ranges.poor) / max) * 100}%` }}
        />
        {/* Good range */}
        <div 
          className="absolute h-full bg-emerald-200 dark:bg-emerald-900/50"
          style={{ left: `${(ranges.ok / max) * 100}%`, width: `${((ranges.good - ranges.ok) / max) * 100}%` }}
        />
        {/* Value bar */}
        <div 
          className="absolute h-3 bg-slate-800 dark:bg-slate-200 top-1.5 rounded"
          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        />
        {/* Target marker */}
        {target !== undefined && (
          <div 
            className="absolute w-0.5 h-full bg-red-600"
            style={{ left: `${(target / max) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}

// ==================== WATERFALL CHART ====================
interface WaterfallData {
  name: string;
  value: number;
  isTotal?: boolean;
}

export function WaterfallChart({ data }: { data: WaterfallData[] }) {
  // Calculate cumulative values
  let cumulative = 0;
  const chartData = data.map((item, index) => {
    if (item.isTotal) {
      return { ...item, start: 0, end: cumulative };
    }
    const start = cumulative;
    cumulative += item.value;
    return { ...item, start, end: cumulative };
  });

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip 
          formatter={(value: number, name: string) => {
            if (name === 'start') return null;
            return [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, 'Change'];
          }}
          contentStyle={{ 
            background: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))' 
          }}
        />
        <Bar dataKey="start" stackId="a" fill="transparent" />
        <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell 
              key={index} 
              fill={entry.isTotal ? COLORS.blue : entry.value >= 0 ? COLORS.emerald : COLORS.rose}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ==================== LOLLIPOP CHART ====================
interface LollipopData {
  name: string;
  value: number;
}

export function LollipopChart({ data, horizontal = true }: { data: LollipopData[]; horizontal?: boolean }) {
  const maxValue = Math.max(...data.map(d => Math.abs(d.value)));

  if (horizontal) {
    return (
      <div className="space-y-3">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-xs font-medium w-16 truncate">{item.name}</span>
            <div className="flex-1 relative h-2">
              <div className="absolute inset-0 bg-muted/30 rounded-full" />
              <div 
                className={cn(
                  "absolute h-full rounded-full transition-all",
                  item.value >= 0 ? "bg-emerald-500" : "bg-rose-500"
                )}
                style={{ width: `${(Math.abs(item.value) / maxValue) * 100}%` }}
              />
              <div 
                className={cn(
                  "absolute h-4 w-4 rounded-full -top-1 shadow-md flex items-center justify-center",
                  item.value >= 0 ? "bg-emerald-500" : "bg-rose-500"
                )}
                style={{ left: `calc(${(Math.abs(item.value) / maxValue) * 100}% - 8px)` }}
              />
            </div>
            <span className={cn(
              "text-xs font-mono w-14 text-right",
              item.value >= 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {item.value >= 0 ? '+' : ''}{item.value.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" fill={COLORS.blue} barSize={4} />
        <Scatter dataKey="value" fill={COLORS.blue} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ==================== RADIAL BAR PROGRESS ====================
interface RadialProgressProps {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  colorScheme?: 'default' | 'success' | 'warning' | 'danger';
}

export function RadialProgress({ 
  value, 
  max = 100, 
  label, 
  sublabel,
  size = 'md',
  colorScheme = 'default'
}: RadialProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizes = {
    sm: { outer: 80, inner: 60, stroke: 8, text: 'text-lg' },
    md: { outer: 120, inner: 92, stroke: 12, text: 'text-2xl' },
    lg: { outer: 160, inner: 124, stroke: 16, text: 'text-3xl' },
  };
  
  const colors = {
    default: COLORS.blue,
    success: COLORS.emerald,
    warning: COLORS.amber,
    danger: COLORS.rose,
  };
  
  const { outer, inner, stroke, text } = sizes[size];
  const radius = (outer - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: outer, height: outer }}>
        <svg className="transform -rotate-90" width={outer} height={outer}>
          {/* Background circle */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted/20"
            strokeWidth={stroke}
          />
          {/* Progress circle */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke={colors[colorScheme]}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', text)}>{value.toFixed(1)}</span>
          {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        </div>
      </div>
      <span className="text-sm text-muted-foreground mt-2">{label}</span>
    </div>
  );
}

// ==================== COMPARISON MATRIX ====================
interface MatrixData {
  rowLabels: string[];
  colLabels: string[];
  values: number[][];
}

export function ComparisonMatrix({ data }: { data: MatrixData }) {
  const maxAbs = Math.max(...data.values.flat().map(Math.abs));

  const getColor = (value: number) => {
    const intensity = Math.min(Math.abs(value) / maxAbs, 1);
    if (value > 0) {
      return `rgba(16, 185, 129, ${intensity * 0.8 + 0.1})`;
    } else if (value < 0) {
      return `rgba(244, 63, 94, ${intensity * 0.8 + 0.1})`;
    }
    return 'rgba(100, 116, 139, 0.2)';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2" />
            {data.colLabels.map((label, idx) => (
              <th key={idx} className="p-2 text-xs font-medium text-muted-foreground">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.values.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td className="p-2 text-xs font-medium text-muted-foreground text-right">
                {data.rowLabels[rowIdx]}
              </td>
              {row.map((value, colIdx) => (
                <td 
                  key={colIdx} 
                  className="p-2 text-center"
                  style={{ backgroundColor: getColor(value) }}
                >
                  <span className="text-xs font-mono font-bold">
                    {value >= 0 ? '+' : ''}{value.toFixed(1)}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== TREND INDICATOR ====================
interface TrendIndicatorProps {
  current: number;
  previous: number;
  label: string;
  format?: (v: number) => string;
}

export function TrendIndicator({ current, previous, label, format }: TrendIndicatorProps) {
  const change = current - previous;
  const changePercent = previous !== 0 ? ((change / Math.abs(previous)) * 100) : 0;
  const isPositive = change >= 0;
  const formatFn = format || ((v: number) => v.toFixed(2));

  return (
    <div className="p-4 rounded-xl border bg-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold">{formatFn(current)}</p>
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          isPositive 
            ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
            : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
        )}>
          {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(changePercent).toFixed(1)}%
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-muted-foreground">vs previous:</span>
        <span className="text-xs font-mono">{formatFn(previous)}</span>
        <span className={cn(
          "text-xs font-mono",
          isPositive ? "text-emerald-600" : "text-rose-600"
        )}>
          ({isPositive ? '+' : ''}{formatFn(change)})
        </span>
      </div>
    </div>
  );
}

// ==================== PERCENTILE BAR ====================
interface PercentileBarProps {
  value: number;
  percentile: number;
  label: string;
  format?: (v: number) => string;
}

export function PercentileBar({ value, percentile, label, format }: PercentileBarProps) {
  const formatFn = format || ((v: number) => v.toFixed(2));
  
  const getPercentileColor = () => {
    if (percentile >= 75) return 'emerald';
    if (percentile >= 50) return 'blue';
    if (percentile >= 25) return 'amber';
    return 'rose';
  };

  const color = getPercentileColor();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">{formatFn(value)}</span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              color === 'emerald' && "bg-emerald-50 text-emerald-700 border-emerald-200",
              color === 'blue' && "bg-blue-50 text-blue-700 border-blue-200",
              color === 'amber' && "bg-amber-50 text-amber-700 border-amber-200",
              color === 'rose' && "bg-rose-50 text-rose-700 border-rose-200"
            )}
          >
            {percentile}th %ile
          </Badge>
        </div>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "absolute h-full rounded-full transition-all",
            color === 'emerald' && "bg-emerald-500",
            color === 'blue' && "bg-blue-500",
            color === 'amber' && "bg-amber-500",
            color === 'rose' && "bg-rose-500"
          )}
          style={{ width: `${percentile}%` }}
        />
        <div 
          className="absolute w-0.5 h-4 -top-1 bg-foreground"
          style={{ left: `${percentile}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ==================== MINI SPARKLINE AREA ====================
export function SparklineArea({ 
  data, 
  height = 40, 
  color = COLORS.blue,
  showRange = false 
}: { 
  data: number[]; 
  height?: number; 
  color?: string;
  showRange?: boolean;
}) {
  const chartData = data.map((value, index) => ({ value, index }));
  const min = Math.min(...data);
  const max = Math.max(...data);
  const last = data[data.length - 1];
  const first = data[0];
  const isUp = last >= first;

  return (
    <div className="space-y-1">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isUp ? COLORS.emerald : COLORS.rose} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={isUp ? COLORS.emerald : COLORS.rose} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={isUp ? COLORS.emerald : COLORS.rose}
            strokeWidth={1.5}
            fill={`url(#gradient-${color})`}
          />
        </AreaChart>
      </ResponsiveContainer>
      {showRange && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>L: {min.toFixed(2)}</span>
          <span className={cn(
            "font-medium",
            isUp ? "text-emerald-600" : "text-rose-600"
          )}>
            {isUp ? '▲' : '▼'} {((last - first) / Math.abs(first) * 100).toFixed(1)}%
          </span>
          <span>H: {max.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

// ==================== CALENDAR HEATMAP ====================
interface CalendarHeatmapProps {
  data: Array<{ date: string; value: number }>;
  startDate?: Date;
  weeks?: number;
}

export function CalendarHeatmap({ data, weeks = 12 }: CalendarHeatmapProps) {
  const maxVal = Math.max(...data.map(d => Math.abs(d.value)));
  
  const getColor = (value: number) => {
    const intensity = Math.min(Math.abs(value) / maxVal, 1);
    if (value > 0) {
      return `rgba(16, 185, 129, ${intensity * 0.8 + 0.2})`;
    } else if (value < 0) {
      return `rgba(244, 63, 94, ${intensity * 0.8 + 0.2})`;
    }
    return 'rgba(100, 116, 139, 0.2)';
  };

  // Create weeks of data
  const weekData: Array<Array<{ date: string; value: number } | null>> = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  
  for (let w = 0; w < weeks; w++) {
    const week: Array<{ date: string; value: number } | null> = [];
    for (let d = 0; d < 5; d++) {
      const idx = w * 5 + d;
      week.push(data[idx] || null);
    }
    weekData.push(week);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-0.5">
        <div className="flex flex-col gap-0.5 mr-1">
          {days.map(day => (
            <div key={day} className="h-3 text-[10px] text-muted-foreground flex items-center">
              {day}
            </div>
          ))}
        </div>
        {weekData.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-0.5">
            {week.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: day ? getColor(day.value) : 'rgba(100, 116, 139, 0.1)' }}
                title={day ? `${day.date}: ${day.value >= 0 ? '+' : ''}${day.value.toFixed(2)}%` : ''}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <span>Loss</span>
        <div className="flex gap-0.5">
          {[-1, -0.5, 0, 0.5, 1].map((v, i) => (
            <div 
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getColor(v * maxVal) }}
            />
          ))}
        </div>
        <span>Gain</span>
      </div>
    </div>
  );
}

// ==================== DONUT CHART WITH CENTER ====================
interface DonutData {
  name: string;
  value: number;
  color?: string;
}

export function DonutWithCenter({ 
  data, 
  centerValue, 
  centerLabel,
  size = 200 
}: { 
  data: DonutData[]; 
  centerValue: string | number;
  centerLabel: string;
  size?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const RADIAN = Math.PI / 180;
  
  const colors = [COLORS.emerald, COLORS.rose, COLORS.amber, COLORS.blue, COLORS.purple];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.35}
              outerRadius={size * 0.45}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color || colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${((value / total) * 100).toFixed(1)}%`, 'Share']}
              contentStyle={{ 
                background: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))' 
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{centerValue}</span>
          <span className="text-xs text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color || colors[index % colors.length] }}
            />
            <span className="text-xs">{entry.name}</span>
            <span className="text-xs font-mono text-muted-foreground">
              ({((entry.value / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== STAT CARD WITH CHART ====================
interface StatCardWithChartProps {
  title: string;
  value: string | number;
  change?: number;
  chartData: number[];
  icon?: React.ReactNode;
}

export function StatCardWithChart({ title, value, change, chartData, icon }: StatCardWithChartProps) {
  const isPositive = change === undefined || change >= 0;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              {icon}
              {title}
            </p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-xs mt-1",
                isPositive ? "text-emerald-600" : "text-rose-600"
              )}>
                {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(change).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
        <SparklineArea data={chartData} height={50} showRange />
      </CardContent>
    </Card>
  );
}

// ==================== SCORE BREAKDOWN ====================
interface ScoreBreakdownProps {
  scores: Array<{ label: string; score: number; maxScore: number; weight?: number }>;
  totalScore: number;
  maxTotalScore: number;
}

export function ScoreBreakdown({ scores, totalScore, maxTotalScore }: ScoreBreakdownProps) {
  const percentage = (totalScore / maxTotalScore) * 100;
  
  const getGrade = () => {
    if (percentage >= 90) return { grade: 'A+', color: 'emerald' };
    if (percentage >= 80) return { grade: 'A', color: 'emerald' };
    if (percentage >= 70) return { grade: 'B', color: 'blue' };
    if (percentage >= 60) return { grade: 'C', color: 'amber' };
    if (percentage >= 50) return { grade: 'D', color: 'orange' };
    return { grade: 'F', color: 'rose' };
  };

  const { grade, color } = getGrade();

  return (
    <div className="space-y-4">
      {/* Total Score */}
      <div className={cn(
        "p-4 rounded-xl text-center",
        color === 'emerald' && "bg-emerald-50 dark:bg-emerald-950/30",
        color === 'blue' && "bg-blue-50 dark:bg-blue-950/30",
        color === 'amber' && "bg-amber-50 dark:bg-amber-950/30",
        color === 'orange' && "bg-orange-50 dark:bg-orange-950/30",
        color === 'rose' && "bg-rose-50 dark:bg-rose-950/30"
      )}>
        <div className="flex items-center justify-center gap-3">
          <span className={cn(
            "text-4xl font-bold",
            color === 'emerald' && "text-emerald-600",
            color === 'blue' && "text-blue-600",
            color === 'amber' && "text-amber-600",
            color === 'orange' && "text-orange-600",
            color === 'rose' && "text-rose-600"
          )}>
            {totalScore}
          </span>
          <span className="text-lg text-muted-foreground">/ {maxTotalScore}</span>
          <Badge className={cn(
            "text-lg px-3 py-1",
            color === 'emerald' && "bg-emerald-500",
            color === 'blue' && "bg-blue-500",
            color === 'amber' && "bg-amber-500",
            color === 'orange' && "bg-orange-500",
            color === 'rose' && "bg-rose-500"
          )}>
            {grade}
          </Badge>
        </div>
      </div>

      {/* Individual Scores */}
      <div className="space-y-3">
        {scores.map((item, idx) => {
          const pct = (item.score / item.maxScore) * 100;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="font-mono">
                  {item.score}/{item.maxScore}
                  {item.weight && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (×{item.weight})
                    </span>
                  )}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== TIMELINE CHART ====================
interface TimelineEvent {
  date: string;
  label: string;
  value?: number;
  type?: 'positive' | 'negative' | 'neutral';
}

export function TimelineChart({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      
      <div className="space-y-4">
        {events.map((event, idx) => (
          <div key={idx} className="flex gap-4 items-start">
            <div className={cn(
              "relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-white",
              event.type === 'positive' && "bg-emerald-500",
              event.type === 'negative' && "bg-rose-500",
              (!event.type || event.type === 'neutral') && "bg-slate-500"
            )}>
              {event.type === 'positive' && <ArrowUp className="h-4 w-4" />}
              {event.type === 'negative' && <ArrowDown className="h-4 w-4" />}
              {(!event.type || event.type === 'neutral') && <Minus className="h-4 w-4" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{event.label}</p>
                {event.value !== undefined && (
                  <span className={cn(
                    "text-sm font-mono",
                    event.type === 'positive' && "text-emerald-600",
                    event.type === 'negative' && "text-rose-600"
                  )}>
                    {event.value >= 0 ? '+' : ''}{event.value.toFixed(2)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{event.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== RADAR COMPARISON ====================
interface RadarComparisonData {
  subject: string;
  A: number;
  B?: number;
  fullMark: number;
}

export function RadarComparison({ 
  data, 
  labelA = 'Current',
  labelB = 'Benchmark' 
}: { 
  data: RadarComparisonData[];
  labelA?: string;
  labelB?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 10 }} />
        <Radar name={labelA} dataKey="A" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.5} />
        {data[0]?.B !== undefined && (
          <Radar name={labelB} dataKey="B" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.3} />
        )}
        <Legend />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ==================== MINI BAR INDICATOR ====================
interface MiniBarIndicatorProps {
  value: number;
  max: number;
  label: string;
  showValue?: boolean;
  color?: string;
}

export function MiniBarIndicator({ value, max, label, showValue = true, color = COLORS.blue }: MiniBarIndicatorProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        {showValue && <span className="font-mono font-medium">{value.toFixed(1)}</span>}
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ==================== COMPARISON BARS ====================
interface ComparisonBarsProps {
  items: Array<{
    label: string;
    value: number;
    benchmark?: number;
  }>;
  format?: (v: number) => string;
}

export function ComparisonBars({ items, format }: ComparisonBarsProps) {
  const formatFn = format || ((v: number) => v.toFixed(1));
  const maxValue = Math.max(...items.flatMap(i => [i.value, i.benchmark || 0]));

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{formatFn(item.value)}</span>
              {item.benchmark !== undefined && (
                <span className="text-xs text-muted-foreground">
                  vs {formatFn(item.benchmark)}
                </span>
              )}
            </div>
          </div>
          <div className="relative h-4">
            {item.benchmark !== undefined && (
              <div 
                className="absolute h-full bg-muted/50 rounded"
                style={{ width: `${(item.benchmark / maxValue) * 100}%` }}
              />
            )}
            <div 
              className={cn(
                "absolute h-full rounded transition-all",
                item.benchmark !== undefined && item.value > item.benchmark 
                  ? "bg-emerald-500" 
                  : item.benchmark !== undefined && item.value < item.benchmark
                    ? "bg-rose-500"
                    : "bg-blue-500"
              )}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== SIGNAL INDICATOR ====================
type SignalType = 'buy' | 'sell' | 'hold' | 'strong_buy' | 'strong_sell';

interface SignalIndicatorProps {
  signal: SignalType;
  confidence?: number;
  label?: string;
}

export function SignalIndicator({ signal, confidence, label }: SignalIndicatorProps) {
  const signalConfig = {
    strong_buy: { text: 'STRONG BUY', color: 'emerald', icon: <ArrowUp className="h-5 w-5" /> },
    buy: { text: 'BUY', color: 'emerald', icon: <ArrowUp className="h-4 w-4" /> },
    hold: { text: 'HOLD', color: 'slate', icon: <Minus className="h-4 w-4" /> },
    sell: { text: 'SELL', color: 'rose', icon: <ArrowDown className="h-4 w-4" /> },
    strong_sell: { text: 'STRONG SELL', color: 'rose', icon: <ArrowDown className="h-5 w-5" /> },
  };

  const config = signalConfig[signal];

  return (
    <div className={cn(
      "p-4 rounded-xl text-center",
      config.color === 'emerald' && "bg-emerald-50 dark:bg-emerald-950/30",
      config.color === 'rose' && "bg-rose-50 dark:bg-rose-950/30",
      config.color === 'slate' && "bg-slate-50 dark:bg-slate-950/30"
    )}>
      {label && <p className="text-xs text-muted-foreground mb-2">{label}</p>}
      <div className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold",
        config.color === 'emerald' && "bg-emerald-500 text-white",
        config.color === 'rose' && "bg-rose-500 text-white",
        config.color === 'slate' && "bg-slate-500 text-white"
      )}>
        {config.icon}
        {config.text}
      </div>
      {confidence !== undefined && (
        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-1">Confidence</div>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={cn(
                  "w-4 h-2 rounded-sm",
                  level <= Math.round(confidence / 20) 
                    ? config.color === 'emerald' ? "bg-emerald-500" 
                      : config.color === 'rose' ? "bg-rose-500" 
                      : "bg-slate-500"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className="text-xs font-mono mt-1">{confidence.toFixed(0)}%</p>
        </div>
      )}
    </div>
  );
}

// ==================== METRIC DELTA CARD ====================
interface MetricDeltaCardProps {
  title: string;
  current: number;
  previous: number;
  format?: (v: number) => string;
  invertColors?: boolean;
  subtitle?: string;
}

export function MetricDeltaCard({ 
  title, 
  current, 
  previous, 
  format, 
  invertColors = false,
  subtitle 
}: MetricDeltaCardProps) {
  const formatFn = format || ((v: number) => v.toFixed(2));
  const delta = current - previous;
  const deltaPercent = previous !== 0 ? (delta / Math.abs(previous)) * 100 : 0;
  const isPositive = invertColors ? delta < 0 : delta >= 0;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{formatFn(current)}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn(
            "flex flex-col items-end",
            isPositive ? "text-emerald-600" : "text-rose-600"
          )}>
            <div className="flex items-center gap-1">
              {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              <span className="text-sm font-medium">{Math.abs(deltaPercent).toFixed(1)}%</span>
            </div>
            <span className="text-xs">
              {delta >= 0 ? '+' : ''}{formatFn(delta)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== THRESHOLD GAUGE ====================
interface ThresholdGaugeProps {
  value: number;
  thresholds: {
    danger: number;
    warning: number;
    success: number;
  };
  label: string;
  min?: number;
  max?: number;
}

export function ThresholdGauge({ value, thresholds, label, min = 0, max = 100 }: ThresholdGaugeProps) {
  const range = max - min;
  const getColor = () => {
    if (value >= thresholds.success) return 'emerald';
    if (value >= thresholds.warning) return 'amber';
    return 'rose';
  };

  const color = getColor();
  const percentage = ((value - min) / range) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="outline" className={cn(
          color === 'emerald' && "bg-emerald-50 text-emerald-700 border-emerald-200",
          color === 'amber' && "bg-amber-50 text-amber-700 border-amber-200",
          color === 'rose' && "bg-rose-50 text-rose-700 border-rose-200"
        )}>
          {value.toFixed(1)}
        </Badge>
      </div>
      <div className="relative h-3 bg-gradient-to-r from-rose-200 via-amber-200 to-emerald-200 rounded-full">
        {/* Threshold markers */}
        <div 
          className="absolute w-0.5 h-5 -top-1 bg-rose-600"
          style={{ left: `${((thresholds.danger - min) / range) * 100}%` }}
        />
        <div 
          className="absolute w-0.5 h-5 -top-1 bg-amber-600"
          style={{ left: `${((thresholds.warning - min) / range) * 100}%` }}
        />
        <div 
          className="absolute w-0.5 h-5 -top-1 bg-emerald-600"
          style={{ left: `${((thresholds.success - min) / range) * 100}%` }}
        />
        {/* Value indicator */}
        <div 
          className={cn(
            "absolute w-4 h-4 -top-0.5 rounded-full border-2 border-white shadow-md",
            color === 'emerald' && "bg-emerald-500",
            color === 'amber' && "bg-amber-500",
            color === 'rose' && "bg-rose-500"
          )}
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}</span>
        <span>Danger: {thresholds.danger}</span>
        <span>Warning: {thresholds.warning}</span>
        <span>Good: {thresholds.success}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ==================== STACKED PROGRESS ====================
interface StackedProgressProps {
  segments: Array<{
    value: number;
    label: string;
    color: string;
  }>;
  total?: number;
}

export function StackedProgress({ segments, total }: StackedProgressProps) {
  const totalValue = total || segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden">
        {segments.map((segment, idx) => (
          <div
            key={idx}
            className="h-full transition-all"
            style={{ 
              width: `${(segment.value / totalValue) * 100}%`,
              backgroundColor: segment.color
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {segments.map((segment, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-xs">{segment.label}</span>
            <span className="text-xs font-mono text-muted-foreground">
              ({((segment.value / totalValue) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MINI STAT GRID ====================
interface MiniStatGridProps {
  stats: Array<{
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
  }>;
  columns?: 2 | 3 | 4;
}

export function MiniStatGrid({ stats, columns = 3 }: MiniStatGridProps) {
  return (
    <div className={cn(
      "grid gap-2",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-3",
      columns === 4 && "grid-cols-4"
    )}>
      {stats.map((stat, idx) => (
        <div key={idx} className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <span className="text-sm font-bold">{stat.value}</span>
            {stat.trend === 'up' && <ArrowUp className="h-3 w-3 text-emerald-500" />}
            {stat.trend === 'down' && <ArrowDown className="h-3 w-3 text-rose-500" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export default {
  BulletChart,
  WaterfallChart,
  LollipopChart,
  RadialProgress,
  ComparisonMatrix,
  TrendIndicator,
  PercentileBar,
  SparklineArea,
  CalendarHeatmap,
  DonutWithCenter,
  StatCardWithChart,
  ScoreBreakdown,
  TimelineChart,
  RadarComparison,
  MiniBarIndicator,
  ComparisonBars,
  SignalIndicator,
  MetricDeltaCard,
  ThresholdGauge,
  StackedProgress,
  MiniStatGrid
};
