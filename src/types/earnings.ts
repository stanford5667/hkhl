// src/types/earnings.ts

export interface EarningsEvent {
  id: string;
  symbol: string;
  company_name: string | null;
  report_date: string;
  fiscal_period: string | null;
  fiscal_year: number | null;
  time_of_day: string | null;
  estimated_time: string | null;
  actual_report_time: string | null;
  eps_estimate: number | null;
  eps_actual: number | null;
  revenue_estimate: number | null;
  revenue_actual: number | null;
  analyst_count: number | null;
  eps_surprise_pct: number | null;
  revenue_surprise_pct: number | null;
  updated_at: string;
  created_at: string;
}

export interface EarningsHistory {
  id: string;
  symbol: string;
  report_date: string;
  fiscal_period: string | null;
  eps_estimate: number | null;
  eps_actual: number | null;
  eps_surprise_pct: number | null;
  revenue_estimate: number | null;
  revenue_actual: number | null;
  revenue_surprise_pct: number | null;
  price_before: number | null;
  price_after: number | null;
  price_change_pct: number | null;
  created_at: string;
}

export interface EarningsPrediction {
  id: string;
  earnings_calendar_id: string;
  symbol: string;
  report_date: string;
  predicted_outcome: 'beat' | 'miss' | 'inline';
  confidence_score: number;
  signals: Record<string, unknown>;
  model_version: string;
  generated_at: string;
  user_id: string | null;
  created_at: string;
}

export interface EarningsWithPrediction extends EarningsEvent {
  prediction?: EarningsPrediction;
  earnings_predictions?: EarningsPrediction[];
  historical_beat_rate?: number;
  avg_surprise_2y?: number;
  beat_count_2y?: number;
  total_reports_2y?: number;
}

export interface EarningsScreenCriteria {
  minConfidence: number;
  expectedOutcome: 'beat' | 'miss' | 'inline' | 'all';
  dateRange: {
    start: string;
    end: string;
  };
  marketCap?: {
    min?: number;
    max?: number;
  };
  sectors?: string[];
  minBeatRate?: number;
  minAnalystCount?: number;
}

export interface EarningsSignal {
  type: string;
  value: number;
  weight: number;
  description: string;
}

export interface EarningsCalendarFilters {
  dateRange: 'today' | 'week' | 'month' | 'custom';
  customStart?: string;
  customEnd?: string;
  symbols?: string[];
  hasPrediction?: boolean;
  timeOfDay?: 'BMO' | 'AMC' | 'DMT' | 'all';
}
