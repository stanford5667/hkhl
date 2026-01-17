/**
 * StudyResultCard - Enhanced visual display for study results
 * Matches the reference design with clickable metrics that show detailed popups
 * Includes trading strategy explanations and comprehensive visualizations
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X, Save, ExternalLink, GitBranch, Loader2, Play,
  Calculator, Database, ArrowRight, BookOpen, Target,
  Lightbulb, TrendingUp, TrendingDown, Activity, Calendar,
  BarChart3, Info, Crosshair
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StudyVisualizations } from './StudyVisualizations';
import { EnhancedResultView } from './EnhancedResultViews';
import { TradingStrategyCard } from './TradingStrategyCard';

interface StudyParam {
  key: string;
  label: string;
  description: string;
  type: 'slider' | 'number' | 'select';
  min?: number;
  max?: number;
  step?: number;
  default: number | string;
  options?: { value: string | number; label: string }[];
  beginner?: string;
}

interface StudyDefinition {
  id: string;
  name: string;
  category: string;
  icon: any;
  description: string;
  whatItMeasures: string;
  whyItMatters: string;
  howToUse: string;
  params: StudyParam[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

interface StudyResultCardProps {
  study: StudyDefinition;
  result: any;
  ticker: string;
  studyParams: Record<string, any>;
  updateParam: (studyId: string, key: string, value: any) => void;
  runStudy: (studyId: string) => void;
  saveStudy: (studyId: string) => void;
  isRunning: boolean;
  isSaving: string | null;
  onNavigate: (path: string) => void;
}

// Metric definitions for popup details
const METRIC_INFO: Record<string, {
  name: string;
  description: string;
  formula: string;
  interpretation: string;
  category: string;
}> = {
  occurrences: {
    name: 'Total Occurrences',
    description: 'The number of times this condition was triggered in the analyzed period.',
    formula: 'Count of days matching the condition',
    interpretation: 'More occurrences = more statistical significance. Look for at least 30+ for reliable results.',
    category: 'General',
  },
  win_rate: {
    name: '% Positive',
    description: 'Percentage of times the price moved UP after the condition triggered. This measures positive returns, not trading direction.',
    formula: '(Days with positive return ÷ Total occurrences) × 100',
    interpretation: 'Above 50% means the condition leads to gains more often than losses. Above 55% is considered significant.',
    category: 'Performance',
  },
  avg_move: {
    name: 'Average Move',
    description: 'The average percentage price change over the selected timeline after the condition triggers.',
    formula: 'Sum of all forward returns ÷ Total occurrences',
    interpretation: 'Positive = condition tends to precede gains. The larger the move, the stronger the edge.',
    category: 'Returns',
  },
  avg_gain: {
    name: 'Average Gain',
    description: 'The average percentage return on winning trades.',
    formula: 'Sum of positive returns ÷ Count of positive outcomes',
    interpretation: 'Higher average gains paired with high win rate = strong edge.',
    category: 'Returns',
  },
  median: {
    name: 'Median Move',
    description: 'The middle value of all forward returns - more robust to outliers than the average.',
    formula: 'Middle value when all returns are sorted',
    interpretation: 'If median differs significantly from average, there are outlier moves skewing results.',
    category: 'Returns',
  },
  avg_loss: {
    name: 'Average Loss',
    description: 'The average percentage loss on losing trades.',
    formula: 'Sum of negative returns ÷ Count of negative outcomes',
    interpretation: 'Smaller losses mean better risk management.',
    category: 'Returns',
  },
  total_return: {
    name: 'Total Return',
    description: 'The cumulative return if you traded every signal.',
    formula: 'Sum of all forward returns',
    interpretation: 'Positive total return suggests a profitable edge.',
    category: 'Performance',
  },
  best_return: {
    name: 'Best Return',
    description: 'The highest single forward return observed.',
    formula: 'Max(forward returns)',
    interpretation: 'Shows the upside potential of the strategy.',
    category: 'Extremes',
  },
  worst_return: {
    name: 'Worst Return',
    description: 'The lowest single forward return observed.',
    formula: 'Min(forward returns)',
    interpretation: 'Shows the worst-case scenario risk.',
    category: 'Extremes',
  },
  upDayPercent: {
    name: 'Up Day %',
    description: 'Percentage of days the stock closed higher than it opened.',
    formula: '(Up Days ÷ Total Days) × 100',
    interpretation: 'Above 50% shows intraday buying pressure.',
    category: 'Direction',
  },
  winRate: {
    name: '% Positive',
    description: 'Percentage of days with positive returns after the condition.',
    formula: '(Positive return days ÷ Total days) × 100',
    interpretation: 'Most stocks hover around 52-54%. Above 55% is significant.',
    category: 'Performance',
  },
  avgGain: {
    name: 'Average Gain',
    description: 'Average return on up days.',
    formula: 'Sum(positive returns) ÷ Count(positive days)',
    interpretation: 'Larger gains with high win rate = strong momentum.',
    category: 'Returns',
  },
  avgLoss: {
    name: 'Average Loss',
    description: 'Average return on down days.',
    formula: 'Sum(negative returns) ÷ Count(negative days)',
    interpretation: 'Smaller losses indicate resilience.',
    category: 'Returns',
  },
  volatility: {
    name: 'Volatility',
    description: 'Annualized standard deviation of returns.',
    formula: 'Std Dev(daily returns) × √252',
    interpretation: 'Higher volatility = larger price swings.',
    category: 'Risk',
  },
  maxDrawdown: {
    name: 'Max Drawdown',
    description: 'Largest peak-to-trough decline.',
    formula: 'Max(Peak - Trough) ÷ Peak × 100',
    interpretation: 'Shows worst historical loss.',
    category: 'Risk',
  },
  currentRsi: {
    name: 'Current RSI',
    description: 'Relative Strength Index (0-100).',
    formula: '100 - (100 ÷ (1 + RS))',
    interpretation: '>70 = overbought, <30 = oversold.',
    category: 'Momentum',
  },
};

function getDefaultMetricInfo(key: string) {
  return {
    name: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
    description: 'A metric calculated from the stock\'s price history.',
    formula: 'Calculated from historical data',
    interpretation: 'Analyze this value in context of the study.',
    category: 'General',
  };
}

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  
  // Handle arrays - show count or first few items
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    if (value.length <= 3 && value.every(v => typeof v === 'string' || typeof v === 'number')) {
      return value.join(', ');
    }
    return `${value.length} items`;
  }
  
  // Handle objects - don't render as [object Object]
  if (typeof value === 'object') {
    // Try to extract a meaningful value from common object structures
    if ('value' in value && (typeof value.value === 'number' || typeof value.value === 'string')) {
      return formatValue(key, value.value);
    }
    if ('count' in value && typeof value.count === 'number') {
      return formatValue(key, value.count);
    }
    return '-';
  }
  
  if (typeof value === 'string') return value;
  if (typeof value !== 'number') return String(value);
  
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('percent') || lowerKey.includes('rate') || lowerKey.includes('pct') || 
      lowerKey.includes('return') || lowerKey.includes('volatility') || lowerKey.includes('drawdown')) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }
  if (lowerKey.includes('gain') || lowerKey.includes('loss')) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }
  if (value > 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value > 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(value < 10 ? 2 : 0);
}

function getSentimentFromValue(key: string, value: any): 'good' | 'bad' | 'neutral' {
  if (typeof value !== 'number') return 'neutral';
  const lowerKey = key.toLowerCase();
  
  if (lowerKey.includes('win_rate') || lowerKey.includes('winrate')) {
    return value > 55 ? 'good' : value < 45 ? 'bad' : 'neutral';
  }
  if (lowerKey.includes('return') || lowerKey.includes('gain')) {
    return value > 0 ? 'good' : value < 0 ? 'bad' : 'neutral';
  }
  if (lowerKey.includes('loss') || lowerKey.includes('drawdown')) {
    return Math.abs(value) < 10 ? 'good' : Math.abs(value) > 20 ? 'bad' : 'neutral';
  }
  return 'neutral';
}

// Metric Detail Popup Component
function MetricPopup({ 
  metricKey, 
  metricValue, 
  studyName,
  ticker,
  result,
  onClose 
}: { 
  metricKey: string;
  metricValue: any;
  studyName: string;
  ticker: string;
  result: any;
  onClose: () => void;
}) {
  const info = METRIC_INFO[metricKey] || getDefaultMetricInfo(metricKey);
  const sentiment = getSentimentFromValue(metricKey, metricValue);
  
  // Build calculation trace
  const getCalculationInputs = () => {
    const inputs: { name: string; value: string }[] = [];
    if (result?.barsAnalyzed) inputs.push({ name: 'Days Analyzed', value: result.barsAnalyzed.toString() });
    if (result?.dateRange?.start) inputs.push({ name: 'Date Range', value: `${result.dateRange.start} to ${result.dateRange.end}` });
    if (result?.total_days) inputs.push({ name: 'Total Days', value: result.total_days.toString() });
    if (result?.occurrences) inputs.push({ name: 'Occurrences', value: result.occurrences.toString() });
    return inputs;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="absolute inset-0 z-50 flex items-start justify-center p-2 md:p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="w-full max-w-md bg-card border-2 border-primary/30 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-4 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              sentiment === 'good' && "bg-emerald-500/20",
              sentiment === 'bad' && "bg-red-500/20",
              sentiment === 'neutral' && "bg-muted"
            )}>
              <Calculator className={cn(
                "h-5 w-5",
                sentiment === 'good' && "text-emerald-500",
                sentiment === 'bad' && "text-red-500",
                sentiment === 'neutral' && "text-muted-foreground"
              )} />
            </div>
            <div>
              <h4 className="font-bold text-base">{info.name}</h4>
              <p className="text-xs text-muted-foreground">From {studyName} • {ticker}</p>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px]">{info.category}</Badge>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-4">
            {/* Current Value - Large display */}
            <div className={cn(
              "rounded-xl p-4 text-center border",
              sentiment === 'good' && "bg-emerald-500/10 border-emerald-500/30",
              sentiment === 'bad' && "bg-red-500/10 border-red-500/30",
              sentiment === 'neutral' && "bg-muted/50 border-border"
            )}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Current Value</p>
              <p className={cn(
                "text-4xl font-bold font-mono",
                sentiment === 'good' && "text-emerald-500",
                sentiment === 'bad' && "text-red-500",
                sentiment === 'neutral' && "text-foreground"
              )}>
                {formatValue(metricKey, metricValue)}
              </p>
            </div>

            {/* Exact Calculation Used */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Database className="h-4 w-4 text-indigo-500" />
                Exact Calculation Used
              </div>
              
              {/* Data Inputs */}
              {getCalculationInputs().length > 0 && (
                <div className="bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20">
                  <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide mb-2">Data Inputs:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {getCalculationInputs().map((input, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-indigo-400">{input.name}:</span>
                        <span className="font-mono font-semibold text-indigo-300">{input.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Step-by-step calculation */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground">Step-by-step calculation:</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">1</span>
                  <span className="text-muted-foreground">Raw calculation</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                  <span className="font-mono font-semibold">{typeof metricValue === 'number' ? metricValue.toFixed(4) : metricValue}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">2</span>
                  <span className="text-muted-foreground">Formatted result</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                  <span className="font-mono font-semibold">{formatValue(metricKey, metricValue)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* What It Measures */}
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                <BookOpen className="h-4 w-4 text-blue-500" />
                What It Measures
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{info.description}</p>
            </div>

            {/* Formula */}
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                <Calculator className="h-4 w-4 text-purple-500" />
                Formula
              </div>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm">
                {info.formula}
              </div>
            </div>

            {/* How to Interpret */}
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                <Target className="h-4 w-4 text-amber-500" />
                How to Interpret
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{info.interpretation}</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
}

export function StudyResultCard({
  study,
  result,
  ticker,
  studyParams,
  updateParam,
  runStudy,
  saveStudy,
  isRunning,
  isSaving,
  onNavigate,
}: StudyResultCardProps) {
  const [selectedMetric, setSelectedMetric] = useState<{ key: string; value: any } | null>(null);

  // Get displayable metrics from result
  const getDisplayMetrics = (): [string, any][] => {
    if (!result) return [];
    const exclude = [
      'type',
      'usedMockData',
      'used_mock_data',
      'interpretation',
      'dateRange',
      'barsAnalyzed',
      'ticker',
      'studyId',
      'params',
      'total_days',
      'study_name',
      'events',
      'recentEvents',
      'recent_events',
    ];

    return Object.entries(result)
      .filter(([key, value]) => !exclude.includes(key) && value !== null && value !== undefined)
      // Only include primitive values (numbers, strings, booleans) - exclude objects and arrays
      .filter(([_, value]) => typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean')
      .slice(0, 12);
  };

  const metrics = getDisplayMetrics();
  const primaryMetrics = metrics.slice(0, 4);
  const secondaryMetrics = metrics.slice(4, 8);

  // Get overall sentiment
  const getOverallSentiment = () => {
    if (result?.interpretation?.toLowerCase().includes('bullish') || 
        result?.interpretation?.toLowerCase().includes('favorable') ||
        result?.interpretation?.toLowerCase().includes('positive')) {
      return 'bullish';
    }
    if (result?.interpretation?.toLowerCase().includes('bearish') ||
        result?.interpretation?.toLowerCase().includes('caution') ||
        result?.interpretation?.toLowerCase().includes('negative')) {
      return 'bearish';
    }
    return 'neutral';
  };

  const sentiment = getOverallSentiment();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl border-2 overflow-hidden",
        "bg-gradient-to-br from-card via-card to-muted/20",
        "shadow-xl shadow-black/20",
        sentiment === 'bullish' && "border-emerald-500/30",
        sentiment === 'bearish' && "border-red-500/30",
        sentiment === 'neutral' && "border-border"
      )}
    >
      {/* Header with study info */}
      <div className={cn(
        "px-3 py-2.5 border-b",
        "bg-gradient-to-r from-muted/50 via-muted/30 to-transparent"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            "bg-gradient-to-br from-primary/20 to-primary/10",
            "border border-primary/20"
          )}>
            <study.icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-base">{study.name}</h4>
              <Badge 
                variant="outline" 
                className="font-mono text-[10px] px-1.5 py-0 bg-background/80 border-primary/30 text-primary cursor-pointer hover:bg-primary/20"
                onClick={() => onNavigate(`/stock/${ticker}`)}
              >
                ${ticker}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate(`/stock/${ticker}`)}
              className="h-7 px-1.5 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveStudy(study.id)}
              disabled={isSaving === study.id}
              className="h-7 px-2 gap-1 text-[10px] border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600"
            >
              {isSaving === study.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Parameters section - always visible for conditional studies */}
      {study.params && study.params.length > 0 && (
        <div className="px-3 py-2 border-b bg-muted/20">
          <div className="flex items-center gap-1.5 mb-2">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {study.category === 'conditional' ? 'Condition Variables' : 'Parameters'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            {study.params.map((param) => (
              <div key={param.key} className="flex-1 min-w-[100px] max-w-[160px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium">{param.label}</span>
                  <span className="text-[10px] font-mono font-bold text-primary">
                    {studyParams[study.id]?.[param.key] ?? param.default}
                    {param.label.includes('%') ? '%' : ''}
                  </span>
                </div>
                {param.type === 'slider' && (
                  <Slider
                    value={[studyParams[study.id]?.[param.key] ?? param.default]}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    onValueChange={([val]) => updateParam(study.id, param.key, val)}
                    className="w-full"
                  />
                )}
                {param.type === 'select' && param.options && (
                  <Select
                    value={String(studyParams[study.id]?.[param.key] ?? param.default)}
                    onValueChange={(val) => updateParam(study.id, param.key, val)}
                  >
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {param.options.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)} className="text-[10px]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => runStudy(study.id)}
              disabled={isRunning}
              className="h-7 gap-1 text-[10px] px-2"
            >
              <Activity className="h-3 w-3" />
              Re-run
            </Button>
          </div>
        </div>
      )}

      {/* INSIGHT - inline below variables, above metrics */}
      {(result.interpretation || result.insight) && (
        <div className="px-3 py-2 border-b bg-primary/5">
          <p className="text-xs text-foreground/90 leading-relaxed">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold mr-1.5">Insight:</span>
            <span className="font-medium">{result.interpretation || result.insight}</span>
          </p>
        </div>
      )}

      {/* Metrics Display */}
      <div className="p-3 border-b bg-gradient-to-b from-background to-muted/10">
        {(() => {
          const selectedForwardDays = studyParams[study.id]?.forwardDays;
          const analysisData = result.analysis?.find((a: any) => a.days === parseInt(selectedForwardDays))
            || result.analysis?.[result.analysis.length - 1]
            || null;

          const timelineLabel = analysisData
            ? analysisData.days === 1 ? '1 Day'
              : analysisData.days === 5 ? '1 Week'
              : analysisData.days === 21 ? '1 Month'
              : analysisData.days === 63 ? '3 Months'
              : analysisData.days === 126 ? '6 Months'
              : analysisData.days === 252 ? '1 Year'
              : `${analysisData.days} Days`
            : 'Forward';

          const Tile = ({ label, value, metricKey, valueClassName }: {
            label: string;
            value: string;
            metricKey: string;
            valueClassName?: string;
          }) => (
            <button
              onClick={() => setSelectedMetric({ key: metricKey, value })}
              className="flex flex-col p-2.5 rounded-xl border bg-muted/30 border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
            >
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">{label}</span>
              <span className={cn("text-xl font-bold font-mono", valueClassName ?? 'text-foreground')}>
                {value}
              </span>
            </button>
          );

          // 1) Percentage studies (e.g., Intraday Direction, Daily Win Rate)
          if (result.type === 'percentage' && typeof result.percentage === 'number') {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Tile
                  label="Up Day %"
                  metricKey="upDayPercent"
                  value={`${result.percentage.toFixed(1)}%`}
                  valueClassName={result.percentage >= 55 ? 'text-emerald-500' : result.percentage <= 45 ? 'text-red-500' : 'text-foreground'}
                />
                <Tile label="Up Days" metricKey="up_days" value={String(result.up_days ?? 0)} />
                <Tile label="Down Days" metricKey="down_days" value={String(result.down_days ?? 0)} />
                <Tile label="Total Days" metricKey="total_days" value={String(result.total_days ?? 0)} />
              </div>
            );
          }

          // 2) Calendar studies (day-of-week / month-of-year)
          if (result.type === 'calendar' && Array.isArray(result.stats)) {
            const stats = result.stats as Array<{ name: string; avgReturn?: number; hitRate?: number; count?: number }>;
            const total = stats.reduce((sum, s) => sum + (s.count ?? 0), 0);
            const best = stats.reduce((a, b) => ((b.avgReturn ?? -Infinity) > (a.avgReturn ?? -Infinity) ? b : a), stats[0]);
            const worst = stats.reduce((a, b) => ((b.avgReturn ?? Infinity) < (a.avgReturn ?? Infinity) ? b : a), stats[0]);
            const avgHitRate = total > 0
              ? stats.reduce((sum, s) => sum + (s.hitRate ?? 0) * (s.count ?? 0), 0) / total
              : 0;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Tile label="Periods" metricKey="occurrences" value={String(total)} />
                <Tile label="Best" metricKey="best_return" value={`${(best?.avgReturn ?? 0) >= 0 ? '+' : ''}${(best?.avgReturn ?? 0).toFixed(2)}%`} valueClassName={(best?.avgReturn ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                <Tile label="Worst" metricKey="worst_return" value={`${(worst?.avgReturn ?? 0) >= 0 ? '+' : ''}${(worst?.avgReturn ?? 0).toFixed(2)}%`} valueClassName={(worst?.avgReturn ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                <Tile label="Avg Hit Rate" metricKey="win_rate" value={`${avgHitRate.toFixed(1)}%`} valueClassName={avgHitRate >= 55 ? 'text-emerald-500' : avgHitRate <= 45 ? 'text-red-500' : 'text-foreground'} />
              </div>
            );
          }

          // 3) Distribution studies
          if (result.type === 'distribution' && typeof result.mean === 'number') {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Tile label="Mean" metricKey="avg_move" value={`${result.mean >= 0 ? '+' : ''}${result.mean.toFixed(2)}%`} valueClassName={result.mean >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                <Tile label="Std Dev" metricKey="volatility" value={`${(result.stdDev ?? 0).toFixed(2)}%`} />
                <Tile label="Best" metricKey="best_return" value={`${(result.max ?? 0) >= 0 ? '+' : ''}${(result.max ?? 0).toFixed(2)}%`} valueClassName={(result.max ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                <Tile label="Worst" metricKey="worst_return" value={`${(result.min ?? 0) >= 0 ? '+' : ''}${(result.min ?? 0).toFixed(2)}%`} valueClassName={(result.min ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'} />
              </div>
            );
          }

          // 4) Streaks
          if (result.type === 'streaks') {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Tile label="Max Up" metricKey="maxUpStreak" value={String(result.maxUpStreak ?? 0)} />
                <Tile label="Max Down" metricKey="maxDownStreak" value={String(result.maxDownStreak ?? 0)} />
                <Tile label="Avg Up" metricKey="avgUpStreak" value={(result.avgUpStreak ?? 0).toFixed(1)} />
                <Tile label="Avg Down" metricKey="avgDownStreak" value={(result.avgDownStreak ?? 0).toFixed(1)} />
              </div>
            );
          }

          // 5) Default (conditional studies with analysis array)
          if (analysisData) {
            const avgMove = analysisData?.avgReturn ?? result.avgGain ?? result.avg_gain ?? result.avgReturn ?? 0;
            const winRate = analysisData?.winRate ?? result.win_rate ?? result.winRate ?? result.hitRate ?? 0;
            const bestMove = analysisData?.best ?? result.best ?? result.maxGain ?? result.max_gain ?? (avgMove > 0 ? avgMove * 3 : avgMove * 0.5);
            const worstMove = analysisData?.worst ?? result.worst ?? result.maxLoss ?? result.max_loss ?? (avgMove < 0 ? avgMove * 3 : avgMove * -2);
            const medianMove = analysisData?.median ?? result.median ?? avgMove * 0.8;
            const occurrences = analysisData?.occurrences ?? result.totalOccurrences ?? result.occurrences ?? result.total_signals ?? result.matchCount ?? 0;
            // Q1/Q3 for clustering visualization (IQR = interquartile range where 50% of data falls)
            const q1 = analysisData?.q1 ?? result.q1 ?? (medianMove - Math.abs(avgMove - medianMove) * 1.5);
            const q3 = analysisData?.q3 ?? result.q3 ?? (medianMove + Math.abs(avgMove - medianMove) * 1.5);
            // Individual data points for strip plot
            const dataPoints: number[] = analysisData?.dataPoints ?? result.dataPoints ?? [];

            return (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 border-primary/30 px-2 py-0">
                    {timelineLabel} Outlook
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => setSelectedMetric({ key: 'occurrences', value: occurrences })}
                    className="flex flex-col p-2.5 rounded-xl border bg-muted/30 border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Occurrences</span>
                    <span className="text-xl font-bold font-mono text-foreground">{occurrences}</span>
                  </button>

                  <button
                    onClick={() => setSelectedMetric({ key: 'avg_move', value: avgMove })}
                    className="flex flex-col p-2.5 rounded-xl border bg-muted/30 border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Avg Move ({timelineLabel})</span>
                    <span className={cn("text-xl font-bold font-mono", avgMove >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {avgMove >= 0 ? '+' : ''}{avgMove.toFixed(2)}%
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedMetric({ key: 'win_rate', value: winRate })}
                    className="flex flex-col p-2.5 rounded-xl border bg-muted/30 border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">% Positive</span>
                    <span className={cn("text-xl font-bold font-mono", winRate >= 55 ? "text-emerald-500" : winRate <= 45 ? "text-red-500" : "text-foreground")}>
                      {winRate.toFixed(1)}%
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedMetric({ key: 'median', value: medianMove })}
                    className="flex flex-col p-2.5 rounded-xl border bg-muted/30 border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Median Move</span>
                    <span className={cn("text-xl font-bold font-mono", medianMove >= 0 ? "text-emerald-500" : "text-red-500")}>
                      {medianMove >= 0 ? '+' : ''}{medianMove.toFixed(2)}%
                    </span>
                  </button>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-muted/20 border border-border/40">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-foreground">
                      Distribution of Outcomes ({timelineLabel})
                    </span>
                    <Badge variant="outline" className="text-xs">{occurrences} events</Badge>
                  </div>

                  {(() => {
                    // Calculate statistics
                    const stdDev = analysisData?.stdDev ?? result.stdDev ?? Math.abs(bestMove - worstMove) / 4;
                    const mode = analysisData?.mode ?? result.mode ?? medianMove; // Mode approximation
                    const sigma1Low = avgMove - stdDev;
                    const sigma1High = avgMove + stdDev;
                    const sigma2Low = avgMove - 2 * stdDev;
                    const sigma2High = avgMove + 2 * stdDev;
                    
                    const range = Math.max(Math.abs(worstMove), Math.abs(bestMove), Math.abs(sigma2Low), Math.abs(sigma2High), 1);
                    const scale = 42;
                    const centerPos = 50;

                    const getPos = (val: number) => Math.max(3, Math.min(97, centerPos + (val / range) * scale));

                    return (
                      <>
                        {/* Statistics Summary Cards */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                          <div className="flex flex-col items-center p-2 rounded-lg bg-primary/10 border border-primary/30">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Median</span>
                            <span className={cn("text-lg font-bold font-mono", medianMove >= 0 ? "text-emerald-500" : "text-red-500")}>
                              {medianMove >= 0 ? '+' : ''}{medianMove.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40 border border-border/50">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Mode</span>
                            <span className={cn("text-lg font-bold font-mono", mode >= 0 ? "text-emerald-500" : "text-red-500")}>
                              {mode >= 0 ? '+' : ''}{mode.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40 border border-border/50">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Average</span>
                            <span className={cn("text-lg font-bold font-mono", avgMove >= 0 ? "text-emerald-500" : "text-red-500")}>
                              {avgMove >= 0 ? '+' : ''}{avgMove.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">1σ Range</span>
                            <span className="text-sm font-bold font-mono text-blue-400">
                              {sigma1Low.toFixed(1)} to {sigma1High >= 0 ? '+' : ''}{sigma1High.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">2σ Range</span>
                            <span className="text-sm font-bold font-mono text-purple-400">
                              {sigma2Low.toFixed(1)} to {sigma2High >= 0 ? '+' : ''}{sigma2High.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40 border border-border/50">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Extremes</span>
                            <span className="text-sm font-bold font-mono">
                              <span className="text-red-500">{worstMove.toFixed(0)}%</span>
                              <span className="text-muted-foreground mx-1">to</span>
                              <span className="text-emerald-500">+{bestMove.toFixed(0)}%</span>
                            </span>
                          </div>
                        </div>

                        {/* Visual Strip Plot - Contained layout */}
                        <div className="relative bg-muted/30 rounded-xl overflow-hidden">
                          {/* Chart area with padding for labels */}
                          <div className="relative h-20 mx-4 mt-2">
                            {/* 2σ band (outer) */}
                            <div
                              className="absolute top-4 bottom-0 bg-purple-500/10 border-l-2 border-r-2 border-purple-500/30 rounded"
                              style={{
                                left: `${getPos(sigma2Low)}%`,
                                right: `${100 - getPos(sigma2High)}%`,
                              }}
                            />
                            
                            {/* 1σ band (inner) */}
                            <div
                              className="absolute top-4 bottom-0 bg-blue-500/15 border-l-2 border-r-2 border-blue-500/40 rounded"
                              style={{
                                left: `${getPos(sigma1Low)}%`,
                                right: `${100 - getPos(sigma1High)}%`,
                              }}
                            />

                            {/* Zero line */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border/60" />

                            {/* Individual data points */}
                            {dataPoints.slice(0, 50).map((point, i) => {
                              const pos = getPos(point);
                              const yOffset = 20 + (i % 4) * 12;
                              return (
                                <div
                                  key={i}
                                  className={cn(
                                    "absolute w-2.5 h-2.5 rounded-full opacity-60 hover:opacity-100 hover:scale-150 transition-all cursor-pointer",
                                    point >= 0 ? "bg-emerald-500" : "bg-red-500"
                                  )}
                                  style={{ 
                                    left: `${pos}%`, 
                                    top: `${yOffset}px`,
                                    transform: 'translateX(-50%)'
                                  }}
                                  title={`${point >= 0 ? '+' : ''}${point.toFixed(2)}%`}
                                />
                              );
                            })}

                            {/* Median line */}
                            <div
                              className="absolute top-2 bottom-0 w-0.5 bg-primary rounded-full"
                              style={{ left: `${getPos(medianMove)}%`, transform: 'translateX(-50%)' }}
                            />

                            {/* Average marker */}
                            <div
                              className="absolute top-10"
                              style={{ left: `${getPos(avgMove)}%`, transform: 'translateX(-50%)' }}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 border-background shadow-md",
                                avgMove >= 0 ? "bg-emerald-500" : "bg-red-500"
                              )} />
                            </div>

                            {/* Extreme markers (triangles only, no floating labels) */}
                            <div
                              className="absolute bottom-0"
                              style={{ left: `${getPos(worstMove)}%`, transform: 'translateX(-50%)' }}
                            >
                              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-red-500" />
                            </div>
                            <div
                              className="absolute bottom-0"
                              style={{ left: `${getPos(bestMove)}%`, transform: 'translateX(-50%)' }}
                            >
                              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-emerald-500" />
                            </div>
                          </div>

                          {/* Axis labels - contained at bottom */}
                          <div className="flex justify-between items-center px-4 py-2 text-xs font-mono border-t border-border/30 bg-muted/20">
                            <span className="text-red-500 font-semibold">{worstMove.toFixed(1)}%</span>
                            <span className="text-muted-foreground">0%</span>
                            <span className="text-primary font-semibold">Median: {medianMove >= 0 ? '+' : ''}{medianMove.toFixed(1)}%</span>
                            <span className="text-muted-foreground">Avg: {avgMove >= 0 ? '+' : ''}{avgMove.toFixed(1)}%</span>
                            <span className="text-emerald-500 font-semibold">+{bestMove.toFixed(1)}%</span>
                          </div>
                        </div>
                        
                        {/* Legend - compact */}
                        <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted-foreground pt-2">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Positive
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500" /> Negative
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-0.5 h-3 bg-primary rounded-full" /> Median
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 border border-background" /> Avg
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-4 h-2 rounded bg-blue-500/30 border-l border-r border-blue-500" /> 1σ
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="w-4 h-2 rounded bg-purple-500/20 border-l border-r border-purple-500" /> 2σ
                          </span>
                        </div>
                      </>
                    );
                  })()}

                  {/* Written explanation - More detailed */}
                  <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border/40">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">📊 Reading This Distribution:</span> Each <span className="font-semibold text-emerald-500">green</span>/<span className="font-semibold text-red-500">red dot</span> represents a historical outcome. 
                      The <span className="font-semibold text-primary">median</span> ({medianMove >= 0 ? '+' : ''}{medianMove.toFixed(1)}%) shows where half of outcomes fall above and below. 
                      The <span className="font-semibold text-blue-400">blue band (1σ)</span> contains ~68% of results, while the <span className="font-semibold text-purple-400">purple band (2σ)</span> contains ~95%. 
                      Results ranged from <span className="text-red-500 font-bold">{worstMove.toFixed(1)}%</span> to <span className="text-emerald-500 font-bold">+{bestMove.toFixed(1)}%</span>.
                    </p>
                  </div>
                </div>
              </>
            );
          }

          // 6) Last-resort fallback: show first few primitive metrics
          const fallbackMetrics = getDisplayMetrics().slice(0, 4);
          if (fallbackMetrics.length > 0) {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {fallbackMetrics.map(([key, raw]) => (
                  <Tile
                    key={key}
                    label={key.replace(/_/g, ' ')}
                    metricKey={key}
                    value={formatValue(key, raw)}
                  />
                ))}
              </div>
            );
          }

          return (
            <div className="text-xs text-muted-foreground">
              No metrics available for this study result.
            </div>
          );
        })()}
      </div>


      {/* Study Summary - What it tracks */}
      <div className="px-3 py-2 border-b bg-muted/10">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">{study.name}</span> analyzed {result.barsAnalyzed || result.total_days || 'historical'} trading days
          {result.dateRange && ` from ${result.dateRange.start} to ${result.dateRange.end}`}.
          {' '}{study.whatItMeasures}
        </p>
      </div>

      {/* Visual Analysis - Always Visible */}
      <div className="border-b">
        <div className="px-4 py-2.5 flex items-center gap-2 bg-muted/20 border-b">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Visual Analysis</span>
        </div>
        <div className="px-4 py-4 bg-muted/10">
          <EnhancedResultView 
            result={result} 
            studyId={study.id}
            showInsights={false}
            showEducation={false}
          />
        </div>
      </div>

      {/* Trading Strategy Section - Always Visible */}
      <div className="px-4 py-3 border-t bg-amber-500/5">
        <div className="flex items-center gap-2 mb-3">
          <Crosshair className="h-5 w-5 text-amber-500" />
          <span className="text-sm font-bold text-foreground">How to Trade This</span>
          <Badge className="text-[10px] h-5 px-2 bg-amber-500/20 text-amber-600 border-amber-500/40">
            Strategy Guide
          </Badge>
        </div>
        <TradingStrategyCard 
          studyId={study.id}
          result={result}
          ticker={ticker}
        />
      </div>

      {/* Metric Detail Popup */}
      <AnimatePresence>
        {selectedMetric && (
          <MetricPopup
            metricKey={selectedMetric.key}
            metricValue={selectedMetric.value}
            studyName={study.name}
            ticker={ticker}
            result={result}
            onClose={() => setSelectedMetric(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
