import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, Target, Percent, Calendar, Search, Filter, ArrowUpDown, Loader2, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ScreenerFilters {
  minProbability: number;
  maxProbability: number;
  minExpectedReturn: number | null;
  minSampleSize: number;
  eventType: string | null;
  sector: string | null;
  marketCapTier: string | null;
  maxDaysUntil: number | null;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string | null;
  market_cap_tier: string | null;
  event_type: string;
  probability_score: number;
  expected_return: number;
  sample_size: number;
  win_rate: number;
  days_until_event: number;
  next_event_date: string | null;
  confidence_level: string;
}

const eventTypes = [
  { value: 'earnings', label: 'Earnings' },
  { value: 'dividend', label: 'Dividend' },
  { value: 'fomc', label: 'FOMC' },
  { value: 'cpi', label: 'CPI Release' },
  { value: 'jobs', label: 'Jobs Report' },
  { value: 'general', label: 'General' },
];

const sectors = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Communication Services', 'Industrials', 'Consumer Defensive',
  'Energy', 'Basic Materials', 'Real Estate', 'Utilities'
];

const marketCapTiers = [
  { value: 'mega', label: 'Mega (>$200B)' },
  { value: 'large', label: 'Large ($10-200B)' },
  { value: 'mid', label: 'Mid ($2-10B)' },
  { value: 'small', label: 'Small ($300M-2B)' },
  { value: 'micro', label: 'Micro (<$300M)' },
];

export function ProbabilityScreener() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ScreenerFilters>({
    minProbability: 60,
    maxProbability: 100,
    minExpectedReturn: null,
    minSampleSize: 5,
    eventType: null,
    sector: null,
    marketCapTier: null,
    maxDaysUntil: 14,
    sortBy: 'probability_score',
    sortOrder: 'DESC',
  });
  const [isScreening, setIsScreening] = useState(false);
  const [results, setResults] = useState<ScreenerResult[]>([]);

  const runScreen = async () => {
    setIsScreening(true);
    try {
      const { data, error } = await supabase.functions.invoke('screen-probability', {
        body: {
          minProbability: filters.minProbability,
          maxProbability: filters.maxProbability,
          minExpectedReturn: filters.minExpectedReturn,
          minSampleSize: filters.minSampleSize,
          eventTypes: filters.eventType ? [filters.eventType] : null,
          sectors: filters.sector ? [filters.sector] : null,
          marketCapTiers: filters.marketCapTier ? [filters.marketCapTier] : null,
          maxDaysUntilEvent: filters.maxDaysUntil,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          limit: 100,
        }
      });

      if (error) throw error;
      setResults(data.results || []);
      toast({
        title: 'Screening Complete',
        description: `Found ${data.results?.length || 0} opportunities matching your criteria`,
      });
    } catch (err) {
      console.error('Screening error:', err);
      toast({
        title: 'Screening Failed',
        description: 'Unable to run probability screen. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsScreening(false);
    }
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 80) return 'text-green-500';
    if (prob >= 65) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getReturnColor = (ret: number) => {
    if (ret >= 5) return 'text-green-500';
    if (ret >= 2) return 'text-yellow-500';
    if (ret > 0) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Filters Card */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Probability Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Probability Range */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm">Minimum Probability</Label>
              <span className="text-sm font-medium text-primary">{filters.minProbability}%</span>
            </div>
            <Slider
              value={[filters.minProbability]}
              onValueChange={([val]) => setFilters(f => ({ ...f, minProbability: val }))}
              min={50}
              max={95}
              step={5}
              className="w-full"
            />
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Event Type</Label>
              <Select
                value={filters.eventType || 'all'}
                onValueChange={(val) => setFilters(f => ({ ...f, eventType: val === 'all' ? null : val }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {eventTypes.map(et => (
                    <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sector</Label>
              <Select
                value={filters.sector || 'all'}
                onValueChange={(val) => setFilters(f => ({ ...f, sector: val === 'all' ? null : val }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sectors</SelectItem>
                  {sectors.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Market Cap</Label>
              <Select
                value={filters.marketCapTier || 'all'}
                onValueChange={(val) => setFilters(f => ({ ...f, marketCapTier: val === 'all' ? null : val }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Sizes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  {marketCapTiers.map(mc => (
                    <SelectItem key={mc.value} value={mc.value}>{mc.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Days Until Event</Label>
              <Select
                value={String(filters.maxDaysUntil || 'any')}
                onValueChange={(val) => setFilters(f => ({ ...f, maxDaysUntil: val === 'any' ? null : Number(val) }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Any Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Time</SelectItem>
                  <SelectItem value="1">Today</SelectItem>
                  <SelectItem value="7">This Week</SelectItem>
                  <SelectItem value="14">2 Weeks</SelectItem>
                  <SelectItem value="30">1 Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={runScreen} disabled={isScreening} className="w-full">
            {isScreening ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Screening Universe...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Screen Universe
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Top Opportunities
              </CardTitle>
              <Badge variant="secondary">{results.length} results</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 bg-card">Symbol</TableHead>
                    <TableHead className="sticky top-0 bg-card">Event</TableHead>
                    <TableHead className="sticky top-0 bg-card text-right">Probability</TableHead>
                    <TableHead className="sticky top-0 bg-card text-right">Exp. Return</TableHead>
                    <TableHead className="sticky top-0 bg-card text-right">Win Rate</TableHead>
                    <TableHead className="sticky top-0 bg-card text-right">Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, idx) => (
                    <TableRow key={`${r.symbol}-${r.event_type}-${idx}`} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <span className="font-medium">{r.symbol}</span>
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{r.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {r.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${getProbabilityColor(r.probability_score)}`}>
                        {r.probability_score.toFixed(1)}%
                      </TableCell>
                      <TableCell className={`text-right font-medium ${getReturnColor(r.expected_return)}`}>
                        {r.expected_return > 0 ? '+' : ''}{r.expected_return.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {r.win_rate?.toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={r.days_until_event <= 1 ? 'destructive' : 'secondary'} className="text-xs">
                          {r.days_until_event}d
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {results.length === 0 && !isScreening && (
        <Card className="bg-card/30 border-dashed">
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-muted-foreground mb-2">No Results Yet</h3>
            <p className="text-sm text-muted-foreground/70">
              Adjust filters and click "Screen Universe" to find high-probability opportunities
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
