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
  const [criteria, setCriteria] = useState<EarningsScreenCriteria>({
    minConfidence: 0,
    expectedOutcome: 'all',
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days ahead
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
    <div className="space-y-6">
      {/* Criteria Panel */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Screening Criteria
          </CardTitle>
          <CardDescription>
            Filter companies based on earnings prediction signals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Expected Outcome */}
            <div className="space-y-2">
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
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Minimum Confidence</Label>
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
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Min. Historical Beat Rate</Label>
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

      {/* Results Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Total Results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Expected Beats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <div className="text-2xl font-bold text-emerald-600">{stats.beats}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Expected Misses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <div className="text-2xl font-bold text-destructive">{stats.misses}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Expected Inline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.inline}</div>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Screening Results</CardTitle>
              <CardDescription>
                Companies matching your criteria
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportResults}
              disabled={!screenResults || screenResults.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : screenResults && screenResults.length > 0 ? (
            <EarningsTable earnings={screenResults} showDate />
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No companies match your screening criteria. Try adjusting the filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
