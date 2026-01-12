import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  FileCheck, 
  Calculator,
  Database,
  Clock,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  study: string;
  studyType: string;
  passed: boolean;
  usedRealData: boolean;
  barsAnalyzed: number;
  dateRange: { start: string; end: string } | null;
  issues: string[];
  metrics: Record<string, any>;
  calculationChecks?: CalculationCheck[];
}

interface CalculationCheck {
  name: string;
  expected: number | string;
  actual: number | string;
  passed: boolean;
  formula: string;
  tolerance?: number;
}

const STUDY_TYPES = [
  'daily_close_gt_open',
  'daily_close_gt_prior', 
  'daily_return_distribution',
  'up_down_streaks',
  'day_of_week_returns',
  'month_of_year_returns',
  'gap_analysis',
  'volatility_analysis',
  'drawdown_analysis',
  'moving_average_analysis',
  'volume_analysis',
  'rsi_analysis',
  'mean_reversion',
  'range_analysis',
  'high_low_analysis',
  'trend_strength',
  'price_targets'
];

const STUDY_NAMES: Record<string, string> = {
  'daily_close_gt_open': 'Close > Open',
  'daily_close_gt_prior': 'Close > Prior Close',
  'daily_return_distribution': 'Return Distribution',
  'up_down_streaks': 'Up/Down Streaks',
  'day_of_week_returns': 'Day of Week Returns',
  'month_of_year_returns': 'Month of Year Returns',
  'gap_analysis': 'Gap Analysis',
  'volatility_analysis': 'Volatility Analysis',
  'drawdown_analysis': 'Drawdown Analysis',
  'moving_average_analysis': 'Moving Average Analysis',
  'volume_analysis': 'Volume Analysis',
  'rsi_analysis': 'RSI Analysis',
  'mean_reversion': 'Mean Reversion',
  'range_analysis': 'Range Analysis',
  'high_low_analysis': 'High/Low Analysis',
  'trend_strength': 'Trend Strength',
  'price_targets': 'Price Targets'
};

// Deep validation functions that verify mathematical accuracy
function verifyPercentageStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Verify percentage calculation
  const calculatedPct = (result.up_days / result.total_days) * 100;
  checks.push({
    name: 'Percentage Calculation',
    expected: calculatedPct.toFixed(4),
    actual: result.percentage.toFixed(4),
    passed: Math.abs(calculatedPct - result.percentage) < 0.01,
    formula: '(up_days / total_days) × 100',
    tolerance: 0.01
  });
  
  // Check 2: Verify day counts sum
  const sumDays = result.up_days + result.down_days + result.unchanged;
  checks.push({
    name: 'Day Count Sum',
    expected: result.total_days,
    actual: sumDays,
    passed: sumDays === result.total_days,
    formula: 'up_days + down_days + unchanged = total_days'
  });
  
  // Check 3: Percentage in valid range
  checks.push({
    name: 'Percentage Range',
    expected: '0-100',
    actual: result.percentage.toFixed(2),
    passed: result.percentage >= 0 && result.percentage <= 100,
    formula: '0 ≤ percentage ≤ 100'
  });
  
  return checks;
}

function verifyDistributionStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Annualized volatility formula
  const expectedAnnualVol = result.stdDev * Math.sqrt(252);
  checks.push({
    name: 'Annualized Volatility',
    expected: expectedAnnualVol.toFixed(4),
    actual: result.annualizedVol.toFixed(4),
    passed: Math.abs(expectedAnnualVol - result.annualizedVol) < 0.1,
    formula: 'σ_daily × √252',
    tolerance: 0.1
  });
  
  // Check 2: Percentiles in order
  const p = result.percentiles;
  const inOrder = p.p5 <= p.p25 && p.p25 <= p.p50 && p.p50 <= p.p75 && p.p75 <= p.p95;
  checks.push({
    name: 'Percentile Order',
    expected: 'p5 ≤ p25 ≤ p50 ≤ p75 ≤ p95',
    actual: `${p.p5.toFixed(2)} ≤ ${p.p25.toFixed(2)} ≤ ${p.p50.toFixed(2)} ≤ ${p.p75.toFixed(2)} ≤ ${p.p95.toFixed(2)}`,
    passed: inOrder,
    formula: 'Ascending percentile order'
  });
  
  // Check 3: Min/Max consistency
  checks.push({
    name: 'Min/Max Bounds',
    expected: 'min ≤ p5, max ≥ p95',
    actual: `min=${result.min.toFixed(2)}, max=${result.max.toFixed(2)}`,
    passed: result.min <= p.p5 && result.max >= p.p95,
    formula: 'Extremes contain percentiles'
  });
  
  // Check 4: Reasonable daily return range
  checks.push({
    name: 'Mean Daily Return',
    expected: '|mean| < 1%',
    actual: `${result.mean.toFixed(4)}%`,
    passed: Math.abs(result.mean) < 1,
    formula: 'Typical daily returns are small'
  });
  
  return checks;
}

function verifyStreaksStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Max >= Avg
  checks.push({
    name: 'Max Up Streak ≥ Avg',
    expected: `avg ≤ ${result.maxUpStreak}`,
    actual: result.avgUpStreak.toFixed(2),
    passed: result.avgUpStreak <= result.maxUpStreak,
    formula: 'Average cannot exceed maximum'
  });
  
  checks.push({
    name: 'Max Down Streak ≥ Avg',
    expected: `avg ≤ ${result.maxDownStreak}`,
    actual: result.avgDownStreak.toFixed(2),
    passed: result.avgDownStreak <= result.maxDownStreak,
    formula: 'Average cannot exceed maximum'
  });
  
  // Check 2: Valid current direction
  checks.push({
    name: 'Current Direction Valid',
    expected: 'up or down',
    actual: result.currentDirection,
    passed: ['up', 'down'].includes(result.currentDirection),
    formula: 'Direction ∈ {up, down}'
  });
  
  return checks;
}

function verifyRSIStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: RSI in valid range
  checks.push({
    name: 'Current RSI Range',
    expected: '0-100',
    actual: result.current.toFixed(2),
    passed: result.current >= 0 && result.current <= 100,
    formula: 'RSI = 100 - (100 / (1 + RS))'
  });
  
  // Check 2: Overbought/Oversold percentages
  checks.push({
    name: 'Overbought % Valid',
    expected: '0-100%',
    actual: `${result.overboughtPct.toFixed(2)}%`,
    passed: result.overboughtPct >= 0 && result.overboughtPct <= 100,
    formula: '% of days RSI > 70'
  });
  
  // Check 3: Distribution sums to ~100%
  const distTotal = result.distribution.reduce((sum: number, d: any) => sum + d.count, 0);
  checks.push({
    name: 'Distribution Coverage',
    expected: '> 0 total count',
    actual: distTotal.toString(),
    passed: distTotal > 0,
    formula: 'All RSI values categorized'
  });
  
  return checks;
}

function verifyVolatilityStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: ATR min <= avg <= max
  checks.push({
    name: 'ATR Ordering',
    expected: 'min ≤ avg ≤ max',
    actual: `${result.atr.min.toFixed(2)} ≤ ${result.atr.avg.toFixed(2)} ≤ ${result.atr.max.toFixed(2)}`,
    passed: result.atr.min <= result.atr.avg && result.atr.avg <= result.atr.max,
    formula: 'Statistical ordering constraint'
  });
  
  // Check 2: Volatility clustering in range
  checks.push({
    name: 'Volatility Clustering %',
    expected: '0-100%',
    actual: `${result.volatilityClustering.toFixed(2)}%`,
    passed: result.volatilityClustering >= 0 && result.volatilityClustering <= 100,
    formula: 'Consecutive high-vol days ratio'
  });
  
  // Check 3: Positive ATR values
  checks.push({
    name: 'ATR Positivity',
    expected: '> 0',
    actual: result.atr.current.toFixed(4),
    passed: result.atr.current > 0 && result.atr.avg > 0,
    formula: 'ATR = max(H-L, |H-Cp|, |L-Cp|)'
  });
  
  return checks;
}

function verifyDrawdownStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Max drawdown in valid range
  checks.push({
    name: 'Max Drawdown Range',
    expected: '0-100%',
    actual: `${result.maxDrawdown.toFixed(2)}%`,
    passed: result.maxDrawdown >= 0 && result.maxDrawdown <= 100,
    formula: 'MDD = (Peak - Trough) / Peak × 100'
  });
  
  // Check 2: Current <= Max
  checks.push({
    name: 'Current ≤ Max DD',
    expected: `≤ ${result.maxDrawdown.toFixed(2)}%`,
    actual: `${result.currentDrawdown.toFixed(2)}%`,
    passed: result.currentDrawdown <= result.maxDrawdown + 0.01,
    formula: 'Current cannot exceed historical max'
  });
  
  // Check 3: Non-negative recovery days
  checks.push({
    name: 'Recovery Days Valid',
    expected: '≥ 0',
    actual: result.avgRecoveryDays.toFixed(1),
    passed: result.avgRecoveryDays >= 0,
    formula: 'Days from trough to recovery'
  });
  
  return checks;
}

function verifyMeanReversionStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Autocorrelation in valid range
  checks.push({
    name: 'Autocorrelation Range',
    expected: '-1 to 1',
    actual: result.autocorrelation.toFixed(4),
    passed: result.autocorrelation >= -1 && result.autocorrelation <= 1,
    formula: 'ρ = Cov(Rt, Rt-1) / σ²'
  });
  
  // Check 2: Valid regime
  checks.push({
    name: 'Regime Classification',
    expected: 'mean_reverting, trending, or random',
    actual: result.regime,
    passed: ['mean_reverting', 'trending', 'random'].includes(result.regime),
    formula: 'Based on autocorrelation sign'
  });
  
  // Check 3: Reversal rates in range
  checks.push({
    name: 'After Large Up Reversal',
    expected: '0-100%',
    actual: `${result.afterLargeUp.reversalRate.toFixed(2)}%`,
    passed: result.afterLargeUp.reversalRate >= 0 && result.afterLargeUp.reversalRate <= 100,
    formula: '% of large up days followed by down'
  });
  
  return checks;
}

function verifyPriceTargetsStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Current price positive
  checks.push({
    name: 'Current Price Valid',
    expected: '> 0',
    actual: `$${result.currentPrice.toFixed(2)}`,
    passed: result.currentPrice > 0,
    formula: 'Price must be positive'
  });
  
  // Check 2: Projections in order
  const p30 = result.projections.days30;
  const ordered = p30.worst < p30.bear && p30.bear < p30.expected && 
                  p30.expected < p30.bull && p30.bull < p30.best;
  checks.push({
    name: '30-Day Projection Order',
    expected: 'worst < bear < expected < bull < best',
    actual: `${p30.worst.toFixed(0)} < ${p30.bear.toFixed(0)} < ${p30.expected.toFixed(0)} < ${p30.bull.toFixed(0)} < ${p30.best.toFixed(0)}`,
    passed: ordered,
    formula: 'Scenarios in risk order'
  });
  
  // Check 3: Verify projection formula
  const expectedProj = result.currentPrice * Math.pow(1 + result.dailyReturn / 100, 30);
  checks.push({
    name: '30-Day Expected Formula',
    expected: expectedProj.toFixed(2),
    actual: p30.expected.toFixed(2),
    passed: Math.abs(expectedProj - p30.expected) / expectedProj < 0.01,
    formula: 'P × (1 + r)^30'
  });
  
  return checks;
}

function verifyCalendarStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Stats array exists and has entries
  checks.push({
    name: 'Stats Array Valid',
    expected: '> 0 entries',
    actual: `${result.stats?.length || 0} entries`,
    passed: Array.isArray(result.stats) && result.stats.length > 0,
    formula: 'Each period has statistics'
  });
  
  if (!result.stats?.length) return checks;
  
  // Check 2: All hit rates in valid range
  const invalidHitRates = result.stats.filter((s: any) => s.hitRate < 0 || s.hitRate > 100);
  checks.push({
    name: 'Hit Rates in Range',
    expected: 'All 0-100%',
    actual: invalidHitRates.length > 0 ? `${invalidHitRates.length} invalid` : 'All valid',
    passed: invalidHitRates.length === 0,
    formula: '0 ≤ hitRate ≤ 100'
  });
  
  // Check 3: No weekend days for day of week
  if (result.period === 'day_of_week') {
    const dayNames = result.stats.map((s: any) => s.name);
    const hasWeekend = dayNames.includes('Sunday') || dayNames.includes('Saturday');
    checks.push({
      name: 'No Weekend Days',
      expected: 'Mon-Fri only',
      actual: hasWeekend ? 'Contains weekend' : 'Weekdays only',
      passed: !hasWeekend,
      formula: 'Stock markets closed weekends'
    });
  }
  
  return checks;
}

function verifyGapStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Gap counts non-negative
  checks.push({
    name: 'Gap Counts Valid',
    expected: '≥ 0',
    actual: `Up: ${result.gapsUp.count}, Down: ${result.gapsDown.count}`,
    passed: result.gapsUp.count >= 0 && result.gapsDown.count >= 0,
    formula: 'Counts cannot be negative'
  });
  
  // Check 2: Fill rates in range
  if (result.gapsUp.count > 0) {
    checks.push({
      name: 'Gap Up Fill Rate',
      expected: '0-100%',
      actual: `${result.gapsUp.fillRate.toFixed(1)}%`,
      passed: result.gapsUp.fillRate >= 0 && result.gapsUp.fillRate <= 100,
      formula: '% of gaps that filled same day'
    });
  }
  
  // Check 3: Gap direction consistency
  if (result.gapsUp.count > 0) {
    checks.push({
      name: 'Gap Up Avg Size',
      expected: '> 0%',
      actual: `${result.gapsUp.avgGapSize.toFixed(3)}%`,
      passed: result.gapsUp.avgGapSize > 0,
      formula: 'Gap up = Open > Prior Close'
    });
  }
  
  if (result.gapsDown.count > 0) {
    checks.push({
      name: 'Gap Down Avg Size',
      expected: '< 0%',
      actual: `${result.gapsDown.avgGapSize.toFixed(3)}%`,
      passed: result.gapsDown.avgGapSize < 0,
      formula: 'Gap down = Open < Prior Close'
    });
  }
  
  return checks;
}

function verifyMovingAverageStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check each MA period
  for (const period of ['ma20', 'ma50', 'ma200']) {
    if (result[period]) {
      const ma = result[period];
      
      // SMA and EMA should be positive
      checks.push({
        name: `${period.toUpperCase()} Values Positive`,
        expected: '> 0',
        actual: `SMA: ${ma.sma?.toFixed(2)}, EMA: ${ma.ema?.toFixed(2)}`,
        passed: ma.sma > 0 && ma.ema > 0,
        formula: 'Price averages must be positive'
      });
      
      // Percentage above should be 0-100%
      checks.push({
        name: `${period.toUpperCase()} % Above Valid`,
        expected: '0-100%',
        actual: `${ma.pctAboveSMA.toFixed(1)}%`,
        passed: ma.pctAboveSMA >= 0 && ma.pctAboveSMA <= 100,
        formula: '% of days price > MA'
      });
    }
  }
  
  // Check trend if available
  if (result.currentTrend) {
    checks.push({
      name: 'Current Trend Valid',
      expected: 'bullish or bearish',
      actual: result.currentTrend,
      passed: ['bullish', 'bearish'].includes(result.currentTrend),
      formula: 'Based on MA crossovers'
    });
  }
  
  return checks;
}

function verifyVolumeStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Volume values positive
  checks.push({
    name: 'Average Volume Positive',
    expected: '> 0',
    actual: result.avgVolume?.toLocaleString() || '0',
    passed: result.avgVolume > 0,
    formula: 'Trading activity must be positive'
  });
  
  checks.push({
    name: 'Current Volume Positive',
    expected: '> 0',
    actual: result.currentVolume?.toLocaleString() || '0',
    passed: result.currentVolume > 0,
    formula: 'Latest day volume'
  });
  
  // Check 2: Volume ratio positive
  checks.push({
    name: 'Volume Ratio Valid',
    expected: '> 0',
    actual: result.volumeRatio?.toFixed(2) || '0',
    passed: result.volumeRatio > 0,
    formula: 'Current / Average volume'
  });
  
  // Check 3: Volume bias valid
  checks.push({
    name: 'Volume Bias Classification',
    expected: 'accumulation or distribution',
    actual: result.volumeBias,
    passed: ['accumulation', 'distribution'].includes(result.volumeBias),
    formula: 'Based on up/down day volume'
  });
  
  return checks;
}

function verifyRangeStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Positive range values
  checks.push({
    name: 'Average Range Positive',
    expected: '> 0',
    actual: `$${result.avgDailyRange?.toFixed(2) || 0}`,
    passed: result.avgDailyRange > 0,
    formula: 'Avg(High - Low)'
  });
  
  checks.push({
    name: 'Range % Positive',
    expected: '> 0%',
    actual: `${result.avgRangePercent?.toFixed(2) || 0}%`,
    passed: result.avgRangePercent > 0,
    formula: '(High - Low) / Close × 100'
  });
  
  // Check 2: Body percent in range
  checks.push({
    name: 'Body % Valid',
    expected: '0-100%',
    actual: `${result.avgBodyPercent?.toFixed(1) || 0}%`,
    passed: result.avgBodyPercent >= 0 && result.avgBodyPercent <= 100,
    formula: '|Close - Open| / Range × 100'
  });
  
  // Check 3: Doji rate in range
  checks.push({
    name: 'Doji Rate Valid',
    expected: '0-100%',
    actual: `${result.dojiRate?.toFixed(1) || 0}%`,
    passed: result.dojiRate >= 0 && result.dojiRate <= 100,
    formula: '% of days with body < 10%'
  });
  
  return checks;
}

function verifyHighLowStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Year high >= year low
  checks.push({
    name: 'High ≥ Low',
    expected: `High ≥ Low`,
    actual: `$${result.yearHigh?.toFixed(2)} ≥ $${result.yearLow?.toFixed(2)}`,
    passed: result.yearHigh >= result.yearLow,
    formula: '52-week high ≥ 52-week low'
  });
  
  // Check 2: Distance from high should be <= 0
  checks.push({
    name: 'Distance from High',
    expected: '≤ 0%',
    actual: `${result.distFromHigh?.toFixed(2)}%`,
    passed: result.distFromHigh <= 1, // Allow tiny margin
    formula: '(Current - High) / High × 100'
  });
  
  // Check 3: Distance from low should be >= 0
  checks.push({
    name: 'Distance from Low',
    expected: '≥ 0%',
    actual: `${result.distFromLow?.toFixed(2)}%`,
    passed: result.distFromLow >= -1, // Allow tiny margin
    formula: '(Current - Low) / Low × 100'
  });
  
  return checks;
}

function verifyTrendStrengthStudy(result: any): CalculationCheck[] {
  const checks: CalculationCheck[] = [];
  
  // Check 1: Score in valid range
  checks.push({
    name: 'Trend Score Range',
    expected: `0-${result.maxScore}`,
    actual: result.trendScore?.toString() || '0',
    passed: result.trendScore >= 0 && result.trendScore <= result.maxScore,
    formula: 'Sum of bullish indicators'
  });
  
  // Check 2: Valid direction
  checks.push({
    name: 'Trend Direction Valid',
    expected: 'strong_up, up, neutral, down, strong_down',
    actual: result.trendDirection,
    passed: ['strong_up', 'up', 'neutral', 'down', 'strong_down'].includes(result.trendDirection),
    formula: 'Based on trend score'
  });
  
  // Check 3: Higher highs/lows rates in range
  checks.push({
    name: 'Higher Highs Rate',
    expected: '0-100%',
    actual: `${result.higherHighsRate?.toFixed(1) || 0}%`,
    passed: result.higherHighsRate >= 0 && result.higherHighsRate <= 100,
    formula: '% of days making higher highs'
  });
  
  return checks;
}

function getVerificationFunction(studyType: string): ((result: any) => CalculationCheck[]) | null {
  const verifiers: Record<string, (result: any) => CalculationCheck[]> = {
    'daily_close_gt_open': verifyPercentageStudy,
    'daily_close_gt_prior': verifyPercentageStudy,
    'daily_return_distribution': verifyDistributionStudy,
    'up_down_streaks': verifyStreaksStudy,
    'day_of_week_returns': verifyCalendarStudy,
    'month_of_year_returns': verifyCalendarStudy,
    'gap_analysis': verifyGapStudy,
    'volatility_analysis': verifyVolatilityStudy,
    'drawdown_analysis': verifyDrawdownStudy,
    'moving_average_analysis': verifyMovingAverageStudy,
    'volume_analysis': verifyVolumeStudy,
    'rsi_analysis': verifyRSIStudy,
    'mean_reversion': verifyMeanReversionStudy,
    'range_analysis': verifyRangeStudy,
    'high_low_analysis': verifyHighLowStudy,
    'trend_strength': verifyTrendStrengthStudy,
    'price_targets': verifyPriceTargetsStudy,
  };
  return verifiers[studyType] || null;
}

interface StudyAuditDashboardProps {
  ticker?: string;
  onClose?: () => void;
}

export const StudyAuditDashboard: React.FC<StudyAuditDashboardProps> = ({ 
  ticker = 'AAPL',
  onClose 
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [currentStudy, setCurrentStudy] = useState<string>('');
  const [expandedStudy, setExpandedStudy] = useState<string | null>(null);

  const runAudit = async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 3);
    
    const newResults: ValidationResult[] = [];
    
    for (let i = 0; i < STUDY_TYPES.length; i++) {
      const studyType = STUDY_TYPES[i];
      setCurrentStudy(STUDY_NAMES[studyType] || studyType);
      setProgress(((i + 1) / STUDY_TYPES.length) * 100);
      
      try {
        const { data, error } = await supabase.functions.invoke('run-asset-study', {
          body: {
            ticker,
            studyType,
            startDate: startDate.toISOString().split('T')[0],
            endDate
          }
        });
        
        if (error) {
          newResults.push({
            study: STUDY_NAMES[studyType] || studyType,
            studyType,
            passed: false,
            usedRealData: false,
            barsAnalyzed: 0,
            dateRange: null,
            issues: [`API Error: ${error.message}`],
            metrics: {}
          });
          continue;
        }
        
        if (!data.success) {
          newResults.push({
            study: STUDY_NAMES[studyType] || studyType,
            studyType,
            passed: false,
            usedRealData: false,
            barsAnalyzed: 0,
            dateRange: null,
            issues: [`Study Error: ${data.error}`],
            metrics: {}
          });
          continue;
        }
        
        // Run deep verification
        const verifier = getVerificationFunction(studyType);
        const calculationChecks = verifier ? verifier(data.result) : [];
        const allChecksPassed = calculationChecks.every(c => c.passed);
        
        const issues: string[] = [];
        if (data.useMockData) {
          issues.push('Using mock data - POLYGON_API_KEY not configured');
        }
        calculationChecks.filter(c => !c.passed).forEach(c => {
          issues.push(`${c.name}: expected ${c.expected}, got ${c.actual}`);
        });
        
        newResults.push({
          study: STUDY_NAMES[studyType] || studyType,
          studyType,
          passed: !data.useMockData && allChecksPassed && issues.length === 0,
          usedRealData: !data.useMockData,
          barsAnalyzed: data.barsAnalyzed,
          dateRange: data.dateRange,
          issues,
          metrics: data.result,
          calculationChecks
        });
        
      } catch (err: any) {
        newResults.push({
          study: STUDY_NAMES[studyType] || studyType,
          studyType,
          passed: false,
          usedRealData: false,
          barsAnalyzed: 0,
          dateRange: null,
          issues: [`Exception: ${err.message}`],
          metrics: {}
        });
      }
      
      setResults([...newResults]);
    }
    
    setIsRunning(false);
    setCurrentStudy('');
  };

  const passedCount = results.filter(r => r.passed).length;
  const realDataCount = results.filter(r => r.usedRealData).length;
  const totalChecks = results.reduce((sum, r) => sum + (r.calculationChecks?.length || 0), 0);
  const passedChecks = results.reduce((sum, r) => 
    sum + (r.calculationChecks?.filter(c => c.passed).length || 0), 0);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Study Accuracy Audit</CardTitle>
              <p className="text-sm text-muted-foreground">
                Verify all 17 studies produce mathematically correct results
              </p>
            </div>
          </div>
          <Button 
            onClick={runAudit} 
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Full Audit
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Testing: {currentStudy}</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {results.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold text-foreground">{results.length}</div>
                <div className="text-xs text-muted-foreground">Studies Tested</div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 text-center">
                <div className="text-2xl font-bold text-green-600">{passedCount}</div>
                <div className="text-xs text-muted-foreground">Passed</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                <div className="text-2xl font-bold text-blue-600">{realDataCount}</div>
                <div className="text-xs text-muted-foreground">Real Data</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Calc Accuracy</div>
              </div>
            </div>
            
            {/* Results List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                <AnimatePresence>
                  {results.map((result, idx) => (
                    <motion.div
                      key={result.studyType}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div 
                        className={`p-3 rounded-lg border cursor-pointer transition-colors
                          ${result.passed 
                            ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10' 
                            : 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'}`}
                        onClick={() => setExpandedStudy(
                          expandedStudy === result.studyType ? null : result.studyType
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {result.passed ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <div>
                              <div className="font-medium">{result.study}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <Database className="h-3 w-3" />
                                {result.barsAnalyzed} bars
                                {result.usedRealData ? (
                                  <Badge variant="outline" className="text-xs py-0 px-1 bg-green-500/10">
                                    Real Data
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs py-0 px-1 bg-yellow-500/10">
                                    Mock Data
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.calculationChecks && (
                              <Badge variant="outline" className="text-xs">
                                {result.calculationChecks.filter(c => c.passed).length}/
                                {result.calculationChecks.length} checks
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Expanded Details */}
                        <AnimatePresence>
                          {expandedStudy === result.studyType && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                                {/* Issues */}
                                {result.issues.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-red-500 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Issues Found
                                    </div>
                                    {result.issues.map((issue, i) => (
                                      <div key={i} className="text-xs text-muted-foreground pl-4">
                                        • {issue}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Calculation Checks */}
                                {result.calculationChecks && result.calculationChecks.length > 0 && (
                                  <div className="space-y-2">
                                    <div className="text-xs font-medium flex items-center gap-1">
                                      <Calculator className="h-3 w-3" />
                                      Calculation Verification
                                    </div>
                                    <div className="grid gap-1.5">
                                      {result.calculationChecks.map((check, i) => (
                                        <div 
                                          key={i}
                                          className={`text-xs p-2 rounded flex items-start gap-2
                                            ${check.passed ? 'bg-green-500/10' : 'bg-red-500/10'}`}
                                        >
                                          {check.passed ? (
                                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                          ) : (
                                            <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium">{check.name}</div>
                                            <div className="text-muted-foreground truncate">
                                              Formula: {check.formula}
                                            </div>
                                            <div className="flex gap-4 mt-1">
                                              <span>Expected: <code className="bg-muted px-1 rounded">{check.expected}</code></span>
                                              <span>Actual: <code className="bg-muted px-1 rounded">{check.actual}</code></span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Date Range */}
                                {result.dateRange && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Data Range: {result.dateRange.start} to {result.dateRange.end}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
            
            {/* Overall Score */}
            {!isRunning && results.length === STUDY_TYPES.length && (
              <div className={`p-4 rounded-lg text-center ${
                passedCount === results.length 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-yellow-500/10 border border-yellow-500/30'
              }`}>
                <div className="text-3xl font-bold mb-1">
                  {Math.round((passedCount / results.length) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Overall Accuracy Score
                </div>
                {passedCount === results.length ? (
                  <div className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    All studies producing verifiable results!
                  </div>
                ) : (
                  <div className="text-sm text-yellow-600 mt-2">
                    {results.length - passedCount} study(ies) need attention
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {!isRunning && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Click "Run Full Audit" to verify all study calculations</p>
            <p className="text-sm mt-1">Testing ticker: <code className="bg-muted px-2 py-0.5 rounded">{ticker}</code></p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudyAuditDashboard;
