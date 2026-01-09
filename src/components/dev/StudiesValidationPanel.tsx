/**
 * Studies Validation Panel
 * 
 * Add this component to your app to test all Polygon studies for data accuracy.
 * Shows which studies use real vs mock data and validates all calculations.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Play,
  Database,
  Beaker
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface StudyResult {
  studyType: string;
  passed: boolean;
  usedRealData: boolean;
  barsAnalyzed: number;
  dateRange: { start: string; end: string } | null;
  issues: string[];
  computationTimeMs: number;
}

const STUDY_TYPES = [
  { id: 'daily_close_gt_open', name: 'Close > Open' },
  { id: 'daily_close_gt_prior', name: 'Close > Prior' },
  { id: 'daily_return_distribution', name: 'Return Distribution' },
  { id: 'up_down_streaks', name: 'Win/Loss Streaks' },
  { id: 'day_of_week_returns', name: 'Day of Week' },
  { id: 'month_of_year_returns', name: 'Monthly Seasonality' },
  { id: 'gap_analysis', name: 'Gap Analysis' },
  { id: 'volatility_analysis', name: 'Volatility Analysis' },
  { id: 'drawdown_analysis', name: 'Drawdown Analysis' },
  { id: 'moving_average_analysis', name: 'Moving Averages' },
  { id: 'volume_analysis', name: 'Volume Analysis' },
  { id: 'rsi_analysis', name: 'RSI Analysis' },
  { id: 'mean_reversion', name: 'Mean Reversion' },
  { id: 'range_analysis', name: 'Range Analysis' },
  { id: 'high_low_analysis', name: 'New Highs/Lows' },
  { id: 'trend_strength', name: 'Trend Strength' },
  { id: 'price_targets', name: 'Price Targets' },
];

export function StudiesValidationPanel() {
  const [ticker, setTicker] = useState('AAPL');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStudy, setCurrentStudy] = useState<string | null>(null);
  const [results, setResults] = useState<StudyResult[]>([]);

  const runValidation = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 3);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const newResults: StudyResult[] = [];
    
    for (let i = 0; i < STUDY_TYPES.length; i++) {
      const study = STUDY_TYPES[i];
      setCurrentStudy(study.name);
      setProgress(((i + 1) / STUDY_TYPES.length) * 100);
      
      try {
        const startTime = Date.now();
        
        const { data, error } = await supabase.functions.invoke('run-asset-study', {
          body: {
            ticker: ticker.toUpperCase(),
            studyType: study.id,
            startDate: startDateStr,
            endDate
          }
        });
        
        const computationTimeMs = Date.now() - startTime;
        
        if (error) {
          newResults.push({
            studyType: study.id,
            passed: false,
            usedRealData: false,
            barsAnalyzed: 0,
            dateRange: null,
            issues: [`API Error: ${error.message}`],
            computationTimeMs
          });
        } else if (!data.success) {
          newResults.push({
            studyType: study.id,
            passed: false,
            usedRealData: false,
            barsAnalyzed: 0,
            dateRange: null,
            issues: [`Study Error: ${data.error}`],
            computationTimeMs
          });
        } else {
          const validation = validateResult(study.id, data.result);
          const usedRealData = !data.useMockData;
          
          newResults.push({
            studyType: study.id,
            passed: validation.passed,
            usedRealData,
            barsAnalyzed: data.barsAnalyzed,
            dateRange: data.dateRange,
            issues: validation.issues.concat(usedRealData ? [] : ['Using mock data (add POLYGON_API_KEY)']),
            computationTimeMs
          });
        }
      } catch (err: any) {
        newResults.push({
          studyType: study.id,
          passed: false,
          usedRealData: false,
          barsAnalyzed: 0,
          dateRange: null,
          issues: [`Exception: ${err.message}`],
          computationTimeMs: 0
        });
      }
      
      setResults([...newResults]);
    }
    
    setIsRunning(false);
    setCurrentStudy(null);
  };

  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed && r.usedRealData).length,
    passedMock: results.filter(r => r.passed && !r.usedRealData).length,
    failed: results.filter(r => !r.passed).length,
    realData: results.filter(r => r.usedRealData).length
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Beaker className="h-5 w-5 text-primary" />
          Polygon Studies Validation
        </CardTitle>
        <CardDescription>
          Test all 17 quantitative studies for data accuracy and real data connectivity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ticker:</span>
            <Input 
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="w-24 font-mono"
              disabled={isRunning}
            />
          </div>
          <Button onClick={runValidation} disabled={isRunning} className="gap-2">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run All Tests
              </>
            )}
          </Button>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Testing: {currentStudy}</span>
              <span className="font-mono">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Summary */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard value={summary.total} label="Total" />
            <SummaryCard value={summary.passed} label="Passed (Real)" color="emerald" />
            <SummaryCard value={summary.passedMock} label="Passed (Mock)" color="amber" />
            <SummaryCard value={summary.failed} label="Failed" color="rose" />
            <SummaryCard 
              value={`${summary.realData}/${summary.total}`} 
              label="Real Data" 
              icon={<Database className="h-4 w-4" />}
              color={summary.realData === summary.total ? 'emerald' : summary.realData > 0 ? 'amber' : 'rose'}
            />
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {STUDY_TYPES.map((study) => {
              const result = results.find(r => r.studyType === study.id);
              if (!result) return null;
              
              return (
                <div 
                  key={study.id}
                  className={cn(
                    "p-3 rounded-lg border flex items-center justify-between",
                    result.passed && result.usedRealData ? "bg-emerald-500/5 border-emerald-500/20" :
                    result.passed && !result.usedRealData ? "bg-amber-500/5 border-amber-500/20" :
                    "bg-rose-500/5 border-rose-500/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {result.passed && result.usedRealData ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : result.passed && !result.usedRealData ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{study.name}</p>
                      {result.issues.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {result.issues[0]}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant={result.usedRealData ? 'default' : 'secondary'}>
                      {result.usedRealData ? 'Real' : 'Mock'}
                    </Badge>
                    <span className="font-mono text-muted-foreground">
                      {result.barsAnalyzed} bars
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {result.computationTimeMs}ms
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Data Source Warning */}
        {results.length > 0 && summary.realData === 0 && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-600 dark:text-amber-400">All tests used mock data</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add <code className="bg-muted px-1 rounded">POLYGON_API_KEY</code> to your Supabase secrets to test with real market data.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Run: <code className="bg-muted px-1 rounded">supabase secrets set POLYGON_API_KEY=your_key</code>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryCard({ value, label, color, icon }: { 
  value: string | number; 
  label: string; 
  color?: 'emerald' | 'rose' | 'amber';
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg border text-center",
      color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/20" :
      color === 'rose' ? "bg-rose-500/10 border-rose-500/20" :
      color === 'amber' ? "bg-amber-500/10 border-amber-500/20" :
      "bg-muted/50"
    )}>
      <div className="flex items-center justify-center gap-1">
        {icon}
        <p className={cn(
          "text-2xl font-bold tabular-nums",
          color === 'emerald' ? "text-emerald-500" :
          color === 'rose' ? "text-rose-500" :
          color === 'amber' ? "text-amber-500" : ""
        )}>{value}</p>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// Validation functions
function validateResult(studyType: string, result: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Type checks
  if (!result || typeof result !== 'object') {
    return { passed: false, issues: ['Invalid result object'] };
  }
  
  // Study-specific validation
  switch (studyType) {
    case 'daily_close_gt_open':
    case 'daily_close_gt_prior':
      if (result.percentage < 0 || result.percentage > 100) {
        issues.push(`Percentage ${result.percentage} out of range [0,100]`);
      }
      if (result.up_days + result.down_days + (result.unchanged || 0) !== result.total_days) {
        issues.push('Day counts do not add up');
      }
      break;
      
    case 'daily_return_distribution':
      if (result.stdDev < 0) issues.push('StdDev cannot be negative');
      if (Math.abs(result.mean) > 5) issues.push('Mean return seems unrealistic');
      break;
      
    case 'rsi_analysis':
      if (result.current < 0 || result.current > 100) {
        issues.push(`RSI ${result.current} out of range [0,100]`);
      }
      break;
      
    case 'volatility_analysis':
      if (result.atr.current <= 0) issues.push('ATR must be positive');
      break;
      
    case 'drawdown_analysis':
      if (result.maxDrawdown < 0 || result.maxDrawdown > 100) {
        issues.push(`Max drawdown ${result.maxDrawdown} invalid`);
      }
      break;
      
    case 'trend_strength':
      if (result.trendScore < 0 || result.trendScore > result.maxScore) {
        issues.push('Trend score out of range');
      }
      break;
      
    case 'high_low_analysis':
      if (result.yearHigh < result.yearLow) {
        issues.push('Year high cannot be less than year low');
      }
      break;
  }
  
  return { passed: issues.length === 0, issues };
}

export default StudiesValidationPanel;
