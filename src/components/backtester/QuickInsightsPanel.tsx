/**
 * Quick Insights Panel
 * 
 * Inline study results for informational (non-backtest) studies.
 * Renders within the backtester area with clickable chips and compact result views.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, X, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface QuickInsightsPanelProps {
  ticker: string;
}

interface StudyChip {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const QUICK_STUDIES: StudyChip[] = [
  { id: 'day_of_week_returns', label: 'Best Days', icon: '📅', description: 'Win rate & avg return by weekday' },
  { id: 'month_of_year_returns', label: 'Best Months', icon: '📆', description: 'Avg return by month' },
  { id: 'daily_return_distribution', label: 'Return Distribution', icon: '📊', description: 'Daily return percentiles' },
  { id: 'drawdown_analysis', label: 'Drawdowns', icon: '📉', description: 'Max drawdown & recovery' },
  { id: 'mean_reversion', label: 'Mean Reversion', icon: '🔄', description: 'Reversion tendency stats' },
  { id: 'volume_analysis', label: 'Volume Profile', icon: '📶', description: 'Volume trends & signals' },
  { id: 'range_analysis', label: 'Range Analysis', icon: '↔️', description: 'Daily range patterns' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT RENDERERS
// ═══════════════════════════════════════════════════════════════════════════════

function DayOfWeekResult({ data }: { data: any }) {
  if (!data?.analysis) return null;
  const chartData = [...data.analysis].sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <XAxis dataKey="dayName" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(0, 3)} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string) => [`${value}%`, name === 'winRate' ? 'Win Rate' : 'Avg Return']}
          />
          <Bar dataKey="winRate" name="winRate" radius={[4, 4, 0, 0]}>
            {chartData.map((entry: any, idx: number) => (
              <Cell key={idx} fill={entry.winRate >= 50 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-5 gap-1">
        {chartData.map((d: any) => (
          <div key={d.dayOfWeek} className="text-center p-1.5 rounded bg-muted/50">
            <div className="text-[10px] text-muted-foreground">{d.dayName?.slice(0, 3)}</div>
            <div className={cn("text-xs font-bold", d.avgReturn >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {d.avgReturn >= 0 ? '+' : ''}{d.avgReturn}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthOfYearResult({ data }: { data: any }) {
  if (!data?.analysis) return null;
  const months = [...data.analysis].sort((a: any, b: any) => a.month - b.month);

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {months.map((m: any) => (
        <div
          key={m.month}
          className={cn(
            "p-2 rounded text-center border",
            m.avgReturn >= 0
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-rose-500/10 border-rose-500/20'
          )}
        >
          <div className="text-[10px] text-muted-foreground">{m.monthName?.slice(0, 3)}</div>
          <div className={cn("text-sm font-bold", m.avgReturn >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
            {m.avgReturn >= 0 ? '+' : ''}{m.avgReturn}%
          </div>
          <div className="text-[10px] text-muted-foreground">{m.winRate}% win</div>
        </div>
      ))}
    </div>
  );
}

function ReturnDistributionResult({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatMini label="Avg Daily Return" value={`${data.mean >= 0 ? '+' : ''}${data.mean}%`} positive={data.mean >= 0} />
      <StatMini label="Median Return" value={`${data.median >= 0 ? '+' : ''}${data.median}%`} positive={data.median >= 0} />
      <StatMini label="Positive Days" value={`${data.positiveReturns}%`} positive={data.positiveReturns >= 50} />
      <StatMini label="5th Percentile" value={`${data.percentiles?.p5}%`} positive={false} />
      <StatMini label="95th Percentile" value={`+${data.percentiles?.p95}%`} positive={true} />
      <StatMini label="Total Days" value={`${data.totalDays}`} />
    </div>
  );
}

function DrawdownResult({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatMini label="Max Drawdown" value={`-${data.maxDrawdown}%`} positive={false} />
      <StatMini label="Current Drawdown" value={`-${data.currentDrawdown}%`} positive={data.currentDrawdown === 0} />
      <StatMini label="Avg Recovery" value={data.avgRecoveryDays ? `${data.avgRecoveryDays} days` : 'N/A'} />
      <StatMini label="Significant DDs" value={`${data.significantDrawdowns?.length || 0}`} />
    </div>
  );
}

function MeanReversionResult({ data }: { data: any }) {
  if (!data) return null;
  const signalLabel = data.signal === 'extended_high' ? '⚠️ Extended High' : data.signal === 'extended_low' ? '🟢 Extended Low' : '➡️ Near Mean';
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatMini label="Current Deviation" value={`${data.currentDeviation >= 0 ? '+' : ''}${data.currentDeviation}%`} positive={data.currentDeviation >= 0} />
      <StatMini label="Signal" value={signalLabel} />
      <StatMini label="Reversion Rate" value={data.meanReversionRate ? `${data.meanReversionRate}%` : 'N/A'} />
      <StatMini label="Historical Events" value={`${data.historicalEvents}`} />
    </div>
  );
}

function VolumeResult({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatMini label="Avg Volume" value={formatVolume(data.avgDailyVolume)} />
      <StatMini label="Current Volume" value={formatVolume(data.currentVolume)} />
      <StatMini label="Volume Ratio" value={`${data.volumeRatio}x`} positive={data.volumeRatio >= 1} />
      <StatMini label="Signal" value={data.signal === 'high_volume' ? '🔥 High' : data.signal === 'low_volume' ? '💤 Low' : '➡️ Normal'} />
    </div>
  );
}

function RangeResult({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatMini label="Avg Daily Range" value={`${data.avgDailyRange}%`} />
      <StatMini label="Recent 5-Day Avg" value={`${data.recent5DayAvgRange}%`} />
      <StatMini label="Range Expansion" value={data.rangeExpansion ? '⚡ Yes' : 'No'} positive={!data.rangeExpansion} />
      <StatMini label="Range Contraction" value={data.rangeContraction ? '🔻 Yes' : 'No'} />
    </div>
  );
}

function StatMini({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="p-2 rounded bg-muted/30 border border-border/50">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-semibold", positive === true ? 'text-emerald-500' : positive === false ? 'text-rose-500' : 'text-foreground')}>
        {value}
      </div>
    </div>
  );
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${v}`;
}

function renderStudyResult(studyId: string, data: any) {
  switch (studyId) {
    case 'day_of_week_returns': return <DayOfWeekResult data={data} />;
    case 'month_of_year_returns': return <MonthOfYearResult data={data} />;
    case 'daily_return_distribution': return <ReturnDistributionResult data={data} />;
    case 'drawdown_analysis': return <DrawdownResult data={data} />;
    case 'mean_reversion': return <MeanReversionResult data={data} />;
    case 'volume_analysis': return <VolumeResult data={data} />;
    case 'range_analysis': return <RangeResult data={data} />;
    default: return <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(data, null, 2)}</pre>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function QuickInsightsPanel({ ticker }: QuickInsightsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingStudies, setLoadingStudies] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, any>>({});
  const [openStudies, setOpenStudies] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRunStudy = useCallback(async (studyId: string) => {
    // Toggle open/close if already loaded
    if (results[studyId]) {
      setOpenStudies(prev => {
        const next = new Set(prev);
        if (next.has(studyId)) next.delete(studyId);
        else next.add(studyId);
        return next;
      });
      return;
    }

    // Fetch study
    setLoadingStudies(prev => new Set(prev).add(studyId));
    setErrors(prev => { const next = { ...prev }; delete next[studyId]; return next; });

    try {
      const { data, error } = await supabase.functions.invoke('run-single-study', {
        body: { ticker, studyId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Study failed');

      setResults(prev => ({ ...prev, [studyId]: data.result }));
      setOpenStudies(prev => new Set(prev).add(studyId));
    } catch (err) {
      setErrors(prev => ({ ...prev, [studyId]: err instanceof Error ? err.message : 'Failed' }));
    } finally {
      setLoadingStudies(prev => { const next = new Set(prev); next.delete(studyId); return next; });
    }
  }, [ticker, results]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Quick Insights</span>
              <span className="text-xs text-muted-foreground">— {ticker} statistical studies</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-3">
            {/* Study Chips */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_STUDIES.map(study => {
                const isLoading = loadingStudies.has(study.id);
                const isActive = openStudies.has(study.id);
                const hasError = !!errors[study.id];

                return (
                  <Button
                    key={study.id}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleRunStudy(study.id)}
                    disabled={isLoading}
                    className={cn(
                      "h-7 text-xs gap-1",
                      hasError && "border-destructive/50"
                    )}
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>{study.icon}</span>}
                    {study.label}
                  </Button>
                );
              })}
            </div>

            {/* Results */}
            <div className="space-y-2">
              {QUICK_STUDIES.filter(s => openStudies.has(s.id)).map(study => (
                <div key={study.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{study.icon}</span>
                      <span className="text-sm font-semibold">{study.label}</span>
                    </div>
                    <button
                      onClick={() => setOpenStudies(prev => { const next = new Set(prev); next.delete(study.id); return next; })}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {errors[study.id] ? (
                    <p className="text-xs text-destructive">{errors[study.id]}</p>
                  ) : results[study.id] ? (
                    renderStudyResult(study.id, results[study.id])
                  ) : (
                    <div className="flex items-center gap-2 py-4 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Loading...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
