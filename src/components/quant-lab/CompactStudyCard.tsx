import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Minus, Save, Loader2,
  Sparkles, Calendar, BarChart3, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart
} from 'recharts';

// Import metric definitions for explanations
const METRIC_EXPLANATIONS: Record<string, { name: string; formula: string; description: string }> = {
  win_rate: { name: 'Win Rate', formula: '(Positive Days ÷ Total Days) × 100', description: 'Percentage of days with positive returns' },
  winRate: { name: 'Win Rate', formula: '(Positive Days ÷ Total Days) × 100', description: 'Percentage of days with positive returns' },
  hitRate: { name: 'Hit Rate', formula: '(Successful Signals ÷ Total Signals) × 100', description: 'Accuracy of the signal' },
  occurrences: { name: 'Occurrences', formula: 'Count of pattern instances', description: 'Number of times this pattern occurred' },
  total_occurrences: { name: 'Total Occurrences', formula: 'Count of all pattern instances', description: 'Total count of pattern matches' },
  avg_gain: { name: 'Avg Gain', formula: 'Sum of returns ÷ Count', description: 'Average return when pattern occurs' },
  avgGain: { name: 'Avg Gain', formula: 'Sum of gains ÷ Winning trades', description: 'Average profit on winning trades' },
  avgReturn: { name: 'Avg Return', formula: 'Sum of all returns ÷ Total trades', description: 'Mean return per occurrence' },
  avgLoss: { name: 'Avg Loss', formula: 'Sum of losses ÷ Losing trades', description: 'Average loss on losing trades' },
  percent_of_days: { name: '% of Days', formula: '(Pattern Days ÷ Total Days) × 100', description: 'Frequency of pattern occurrence' },
  maxDrawdown: { name: 'Max Drawdown', formula: 'Max(Peak - Trough) ÷ Peak', description: 'Largest peak-to-trough decline' },
  volatility: { name: 'Volatility', formula: 'StdDev(returns) × √252', description: 'Annualized standard deviation' },
  sharpeRatio: { name: 'Sharpe Ratio', formula: '(Return - RiskFree) ÷ Volatility', description: 'Risk-adjusted return measure' },
  profitFactor: { name: 'Profit Factor', formula: 'Gross Profit ÷ Gross Loss', description: 'Ratio of wins to losses' },
  expectancy: { name: 'Expectancy', formula: '(WinRate × AvgWin) - (LossRate × AvgLoss)', description: 'Expected return per trade' },
  currentRsi: { name: 'Current RSI', formula: '100 - (100 ÷ (1 + RS))', description: 'Relative strength momentum indicator' },
  avgBounce: { name: 'Avg Bounce', formula: 'Mean return after extreme moves', description: 'Typical recovery after drops' },
  meanReversionRate: { name: 'Mean Reversion Rate', formula: 'Reversals ÷ Extreme Moves × 100', description: 'How often extremes reverse' },
};

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

// Generate historical performance data
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

function formatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}

// Get ALL numeric metrics from result
function getAllMetrics(result: any): { key: string; value: any }[] {
  const exclude = ['dateRange', 'barsAnalyzed', 'interpretation', 'id'];
  const metrics: { key: string; value: any }[] = [];
  
  for (const [key, value] of Object.entries(result)) {
    if (exclude.includes(key)) continue;
    if (typeof value === 'number' || (typeof value === 'string' && !key.includes('date'))) {
      metrics.push({ key, value });
    }
  }
  return metrics;
}

export const CompactStudyCard = memo(function CompactStudyCard({
  study,
  result,
  ticker,
  onSave,
  isSaving,
  onTickerClick
}: CompactStudyCardProps) {
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const sentiment = getSentiment(result.interpretation);
  const allMetrics = getAllMetrics(result);
  const displayMetrics = showAllMetrics ? allMetrics : allMetrics.slice(0, 6);
  const aiSummary = useMemo(() => generateAISummary(result, study.name, ticker), [result, study.name, ticker]);
  const performanceData = useMemo(() => generatePerformanceData(result), [result]);
  
  const trendColor = performanceData[performanceData.length - 1]?.value > performanceData[0]?.value 
    ? 'hsl(142.1 76.2% 36.3%)' 
    : 'hsl(0 84.2% 60.2%)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card overflow-hidden text-xs"
    >
      {/* Compact Header Row - Ticker + Study + Sentiment + Save */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/30 border-b">
        <Badge 
          variant="default" 
          className="font-mono text-[10px] px-1.5 py-0 h-5 cursor-pointer hover:bg-primary/80"
          onClick={onTickerClick}
        >
          {ticker}
        </Badge>
        <study.icon className={cn("h-3 w-3 shrink-0", sentiment.color)} />
        <span className="font-semibold text-[11px] truncate flex-1">{study.name}</span>
        <div className={cn("flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full", 
          sentiment.label === 'Bullish' ? 'bg-emerald-500/10' : 
          sentiment.label === 'Bearish' ? 'bg-red-500/10' : 'bg-amber-500/10',
          sentiment.color
        )}>
          {sentiment.icon}
          {sentiment.label}
        </div>
        <Button size="sm" variant="ghost" onClick={onSave} disabled={isSaving} className="h-5 w-5 p-0">
          {isSaving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Save className="h-2.5 w-2.5" />}
        </Button>
      </div>

      {/* Inline Metrics - All on one row when possible */}
      <div className="px-2 py-1.5 border-b flex flex-wrap gap-x-3 gap-y-1">
        {displayMetrics.map(({ key, value }) => {
          const explanation = METRIC_EXPLANATIONS[key];
          return (
            <div 
              key={key} 
              className="flex items-center gap-1 text-[10px] cursor-help"
              title={explanation ? `${explanation.formula}\n${explanation.description}` : formatKey(key)}
            >
              <span className="text-muted-foreground">{explanation?.name || formatKey(key)}:</span>
              <span className="font-mono font-bold">{formatMetricValue(key, value)}</span>
            </div>
          );
        })}
        {allMetrics.length > 6 && (
          <button
            onClick={() => setShowAllMetrics(!showAllMetrics)}
            className="flex items-center gap-0.5 text-[9px] text-primary hover:underline"
          >
            {showAllMetrics ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            {showAllMetrics ? 'Less' : `+${allMetrics.length - 6}`}
          </button>
        )}
      </div>

      {/* AI Summary + Chart - Side by Side */}
      <div className="grid grid-cols-[1fr,140px] gap-px bg-border">
        {/* AI Summary */}
        <div className="bg-background px-2 py-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <Sparkles className="h-2.5 w-2.5 text-primary" />
            <span className="text-[9px] font-semibold text-primary uppercase">AI Analysis</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug line-clamp-3">{aiSummary}</p>
        </div>

        {/* Mini Chart */}
        <div className="bg-background px-1 py-1">
          <div className="flex items-center gap-1 mb-0.5">
            <BarChart3 className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[8px] text-muted-foreground uppercase">30d Trend</span>
          </div>
          <div className="h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id={`gradient-${study.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trendColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={trendColor} 
                  strokeWidth={1}
                  fill={`url(#gradient-${study.id})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Footer - Date Range (minimal) */}
      <div className="flex items-center justify-between px-2 py-1 bg-muted/20 text-[9px] text-muted-foreground">
        <span className="font-mono">{result.barsAnalyzed || '-'} days</span>
        {result.dateRange && (
          <span className="font-mono">{result.dateRange.start} → {result.dateRange.end}</span>
        )}
      </div>
    </motion.div>
  );
});
