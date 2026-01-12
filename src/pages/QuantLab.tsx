/**
 * QUANT LAB - Simple Stock Analysis
 * Beginner-friendly quantitative analysis
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FlaskConical, Search, Play, TrendingUp, TrendingDown, 
  BarChart3, Activity, Calendar, Zap, LineChart, Gauge, 
  Target, Loader2, CheckCircle2, Save, ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

// Simple study definitions - just the essentials
const STUDIES = [
  {
    id: 'trend_strength',
    name: 'Trend Strength',
    icon: TrendingUp,
    description: 'Is it going up or down?',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10'
  },
  {
    id: 'rsi_analysis',
    name: 'RSI Signal',
    icon: Gauge,
    description: 'Overbought or oversold?',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  {
    id: 'moving_average_analysis',
    name: 'Moving Averages',
    icon: LineChart,
    description: 'Above or below key levels?',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  {
    id: 'volatility_analysis',
    name: 'Volatility',
    icon: Zap,
    description: 'How much does it move?',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
  {
    id: 'day_of_week_returns',
    name: 'Best Days',
    icon: Calendar,
    description: 'Which days perform best?',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10'
  },
  {
    id: 'daily_return_distribution',
    name: 'Return Profile',
    icon: BarChart3,
    description: 'Typical daily moves',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10'
  },
  {
    id: 'drawdown_analysis',
    name: 'Drawdowns',
    icon: TrendingDown,
    description: 'How bad do drops get?',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  },
  {
    id: 'up_down_streaks',
    name: 'Win Streaks',
    icon: Activity,
    description: 'How long do runs last?',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10'
  }
];

const PERIODS = [
  { value: '1y', label: '1 Year' },
  { value: '3y', label: '3 Years' },
  { value: '5y', label: '5 Years' }
];

// Result display helpers
function getSignal(result: any, studyId: string): { label: string; color: string; description: string } {
  if (!result) return { label: 'No data', color: 'text-muted-foreground', description: '' };

  switch (studyId) {
    case 'trend_strength': {
      const score = result.trendScore ?? 0;
      const max = result.maxScore ?? 5;
      if (score >= max - 1) return { label: '🟢 Strong Uptrend', color: 'text-emerald-500', description: `Score: ${score}/${max}` };
      if (score >= max / 2) return { label: '🟡 Mild Uptrend', color: 'text-amber-500', description: `Score: ${score}/${max}` };
      if (score <= 1) return { label: '🔴 Strong Downtrend', color: 'text-red-500', description: `Score: ${score}/${max}` };
      return { label: '⚪ Neutral', color: 'text-muted-foreground', description: `Score: ${score}/${max}` };
    }
    case 'rsi_analysis': {
      const rsi = result.current ?? 50;
      if (rsi > 70) return { label: '🔴 Overbought', color: 'text-red-500', description: `RSI: ${rsi.toFixed(1)}` };
      if (rsi < 30) return { label: '🟢 Oversold', color: 'text-emerald-500', description: `RSI: ${rsi.toFixed(1)}` };
      return { label: '⚪ Neutral', color: 'text-muted-foreground', description: `RSI: ${rsi.toFixed(1)}` };
    }
    case 'moving_average_analysis': {
      const above200 = result.ma200?.currentAboveSMA;
      const trend = result.currentTrend;
      if (above200 && trend === 'bullish') return { label: '🟢 Bullish', color: 'text-emerald-500', description: 'Above 200 MA, uptrend' };
      if (!above200) return { label: '🔴 Bearish', color: 'text-red-500', description: 'Below 200 MA' };
      return { label: '🟡 Mixed', color: 'text-amber-500', description: 'Near moving averages' };
    }
    case 'volatility_analysis': {
      const vol = result.annualizedVol?.current ?? 0;
      if (vol > 40) return { label: '🔴 High Volatility', color: 'text-red-500', description: `${vol.toFixed(1)}% annual vol` };
      if (vol > 20) return { label: '🟡 Moderate', color: 'text-amber-500', description: `${vol.toFixed(1)}% annual vol` };
      return { label: '🟢 Low Volatility', color: 'text-emerald-500', description: `${vol.toFixed(1)}% annual vol` };
    }
    case 'day_of_week_returns': {
      const stats = result.stats || [];
      const best = stats.reduce((a: any, b: any) => (a?.avgReturn || 0) > (b?.avgReturn || 0) ? a : b, {});
      return { label: `📅 Best: ${best?.name || 'N/A'}`, color: 'text-primary', description: `Avg: ${(best?.avgReturn || 0).toFixed(2)}%` };
    }
    case 'daily_return_distribution': {
      const mean = result.mean ?? 0;
      const vol = result.stdDev ?? 0;
      return { label: mean > 0 ? '🟢 Positive Bias' : '🔴 Negative Bias', color: mean > 0 ? 'text-emerald-500' : 'text-red-500', description: `Avg: ${mean.toFixed(3)}%, Vol: ${vol.toFixed(2)}%` };
    }
    case 'drawdown_analysis': {
      const maxDD = result.maxDrawdown ?? 0;
      if (maxDD > 30) return { label: '🔴 High Risk', color: 'text-red-500', description: `Max drop: ${maxDD.toFixed(1)}%` };
      if (maxDD > 15) return { label: '🟡 Moderate Risk', color: 'text-amber-500', description: `Max drop: ${maxDD.toFixed(1)}%` };
      return { label: '🟢 Low Risk', color: 'text-emerald-500', description: `Max drop: ${maxDD.toFixed(1)}%` };
    }
    case 'up_down_streaks': {
      const maxUp = result.maxUpStreak ?? 0;
      const maxDown = result.maxDownStreak ?? 0;
      return { label: maxUp > maxDown ? '🟢 Strong Momentum' : '🔴 Weak Momentum', color: maxUp > maxDown ? 'text-emerald-500' : 'text-red-500', description: `Best win streak: ${maxUp} days` };
    }
    default:
      return { label: 'Complete', color: 'text-primary', description: '' };
  }
}

export default function QuantLab() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTicker = searchParams.get('ticker') || '';
  
  const [ticker, setTicker] = useState(initialTicker);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(initialTicker || null);
  const [period, setPeriod] = useState('3y');
  const [selectedStudies, setSelectedStudies] = useState<string[]>(['trend_strength', 'rsi_analysis', 'moving_average_analysis']);
  const [results, setResults] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [runningStudy, setRunningStudy] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  const handleSetTicker = useCallback((t: string) => {
    const normalized = t.toUpperCase().trim();
    if (normalized) {
      setSelectedTicker(normalized);
      setResults({});
    }
  }, []);

  const toggleStudy = (studyId: string) => {
    setSelectedStudies(prev => 
      prev.includes(studyId) 
        ? prev.filter(s => s !== studyId)
        : [...prev, studyId]
    );
  };

  const runStudy = async (studyId: string) => {
    if (!selectedTicker) return;
    
    setRunningStudy(studyId);
    try {
      const periodYears = { '1y': 1, '3y': 3, '5y': 5 }[period] || 3;
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - periodYears);

      const { data, error } = await supabase.functions.invoke('run-asset-study', {
        body: {
          ticker: selectedTicker,
          studyType: studyId,
          startDate: startDate.toISOString().split('T')[0],
          endDate,
          params: {}
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setResults(prev => ({
        ...prev,
        [studyId]: {
          ...data.result,
          barsAnalyzed: data.barsAnalyzed,
          dateRange: data.dateRange
        }
      }));
    } catch (error: any) {
      console.error('Study error:', error);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setRunningStudy(null);
    }
  };

  const runAllStudies = async () => {
    if (!selectedTicker) {
      toast.error('Enter a ticker symbol first');
      return;
    }
    if (selectedStudies.length === 0) {
      toast.error('Select at least one study');
      return;
    }

    setIsRunning(true);
    for (const studyId of selectedStudies) {
      await runStudy(studyId);
    }
    setIsRunning(false);
    toast.success('Analysis complete!');
  };

  const saveResult = async (studyId: string) => {
    if (!user) {
      toast.info('Sign up free to save your research', {
        description: 'Build your personal analysis library',
        action: { label: 'Sign Up', onClick: () => window.location.href = '/login' }
      });
      return;
    }

    const result = results[studyId];
    const study = STUDIES.find(s => s.id === studyId);
    if (!result || !study) return;

    setIsSaving(studyId);
    try {
      const { error } = await supabase.from('saved_studies').insert({
        user_id: user.id,
        ticker: selectedTicker,
        study_type: studyId,
        study_name: study.name,
        period,
        params: {},
        result,
        bars_analyzed: result.barsAnalyzed,
        date_range: result.dateRange
      });

      if (error) throw error;
      toast.success('Saved to your library!');
    } catch (error: any) {
      toast.error('Failed to save');
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 pb-24 md:pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
            <FlaskConical className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Quant Lab</h1>
            <p className="text-sm text-muted-foreground">Simple stock analysis</p>
          </div>
        </div>

        {/* Ticker Input */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="text-sm mb-2 block">Stock Symbol</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. AAPL, MSFT, SPY"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetTicker(ticker)}
                    className="font-mono"
                  />
                  <Button onClick={() => handleSetTicker(ticker)} disabled={!ticker}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'SPY', 'QQQ'].map((t) => (
                    <Badge
                      key={t}
                      variant={selectedTicker === t ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => handleSetTicker(t)}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="sm:w-32">
                <Label className="text-sm mb-2 block">Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Ticker Display */}
        {selectedTicker && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono">{selectedTicker}</span>
              <Badge variant="secondary">{period}</Badge>
            </div>
            <Button 
              onClick={runAllStudies} 
              disabled={isRunning || selectedStudies.length === 0}
              className="gap-2"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run {selectedStudies.length} Studies
            </Button>
          </div>
        )}

        {/* Study Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Studies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STUDIES.map((study) => {
                const Icon = study.icon;
                const isSelected = selectedStudies.includes(study.id);
                const result = results[study.id];
                const isLoading = runningStudy === study.id;
                
                return (
                  <button
                    key={study.id}
                    onClick={() => toggleStudy(study.id)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all relative",
                      isSelected 
                        ? "border-primary bg-primary/5 ring-1 ring-primary" 
                        : "border-border hover:border-primary/50",
                      result && "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("p-1.5 rounded", study.bgColor)}>
                        <Icon className={cn("h-3.5 w-3.5", study.color)} />
                      </div>
                      {isLoading && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                      {result && !isLoading && <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />}
                    </div>
                    <p className="text-xs font-medium">{study.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{study.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {Object.keys(results).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Results
                <Badge variant="secondary">{Object.keys(results).length} studies</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedStudies.map((studyId) => {
                const study = STUDIES.find(s => s.id === studyId);
                const result = results[studyId];
                if (!study || !result) return null;

                const signal = getSignal(result, studyId);
                const Icon = study.icon;

                return (
                  <div 
                    key={studyId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border"
                  >
                    <div className={cn("p-2 rounded-lg", study.bgColor)}>
                      <Icon className={cn("h-4 w-4", study.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{study.name}</p>
                      <p className={cn("text-sm font-medium", signal.color)}>{signal.label}</p>
                      <p className="text-xs text-muted-foreground">{signal.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveResult(studyId)}
                      disabled={isSaving === studyId}
                      className="gap-1 text-xs"
                    >
                      {isSaving === studyId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      Save
                    </Button>
                  </div>
                );
              })}

              {Object.keys(results).length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    Based on {results[Object.keys(results)[0]]?.barsAnalyzed || 0} trading days
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!selectedTicker && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-medium mb-1">Enter a stock ticker to start</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try AAPL, MSFT, GOOGL, or any US stock
              </p>
              <div className="flex justify-center gap-2">
                {['SPY', 'QQQ', 'AAPL'].map(t => (
                  <Button key={t} variant="outline" size="sm" onClick={() => handleSetTicker(t)}>
                    {t} <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
