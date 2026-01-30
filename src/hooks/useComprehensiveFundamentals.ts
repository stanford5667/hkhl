/**
 * useComprehensiveFundamentals - Unified hook for all fundamental, valuation, and risk metrics
 * Aggregates data from multiple sources with data quality scoring
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAssetMetrics } from './useAssetMetrics';

// Balance sheet data from edge function
interface BalanceSheetData {
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  inventory: number | null;
  cash: number | null;
  longTermDebt: number | null;
  shortTermDebt: number | null;
}

// Financial ratios from edge function
interface FinancialRatios {
  priceToBook: number | null;
  priceToCash: number | null;
  priceToFreeCashFlow: number | null;
  evToEbitda: number | null;
  evToSales: number | null;
  debtToEquity: number | null;
  quickRatio: number | null;
  currentRatio: number | null;
  returnOnAssets: number | null;
  returnOnEquity: number | null;
  enterpriseValue: number | null;
  freeCashFlow: number | null;
}

// Calculated metrics from edge function
interface CalculatedMetrics {
  operatingMargin: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  epsGrowthYoY: number | null;
  revenueGrowthYoY: number | null;
  epsStdDev: number | null;
}

// Enhanced fundamentals response
interface EnhancedFundamentalsData {
  profile: {
    symbol: string;
    companyName: string;
    industry: string;
    sector: string;
    marketCap: number;
    price: number;
    description: string;
  } | null;
  financials: Array<{
    date: string;
    revenue: number;
    netIncome: number;
    operatingIncome: number;
    ebitda: number;
    eps: number;
  }>;
  estimates: Array<{
    date: string;
    estimatedEpsAvg: number;
  }>;
  balanceSheet: BalanceSheetData | null;
  ratios: FinancialRatios | null;
  metrics: CalculatedMetrics | null;
  useMockData: boolean;
  source: string;
  dataQuality: number;
}

// Earnings prediction from DB
interface EarningsPrediction {
  predicted_outcome: string | null;
  confidence_score: number | null;
}

// Performance returns structure
interface PerformanceReturns {
  day1: number | null;
  week1: number | null;
  month1: number | null;
  month3: number | null;
  month6: number | null;
  year1: number | null;
  year3: number | null;
  year5: number | null;
}

// Full comprehensive fundamentals interface
export interface ComprehensiveFundamentals {
  // Valuation Metrics
  pe: number | null;
  forwardPE: number | null;
  peg: number | null;
  priceToBook: number | null;
  priceToCash: number | null;
  evToEbitda: number | null;
  
  // Profitability Metrics
  operatingMargin: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  
  // Growth Metrics
  epsGrowthYoY: number | null;
  revenueGrowthYoY: number | null;
  epsStdDev: number | null;
  
  // Stability Metrics
  debtToEquity: number | null;
  quickRatio: number | null;
  currentRatio: number | null;
  
  // Risk Metrics (from useAssetMetrics)
  volatility: number | null;
  beta: number | null;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  maxDrawdown: number | null;
  
  // Custom Period Performance
  returns: PerformanceReturns;
  
  // Market Data
  avgVolume20D: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  price: number | null;
  eps: number | null;
  
  // Raw Financial Data (for expense breakdown)
  revenue: number | null;
  costOfRevenue: number | null;
  operatingExpenses: number | null;
  interestExpense: number | null;
  incomeTax: number | null;
  
  // Earnings Intelligence
  beatProbability: number | null;
  confidenceLevel: 'high' | 'medium' | 'low' | null;
  
  // Metadata
  source: string;
  isLoading: boolean;
  dataQuality: number;
  useMockData: boolean;
}

// Fetch enhanced fundamentals from edge function
async function fetchEnhancedFundamentals(ticker: string): Promise<EnhancedFundamentalsData | null> {
  const { data, error } = await supabase.functions.invoke('fmp-fundamentals', {
    body: { action: 'fundamentals', symbol: ticker }
  });
  
  if (error) {
    console.error('[useComprehensiveFundamentals] Edge function error:', error);
    return null;
  }
  
  if (!data?.success) {
    console.warn('[useComprehensiveFundamentals] No data for', ticker);
    return null;
  }
  
  return {
    profile: data.profile,
    financials: data.financials || [],
    estimates: data.estimates || [],
    balanceSheet: data.balanceSheet || null,
    ratios: data.ratios || null,
    metrics: data.metrics || null,
    useMockData: data.useMockData || false,
    source: data.source || 'Unknown',
    dataQuality: data.dataQuality || 1,
  };
}

// Fetch earnings prediction from database
async function fetchEarningsPrediction(ticker: string): Promise<EarningsPrediction | null> {
  const { data, error } = await supabase
    .from('earnings_predictions')
    .select('predicted_outcome, confidence_score')
    .eq('symbol', ticker)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return data;
}

// Fetch custom period returns from market_daily_bars
async function fetchPerformanceReturns(ticker: string): Promise<PerformanceReturns> {
  const returns: PerformanceReturns = {
    day1: null,
    week1: null,
    month1: null,
    month3: null,
    month6: null,
    year1: null,
    year3: null,
    year5: null,
  };
  
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 5);
    
    const { data: bars, error } = await supabase
      .from('market_daily_bars')
      .select('bar_date, close')
      .eq('ticker', ticker)
      .gte('bar_date', startDate.toISOString().split('T')[0])
      .lte('bar_date', endDate.toISOString().split('T')[0])
      .order('bar_date', { ascending: false });
    
    if (error || !bars || bars.length < 2) {
      return returns;
    }
    
    const currentPrice = bars[0].close;
    
    // Find prices at different intervals
    const findPriceAtDaysAgo = (daysAgo: number): number | null => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysAgo);
      
      for (const bar of bars) {
        const barDate = new Date(bar.bar_date);
        if (barDate <= targetDate) {
          return bar.close;
        }
      }
      return null;
    };
    
    const calculateReturn = (pastPrice: number | null): number | null => {
      if (!pastPrice || pastPrice === 0) return null;
      return Math.round(((currentPrice - pastPrice) / pastPrice) * 10000) / 100;
    };
    
    returns.day1 = calculateReturn(findPriceAtDaysAgo(1));
    returns.week1 = calculateReturn(findPriceAtDaysAgo(7));
    returns.month1 = calculateReturn(findPriceAtDaysAgo(30));
    returns.month3 = calculateReturn(findPriceAtDaysAgo(90));
    returns.month6 = calculateReturn(findPriceAtDaysAgo(180));
    returns.year1 = calculateReturn(findPriceAtDaysAgo(365));
    returns.year3 = calculateReturn(findPriceAtDaysAgo(365 * 3));
    returns.year5 = calculateReturn(findPriceAtDaysAgo(365 * 5));
    
  } catch (err) {
    console.error('[useComprehensiveFundamentals] Error fetching returns:', err);
  }
  
  return returns;
}

// Fetch average volume from market_daily_bars
async function fetchAvgVolume(ticker: string): Promise<number | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const { data, error } = await supabase
      .from('market_daily_bars')
      .select('volume')
      .eq('ticker', ticker)
      .gte('bar_date', startDate.toISOString().split('T')[0])
      .lte('bar_date', endDate.toISOString().split('T')[0])
      .order('bar_date', { ascending: false })
      .limit(20);
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    const volumes = data.filter(d => d.volume).map(d => d.volume as number);
    if (volumes.length === 0) return null;
    
    return Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length);
  } catch {
    return null;
  }
}

export function useComprehensiveFundamentals(ticker: string | undefined) {
  // Fetch enhanced fundamentals from edge function
  const { data: fundamentals, isLoading: fundamentalsLoading } = useQuery({
    queryKey: ['comprehensive-fundamentals', ticker],
    queryFn: () => fetchEnhancedFundamentals(ticker!),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: !!ticker,
  });
  
  // Fetch asset metrics (volatility, beta, sharpe, etc.)
  const { data: assetMetrics, isLoading: metricsLoading } = useAssetMetrics(ticker, '3Y');
  
  // Fetch earnings prediction
  const { data: prediction } = useQuery({
    queryKey: ['earnings-prediction', ticker],
    queryFn: () => fetchEarningsPrediction(ticker!),
    staleTime: 60 * 60 * 1000,
    enabled: !!ticker,
  });
  
  // Fetch performance returns
  const { data: performanceReturns } = useQuery({
    queryKey: ['performance-returns', ticker],
    queryFn: () => fetchPerformanceReturns(ticker!),
    staleTime: 10 * 60 * 1000,
    enabled: !!ticker,
  });
  
  // Fetch average volume
  const { data: avgVolume } = useQuery({
    queryKey: ['avg-volume', ticker],
    queryFn: () => fetchAvgVolume(ticker!),
    staleTime: 10 * 60 * 1000,
    enabled: !!ticker,
  });
  
  const isLoading = fundamentalsLoading || metricsLoading;
  
  // Consolidate all metrics
  const consolidated = useMemo((): ComprehensiveFundamentals => {
    const profile = fundamentals?.profile;
    const ratios = fundamentals?.ratios;
    const metrics = fundamentals?.metrics;
    const financials = fundamentals?.financials || [];
    const estimates = fundamentals?.estimates || [];
    
    // Calculate P/E
    let pe: number | null = null;
    if (profile?.price && financials[0]?.eps && financials[0].eps > 0) {
      pe = Math.round((profile.price / financials[0].eps) * 100) / 100;
    }
    
    // Calculate Forward P/E
    let forwardPE: number | null = null;
    if (profile?.price && estimates[0]?.estimatedEpsAvg && estimates[0].estimatedEpsAvg > 0) {
      forwardPE = Math.round((profile.price / estimates[0].estimatedEpsAvg) * 100) / 100;
    }
    
    // Calculate PEG
    let peg: number | null = null;
    if (pe && metrics?.epsGrowthYoY && metrics.epsGrowthYoY > 0) {
      peg = Math.round((pe / metrics.epsGrowthYoY) * 100) / 100;
    }
    
    // Determine beat probability and confidence level
    let beatProbability: number | null = null;
    let confidenceLevel: 'high' | 'medium' | 'low' | null = null;
    
    if (prediction?.predicted_outcome === 'beat' && prediction.confidence_score) {
      beatProbability = Math.round(prediction.confidence_score);
      if (beatProbability >= 70) confidenceLevel = 'high';
      else if (beatProbability >= 50) confidenceLevel = 'medium';
      else confidenceLevel = 'low';
    }
    
    return {
      // Valuation
      pe,
      forwardPE,
      peg,
      priceToBook: ratios?.priceToBook || null,
      priceToCash: ratios?.priceToCash || null,
      evToEbitda: ratios?.evToEbitda || null,
      
      // Profitability
      operatingMargin: metrics?.operatingMargin || null,
      grossMargin: metrics?.grossMargin || null,
      netMargin: metrics?.netMargin || null,
      returnOnEquity: ratios?.returnOnEquity || null,
      returnOnAssets: ratios?.returnOnAssets || null,
      
      // Growth
      epsGrowthYoY: metrics?.epsGrowthYoY || null,
      revenueGrowthYoY: metrics?.revenueGrowthYoY || null,
      epsStdDev: metrics?.epsStdDev || null,
      
      // Stability
      debtToEquity: ratios?.debtToEquity || null,
      quickRatio: ratios?.quickRatio || null,
      currentRatio: ratios?.currentRatio || null,
      
      // Risk (from useAssetMetrics)
      volatility: assetMetrics?.volatility || null,
      beta: assetMetrics?.beta || null,
      sharpeRatio: assetMetrics?.sharpeRatio || null,
      sortinoRatio: assetMetrics?.sortinoRatio || null,
      maxDrawdown: assetMetrics?.maxDrawdown || null,
      
      // Performance
      returns: performanceReturns || {
        day1: null,
        week1: null,
        month1: null,
        month3: null,
        month6: null,
        year1: null,
        year3: null,
        year5: null,
      },
      
      // Market Data
      avgVolume20D: avgVolume || null,
      marketCap: profile?.marketCap || null,
      enterpriseValue: ratios?.enterpriseValue || null,
      price: profile?.price || null,
      eps: financials[0]?.eps || null,
      
      // Raw Financial Data (for expense breakdown)
      revenue: financials[0]?.revenue || null,
      costOfRevenue: (financials[0] as any)?.costOfRevenue || null,
      operatingExpenses: (financials[0] as any)?.operatingExpenses || null,
      interestExpense: (financials[0] as any)?.interestExpense || null,
      incomeTax: (financials[0] as any)?.incomeTax || null,
      
      // Earnings Intelligence
      beatProbability,
      confidenceLevel,
      
      // Metadata
      source: fundamentals?.source || 'Unknown',
      isLoading,
      dataQuality: fundamentals?.dataQuality || 1,
      useMockData: fundamentals?.useMockData || false,
    };
  }, [fundamentals, assetMetrics, prediction, performanceReturns, avgVolume, isLoading]);
  
  return consolidated;
}
