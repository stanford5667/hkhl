/**
 * Utility functions for earnings calendar and predictions
 */

import { EarningsWithPrediction, EarningsSignal } from '@/types/earnings';

/**
 * Calculate historical beat rate from earnings history
 */
export const calculateBeatRate = (history: { eps_surprise_pct?: number | null }[]): number => {
  if (!history || history.length === 0) return 0;
  
  const beats = history.filter(h => (h.eps_surprise_pct || 0) > 0).length;
  return (beats / history.length) * 100;
};

/**
 * Get color class for prediction outcome
 */
export const getPredictionColor = (outcome: 'beat' | 'miss' | 'inline'): string => {
  const colors = {
    beat: 'text-emerald-600',
    miss: 'text-destructive',
    inline: 'text-muted-foreground',
  };
  return colors[outcome];
};

/**
 * Get background color class for prediction outcome
 */
export const getPredictionBgColor = (outcome: 'beat' | 'miss' | 'inline'): string => {
  const colors = {
    beat: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
    miss: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
    inline: 'bg-muted border-border',
  };
  return colors[outcome];
};

/**
 * Calculate confidence level category
 */
export const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' => {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
};

/**
 * Format earnings time of day
 */
export const formatTimeOfDay = (timeOfDay: string | null): string => {
  const labels: Record<string, string> = {
    BMO: 'Before Market Open',
    AMC: 'After Market Close',
    DMT: 'During Market Hours',
  };
  return timeOfDay ? labels[timeOfDay] || timeOfDay : 'Not specified';
};

/**
 * Get next earnings date for a symbol from calendar
 */
export const getNextEarningsDate = (
  symbol: string,
  calendar: EarningsWithPrediction[]
): string | null => {
  const upcoming = calendar
    .filter(e => e.symbol === symbol)
    .sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());
  
  return upcoming.length > 0 ? upcoming[0].report_date : null;
};

/**
 * Calculate average surprise percentage from history
 */
export const calculateAvgSurprise = (history: { eps_surprise_pct?: number | null }[]): number => {
  if (!history || history.length === 0) return 0;
  
  const sum = history.reduce((acc, h) => acc + (h.eps_surprise_pct || 0), 0);
  return sum / history.length;
};

/**
 * Determine if earnings are approaching (within X days)
 */
export const isEarningsApproaching = (reportDate: string, daysThreshold: number = 7): boolean => {
  const date = new Date(reportDate);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 && diffDays <= daysThreshold;
};

/**
 * Get signal strength description
 */
export const getSignalStrength = (signal: EarningsSignal): string => {
  const absValue = Math.abs(signal.value);
  
  if (absValue >= 0.8) return 'Very Strong';
  if (absValue >= 0.6) return 'Strong';
  if (absValue >= 0.4) return 'Moderate';
  if (absValue >= 0.2) return 'Weak';
  return 'Very Weak';
};

/**
 * Sort earnings by prediction confidence
 */
export const sortByConfidence = (
  earnings: EarningsWithPrediction[]
): EarningsWithPrediction[] => {
  return [...earnings].sort((a, b) => {
    const confA = a.prediction?.confidence_score || 0;
    const confB = b.prediction?.confidence_score || 0;
    return confB - confA;
  });
};

/**
 * Filter earnings by outcome
 */
export const filterByOutcome = (
  earnings: EarningsWithPrediction[],
  outcome: 'beat' | 'miss' | 'inline' | 'all'
): EarningsWithPrediction[] => {
  if (outcome === 'all') return earnings;
  
  return earnings.filter(e => e.prediction?.predicted_outcome === outcome);
};

/**
 * Format currency value
 */
export const formatEarningsCurrency = (value: number | null, compact = false): string => {
  if (value === null) return 'N/A';
  
  if (compact) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  }
  
  return `$${value.toFixed(2)}`;
};

/**
 * Format percent value
 */
export const formatEarningsPercent = (value: number | null): string => {
  if (value === null) return 'N/A';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};
