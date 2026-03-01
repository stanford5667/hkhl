/**
 * CashFlowTable - Display cash flow statement from SEC pipeline
 * Shows Operating, Investing, and Financing activities
 * Matches Income Statement visual format
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Coins, RefreshCw, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinancialDataCell } from './FinancialDataCell';

interface CashFlowTableProps {
  ticker: string;
  companyName?: string;
}

interface CashFlowRow {
  label: string;
  key: string;
  isHighlight?: boolean;
  isSubItem?: boolean;
  tooltip?: string;
  section?: 'operating' | 'investing' | 'financing';
}

const CASH_FLOW_ROWS: CashFlowRow[] = [
  // Operating Activities
  { label: 'Net Income', key: 'netIncome', section: 'operating', tooltip: 'Starting point for operating cash flow.' },
  { label: 'D&A', key: 'depreciationAmortization', isSubItem: true, section: 'operating', tooltip: 'Non-cash expense added back.' },
  { label: 'Stock Comp', key: 'stockBasedCompensation', isSubItem: true, section: 'operating', tooltip: 'Non-cash expense for equity awards.' },
  { label: 'Working Capital', key: 'workingCapitalChanges', isSubItem: true, section: 'operating', tooltip: 'Cash impact from changes in current assets/liabilities.' },
  { label: 'Operating CF', key: 'operatingCashFlow', isHighlight: true, section: 'operating', tooltip: 'Cash generated from core business operations.' },
  
  // Investing Activities
  { label: 'CapEx', key: 'capitalExpenditures', section: 'investing', tooltip: 'Investments in property, plant, and equipment.' },
  { label: 'Acquisitions', key: 'acquisitions', isSubItem: true, section: 'investing', tooltip: 'Cash spent to acquire other companies.' },
  { label: 'Invest Purchases', key: 'investmentPurchases', isSubItem: true, section: 'investing', tooltip: 'Cash spent on marketable securities.' },
  { label: 'Invest Sales', key: 'investmentSales', isSubItem: true, section: 'investing', tooltip: 'Cash received from selling investments.' },
  { label: 'Investing CF', key: 'investingCashFlow', isHighlight: true, section: 'investing', tooltip: 'Cash used for investments and asset purchases.' },
  
  // Financing Activities
  { label: 'Dividends', key: 'dividendsPaid', section: 'financing', tooltip: 'Cash returned to shareholders as dividends.' },
  { label: 'Buybacks', key: 'shareRepurchases', isSubItem: true, section: 'financing', tooltip: 'Cash spent buying back company stock.' },
  { label: 'Debt Repayment', key: 'debtRepayment', isSubItem: true, section: 'financing', tooltip: 'Cash used to pay down loans.' },
  { label: 'Debt Issuance', key: 'debtIssuance', isSubItem: true, section: 'financing', tooltip: 'Cash received from new borrowings.' },
  { label: 'Financing CF', key: 'financingCashFlow', isHighlight: true, section: 'financing', tooltip: 'Cash from debt and equity transactions.' },
  
  // Summary
  { label: 'Net Cash Change', key: 'netCashChange', isHighlight: true, tooltip: 'Total change in cash position for the period.' },
  { label: 'Free Cash Flow', key: 'freeCashFlow', isHighlight: true, tooltip: 'Operating Cash Flow minus CapEx. Cash available for dividends, buybacks, or debt reduction.' },
];

// Derived metrics for cash flow
interface DerivedMetricRow {
  label: string;
  parentKey: string;
  compute: (current: any, prev: any) => number | null;
  format: (value: number | null) => string;
  tooltip: string;
  colorize?: boolean;
}

const DERIVED_METRICS: DerivedMetricRow[] = [
  {
    label: 'OCF Growth %',
    parentKey: 'operatingCashFlow',
    compute: (current, prev) => {
      if (!prev?.operatingCashFlow || !current?.operatingCashFlow) return null;
      return ((current.operatingCashFlow - prev.operatingCashFlow) / Math.abs(prev.operatingCashFlow)) * 100;
    },
    format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—',
    tooltip: 'Year-over-year operating cash flow growth',
    colorize: true,
  },
  {
    label: 'FCF Growth %',
    parentKey: 'freeCashFlow',
    compute: (current, prev) => {
      if (!prev?.freeCashFlow || !current?.freeCashFlow) return null;
      return ((current.freeCashFlow - prev.freeCashFlow) / Math.abs(prev.freeCashFlow)) * 100;
    },
    format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—',
    tooltip: 'Year-over-year free cash flow growth',
    colorize: true,
  },
  {
    label: 'FCF Margin %',
    parentKey: 'freeCashFlow',
    compute: (current) => {
      if (!current?.freeCashFlow || !current?.netIncome) return null;
      return (current.freeCashFlow / Math.abs(current.netIncome)) * 100;
    },
    format: (v) => v != null ? `${v.toFixed(0)}% of NI` : '—',
    tooltip: 'Free Cash Flow as percentage of Net Income (cash conversion)',
  },
];

function formatValue(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1e12) return `${sign}${(absValue / 1e12).toFixed(1)}T`;
  if (absValue >= 1e9) return `${sign}${(absValue / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${sign}${(absValue / 1e6).toFixed(0)}M`;
  
  return value.toLocaleString();
}

function useCashFlowData(ticker: string) {
  return useQuery({
    queryKey: ['cash-flow', ticker],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fmp-fundamentals', {
        body: { action: 'cash-flow', symbol: ticker }
      });
      
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!ticker,
  });
}

export function CashFlowTable({ ticker, companyName }: CashFlowTableProps) {
  const { data, isLoading, error, refetch, isRefetching } = useCashFlowData(ticker);

  const cashFlows = data?.cashFlows || [];
  const source = data?.source || 'SEC XBRL';

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4 text-primary" />
            Cash Flow Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || cashFlows.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4 text-primary" />
            Cash Flow Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Coins className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Cash flow data not available for {ticker}</p>
            <p className="text-xs mt-1">Try refreshing or check back later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayYears = cashFlows.slice().reverse();

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-4 w-4 text-primary" />
              Cash Flow Statement
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
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto relative">
           <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/50">
                <th className="sticky left-0 z-20 text-left px-4 py-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap min-w-[180px]" style={{ backgroundColor: 'hsl(var(--card))', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.4)' }}>
                  Line Item
                </th>
                {displayYears.map((yearData: any, idx: number) => {
                  const yearLabel = yearData.date?.split('-')[0] || yearData.year;
                  return (
                    <th key={idx} className="text-right px-3 py-2.5 font-medium text-xs whitespace-nowrap min-w-[120px]">
                      {yearLabel}
                    </th>
                  );
                })}
              </tr>
            </thead>
            
            <tbody>
              {CASH_FLOW_ROWS.map((row) => {
                const hasData = displayYears.some((y: any) => y[row.key] != null);
                if (!hasData && row.isSubItem) return null;
                
                // Get derived metrics for this row
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
                              row.key === 'freeCashFlow' && "text-emerald-500"
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
                        
                        {displayYears.map((yearData: any, idx: number) => {
                          const value = yearData[row.key];
                          const prevValue = idx > 0 ? displayYears[idx - 1]?.[row.key] : null;
                          const yoyChange = prevValue && value ? ((value - prevValue) / Math.abs(prevValue)) * 100 : undefined;
                          
                          return (
                            <td
                              key={idx}
                              className={cn(
                                "p-0 min-w-[120px] whitespace-nowrap",
                                row.isHighlight && "bg-primary/5"
                              )}
                            >
                              <FinancialDataCell
                                value={formatValue(value)}
                                rawValue={value}
                                label={row.label}
                                tooltip={row.tooltip}
                                source="SEC"
                                sourceDetail={`10-K Filing ${yearData.date?.split('-')[0] || yearData.year}`}
                                isHighlight={row.isHighlight}
                                className={row.key === 'freeCashFlow' && value != null && value > 0 ? "text-emerald-500" : undefined}
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
                          
                          {displayYears.map((yearData: any, idx: number) => {
                            const prev = idx > 0 ? displayYears[idx - 1] : null;
                            const computedValue = metric.compute(yearData, prev);
                            const formattedValue = metric.format(computedValue);
                            
                            return (
                              <td 
                                key={idx}
                                className={cn(
                                  "px-3 py-1.5 text-right text-[10px] tabular-nums min-w-[120px] whitespace-nowrap",
                                  metric.colorize && computedValue != null && (
                                    computedValue >= 0 ? "text-emerald-500" : "text-destructive"
                                  ),
                                  !metric.colorize && "text-muted-foreground"
                                )}
                              >
                                {formattedValue}
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
        </div>
        
        <div className="px-4 py-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground">
            Source: {source}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
