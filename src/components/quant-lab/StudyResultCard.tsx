/**
 * StudyResultCard - Enhanced visual display for study results
 * Matches the reference design with clickable metrics that show detailed popups
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
  ChevronDown, BarChart3, Info
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
    name: 'Win Rate',
    description: 'Percentage of times the forward return was positive after the condition.',
    formula: '(Positive outcomes ÷ Total occurrences) × 100',
    interpretation: 'Above 50% suggests the condition leads to gains more often than losses.',
    category: 'Performance',
  },
  avg_gain: {
    name: 'Average Gain',
    description: 'The average percentage return on winning trades.',
    formula: 'Sum of positive returns ÷ Count of positive outcomes',
    interpretation: 'Higher average gains paired with high win rate = strong edge.',
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
    name: 'Win Rate',
    description: 'Percentage of days with positive returns.',
    formula: '(Positive return days ÷ Total days) × 100',
    interpretation: 'Most stocks hover around 52-54%. Higher is bullish.',
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
  const [showVisuals, setShowVisuals] = useState(false);

  // Get displayable metrics from result
  const getDisplayMetrics = (): [string, any][] => {
    if (!result) return [];
    const exclude = ['interpretation', 'dateRange', 'barsAnalyzed', 'ticker', 'studyId', 'params', 'total_days', 'study_name'];
    return Object.entries(result)
      .filter(([key, value]) => !exclude.includes(key) && value !== null && value !== undefined)
      .filter(([_, value]) => typeof value !== 'object' || Array.isArray(value))
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
        "px-4 py-4 border-b",
        "bg-gradient-to-r from-muted/50 via-muted/30 to-transparent"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-xl shrink-0",
            "bg-gradient-to-br from-primary/20 to-primary/10",
            "border border-primary/20"
          )}>
            <study.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-lg">{study.name}</h4>
              <Badge 
                variant="outline" 
                className="font-mono text-xs bg-background/80 border-primary/30 text-primary cursor-pointer hover:bg-primary/20"
                onClick={() => onNavigate(`/stock/${ticker}`)}
              >
                ${ticker}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {study.description}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate(`/stock/${ticker}`)}
              className="h-8 px-2 text-xs gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveStudy(study.id)}
              disabled={isSaving === study.id}
              className="h-8 px-3 gap-1.5 border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600"
            >
              {isSaving === study.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span className="hidden md:inline">Save</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Parameters section - always visible for conditional studies */}
      {study.params && study.params.length > 0 && (
        <div className="px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {study.category === 'conditional' ? 'Condition Variables' : 'Parameters'}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            {study.params.map((param) => (
              <div key={param.key} className="flex-1 min-w-[140px] max-w-[200px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">{param.label}</span>
                  <span className="text-xs font-mono font-bold text-primary">
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
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {param.options.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
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
              className="h-8 gap-1.5 text-xs"
            >
              <Activity className="h-3 w-3" />
              Re-run
            </Button>
          </div>
        </div>
      )}

      {/* Primary Metrics Grid - Large display */}
      <div className="p-4 border-b bg-gradient-to-b from-background to-muted/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {primaryMetrics.map(([key, value], idx) => {
            const metricSentiment = getSentimentFromValue(key, value);
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
            return (
              <button
                key={key}
                onClick={() => setSelectedMetric({ key, value })}
                className={cn(
                  "group relative flex flex-col p-4 rounded-xl border-2 transition-all",
                  "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
                  "active:scale-[0.98] cursor-pointer",
                  idx === 0 && "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30",
                  idx > 0 && "bg-muted/30 border-border/50"
                )}
              >
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1">
                  {formattedKey}
                </span>
                <span className={cn(
                  "text-2xl md:text-3xl font-bold font-mono tracking-tight",
                  idx === 0 && "text-primary",
                  idx > 0 && metricSentiment === 'good' && "text-emerald-500",
                  idx > 0 && metricSentiment === 'bad' && "text-red-500",
                  idx > 0 && metricSentiment === 'neutral' && "text-foreground"
                )}>
                  {formatValue(key, value)}
                </span>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Secondary Metrics - Compact row */}
        {secondaryMetrics.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {secondaryMetrics.map(([key, value]) => {
              const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
              return (
                <button
                  key={key}
                  onClick={() => setSelectedMetric({ key, value })}
                  className="flex flex-col p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <span className="text-[9px] text-muted-foreground uppercase truncate">{formattedKey}</span>
                  <span className="text-sm font-bold font-mono">{formatValue(key, value)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Interpretation */}
      {result.interpretation && (
        <div className="px-4 py-4 border-b">
          <div className={cn(
            "flex items-start gap-3 p-4 rounded-xl border-l-4",
            "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent",
            "border-amber-500"
          )}>
            <div className="shrink-0 p-2 rounded-lg bg-amber-500/20">
              <Lightbulb className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                AI Insight
              </span>
              <p className="text-sm leading-relaxed mt-1 text-foreground/90">
                {result.interpretation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Visual Analysis Toggle */}
      <button
        onClick={() => setShowVisuals(!showVisuals)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors border-b"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Visual Analysis</span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          showVisuals && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {showVisuals && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 bg-muted/10">
              <EnhancedResultView 
                result={result} 
                studyId={study.id}
                showInsights={false}
                showEducation={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer with data info */}
      <div className="px-4 py-3 bg-gradient-to-r from-muted/40 to-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono font-semibold text-foreground">{result.barsAnalyzed || result.total_days}</span>
          <span>trading days</span>
        </div>
        {result.dateRange && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <Calendar className="h-3.5 w-3.5" />
            <span>{result.dateRange.start}</span>
            <span>→</span>
            <span>{result.dateRange.end}</span>
          </div>
        )}
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
