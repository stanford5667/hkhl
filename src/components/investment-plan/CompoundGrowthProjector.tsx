/**
 * Compound Growth Projector
 * Shows projected portfolio growth with contributions, multiple return scenarios,
 * drawdown expectations, and goal tracking
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertTriangle,
  Calendar,
  Zap,
  ChevronRight,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Sparkles,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompoundGrowthProjectorProps {
  initialInvestment: number;
  expectedReturn: number;
  volatility: number;
  maxDrawdown: number;
  timeHorizon: number;
  targetGoal?: number;
  monthlyContribution?: number;
  onMonthlyContributionChange?: (value: number) => void;
}

// Benchmark performance data
const BENCHMARKS = {
  sp500: { name: 'S&P 500', return: 10.5, color: '#3b82f6' },
  nasdaq: { name: 'NASDAQ', return: 12.8, color: '#8b5cf6' },
  bonds: { name: 'Bonds (AGG)', return: 5.0, color: '#10b981' },
  balanced: { name: '60/40 Portfolio', return: 7.5, color: '#f59e0b' },
  warren: { name: 'Berkshire Hathaway', return: 20.1, color: '#ec4899' },
  ray: { name: 'All Weather', return: 7.8, color: '#06b6d4' },
};

// Calculate compound growth with monthly contributions
function calculateProjection(
  initial: number,
  monthlyContrib: number,
  annualReturn: number,
  years: number
): { year: number; value: number; contributions: number; gains: number }[] {
  const monthlyRate = annualReturn / 100 / 12;
  const data = [];
  let balance = initial;
  let totalContributions = initial;

  for (let year = 0; year <= years; year++) {
    data.push({
      year,
      value: Math.round(balance),
      contributions: Math.round(totalContributions),
      gains: Math.round(balance - totalContributions),
    });

    // Compound monthly for the next year
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyRate) + monthlyContrib;
      totalContributions += monthlyContrib;
    }
  }

  return data;
}

// Calculate required monthly savings to reach goal
function calculateRequiredMonthly(
  initial: number,
  goal: number,
  annualReturn: number,
  years: number
): number {
  const monthlyRate = annualReturn / 100 / 12;
  const months = years * 12;
  
  // Future value of initial investment
  const fvInitial = initial * Math.pow(1 + monthlyRate, months);
  
  // Remaining amount needed
  const remaining = goal - fvInitial;
  
  if (remaining <= 0) return 0;
  
  // PMT formula: PMT = FV * r / ((1+r)^n - 1)
  const pmt = remaining * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
  
  return Math.max(0, Math.round(pmt));
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function CompoundGrowthProjector({
  initialInvestment,
  expectedReturn,
  volatility,
  maxDrawdown,
  timeHorizon,
  targetGoal = 0,
  monthlyContribution = 0,
  onMonthlyContributionChange,
}: CompoundGrowthProjectorProps) {
  const [localMonthly, setLocalMonthly] = useState(monthlyContribution);
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const [activeScenario, setActiveScenario] = useState<'expected' | 'optimistic' | 'pessimistic'>('expected');

  const monthly = onMonthlyContributionChange ? monthlyContribution : localMonthly;
  const setMonthly = (val: number) => {
    if (onMonthlyContributionChange) {
      onMonthlyContributionChange(val);
    } else {
      setLocalMonthly(val);
    }
  };

  // Calculate projections for different scenarios
  const scenarios = useMemo(() => {
    const optimisticReturn = expectedReturn * 1.3; // 30% better than expected
    const pessimisticReturn = expectedReturn * 0.7; // 30% worse than expected
    
    return {
      expected: calculateProjection(initialInvestment, monthly, expectedReturn, timeHorizon),
      optimistic: calculateProjection(initialInvestment, monthly, optimisticReturn, timeHorizon),
      pessimistic: calculateProjection(initialInvestment, monthly, pessimisticReturn, timeHorizon),
    };
  }, [initialInvestment, monthly, expectedReturn, timeHorizon]);

  // Calculate benchmark projections
  const benchmarkProjections = useMemo(() => {
    return Object.entries(BENCHMARKS).map(([key, benchmark]) => ({
      key,
      ...benchmark,
      projection: calculateProjection(initialInvestment, monthly, benchmark.return, timeHorizon),
    }));
  }, [initialInvestment, monthly, timeHorizon]);

  // Final values
  const finalExpected = scenarios.expected[scenarios.expected.length - 1]?.value || 0;
  const finalOptimistic = scenarios.optimistic[scenarios.optimistic.length - 1]?.value || 0;
  const finalPessimistic = scenarios.pessimistic[scenarios.pessimistic.length - 1]?.value || 0;

  // Goal tracking
  const requiredMonthly = targetGoal > 0 
    ? calculateRequiredMonthly(initialInvestment, targetGoal, expectedReturn, timeHorizon)
    : 0;
  const isOnTrack = targetGoal > 0 && finalExpected >= targetGoal;
  const goalProgress = targetGoal > 0 ? Math.min(100, (finalExpected / targetGoal) * 100) : 0;
  const shortfall = targetGoal > finalExpected ? targetGoal - finalExpected : 0;

  // Multiple return periods
  const returnPeriods = useMemo(() => {
    const calcReturn = (years: number) => {
      const projection = calculateProjection(initialInvestment, monthly, expectedReturn, years);
      const final = projection[projection.length - 1]?.value || 0;
      const totalContrib = initialInvestment + monthly * 12 * years;
      const gain = final - totalContrib;
      const percent = ((final - initialInvestment) / initialInvestment) * 100;
      return { value: final, gain, percent };
    };

    return [
      { label: '1 Year', ...calcReturn(1) },
      { label: '3 Years', ...calcReturn(3) },
      { label: '5 Years', ...calcReturn(5) },
      { label: '10 Years', ...calcReturn(Math.min(10, timeHorizon)) },
      { label: `${timeHorizon} Years`, ...calcReturn(timeHorizon) },
    ].filter((p, i, arr) => i < arr.length - 1 || timeHorizon > 10);
  }, [initialInvestment, monthly, expectedReturn, timeHorizon]);

  // Drawdown expectations
  const worstCaseBalance = finalExpected * (1 + maxDrawdown / 100);
  const recoveryYears = Math.abs(maxDrawdown) / (expectedReturn || 8);

  // Combine data for chart
  const chartData = useMemo(() => {
    return scenarios.expected.map((d, i) => ({
      year: d.year,
      expected: d.value,
      optimistic: scenarios.optimistic[i]?.value,
      pessimistic: scenarios.pessimistic[i]?.value,
      contributions: d.contributions,
      ...(targetGoal > 0 ? { goal: targetGoal } : {}),
      ...Object.fromEntries(
        benchmarkProjections.map(b => [b.key, b.projection[i]?.value])
      ),
    }));
  }, [scenarios, benchmarkProjections, targetGoal]);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <Badge className="mb-2 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-emerald-300 border-0">
              <Sparkles className="w-3 h-3 mr-1" />
              Wealth Projector
            </Badge>
            <CardTitle className="text-xl">Compound Growth Calculator</CardTitle>
            <CardDescription>See how your money grows over time with regular contributions</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Contribution Input */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="monthly-contrib" className="text-white/80 mb-2 block">
                Monthly Contribution
              </Label>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <Input
                  id="monthly-contrib"
                  type="number"
                  value={monthly}
                  onChange={(e) => setMonthly(Math.max(0, parseInt(e.target.value) || 0))}
                  className="max-w-[150px] bg-white/10 border-white/20"
                  placeholder="0"
                />
                <span className="text-white/60 text-sm">/ month</span>
              </div>
            </div>
            
            {/* Quick presets */}
            <div className="flex gap-2 flex-wrap">
              {[100, 250, 500, 1000, 2000].map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthly(preset)}
                  className={cn(
                    "border-white/20 text-white/70 hover:bg-white/10",
                    monthly === preset && "bg-white/10 border-emerald-500/50 text-emerald-300"
                  )}
                >
                  ${preset}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Slider for fine-tuning */}
          <div className="mt-4">
            <Slider
              value={[monthly]}
              onValueChange={([val]) => setMonthly(val)}
              max={5000}
              step={50}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>$0</span>
              <span>$5,000/mo</span>
            </div>
          </div>
        </div>

        {/* Return Periods Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {returnPeriods.map((period, i) => (
            <motion.div
              key={period.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-xl bg-white/5 text-center"
            >
              <p className="text-xs text-white/50 mb-1">{period.label}</p>
              <p className="text-lg font-bold">{formatCurrency(period.value)}</p>
              <p className={cn(
                "text-xs flex items-center justify-center gap-1",
                period.gain >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {period.gain >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {period.gain >= 0 ? '+' : ''}{formatCurrency(period.gain)}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Goal Tracking */}
        {targetGoal > 0 && (
          <div className={cn(
            "p-4 rounded-xl border",
            isOnTrack 
              ? "bg-emerald-500/10 border-emerald-500/30" 
              : "bg-amber-500/10 border-amber-500/30"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className={cn("w-5 h-5", isOnTrack ? "text-emerald-400" : "text-amber-400")} />
                <span className="font-medium">Goal: {formatCurrency(targetGoal)}</span>
              </div>
              <Badge variant={isOnTrack ? "default" : "outline"} className={isOnTrack ? "bg-emerald-500" : ""}>
                {isOnTrack ? '✓ On Track' : 'Needs Adjustment'}
              </Badge>
            </div>
            
            <Progress value={goalProgress} className="h-2 mb-3" />
            
            <div className="flex justify-between text-sm text-white/60">
              <span>Projected: {formatCurrency(finalExpected)}</span>
              <span>{goalProgress.toFixed(0)}% of goal</span>
            </div>

            {!isOnTrack && (
              <div className="mt-3 p-3 rounded-lg bg-black/20 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80">To reach your goal, contribute:</p>
                  <p className="text-lg font-bold text-amber-400">{formatCurrency(requiredMonthly)}/month</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setMonthly(requiredMonthly)}
                  className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Projection Chart */}
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="expectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="optimisticGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="year" 
                stroke="rgba(255,255,255,0.4)"
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                tickFormatter={(y) => `Yr ${y}`}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.4)"
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                tickFormatter={(v) => formatCurrency(v)}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelFormatter={(year) => `Year ${year}`}
              />
              
              {/* Contribution baseline */}
              <Line
                type="monotone"
                dataKey="contributions"
                stroke="rgba(255,255,255,0.3)"
                strokeDasharray="5 5"
                dot={false}
                name="Total Contributions"
              />
              
              {/* Pessimistic scenario */}
              <Area
                type="monotone"
                dataKey="pessimistic"
                stroke="#f43f5e"
                fill="none"
                strokeDasharray="3 3"
                dot={false}
                name="Pessimistic (-30%)"
              />
              
              {/* Expected scenario */}
              <Area
                type="monotone"
                dataKey="expected"
                stroke="#10b981"
                fill="url(#expectedGradient)"
                strokeWidth={2}
                dot={false}
                name="Expected"
              />
              
              {/* Optimistic scenario */}
              <Area
                type="monotone"
                dataKey="optimistic"
                stroke="#3b82f6"
                fill="url(#optimisticGradient)"
                strokeDasharray="3 3"
                dot={false}
                name="Optimistic (+30%)"
              />
              
              {/* Goal line */}
              {targetGoal > 0 && (
                <ReferenceLine 
                  y={targetGoal} 
                  stroke="#f59e0b" 
                  strokeDasharray="5 5"
                  label={{ value: 'Goal', fill: '#f59e0b', fontSize: 12 }}
                />
              )}

              {/* Benchmark lines (optional) */}
              {showBenchmarks && benchmarkProjections.slice(0, 2).map(b => (
                <Line
                  key={b.key}
                  type="monotone"
                  dataKey={b.key}
                  stroke={b.color}
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  dot={false}
                  name={b.name}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Scenario Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'pessimistic', label: 'Bear Case', value: finalPessimistic, color: 'rose', desc: 'If returns are 30% lower' },
            { key: 'expected', label: 'Expected', value: finalExpected, color: 'emerald', desc: 'Based on your allocation' },
            { key: 'optimistic', label: 'Bull Case', value: finalOptimistic, color: 'blue', desc: 'If returns are 30% higher' },
          ].map((scenario) => (
            <div
              key={scenario.key}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer",
                activeScenario === scenario.key 
                  ? `bg-${scenario.color}-500/20 border-${scenario.color}-500/50`
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              )}
              onClick={() => setActiveScenario(scenario.key as typeof activeScenario)}
            >
              <p className="text-xs text-white/50 mb-1">{scenario.label}</p>
              <p className={cn(
                "text-lg font-bold",
                scenario.color === 'emerald' && "text-emerald-400",
                scenario.color === 'rose' && "text-rose-400",
                scenario.color === 'blue' && "text-blue-400",
              )}>
                {formatCurrency(scenario.value)}
              </p>
              <p className="text-[10px] text-white/40 mt-1">{scenario.desc}</p>
            </div>
          ))}
        </div>

        {/* Drawdown Warning */}
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-rose-300">What You Must Be Prepared For</p>
              <p className="text-sm text-white/60 mt-1">
                Based on your risk profile, you should expect a maximum drop of <strong className="text-rose-300">{maxDrawdown}%</strong> at some point.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="p-3 rounded-lg bg-black/20">
                  <p className="text-xs text-white/50">Worst Case Balance</p>
                  <p className="font-bold text-rose-400">{formatCurrency(worstCaseBalance)}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20">
                  <p className="text-xs text-white/50">Est. Recovery Time</p>
                  <p className="font-bold">{recoveryYears.toFixed(1)} years</p>
                </div>
              </div>
              <p className="text-xs text-white/40 mt-3">
                💡 If seeing {formatCurrency(worstCaseBalance)} would make you panic sell, consider reducing your risk tolerance.
              </p>
            </div>
          </div>
        </div>

        {/* Benchmark Comparison */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-400" />
              How You Compare to Famous Strategies
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBenchmarks(!showBenchmarks)}
              className="text-xs"
            >
              {showBenchmarks ? 'Hide' : 'Show'} on Chart
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(BENCHMARKS).map(([key, benchmark]) => {
              const benchFinal = benchmarkProjections.find(b => b.key === key)?.projection.slice(-1)[0]?.value || 0;
              const diff = finalExpected - benchFinal;
              const diffPercent = ((finalExpected - benchFinal) / benchFinal * 100);
              
              return (
                <div key={key} className="p-3 rounded-lg bg-white/5 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: benchmark.color }} />
                    <span className="text-white/70">{benchmark.name}</span>
                  </div>
                  <p className="text-xs text-white/50">{benchmark.return}% avg return</p>
                  <p className={cn(
                    "text-xs mt-1 font-medium",
                    diff >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {diff >= 0 ? '+' : ''}{formatCurrency(diff)} ({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(0)}%)
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
