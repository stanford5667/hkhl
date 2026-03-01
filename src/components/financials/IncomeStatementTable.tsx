/**
 * IncomeStatementTable - Financial Statement Display
 * Shows historical income statement data + analyst estimates in a table format
 * Matches the reference design with Bear/Base/Bull scenarios for estimates
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart3, HelpCircle, TrendingUp, RefreshCw, Lock, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinancialDataCell } from './FinancialDataCell';
import { useUsage } from '@/contexts/UsageContext';
import { useUpgrade } from '@/hooks/useUpgrade';
import { UpgradeModal } from '@/components/premium/UpgradeModal';

interface IncomeStatementTableProps {
  ticker: string;
  companyName?: string;
}

interface FinancialRow {
  label: string;
  key: string;
  isHighlight?: boolean;
  isSubItem?: boolean;
  tooltip?: string;
}

// Analyst estimate from FMP API
interface AnalystEstimate {
  date: string;
  estimatedRevenueAvg: number;
  estimatedRevenueLow: number;
  estimatedRevenueHigh: number;
  estimatedNetIncomeAvg: number;
  estimatedNetIncomeLow: number;
  estimatedNetIncomeHigh: number;
  estimatedEpsAvg: number;
  estimatedEpsLow: number;
  estimatedEpsHigh: number;
  estimatedEbitdaAvg: number;
  numberAnalystEstimatedRevenue: number;
  numberAnalystsEstimatedEps: number;
  isEstimate: boolean;
}

type EstimateScenario = 'bear' | 'base' | 'bull';

// Format number to abbreviated form (e.g., 260.2B, 161.8B, 34.5B, etc.)
function formatValue(value: number | null | undefined, isEPS = false): string {
  if (value == null || isNaN(value)) return '—';
  
  if (isEPS) {
    return `$${value.toFixed(2)}`;
  }
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(1)}T`;
  }
  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(0)}M`;
  }
  
  return value.toLocaleString();
}

// Financial row definitions for income statement
const INCOME_STATEMENT_ROWS: FinancialRow[] = [
  { label: 'Revenue', key: 'revenue', tooltip: 'Total revenue from all operations' },
  { label: 'Cost of Revenue', key: 'costOfRevenue', isSubItem: true, tooltip: 'Direct costs attributable to goods sold' },
  { label: 'Gross Profit', key: 'grossProfit', isHighlight: true, tooltip: 'Revenue minus cost of goods sold' },
  { label: 'Operating Expenses', key: 'operatingExpenses', isSubItem: true, tooltip: 'Costs for running day-to-day operations' },
  { label: 'Operating Income', key: 'operatingIncome', tooltip: 'Profit from core business operations' },
  { label: 'Interest Expense', key: 'interestExpense', isSubItem: true, tooltip: 'Cost of borrowing money' },
  { label: 'Other Income', key: 'otherIncome', isSubItem: false, tooltip: 'Income from non-core activities' },
  { label: 'Income Before Tax', key: 'incomeBeforeTax', tooltip: 'Earnings before tax deductions' },
  { label: 'Income Tax', key: 'incomeTax', isSubItem: true, tooltip: 'Tax paid on income' },
  { label: 'Net Income', key: 'netIncome', isHighlight: true, tooltip: 'Total profit after all expenses and taxes' },
  { label: 'EPS (Diluted)', key: 'eps', tooltip: 'Earnings per share including all convertible securities' },
];

// Derived metric rows (margins, growth rates) - displayed inline after parent rows
interface DerivedMetricRow {
  label: string;
  parentKey: string; // Which row this appears after
  compute: (current: any, prev: any, displayYears: any[], idx: number) => number | null;
  format: (value: number | null) => string;
  tooltip: string;
  colorize?: boolean; // Apply green/red based on positive/negative
}

const DERIVED_METRICS: DerivedMetricRow[] = [
  {
    label: 'Revenue Growth %',
    parentKey: 'revenue',
    compute: (current, prev) => {
      if (!prev?.revenue || !current?.revenue) return null;
      return ((current.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100;
    },
    format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—',
    tooltip: 'Year-over-year revenue growth rate',
    colorize: true,
  },
  {
    label: 'Gross Margin %',
    parentKey: 'grossProfit',
    compute: (current) => {
      if (!current?.grossProfit || !current?.revenue) return null;
      return (current.grossProfit / current.revenue) * 100;
    },
    format: (v) => v != null ? `${v.toFixed(1)}%` : '—',
    tooltip: 'Gross Profit as a percentage of Revenue',
  },
  {
    label: 'Op. Margin %',
    parentKey: 'operatingIncome',
    compute: (current) => {
      if (!current?.operatingIncome || !current?.revenue) return null;
      return (current.operatingIncome / current.revenue) * 100;
    },
    format: (v) => v != null ? `${v.toFixed(1)}%` : '—',
    tooltip: 'Operating Income as a percentage of Revenue',
  },
  {
    label: 'Net Income Growth %',
    parentKey: 'netIncome',
    compute: (current, prev) => {
      if (!prev?.netIncome || !current?.netIncome) return null;
      return ((current.netIncome - prev.netIncome) / Math.abs(prev.netIncome)) * 100;
    },
    format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—',
    tooltip: 'Year-over-year net income change',
    colorize: true,
  },
  {
    label: 'Net Margin %',
    parentKey: 'netIncome',
    compute: (current) => {
      if (!current?.netIncome || !current?.revenue) return null;
      return (current.netIncome / current.revenue) * 100;
    },
    format: (v) => v != null ? `${v.toFixed(1)}%` : '—',
    tooltip: 'Net Income as a percentage of Revenue',
  },
];

// Hook to fetch financial data
function useFinancialData(ticker: string) {
  return useQuery({
    queryKey: ['financial-statements', ticker],
    queryFn: async () => {
      // Fetch from FMP fundamentals edge function
      const { data, error } = await supabase.functions.invoke('fmp-fundamentals', {
        body: { action: 'fundamentals', symbol: ticker }
      });
      
      if (error) throw error;
      
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!ticker,
  });
}

// Convert analyst estimates to display format based on scenario
function convertEstimatesToDisplayFormat(
  estimates: AnalystEstimate[], 
  historicalData: any[], 
  scenario: EstimateScenario
) {
  if (!estimates?.length) {
    // Fallback to generated estimates if no real data
    return generateFallbackEstimates(historicalData, scenario);
  }
  
  const latestHistorical = historicalData?.[0];
  
  return estimates.map((est) => {
    const year = parseInt(est.date?.split('-')[0] || '2025');
    
    // Select values based on scenario
    let revenue: number, netIncome: number, eps: number;
    
    switch (scenario) {
      case 'bear':
        revenue = est.estimatedRevenueLow || est.estimatedRevenueAvg * 0.9;
        netIncome = est.estimatedNetIncomeLow || est.estimatedNetIncomeAvg * 0.85;
        eps = est.estimatedEpsLow || est.estimatedEpsAvg * 0.85;
        break;
      case 'bull':
        revenue = est.estimatedRevenueHigh || est.estimatedRevenueAvg * 1.1;
        netIncome = est.estimatedNetIncomeHigh || est.estimatedNetIncomeAvg * 1.15;
        eps = est.estimatedEpsHigh || est.estimatedEpsAvg * 1.15;
        break;
      default: // base
        revenue = est.estimatedRevenueAvg;
        netIncome = est.estimatedNetIncomeAvg;
        eps = est.estimatedEpsAvg;
    }
    
    // Calculate derived values based on historical margins
    const historicalGrossMargin = latestHistorical?.grossProfit && latestHistorical?.revenue
      ? latestHistorical.grossProfit / latestHistorical.revenue
      : 0.4;
    const historicalOpMargin = latestHistorical?.operatingIncome && latestHistorical?.revenue
      ? latestHistorical.operatingIncome / latestHistorical.revenue
      : 0.15;
    
    const grossProfit = revenue * historicalGrossMargin;
    const costOfRevenue = revenue - grossProfit;
    const operatingIncome = revenue * historicalOpMargin;
    const operatingExpenses = grossProfit - operatingIncome;
    const interestExpense = latestHistorical?.interestExpense || revenue * 0.01;
    const otherIncome = latestHistorical?.otherIncome || revenue * 0.005;
    const incomeBeforeTax = netIncome / 0.79; // Assume ~21% effective tax rate
    const incomeTax = incomeBeforeTax - netIncome;
    
    return {
      date: `${year}E`,
      year,
      isEstimate: true,
      revenue,
      costOfRevenue,
      grossProfit,
      operatingExpenses,
      operatingIncome,
      interestExpense,
      otherIncome,
      incomeBeforeTax,
      incomeTax,
      netIncome,
      eps,
      ebitda: est.estimatedEbitdaAvg || operatingIncome * 1.15,
      analystCount: Math.max(est.numberAnalystEstimatedRevenue || 0, est.numberAnalystsEstimatedEps || 0),
    };
  });
}

// Fallback estimates when no analyst data available
function generateFallbackEstimates(historicalData: any[], scenario: EstimateScenario) {
  if (!historicalData?.length) return [];
  
  const latestYear = historicalData[0];
  const growthRates = {
    bear: { revenue: 0.05, margins: -0.02 },
    base: { revenue: 0.08, margins: 0 },
    bull: { revenue: 0.12, margins: 0.02 },
  };
  
  const rates = growthRates[scenario];
  const currentYear = new Date().getFullYear();
  
  return [1, 2, 3].map((yearsAhead) => {
    const year = currentYear + yearsAhead;
    const compoundGrowth = Math.pow(1 + rates.revenue, yearsAhead);
    
    const revenue = (latestYear.revenue || 0) * compoundGrowth;
    const grossMargin = latestYear.grossProfit && latestYear.revenue 
      ? (latestYear.grossProfit / latestYear.revenue) + (rates.margins * yearsAhead * 0.5)
      : 0.4;
    const operatingMargin = latestYear.operatingIncome && latestYear.revenue
      ? (latestYear.operatingIncome / latestYear.revenue) + (rates.margins * yearsAhead * 0.3)
      : 0.25;
    const netMargin = latestYear.netIncome && latestYear.revenue
      ? (latestYear.netIncome / latestYear.revenue) + (rates.margins * yearsAhead * 0.2)
      : 0.15;
    
    return {
      date: `${year}E`,
      year: year,
      isEstimate: true,
      isFallback: true, // Flag to show this is generated, not from analysts
      revenue,
      costOfRevenue: revenue * (1 - grossMargin),
      grossProfit: revenue * grossMargin,
      operatingExpenses: revenue * (grossMargin - operatingMargin),
      operatingIncome: revenue * operatingMargin,
      interestExpense: (latestYear.interestExpense || 0) * 1.02,
      otherIncome: (latestYear.otherIncome || latestYear.revenue * 0.002) * compoundGrowth,
      incomeBeforeTax: revenue * (operatingMargin + 0.01),
      incomeTax: revenue * (operatingMargin + 0.01) * 0.15,
      netIncome: revenue * netMargin,
      eps: (latestYear.eps || 0) * compoundGrowth * (1 + rates.margins * yearsAhead),
    };
  });
}

export function IncomeStatementTable({ ticker, companyName }: IncomeStatementTableProps) {
  const [selectedScenario, setSelectedScenario] = useState<EstimateScenario>('base');
  const [showFullHistory, setShowFullHistory] = useState(false);
  const { data, isLoading, error, refetch, isRefetching } = useFinancialData(ticker);
  const { isPro } = useUsage();
  const { promptUpgrade, showUpgradeDialog, setShowUpgradeDialog, upgradeFeature } = useUpgrade();
  
  const historicalData = data?.financials || [];
  const analystEstimates = data?.estimates || [];
  const hasRealEstimates = analystEstimates.length > 0;
  
  const estimates = convertEstimatesToDisplayFormat(analystEstimates, historicalData, selectedScenario);
  
  // Free users: 1 year of estimates. Pro: all estimates.
  const FREE_ESTIMATE_LIMIT = 1;
  const visibleEstimates = isPro ? estimates : estimates.slice(0, FREE_ESTIMATE_LIMIT);
  const lockedEstimates = isPro ? [] : estimates.slice(FREE_ESTIMATE_LIMIT);
  const hasLockedEstimates = lockedEstimates.length > 0;
  
  // Free users: 4 most recent historical years. Pro: all historical data.
  const FREE_HISTORICAL_LIMIT = 4;
  const historicalReversed = historicalData.slice().reverse();
  const totalHistorical = historicalReversed.length;
  const lockedHistoricalCount = isPro ? 0 : Math.max(0, totalHistorical - FREE_HISTORICAL_LIMIT);
  const hasLockedHistorical = lockedHistoricalCount > 0;
  
  // Prepare display data - historical (reversed to show oldest first) + estimates
  // When collapsed, skip locked historical columns entirely
  const filteredHistorical = showFullHistory 
    ? historicalReversed 
    : historicalReversed.slice(lockedHistoricalCount);
  
  const displayYears = [
    ...filteredHistorical.map((item: any, idx: number) => ({
      ...item,
      year: parseInt(item.date?.split('-')[0] || '2020'),
      isEstimate: false,
      isLocked: false,
      isLockedHistorical: false,
    })),
    ...visibleEstimates.map(e => ({ ...e, isLocked: false })),
    ...lockedEstimates.map(e => ({ ...e, isLocked: true })),
  ];
  
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Income Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !historicalData.length) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Income Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Financial data not available for {ticker}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Income Statement
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">Annual</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Values in millions USD</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
            </Button>
          </div>
        </div>
        
        {/* Projection toggle indicator */}
        <div className="flex items-center gap-2 mt-2">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">Projection</span>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="relative inline-block min-w-full">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/50">
                <th className="sticky left-0 z-20 text-left px-4 py-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap min-w-[180px]" style={{ backgroundColor: 'hsl(var(--card))', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.4)' }}>
                  Line Item
                </th>
                {/* Expand history button column */}
                {hasLockedHistorical && !showFullHistory && (
                  <th className="text-center px-1 py-2.5 min-w-[48px] max-w-[48px]">
                    <button
                      onClick={() => isPro ? setShowFullHistory(true) : promptUpgrade('financialProjections')}
                      className="flex flex-col items-center gap-1 mx-auto group"
                      title={isPro ? 'Show full history' : `Unlock ${lockedHistoricalCount}+ years`}
                    >
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                        {isPro ? <ChevronLeft className="h-3 w-3 text-white" /> : <Crown className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-[9px] text-muted-foreground leading-tight">
                        +{lockedHistoricalCount}yr
                      </span>
                    </button>
                  </th>
                )}
                {/* Collapse button when expanded */}
                {hasLockedHistorical && showFullHistory && (
                  <th className="text-center px-1 py-2.5 min-w-[48px] max-w-[48px]">
                    <button
                      onClick={() => setShowFullHistory(false)}
                      className="flex flex-col items-center gap-1 mx-auto"
                      title="Collapse history"
                    >
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </button>
                  </th>
                )}
                {displayYears.map((yearData, idx) => {
                  const isEstimate = yearData.isEstimate;
                  const isLocked = yearData.isLocked;
                  const yearLabel = isEstimate 
                    ? `${yearData.year}E`
                    : yearData.year?.toString() || yearData.date?.split('-')[0];
                  
                  return (
                    <th 
                      key={idx} 
                      className={cn(
                        "text-right px-3 py-2.5 font-medium text-xs whitespace-nowrap min-w-[120px]",
                        isEstimate && "bg-primary/5",
                        isLocked && "cursor-pointer"
                      )}
                      onClick={isLocked ? () => promptUpgrade('financialProjections') : undefined}
                    >
                      <span className={cn(
                        isEstimate && "text-primary",
                        isLocked && "opacity-50 flex items-center justify-end gap-1"
                      )}>
                        {isLocked && <Lock className="h-2.5 w-2.5 inline" />}
                        {yearLabel}
                      </span>
                    </th>
                  );
                })}
              </tr>
              
              {/* Scenario selector row for estimates */}
              <tr className="border-b border-border/30">
                <td className="sticky left-0 z-20 px-4 py-1 min-w-[180px]" style={{ backgroundColor: 'hsl(var(--card))', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.4)' }}></td>
                {hasLockedHistorical && <td className="min-w-[48px] max-w-[48px]"></td>}
                {displayYears.map((yearData, idx) => {
                  if (!yearData.isEstimate) {
                    return <td key={idx} className="px-3 py-1"></td>;
                  }
                  
                  // Only show scenario buttons on first estimate column
                  const estimateIndex = displayYears.filter((y, i) => i < idx && y.isEstimate).length;
                  if (estimateIndex !== 0) {
                    return <td key={idx} className="bg-primary/5 px-3 py-1"></td>;
                  }
                  
                  return (
                    <td 
                      key={idx} 
                      colSpan={3}
                      className="bg-primary/5 px-2 py-1"
                    >
                      <div className="flex items-center justify-center gap-1">
                        {(['bear', 'base', 'bull'] as EstimateScenario[]).map((scenario) => (
                          <Button
                            key={scenario}
                            variant={selectedScenario === scenario ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setSelectedScenario(scenario)}
                            className={cn(
                              "h-5 px-2 text-[10px] capitalize",
                              selectedScenario === scenario && "bg-primary text-primary-foreground"
                            )}
                          >
                            {scenario}
                          </Button>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </thead>
            
            <tbody>
              {INCOME_STATEMENT_ROWS.map((row) => {
                // Get derived metrics that should appear after this row
                const derivedMetricsForRow = DERIVED_METRICS.filter(m => m.parentKey === row.key);
                
                return (
                  <React.Fragment key={row.key}>
                    <TooltipProvider delayDuration={0}>
                      <tr 
                        className={cn(
                          "border-b border-border/30 hover:bg-accent/30 transition-colors",
                          row.isHighlight && "bg-primary/5 font-semibold"
                        )}
                      >
                        <td className={cn(
                          "sticky left-0 z-20 px-4 py-2.5 text-xs whitespace-nowrap min-w-[180px]",
                          row.isSubItem && "pl-8 text-muted-foreground"
                        )} style={{ backgroundColor: 'hsl(var(--card))', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.4)' }}>
                          <div className="flex items-center gap-1.5 max-w-full">
                            <span className={cn(
                              "truncate flex-1 min-w-0",
                              row.isHighlight && "text-primary",
                              row.key === 'revenue' && "text-primary font-medium"
                            )}>
                              {row.label}
                            </span>
                            {row.tooltip && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex-shrink-0 cursor-help">
                                    <HelpCircle className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[200px]">
                                  <p className="text-xs">{row.tooltip}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        
                        {hasLockedHistorical && <td className="min-w-[48px] max-w-[48px]"></td>}
                        {displayYears.map((yearData, idx) => {
                          const value = yearData[row.key];
                          const isEPS = row.key === 'eps';
                          const isLocked = yearData.isLocked;
                          const prevValue = idx > 0 ? displayYears[idx - 1]?.[row.key] : null;
                          const yoyChange = prevValue && value ? ((value - prevValue) / Math.abs(prevValue)) * 100 : undefined;
                          
                          if (isLocked) {
                            return (
                              <td 
                                key={idx}
                                className="p-0 min-w-[120px] bg-primary/5 cursor-pointer whitespace-nowrap"
                                onClick={() => promptUpgrade('financialProjections')}
                              >
                                <div className="px-3 py-2.5 text-right select-none">
                                  <span className="text-xs tabular-nums blur-[6px] opacity-50 pointer-events-none">
                                    {formatValue(value, isEPS)}
                                  </span>
                                </div>
                              </td>
                            );
                          }
                          
                          return (
                            <td 
                              key={idx}
                              className={cn(
                                "p-0 min-w-[120px] whitespace-nowrap",
                                yearData.isEstimate && "bg-primary/5"
                              )}
                            >
                              <FinancialDataCell
                                value={formatValue(value, isEPS)}
                                rawValue={value}
                                label={row.label}
                                tooltip={row.tooltip}
                                source={yearData.isEstimate ? 'Estimate' : (data?.useMockData ? 'FMP' : 'SEC')}
                                sourceDetail={yearData.isEstimate 
                                  ? `Analyst consensus for ${yearData.year}` 
                                  : `Annual Report ${yearData.year || yearData.date?.split('-')[0]}`
                                }
                                isEstimate={yearData.isEstimate}
                                isHighlight={row.isHighlight}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </TooltipProvider>
                    
                    {/* Derived metric rows */}
                    {derivedMetricsForRow.map((metric) => (
                      <TooltipProvider key={metric.label} delayDuration={0}>
                        <tr className="border-b border-border/20 bg-muted/20">
                          <td className="sticky left-0 z-20 px-4 py-1.5 text-[10px] min-w-[180px] pl-8 whitespace-nowrap" style={{ backgroundColor: 'hsl(var(--card))', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.4)' }}>
                            <div className="flex items-center gap-1.5 max-w-full">
                              <span className="truncate flex-1 min-w-0 text-muted-foreground italic">
                                {metric.label}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex-shrink-0 cursor-help">
                                    <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/40 hover:text-muted-foreground" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[200px]">
                                  <p className="text-xs">{metric.tooltip}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                          
                          {hasLockedHistorical && <td className="min-w-[48px] max-w-[48px] bg-muted/20"></td>}
                          {displayYears.map((yearData, idx) => {
                            const prev = idx > 0 ? displayYears[idx - 1] : null;
                            const computedValue = metric.compute(yearData, prev, displayYears, idx);
                            const formattedValue = metric.format(computedValue);
                            const isLocked = yearData.isLocked;
                            
                            return (
                              <td 
                                key={idx}
                                 className={cn(
                                  "px-3 py-1.5 text-right text-[10px] tabular-nums min-w-[120px] whitespace-nowrap",
                                  yearData.isEstimate && "bg-primary/5",
                                  isLocked && "cursor-pointer",
                                  !isLocked && metric.colorize && computedValue != null && (
                                    computedValue >= 0 ? "text-emerald-500" : "text-destructive"
                                  ),
                                  !isLocked && !metric.colorize && "text-muted-foreground"
                                )}
                                onClick={isLocked ? () => promptUpgrade('financialProjections') : undefined}
                              >
                                {isLocked ? (
                                  <span className="blur-[6px] opacity-50 pointer-events-none">{formattedValue}</span>
                                ) : formattedValue}
                              </td>
                            );
                          })}
                        </tr>
                      </TooltipProvider>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          
          {/* Historical overlay removed - now using collapse/expand button */}
          
          {/* Pro upgrade overlay on locked estimate columns (right side) */}
          {hasLockedEstimates && (
            <div 
              className="absolute right-0 top-0 bottom-0 flex items-center justify-center z-10 cursor-pointer"
              style={{ width: `${lockedEstimates.length * 80}px` }}
              onClick={() => promptUpgrade('financialProjections')}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-background/80 to-background/95" />
              <div className="relative flex flex-col items-center gap-2 p-4 text-center">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <p className="text-xs font-semibold text-foreground">Unlock Projections</p>
                <p className="text-[10px] text-muted-foreground max-w-[120px]">
                  Get multi-year analyst estimates & scenarios
                </p>
                <Button
                  size="sm"
                  className="h-7 text-[10px] px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/20"
                >
                  Upgrade to Pro
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
        
        {/* Data source indicator */}
        <div className="px-4 py-2 border-t border-border/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Source: {data?.useMockData ? 'Demo Data' : data?.source || 'Financial Modeling Prep'}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {hasRealEstimates 
              ? `Estimates from ${(estimates[0] as any)?.analystCount || 'Wall Street'} analysts` 
              : 'Estimates based on historical trends'}
          </span>
        </div>
        
      </CardContent>
      
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeDialog}
        feature={upgradeFeature}
        onClose={() => setShowUpgradeDialog(false)}
      />
    </Card>
  );
}
