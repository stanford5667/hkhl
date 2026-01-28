// src/hooks/useEarningsCalendar.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  EarningsEvent, 
  EarningsPrediction, 
  EarningsWithPrediction,
  EarningsCalendarFilters,
  EarningsScreenCriteria,
  EarningsHistory
} from '@/types/earnings';
import { useToast } from '@/hooks/use-toast';

export const useEarningsCalendar = (filters?: EarningsCalendarFilters) => {
  return useQuery({
    queryKey: ['earnings-calendar', filters],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('earnings_calendar')
        .select('*')
        .gte('report_date', today)
        .order('market_cap', { ascending: false, nullsFirst: false })
        .order('report_date', { ascending: true });

      // Apply filters
      if (filters?.dateRange === 'today') {
        query = query.eq('report_date', today);
      } else if (filters?.dateRange === 'week') {
        const weekAhead = new Date();
        weekAhead.setDate(weekAhead.getDate() + 7);
        query = query.lte('report_date', weekAhead.toISOString().split('T')[0]);
      } else if (filters?.dateRange === 'month') {
        const monthAhead = new Date();
        monthAhead.setMonth(monthAhead.getMonth() + 1);
        query = query.lte('report_date', monthAhead.toISOString().split('T')[0]);
      } else if (filters?.dateRange === 'custom' && filters.customStart && filters.customEnd) {
        query = query
          .gte('report_date', filters.customStart)
          .lte('report_date', filters.customEnd);
      }

      if (filters?.symbols && filters.symbols.length > 0) {
        query = query.in('symbol', filters.symbols);
      }

      if (filters?.timeOfDay && filters.timeOfDay !== 'all') {
        query = query.eq('time_of_day', filters.timeOfDay);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Now fetch predictions for these earnings (batch to avoid URL length limits)
      const earningsIds = (data || []).map(e => e.id);
      
      let predictions: EarningsPrediction[] = [];
      if (earningsIds.length > 0) {
        const BATCH_SIZE = 50;
        const batches = [];
        for (let i = 0; i < earningsIds.length; i += BATCH_SIZE) {
          batches.push(earningsIds.slice(i, i + BATCH_SIZE));
        }
        
        const batchResults = await Promise.all(
          batches.map(batch =>
            supabase
              .from('earnings_predictions')
              .select('*')
              .in('earnings_calendar_id', batch)
          )
        );
        
        predictions = batchResults.flatMap(r => (r.data || [])) as EarningsPrediction[];
      }

      // Merge predictions with earnings
      const results: EarningsWithPrediction[] = (data || []).map(e => {
        const prediction = predictions.find(p => p.earnings_calendar_id === e.id);
        return {
          ...e,
          prediction,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
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
      // Fetch earnings in the date range
      let query = supabase
        .from('earnings_calendar')
        .select('*')
        .gte('report_date', criteria.dateRange.start)
        .lte('report_date', criteria.dateRange.end)
        .order('report_date', { ascending: true });

      const { data: earningsData, error } = await query;
      if (error) throw error;

      // Fetch predictions (batch to avoid URL length limits)
      const earningsIds = (earningsData || []).map(e => e.id);
      let predictions: EarningsPrediction[] = [];
      
      if (earningsIds.length > 0) {
        const BATCH_SIZE = 50;
        const batches = [];
        for (let i = 0; i < earningsIds.length; i += BATCH_SIZE) {
          batches.push(earningsIds.slice(i, i + BATCH_SIZE));
        }
        
        const batchResults = await Promise.all(
          batches.map(batch =>
            supabase
              .from('earnings_predictions')
              .select('*')
              .in('earnings_calendar_id', batch)
          )
        );
        
        predictions = batchResults.flatMap(r => (r.data || [])) as EarningsPrediction[];
      }

      // Fetch historical stats for each symbol (batch to avoid URL length limits)
      const symbols = [...new Set((earningsData || []).map(e => e.symbol))];
      const historyStats: Record<string, { beatCount: number; totalReports: number }> = {};
      
      if (symbols.length > 0) {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        
        const SYMBOL_BATCH_SIZE = 100;
        const symbolBatches = [];
        for (let i = 0; i < symbols.length; i += SYMBOL_BATCH_SIZE) {
          symbolBatches.push(symbols.slice(i, i + SYMBOL_BATCH_SIZE));
        }
        
        const historyResults = await Promise.all(
          symbolBatches.map(batch =>
            supabase
              .from('earnings_history')
              .select('symbol, eps_surprise_pct')
              .in('symbol', batch)
              .gte('report_date', twoYearsAgo.toISOString().split('T')[0])
          )
        );
        
        historyResults.flatMap(r => r.data || []).forEach(h => {
          if (!historyStats[h.symbol]) {
            historyStats[h.symbol] = { beatCount: 0, totalReports: 0 };
          }
          historyStats[h.symbol].totalReports++;
          if ((h.eps_surprise_pct || 0) > 0) {
            historyStats[h.symbol].beatCount++;
          }
        });
      }

      // Merge and filter
      let results: EarningsWithPrediction[] = (earningsData || []).map(e => {
        const prediction = predictions.find(p => p.earnings_calendar_id === e.id);
        const stats = historyStats[e.symbol];
        return {
          ...e,
          prediction,
          beat_count_2y: stats?.beatCount,
          total_reports_2y: stats?.totalReports,
        } as EarningsWithPrediction;
      });

      // Apply filters
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

      return results;
    },
    enabled: !!criteria,
    staleTime: 2 * 60 * 1000,
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
