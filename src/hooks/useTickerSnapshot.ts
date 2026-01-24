import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StreakAnalysis {
  streak: number;
  occurrences: number;
  continuationRate: number;
  avgNextDayReturn: number;
}

export interface StreaksData {
  currentStreak: number;
  analysis: StreakAnalysis[];
  streakStartDate?: string;
  actualTotalChange?: number;
  avgRecoveryDays?: number | null;
  historicalStreakCount?: number;
}

export interface ConsecutiveAnalysis {
  consecutiveDays: number;
  occurrences: number;
  nextDayUpRate: number;
}

export interface ConsecutiveDaysData {
  currentConsecutive: number;
  analysis: ConsecutiveAnalysis[];
}

export interface CloseVsPriorData {
  winRate: number;
  avgDailyReturn: number;
  totalDays: number;
}

export interface VolatilityData {
  annualizedVolatility: number;
  dailyVolatility: number;
  recent20DayVol: number;
  volatilityRank: 'high' | 'low' | 'normal';
}

export interface GapData {
  date: string;
  gapPercent: number;
  filled: boolean;
  daysToFill: number | null;
}

export interface GapsData {
  totalGaps: number;
  upGapFillRate: number;
  downGapFillRate: number;
  avgDaysToFill: number | null;
  recentGaps: GapData[];
}

export interface RSIData {
  currentRSI: number;
  signal: 'oversold' | 'overbought' | 'neutral';
  oversoldBounces: { occurrences: number; winRate: number; avgReturn: number };
  overboughtDrops: { occurrences: number; winRate: number; avgReturn: number };
  winRate: number | null;
}

export interface BollingerData {
  current: number;
  upper: number;
  middle: number;
  lower: number;
  percentB: number;
  signal: 'oversold' | 'overbought' | 'neutral';
  lowerBounceRate: number | null;
  upperRejectionRate: number | null;
}

export interface ExtremeDaysData {
  bestDay: { date: string; change: number };
  worstDay: { date: string; change: number };
  topBest: { date: string; change: number }[];
  topWorst: { date: string; change: number }[];
  avgDailyMove: number;
  avgDailyMovePercent: number;
  upDays: number;
  downDays: number;
  flatDays: number;
  totalDays: number;
}

export interface YearRangeData {
  week52High: number;
  week52Low: number;
  currentPosition: number;
  distanceFromHigh: number;
  distanceFromLow: number;
}

export interface TickerSnapshotData {
  success: boolean;
  ticker: string;
  currentPrice: number;
  dailyVolatility: number;
  streaks: StreaksData;
  consecutive: ConsecutiveDaysData;
  closeVsPrior: CloseVsPriorData;
  volatility: VolatilityData;
  gaps: GapsData;
  rsi: RSIData;
  bollinger: BollingerData;
  extremeDays: ExtremeDaysData;
  yearRange: YearRangeData;
  trendStrength: {
    score: number;
    trend: string;
    priceVsMa20: number;
    priceVsMa50: number;
    priceVsMa200: number | null;
  };
  movingAverages: {
    current: number;
    ma20: number;
    ma50: number;
    ma200: number | null;
    aboveMa20: boolean;
    aboveMa50: boolean;
    aboveMa200: boolean | null;
  };
  meta: {
    studiesRun: number;
    studiesSucceeded: number;
    executionTimeMs: number;
    tier: string;
  };
}

export function useTickerSnapshot(ticker: string | undefined) {
  return useQuery<TickerSnapshotData | null>({
    queryKey: ['ticker-snapshot', ticker],
    queryFn: async () => {
      if (!ticker) return null;
      
      const { data, error } = await supabase.functions.invoke('analyze-ticker-snapshot', {
        body: { ticker }
      });
      
      if (error) {
        console.error('[useTickerSnapshot] Error:', error);
        throw error;
      }
      
      if (!data?.success) {
        console.warn('[useTickerSnapshot] No data for', ticker);
        return null;
      }
      
      // Map the response to our typed structure
      return {
        success: data.success,
        ticker: data.ticker,
        currentPrice: data.currentPrice,
        dailyVolatility: data.dailyVolatility,
        streaks: data.autoStudies?.up_down_streaks || { currentStreak: 0, analysis: [] },
        consecutive: data.autoStudies?.consecutive_days || { currentConsecutive: 0, analysis: [] },
        closeVsPrior: data.autoStudies?.daily_close_gt_prior || { winRate: 50, avgDailyReturn: 0, totalDays: 0 },
        volatility: data.autoStudies?.volatility_analysis || { annualizedVolatility: 0, dailyVolatility: 0, recent20DayVol: 0, volatilityRank: 'normal' },
        gaps: data.autoStudies?.gap_analysis || { totalGaps: 0, upGapFillRate: 0, downGapFillRate: 0, avgDaysToFill: null, recentGaps: [] },
        rsi: data.autoStudies?.rsi_analysis || { currentRSI: 50, signal: 'neutral', oversoldBounces: { occurrences: 0, winRate: 0, avgReturn: 0 }, overboughtDrops: { occurrences: 0, winRate: 0, avgReturn: 0 }, winRate: null },
        bollinger: data.autoStudies?.bollinger_analysis || { current: 0, upper: 0, middle: 0, lower: 0, percentB: 50, signal: 'neutral', lowerBounceRate: null, upperRejectionRate: null },
        extremeDays: data.autoStudies?.extreme_days || { bestDay: { date: 'N/A', change: 0 }, worstDay: { date: 'N/A', change: 0 }, topBest: [], topWorst: [], avgDailyMove: 0, avgDailyMovePercent: 0, upDays: 0, downDays: 0, flatDays: 0, totalDays: 0 },
        yearRange: data.autoStudies?.year_range || { week52High: 0, week52Low: 0, currentPosition: 50, distanceFromHigh: 0, distanceFromLow: 0 },
        trendStrength: data.autoStudies?.trend_strength || { score: 50, trend: 'neutral', priceVsMa20: 0, priceVsMa50: 0, priceVsMa200: null },
        movingAverages: data.autoStudies?.moving_average_analysis || { current: 0, ma20: 0, ma50: 0, ma200: null, aboveMa20: false, aboveMa50: false, aboveMa200: null },
        meta: data.meta || { studiesRun: 0, studiesSucceeded: 0, executionTimeMs: 0, tier: 'AUTO' }
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!ticker,
  });
}
