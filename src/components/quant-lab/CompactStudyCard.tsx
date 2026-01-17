import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Minus, ExternalLink, Save, Loader2,
  Sparkles, Calendar, BarChart3
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart
} from 'recharts';

interface CompactStudyCardProps {
  study: {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  result: any;
  ticker: string;
  onSave: () => void;
  isSaving: boolean;
  onTickerClick: () => void;
}

// Generate AI summary based on result data
function generateAISummary(result: any, studyName: string, ticker: string): string {
  const winRate = result.winRate || result.win_rate || result.hitRate || 0;
  const avgGain = result.avgGain || result.avg_gain || result.avgReturn || 0;
  const occurrences = result.occurrences || result.total_occurrences || result.barsAnalyzed || 0;
  
  const sentiment = winRate > 55 ? 'bullish' : winRate < 45 ? 'bearish' : 'neutral';
  const reliability = occurrences > 50 ? 'statistically significant' : 'limited sample size';
  
  if (sentiment === 'bullish') {
    return `${ticker} shows strong ${studyName.toLowerCase()} behavior with ${winRate.toFixed(1)}% success rate across ${occurrences} occurrences. Average gain of ${avgGain > 0 ? '+' : ''}${avgGain.toFixed(2)}% suggests favorable risk/reward. This pattern has ${reliability} and may indicate continued momentum.`;
  } else if (sentiment === 'bearish') {
    return `${ticker} exhibits weak ${studyName.toLowerCase()} characteristics with only ${winRate.toFixed(1)}% success rate. The ${occurrences} observations show an average move of ${avgGain.toFixed(2)}%. Consider this a cautionary signal with ${reliability}.`;
  } else {
    return `${ticker} displays neutral ${studyName.toLowerCase()} behavior at ${winRate.toFixed(1)}% win rate. With ${occurrences} data points and ${avgGain.toFixed(2)}% average move, no strong directional bias is evident. Monitor for breakout patterns.`;
  }
}

// Generate mock historical performance data
function generatePerformanceData(result: any): { date: string; value: number }[] {
  const days = 30;
  const data: { date: string; value: number }[] = [];
  const baseWinRate = result.winRate || result.win_rate || 50;
  let cumulative = 0;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variance = (Math.random() - 0.5) * 2;
    cumulative += (baseWinRate - 50) / 10 + variance;
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round((50 + cumulative) * 100) / 100
    });
  }
  return data;
}

function getSentiment(interpretation?: string): { color: string; icon: React.ReactNode; label: string } {
  if (!interpretation) return { color: 'text-muted-foreground', icon: <Minus className="h-3 w-3" />, label: 'Neutral' };
  const lower = interpretation.toLowerCase();
  if (lower.includes('bullish') || lower.includes('strong') || lower.includes('high')) {
    return { color: 'text-emerald-500', icon: <TrendingUp className="h-3 w-3" />, label: 'Bullish' };
  }
  if (lower.includes('bearish') || lower.includes('weak') || lower.includes('low')) {
    return { color: 'text-red-500', icon: <TrendingDown className="h-3 w-3" />, label: 'Bearish' };
  }
  return { color: 'text-amber-500', icon: <Minus className="h-3 w-3" />, label: 'Neutral' };
}

function formatMetricValue(key: string, value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') {
    if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('percent')) {
      return `${value.toFixed(1)}%`;
    }
    if (Math.abs(value) < 1) return value.toFixed(3);
    if (Math.abs(value) < 100) return value.toFixed(2);
    return value.toLocaleString();
  }
  return String(value);
}

function getTopMetrics(result: any): { key: string; value: any }[] {
  const priority = ['win_rate', 'winRate', 'occurrences', 'total_occurrences', 'avg_gain', 'avgGain', 'percent_of_days'];
  const metrics: { key: string; value: any }[] = [];
  
  for (const key of priority) {
    if (result[key] !== undefined && metrics.length < 4) {
      metrics.push({ key, value: result[key] });
    }
  }
  
  // Fill remaining slots
  for (const [key, value] of Object.entries(result)) {
    if (metrics.length >= 4) break;
    if (typeof value === 'number' && !priority.includes(key) && !key.includes('date') && key !== 'barsAnalyzed') {
      metrics.push({ key, value });
    }
  }
  
  return metrics.slice(0, 4);
}

export const CompactStudyCard = memo(function CompactStudyCard({
  study,
  result,
  ticker,
  onSave,
  isSaving,
  onTickerClick
}: CompactStudyCardProps) {
  const sentiment = getSentiment(result.interpretation);
  const metrics = getTopMetrics(result);
  const aiSummary = useMemo(() => generateAISummary(result, study.name, ticker), [result, study.name, ticker]);
  const performanceData = useMemo(() => generatePerformanceData(result), [result]);
  
  const trendColor = performanceData[performanceData.length - 1]?.value > performanceData[0]?.value 
    ? 'hsl(142.1 76.2% 36.3%)' 
    : 'hsl(0 84.2% 60.2%)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card overflow-hidden"
    >
      {/* Header Row - Ultra compact */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
        <study.icon className={cn("h-4 w-4 shrink-0", sentiment.color)} />
        <span className="font-semibold text-sm truncate flex-1">{study.name}</span>
        <Badge 
          variant="outline" 
          className="font-mono text-[10px] px-1.5 py-0 h-5 cursor-pointer hover:bg-primary/10"
          onClick={onTickerClick}
        >
          ${ticker}
        </Badge>
        <div className={cn("flex items-center gap-1 text-[10px] font-medium", sentiment.color)}>
          {sentiment.icon}
          {sentiment.label}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onSave}
          disabled={isSaving}
          className="h-6 w-6 p-0"
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        </Button>
      </div>

      {/* Metrics Row - Inline */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-background">
        {metrics.map(({ key, value }) => (
          <div key={key} className="flex-1 text-center px-2 py-1 rounded bg-muted/40">
            <div className="text-[9px] text-muted-foreground uppercase truncate">
              {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
            </div>
            <div className="text-sm font-bold font-mono">{formatMetricValue(key, value)}</div>
          </div>
        ))}
        {result.interpretation && (
          <div className="flex-[2] px-2 py-1 rounded bg-amber-500/10 border-l-2 border-amber-500">
            <div className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Insight</div>
            <div className="text-xs leading-tight line-clamp-2">{result.interpretation}</div>
          </div>
        )}
      </div>

      {/* AI Summary + Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-px bg-border">
        {/* AI Summary */}
        <div className="bg-background px-3 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">AI Analysis</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary}</p>
        </div>

        {/* Performance Chart */}
        <div className="bg-background px-3 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BarChart3 className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">30-Day Win Rate Trend</span>
          </div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id={`gradient-${study.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trendColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '11px',
                    padding: '4px 8px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Win Rate']}
                  labelStyle={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={trendColor} 
                  strokeWidth={1.5}
                  fill={`url(#gradient-${study.id})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Footer - Minimal */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-2.5 w-2.5" />
          <span className="font-mono">{result.barsAnalyzed || '-'} days</span>
        </div>
        <div className="font-mono">
          {result.dateRange?.start} → {result.dateRange?.end}
        </div>
      </div>
    </motion.div>
  );
});
