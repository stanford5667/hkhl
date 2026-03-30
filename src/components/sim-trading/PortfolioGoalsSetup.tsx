import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Target, ShieldCheck, TrendingUp, Save } from 'lucide-react';

interface Props {
  portfolioId: string;
  onSaved?: () => void;
}

const GOAL_TYPES = [
  { value: 'growth', label: 'Capital Growth', desc: 'Grow portfolio value over time' },
  { value: 'income', label: 'Income Generation', desc: 'Generate consistent cash flow from dividends/premiums' },
  { value: 'preservation', label: 'Capital Preservation', desc: 'Protect principal, minimize drawdowns' },
  { value: 'benchmark_beat', label: 'Beat Benchmark', desc: 'Outperform a specific index or fund' },
  { value: 'learning', label: 'Strategy Testing', desc: 'Test and refine a trading approach' },
];

const BENCHMARKS = [
  { value: 'SPY', label: 'S&P 500 (SPY)' },
  { value: 'QQQ', label: 'Nasdaq 100 (QQQ)' },
  { value: 'IWM', label: 'Russell 2000 (IWM)' },
  { value: 'DIA', label: 'Dow Jones (DIA)' },
  { value: 'BND', label: 'Total Bond (BND)' },
  { value: 'VTI', label: 'Total Market (VTI)' },
];

export function PortfolioGoalsSetup({ portfolioId, onSaved }: Props) {
  const { user } = useAuth();
  const [goalType, setGoalType] = useState('growth');
  const [targetReturn, setTargetReturn] = useState(10);
  const [maxDrawdown, setMaxDrawdown] = useState(20);
  const [benchmark, setBenchmark] = useState('SPY');
  const [riskBudget, setRiskBudget] = useState(100);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('sim_portfolio_goals')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHasExisting(true);
          setGoalType(data.goal_type || 'growth');
          setTargetReturn(Number(data.target_annual_return_pct) || 10);
          setMaxDrawdown(Number(data.max_drawdown_pct) || 20);
          setBenchmark(data.benchmark_ticker || 'SPY');
          setRiskBudget(Number(data.risk_budget_pct) || 100);
          setNotes(data.notes || '');
        }
      });
  }, [portfolioId, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        portfolio_id: portfolioId,
        user_id: user.id,
        goal_type: goalType,
        target_annual_return_pct: targetReturn,
        max_drawdown_pct: maxDrawdown,
        benchmark_ticker: benchmark,
        risk_budget_pct: riskBudget,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = hasExisting
        ? await supabase.from('sim_portfolio_goals').update(payload).eq('portfolio_id', portfolioId)
        : await supabase.from('sim_portfolio_goals').insert(payload);

      if (error) throw error;
      setHasExisting(true);
      toast.success('Goals saved');
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save goals');
    } finally {
      setSaving(false);
    }
  };

  const selectedGoal = GOAL_TYPES.find(g => g.value === goalType);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Portfolio Goals & Constraints
        </CardTitle>
        <CardDescription className="text-xs">
          Define your self-directed objectives. The journal will track progress against these — no advice, just data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goal Type */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Primary Objective</Label>
          <Select value={goalType} onValueChange={setGoalType}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_TYPES.map(g => (
                <SelectItem key={g.value} value={g.value}>
                  <span className="font-medium">{g.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedGoal && (
            <p className="text-xs text-muted-foreground">{selectedGoal.desc}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Target Return */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Target Annual Return
            </Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[targetReturn]}
                onValueChange={([v]) => setTargetReturn(v)}
                min={1}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-mono w-12 text-right">{targetReturn}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {targetReturn <= 10 ? 'Conservative' : targetReturn <= 25 ? 'Moderate' : targetReturn <= 50 ? 'Aggressive' : 'Very Aggressive'}
            </p>
          </div>

          {/* Max Drawdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Max Drawdown Tolerance
            </Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[maxDrawdown]}
                onValueChange={([v]) => setMaxDrawdown(v)}
                min={5}
                max={50}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-mono w-12 text-right">{maxDrawdown}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {maxDrawdown <= 10 ? 'Very tight — typical for income/preservation' : maxDrawdown <= 20 ? 'Standard — similar to 60/40 portfolios' : 'Wide — growth-oriented tolerance'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Benchmark */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Benchmark Comparison</Label>
            <Select value={benchmark} onValueChange={setBenchmark}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BENCHMARKS.map(b => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Risk Budget */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Risk Budget (% of capital at risk)</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[riskBudget]}
                onValueChange={([v]) => setRiskBudget(v)}
                min={10}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm font-mono w-12 text-right">{riskBudget}%</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Strategy Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Covered call strategy on mega-caps, rebalance monthly, avoid earnings weeks..."
            className="text-sm min-h-[60px]"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {hasExisting ? 'Update Goals' : 'Save Goals'}
        </Button>
      </CardContent>
    </Card>
  );
}
