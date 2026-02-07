// src/components/earnings/EarningsScreener.tsx

import { useState, useMemo } from 'react';
import { Search, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useEarningsScreen } from '@/hooks/useEarningsCalendar';
import { EarningsScreenCriteria } from '@/types/earnings';
import { EarningsTable } from './EarningsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export const EarningsScreener = () => {
  const { toast } = useToast();
  // Dynamic date range - today through 1 year out
  const today = new Date().toISOString().split('T')[0];
  const oneYearOut = new Date();
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
  const yearEndDate = oneYearOut.toISOString().split('T')[0];
  
  const [criteria, setCriteria] = useState<EarningsScreenCriteria>({
    minConfidence: 0,
    expectedOutcome: 'all',
    dateRange: {
      start: today,
      end: yearEndDate,
    },
    minBeatRate: undefined,
    minAnalystCount: undefined,
  });

  const { data: screenResults, isLoading } = useEarningsScreen(criteria);

  const updateCriteria = (updates: Partial<EarningsScreenCriteria>) => {
    setCriteria(prev => ({ ...prev, ...updates }));
  };

  const exportResults = () => {
    if (!screenResults || screenResults.length === 0) {
      toast({
        title: 'No results to export',
        variant: 'destructive',
      });
      return;
    }

    const csv = [
      ['Symbol', 'Company', 'Report Date', 'Prediction', 'Confidence', 'EPS Est', 'Rev Est', 'Historical Beat Rate'].join(','),
      ...screenResults.map(r => [
        r.symbol,
        r.company_name || '',
        r.report_date,
        r.prediction?.predicted_outcome || '',
        r.prediction?.confidence_score ? (r.prediction.confidence_score * 100).toFixed(1) + '%' : '',
        r.eps_estimate || '',
        r.revenue_estimate || '',
        r.beat_count_2y && r.total_reports_2y 
          ? ((r.beat_count_2y / r.total_reports_2y) * 100).toFixed(1) + '%'
          : '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-screen-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: `Exported ${screenResults.length} results`,
    });
  };

  const stats = useMemo(() => {
    if (!screenResults) return { total: 0, beats: 0, misses: 0, inline: 0 };
    
    return {
      total: screenResults.length,
      beats: screenResults.filter(r => r.prediction?.predicted_outcome === 'beat').length,
      misses: screenResults.filter(r => r.prediction?.predicted_outcome === 'miss').length,
      inline: screenResults.filter(r => r.prediction?.predicted_outcome === 'inline').length,
    };
  }, [screenResults]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Criteria Panel - Compact on mobile */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            Screening Criteria
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Filter companies based on earnings prediction signals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {/* Expected Outcome */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs">Expected Outcome</Label>
              <Select
                value={criteria.expectedOutcome}
                onValueChange={(value) => updateCriteria({ 
                  expectedOutcome: value as 'beat' | 'miss' | 'inline' | 'all' 
                })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Predictions</SelectItem>
                  <SelectItem value="beat">Expected to Beat</SelectItem>
                  <SelectItem value="miss">Expected to Miss</SelectItem>
                  <SelectItem value="inline">Expected Inline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Confidence */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Min. Confidence</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {Math.round(criteria.minConfidence * 100)}%
                </span>
              </div>
              <Slider
                value={[criteria.minConfidence * 100]}
                onValueChange={([value]) => updateCriteria({ minConfidence: value / 100 })}
                min={0}
                max={100}
                step={5}
                className="pt-2"
              />
            </div>

            {/* Historical Beat Rate */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Min. Beat Rate</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {criteria.minBeatRate ? `${Math.round(criteria.minBeatRate * 100)}%` : 'Any'}
                </span>
              </div>
              <Slider
                value={[criteria.minBeatRate ? criteria.minBeatRate * 100 : 0]}
                onValueChange={([value]) => updateCriteria({ 
                  minBeatRate: value > 0 ? value / 100 : undefined 
                })}
                min={0}
                max={100}
                step={10}
                className="pt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary - 2x2 grid on mobile */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
            <CardDescription className="text-[10px] sm:text-xs">Total</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
            <CardDescription className="text-[10px] sm:text-xs">Beats</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              <div className="text-lg sm:text-2xl font-bold text-green-500">{stats.beats}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
            <CardDescription className="text-[10px] sm:text-xs">Misses</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              <div className="text-lg sm:text-2xl font-bold text-destructive">{stats.misses}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
            <CardDescription className="text-[10px] sm:text-xs">Inline</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold text-muted-foreground">{stats.inline}</div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg">Results</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Companies matching your criteria
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportResults}
              disabled={!screenResults || screenResults.length === 0}
              className="w-full sm:w-auto h-8 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-10 sm:h-12 w-full" />
              ))}
            </div>
          ) : screenResults && screenResults.length > 0 ? (
            <EarningsTable earnings={screenResults} showDate />
          ) : (
            <div className="py-8 sm:py-12 text-center text-muted-foreground text-sm">
              No companies match your criteria. Try adjusting filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
