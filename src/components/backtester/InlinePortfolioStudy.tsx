/**
 * Inline Portfolio Study Component
 * Runs studies directly within the portfolio detail panel
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Gauge,
  Zap,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudyResult {
  studyType: string;
  ticker: string;
  data: Record<string, any>;
  interpretation?: string;
}

interface InlinePortfolioStudyProps {
  tickers: string[];
  weights: number[];
  portfolioName: string;
}

const QUICK_STUDIES = [
  { id: 'rsi_analysis', name: 'RSI', icon: Gauge, color: 'text-emerald-500', description: 'Momentum indicator' },
  { id: 'moving_average_analysis', name: 'Moving Avg', icon: TrendingUp, color: 'text-blue-500', description: 'Trend direction' },
  { id: 'volatility_analysis', name: 'Volatility', icon: Zap, color: 'text-amber-500', description: 'Price variability' },
  { id: 'day_of_week_returns', name: 'Seasonality', icon: Calendar, color: 'text-violet-500', description: 'Best trading days' },
];

export function InlinePortfolioStudy({ tickers, weights, portfolioName }: InlinePortfolioStudyProps) {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'individual'>('portfolio');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStudy, setLoadingStudy] = useState<string | null>(null);
  const [results, setResults] = useState<StudyResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runStudy = useCallback(async (studyType: string, ticker?: string) => {
    const targetTicker = ticker || (activeTab === 'individual' ? selectedTicker : tickers[0]);
    if (!targetTicker) {
      toast.error('Please select a ticker first');
      return;
    }

    setIsLoading(true);
    setLoadingStudy(studyType);
    setError(null);

    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Run study for single ticker or portfolio weighted
      if (activeTab === 'portfolio') {
        // Run study for all tickers and aggregate
        const studyPromises = tickers.map(t => 
          supabase.functions.invoke('run-asset-study', {
            body: {
              ticker: t,
              studyType,
              startDate,
              endDate,
              params: {}
            }
          })
        );
        
        const responses = await Promise.all(studyPromises);
        const successfulResults = responses
          .map((r, i) => ({ ticker: tickers[i], weight: weights[i], data: r.data }))
          .filter(r => r.data && !r.data.error);

        if (successfulResults.length > 0) {
          // Create aggregated result
          const aggregatedResult: StudyResult = {
            studyType,
            ticker: 'Portfolio',
            data: aggregatePortfolioResults(successfulResults, studyType),
            interpretation: generatePortfolioInterpretation(successfulResults, studyType, portfolioName),
          };
          
          setResults(prev => [aggregatedResult, ...prev.filter(r => !(r.studyType === studyType && r.ticker === 'Portfolio'))]);
          toast.success(`${QUICK_STUDIES.find(s => s.id === studyType)?.name} study complete`);
        } else {
          throw new Error('No data available for study');
        }
      } else {
        // Single ticker study
        const { data, error: studyError } = await supabase.functions.invoke('run-asset-study', {
          body: {
            ticker: targetTicker,
            studyType,
            startDate,
            endDate,
            params: {}
          }
        });

        if (studyError) throw studyError;

        const result: StudyResult = {
          studyType,
          ticker: targetTicker,
          data: data,
          interpretation: generateTickerInterpretation(data, studyType, targetTicker),
        };

        setResults(prev => [result, ...prev.filter(r => !(r.studyType === studyType && r.ticker === targetTicker))]);
        toast.success(`${QUICK_STUDIES.find(s => s.id === studyType)?.name} study complete for ${targetTicker}`);
      }
    } catch (err: any) {
      console.error('Study error:', err);
      setError(err.message || 'Failed to run study');
      toast.error('Failed to run study');
    } finally {
      setIsLoading(false);
      setLoadingStudy(null);
    }
  }, [activeTab, selectedTicker, tickers, weights, portfolioName]);

  const clearResults = () => {
    setResults([]);
    setError(null);
  };

  return (
    <div className="space-y-3 border-t pt-3 mt-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          Quick Studies
        </h4>
        {results.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearResults} className="h-6 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'portfolio' | 'individual')}>
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="portfolio" className="text-xs">
            <BarChart3 className="h-3 w-3 mr-1" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="individual" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">Analyze the entire portfolio weighted by allocation</p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_STUDIES.map(study => (
              <Button
                key={study.id}
                variant="outline"
                size="sm"
                className="h-8 text-xs justify-start gap-1.5"
                onClick={() => runStudy(study.id)}
                disabled={isLoading}
              >
                {loadingStudy === study.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <study.icon className={cn("h-3 w-3", study.color)} />
                )}
                {study.name}
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="individual" className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">Select a holding to study individually</p>
          
          {/* Ticker Selection */}
          <div className="flex flex-wrap gap-1">
            {tickers.map((ticker, i) => (
              <Badge
                key={ticker}
                variant={selectedTicker === ticker ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedTicker === ticker ? '' : 'hover:bg-muted'
                )}
                onClick={() => setSelectedTicker(ticker)}
              >
                {ticker}
                <span className="ml-1 text-[10px] opacity-60">{weights[i]}%</span>
              </Badge>
            ))}
          </div>

          {selectedTicker && (
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_STUDIES.map(study => (
                <Button
                  key={study.id}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs justify-start gap-1.5"
                  onClick={() => runStudy(study.id, selectedTicker)}
                  disabled={isLoading}
                >
                  {loadingStudy === study.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <study.icon className={cn("h-3 w-3", study.color)} />
                  )}
                  {study.name}
                </Button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Results Display */}
      {(results.length > 0 || error) && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Results</div>
          
          {error && (
            <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}

          <ScrollArea className="max-h-48">
            <div className="space-y-2">
              {results.map((result, idx) => (
                <StudyResultCard key={`${result.studyType}-${result.ticker}-${idx}`} result={result} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function StudyResultCard({ result }: { result: StudyResult }) {
  const study = QUICK_STUDIES.find(s => s.id === result.studyType);
  const [expanded, setExpanded] = useState(false);

  const getKeyMetric = () => {
    const data = result.data;
    switch (result.studyType) {
      case 'rsi_analysis':
        return { label: 'Current RSI', value: data.currentRSI?.toFixed(1) || data.rsi?.toFixed(1) || 'N/A', signal: getRSISignal(data.currentRSI || data.rsi) };
      case 'moving_average_analysis':
        return { label: 'Trend', value: data.trend || 'N/A', signal: data.trend === 'bullish' ? 'bullish' : data.trend === 'bearish' ? 'bearish' : 'neutral' };
      case 'volatility_analysis':
        return { label: '30d Volatility', value: `${(data.volatility30d || data.volatility || 0).toFixed(1)}%`, signal: 'neutral' };
      case 'day_of_week_returns':
        return { label: 'Best Day', value: data.bestDay || 'N/A', signal: 'neutral' };
      default:
        return { label: 'Result', value: 'Complete', signal: 'neutral' };
    }
  };

  const metric = getKeyMetric();

  return (
    <div 
      className="p-2 rounded-lg bg-muted/50 border border-border/50 cursor-pointer hover:bg-muted/70 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {study && <study.icon className={cn("h-3.5 w-3.5", study.color)} />}
          <div>
            <div className="text-xs font-medium">{study?.name || result.studyType}</div>
            <div className="text-[10px] text-muted-foreground">{result.ticker}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px]",
              metric.signal === 'bullish' && 'border-emerald-500/50 text-emerald-500',
              metric.signal === 'bearish' && 'border-red-500/50 text-red-500',
              metric.signal === 'overbought' && 'border-amber-500/50 text-amber-500',
              metric.signal === 'oversold' && 'border-blue-500/50 text-blue-500'
            )}
          >
            {metric.value}
          </Badge>
          <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
        </div>
      </div>
      
      {expanded && result.interpretation && (
        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
          {result.interpretation}
        </div>
      )}
    </div>
  );
}

// Helper functions
function getRSISignal(rsi: number): string {
  if (rsi >= 70) return 'overbought';
  if (rsi <= 30) return 'oversold';
  if (rsi >= 50) return 'bullish';
  return 'bearish';
}

function aggregatePortfolioResults(
  results: { ticker: string; weight: number; data: any }[],
  studyType: string
): Record<string, any> {
  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  
  switch (studyType) {
    case 'rsi_analysis': {
      const weightedRSI = results.reduce((sum, r) => {
        const rsi = r.data?.currentRSI || r.data?.rsi || 50;
        return sum + (rsi * r.weight / totalWeight);
      }, 0);
      return { currentRSI: weightedRSI, components: results.map(r => ({ ticker: r.ticker, rsi: r.data?.currentRSI || r.data?.rsi })) };
    }
    case 'moving_average_analysis': {
      const bullishCount = results.filter(r => r.data?.trend === 'bullish').length;
      const trend = bullishCount >= results.length / 2 ? 'bullish' : bullishCount === 0 ? 'bearish' : 'mixed';
      return { trend, bullishCount, totalAssets: results.length };
    }
    case 'volatility_analysis': {
      const weightedVol = results.reduce((sum, r) => {
        const vol = r.data?.volatility30d || r.data?.volatility || 15;
        return sum + (vol * r.weight / totalWeight);
      }, 0);
      return { volatility30d: weightedVol, components: results.map(r => ({ ticker: r.ticker, vol: r.data?.volatility30d || r.data?.volatility })) };
    }
    case 'day_of_week_returns': {
      const dayScores: Record<string, number> = {};
      results.forEach(r => {
        if (r.data?.bestDay) {
          dayScores[r.data.bestDay] = (dayScores[r.data.bestDay] || 0) + r.weight;
        }
      });
      const bestDay = Object.entries(dayScores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      return { bestDay, dayScores };
    }
    default:
      return { aggregated: true };
  }
}

function generatePortfolioInterpretation(
  results: { ticker: string; weight: number; data: any }[],
  studyType: string,
  portfolioName: string
): string {
  switch (studyType) {
    case 'rsi_analysis': {
      const avgRSI = results.reduce((sum, r) => sum + (r.data?.currentRSI || r.data?.rsi || 50), 0) / results.length;
      if (avgRSI >= 70) return `${portfolioName} shows overbought conditions across holdings. Consider reducing exposure.`;
      if (avgRSI <= 30) return `${portfolioName} shows oversold conditions. Potential buying opportunity.`;
      return `${portfolioName} RSI is neutral (${avgRSI.toFixed(0)}). No extreme momentum signals.`;
    }
    case 'moving_average_analysis': {
      const bullish = results.filter(r => r.data?.trend === 'bullish').length;
      return `${bullish} of ${results.length} holdings showing bullish trends above moving averages.`;
    }
    case 'volatility_analysis': {
      const avgVol = results.reduce((sum, r) => sum + (r.data?.volatility30d || r.data?.volatility || 15), 0) / results.length;
      return `Portfolio weighted volatility: ${avgVol.toFixed(1)}%. ${avgVol > 25 ? 'Higher risk environment.' : 'Moderate volatility levels.'}`;
    }
    case 'day_of_week_returns':
      return `Historical analysis suggests optimal trading patterns for this portfolio mix.`;
    default:
      return `Study completed for ${portfolioName}.`;
  }
}

function generateTickerInterpretation(data: any, studyType: string, ticker: string): string {
  switch (studyType) {
    case 'rsi_analysis': {
      const rsi = data?.currentRSI || data?.rsi || 50;
      if (rsi >= 70) return `${ticker} is overbought (RSI: ${rsi.toFixed(0)}). May be due for a pullback.`;
      if (rsi <= 30) return `${ticker} is oversold (RSI: ${rsi.toFixed(0)}). Could be a buying opportunity.`;
      return `${ticker} RSI at ${rsi.toFixed(0)} - neutral momentum.`;
    }
    case 'moving_average_analysis':
      return data?.trend === 'bullish' 
        ? `${ticker} trading above key moving averages - bullish trend.`
        : `${ticker} trading below key moving averages - bearish trend.`;
    case 'volatility_analysis':
      return `${ticker} 30-day volatility: ${(data?.volatility30d || data?.volatility || 15).toFixed(1)}%`;
    case 'day_of_week_returns':
      return data?.bestDay ? `${ticker} historically performs best on ${data.bestDay}s.` : 'Seasonality analysis complete.';
    default:
      return `Study complete for ${ticker}.`;
  }
}
