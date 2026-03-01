// src/hooks/useEarningsCalendar.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, addMonths, addYears } from 'date-fns';
import { 
  EarningsEvent, 
  EarningsPrediction, 
  EarningsWithPrediction,
  EarningsCalendarFilters,
  EarningsScreenCriteria,
  EarningsHistory
} from '@/types/earnings';
import { useToast } from '@/hooks/use-toast';

const toLocalISODate = (d: Date) => format(d, 'yyyy-MM-dd');

// Lightweight query: just earnings rows for the selected date, no joins
export const useEarningsCalendar = (filters?: EarningsCalendarFilters) => {
  return useQuery({
    queryKey: ['earnings-calendar', filters],
    queryFn: async () => {
      const today = toLocalISODate(new Date());
      
      // Only select columns we actually display
      let query = supabase
        .from('earnings_calendar')
        .select('id, symbol, company_name, report_date, time_of_day, eps_estimate, eps_actual, revenue_estimate, revenue_actual, eps_surprise_pct, revenue_surprise_pct, market_cap, fiscal_period, fiscal_year, analyst_count')
        .order('market_cap', { ascending: false, nullsFirst: false })
        .order('report_date', { ascending: true });

      // Apply date filters
      if (filters?.dateRange === 'custom' && filters.customStart) {
        query = query.eq('report_date', filters.customStart);
      } else if (filters?.dateRange === 'today') {
        query = query.eq('report_date', today);
      } else if (filters?.dateRange === 'week') {
        const weekAhead = toLocalISODate(addDays(new Date(), 7));
        query = query.gte('report_date', today).lte('report_date', weekAhead);
      } else if (filters?.dateRange === 'month') {
        const monthAhead = toLocalISODate(addMonths(new Date(), 1));
        query = query.gte('report_date', today).lte('report_date', monthAhead);
      } else if (filters?.dateRange === 'quarter') {
        const quarterAhead = toLocalISODate(addMonths(new Date(), 3));
        query = query.gte('report_date', today).lte('report_date', quarterAhead);
      } else if (filters?.dateRange === 'year') {
        const yearAhead = toLocalISODate(addYears(new Date(), 1));
        query = query.gte('report_date', today).lte('report_date', yearAhead);
      } else {
        query = query.gte('report_date', today);
      }

      if (filters?.symbols && filters.symbols.length > 0) {
        query = query.in('symbol', filters.symbols);
      }

      const { data, error } = await query;
      if (error) throw error;

      const earningsData = data || [];
      if (earningsData.length === 0) return [];

      // Only enrich visible data — predictions + asset lookups in parallel
      const earningsIds = earningsData.map(e => e.id);
      const symbolsMissingMktCap = earningsData.filter(e => !e.market_cap).map(e => e.symbol);
      const allSymbols = symbolsMissingMktCap.length > 0 ? [...new Set(symbolsMissingMktCap)] : [];

      // Build parallel fetches — skip asset lookup entirely if all have market_cap
      const fetchPromises: [Promise<EarningsPrediction[]>, Promise<any[]>] = [
        // Predictions (batched)
        (async () => {
          if (earningsIds.length === 0) return [];
          const BATCH_SIZE = 100;
          const batches = [];
          for (let i = 0; i < earningsIds.length; i += BATCH_SIZE) {
            batches.push(earningsIds.slice(i, i + BATCH_SIZE));
          }
          const batchResults = await Promise.all(
            batches.map(batch =>
              supabase.from('earnings_predictions')
                .select('id, earnings_calendar_id, predicted_outcome, confidence_score, signals')
                .in('earnings_calendar_id', batch)
            )
          );
          return batchResults.flatMap(r => (r.data || [])) as EarningsPrediction[];
        })(),

        // Asset universe — only if needed
        (async () => {
          if (allSymbols.length === 0) return [];
          const { data } = await supabase
            .from('asset_universe')
            .select('ticker, avg_daily_dollar_volume, industry, sector')
            .in('ticker', allSymbols);
          return data || [];
        })(),
      ];

      const [predictions, assetData] = await Promise.all(fetchPromises);

      // Build lookup maps
      const predictionMap = new Map(predictions.map(p => [p.earnings_calendar_id, p]));
      const assetMap = new Map(assetData.map(a => [a.ticker, a]));

      // Merge — use Map for O(1) lookups instead of Array.find
      let results: EarningsWithPrediction[] = earningsData.map(e => {
        const prediction = predictionMap.get(e.id);
        const asset = assetMap.get(e.symbol);
        return {
          ...e,
          prediction,
          market_cap: e.market_cap || (asset?.avg_daily_dollar_volume ? asset.avg_daily_dollar_volume * 20 : null),
          industry: asset?.industry || null,
          sector: asset?.sector || null,
        } as EarningsWithPrediction;
      });

      // Filter by prediction if needed
      if (filters?.hasPrediction !== undefined) {
        return results.filter(e => 
          filters.hasPrediction ? e.prediction : !e.prediction
        );
      }

      return results;
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useAdjacentEarningsDates = (currentDate: Date) => {
  const dateStr = toLocalISODate(currentDate);
  return useQuery({
    queryKey: ['earnings-adjacent-dates', dateStr],
    queryFn: async () => {
      const [prevResult, nextResult] = await Promise.all([
        supabase
          .from('earnings_calendar')
          .select('report_date')
          .lt('report_date', dateStr)
          .order('report_date', { ascending: false })
          .limit(1),
        supabase
          .from('earnings_calendar')
          .select('report_date')
          .gt('report_date', dateStr)
          .order('report_date', { ascending: true })
          .limit(1),
      ]);
      return {
        prevDate: prevResult.data?.[0]?.report_date || null,
        nextDate: nextResult.data?.[0]?.report_date || null,
      };
    },
    staleTime: 10 * 60 * 1000,
  });
};

// Prefetch the NEXT adjacent dates when navigating, so the following click is instant
export const usePrefetchAdjacentDates = () => {
  const queryClient = useQueryClient();
  return (dateStr: string) => {
    queryClient.prefetchQuery({
      queryKey: ['earnings-adjacent-dates', dateStr],
      queryFn: async () => {
        const [prevResult, nextResult] = await Promise.all([
          supabase.from('earnings_calendar').select('report_date').lt('report_date', dateStr).order('report_date', { ascending: false }).limit(1),
          supabase.from('earnings_calendar').select('report_date').gt('report_date', dateStr).order('report_date', { ascending: true }).limit(1),
        ]);
        return {
          prevDate: prevResult.data?.[0]?.report_date || null,
          nextDate: nextResult.data?.[0]?.report_date || null,
        };
      },
      staleTime: 10 * 60 * 1000,
    });
  };
};

export const useEarningsHistory = (symbol: string) => {
  return useQuery({
    queryKey: ['earnings-history', symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('earnings_history')
        .select('*')
        .eq('symbol', symbol)
        .order('report_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as EarningsHistory[];
    },
    enabled: !!symbol,
  });
};

export const useFetchEarningsData = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      startDate, 
      endDate, 
      symbols 
    }: { 
      startDate?: string; 
      endDate?: string; 
      symbols?: string[] 
    }) => {
      const { data, error } = await supabase.functions.invoke('fetch-earnings-calendar', {
        body: { startDate, endDate, symbols },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['earnings-calendar'] });
      toast({
        title: 'Earnings data updated',
        description: `Fetched ${data?.count || 0} earnings events`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to fetch earnings data',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useGeneratePredictions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      symbols, 
      useBulkPrediction = false 
    }: { 
      symbols: string[]; 
      useBulkPrediction?: boolean 
    }) => {
      const { data, error } = await supabase.functions.invoke('predict-earnings', {
        body: { symbols, useBulkPrediction },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['earnings-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['earnings-predictions'] });
      toast({
        title: 'Predictions generated',
        description: `Created ${data?.predictions?.length || 0} predictions`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate predictions',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useEarningsScreen = (criteria: EarningsScreenCriteria) => {
  return useQuery({
    queryKey: ['earnings-screen', criteria],
    queryFn: async () => {
      let query = supabase
        .from('earnings_calendar')
        .select('*')
        .gte('report_date', criteria.dateRange.start)
        .lte('report_date', criteria.dateRange.end)
        .order('report_date', { ascending: true });

      const { data: earningsData, error } = await query;
      if (error) throw error;

      const earnings = earningsData || [];
      if (earnings.length === 0) return [];

      const earningsIds = earnings.map(e => e.id);
      const symbols = [...new Set(earnings.map(e => e.symbol))];

      const [predictions, historyData] = await Promise.all([
        (async () => {
          if (earningsIds.length === 0) return [];
          const BATCH_SIZE = 50;
          const batches = [];
          for (let i = 0; i < earningsIds.length; i += BATCH_SIZE) {
            batches.push(earningsIds.slice(i, i + BATCH_SIZE));
          }
          const batchResults = await Promise.all(
            batches.map(batch =>
              supabase.from('earnings_predictions').select('*').in('earnings_calendar_id', batch)
            )
          );
          return batchResults.flatMap(r => (r.data || [])) as EarningsPrediction[];
        })(),
        (async () => {
          if (symbols.length === 0) return [];
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
          const SYMBOL_BATCH_SIZE = 100;
          const symbolBatches = [];
          for (let i = 0; i < symbols.length; i += SYMBOL_BATCH_SIZE) {
            symbolBatches.push(symbols.slice(i, i + SYMBOL_BATCH_SIZE));
          }
          const results = await Promise.all(
            symbolBatches.map(batch =>
              supabase.from('earnings_history').select('symbol, eps_surprise_pct').in('symbol', batch)
                .gte('report_date', twoYearsAgo.toISOString().split('T')[0])
            )
          );
          return results.flatMap(r => r.data || []);
        })(),
      ]);

      const historyStats: Record<string, { beatCount: number; totalReports: number }> = {};
      historyData.forEach(h => {
        if (!historyStats[h.symbol]) {
          historyStats[h.symbol] = { beatCount: 0, totalReports: 0 };
        }
        historyStats[h.symbol].totalReports++;
        if ((h.eps_surprise_pct || 0) > 0) {
          historyStats[h.symbol].beatCount++;
        }
      });

      let results: EarningsWithPrediction[] = earnings.map(e => {
        const prediction = predictions.find(p => p.earnings_calendar_id === e.id);
        const stats = historyStats[e.symbol];
        return {
          ...e,
          prediction,
          beat_count_2y: stats?.beatCount,
          total_reports_2y: stats?.totalReports,
        } as EarningsWithPrediction;
      });

      if (criteria.minConfidence > 0) {
        results = results.filter(e => 
          e.prediction && e.prediction.confidence_score >= criteria.minConfidence
        );
      }

      if (criteria.expectedOutcome !== 'all') {
        results = results.filter(e => 
          e.prediction?.predicted_outcome === criteria.expectedOutcome
        );
      }

      if (criteria.minBeatRate) {
        results = results.filter(e => {
          if (!e.beat_count_2y || !e.total_reports_2y) return false;
          const beatRate = e.beat_count_2y / e.total_reports_2y;
          return beatRate >= criteria.minBeatRate!;
        });
      }

      if (criteria.minAnalystCount) {
        results = results.filter(e => 
          e.analyst_count && e.analyst_count >= criteria.minAnalystCount!
        );
      }

      results.sort((a, b) => {
        const dateCompare = a.report_date.localeCompare(b.report_date);
        if (dateCompare !== 0) return dateCompare;
        return (b.market_cap || 0) - (a.market_cap || 0);
      });

      return results;
    },
    enabled: !!criteria,
    staleTime: 5 * 60 * 1000,
  });
};

export const useEarningsPredictions = () => {
  return useQuery({
    queryKey: ['earnings-predictions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('earnings_predictions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EarningsPrediction[];
    },
  });
};
