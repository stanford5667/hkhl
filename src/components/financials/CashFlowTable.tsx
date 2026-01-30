/**
 * CashFlowTable - Display cash flow statement from SEC pipeline
 * Shows Operating, Investing, and Financing activities
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, RefreshCw } from 'lucide-react';
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
  { label: 'Depreciation & Amortization', key: 'depreciationAmortization', isSubItem: true, section: 'operating', tooltip: 'Non-cash expense added back.' },
  { label: 'Stock-based Compensation', key: 'stockBasedCompensation', isSubItem: true, section: 'operating', tooltip: 'Non-cash expense for equity awards.' },
  { label: 'Changes in Working Capital', key: 'workingCapitalChanges', isSubItem: true, section: 'operating', tooltip: 'Cash impact from changes in current assets/liabilities.' },
  { label: 'Operating Cash Flow', key: 'operatingCashFlow', isHighlight: true, section: 'operating', tooltip: 'Cash generated from core business operations.' },
  
  // Investing Activities
  { label: 'Capital Expenditures', key: 'capitalExpenditures', section: 'investing', tooltip: 'Investments in property, plant, and equipment.' },
  { label: 'Acquisitions', key: 'acquisitions', isSubItem: true, section: 'investing', tooltip: 'Cash spent to acquire other companies.' },
  { label: 'Investment Purchases', key: 'investmentPurchases', isSubItem: true, section: 'investing', tooltip: 'Cash spent on marketable securities.' },
  { label: 'Investment Sales', key: 'investmentSales', isSubItem: true, section: 'investing', tooltip: 'Cash received from selling investments.' },
  { label: 'Investing Cash Flow', key: 'investingCashFlow', isHighlight: true, section: 'investing', tooltip: 'Cash used for investments and asset purchases.' },
  
  // Financing Activities
  { label: 'Dividends Paid', key: 'dividendsPaid', section: 'financing', tooltip: 'Cash returned to shareholders as dividends.' },
  { label: 'Share Repurchases', key: 'shareRepurchases', isSubItem: true, section: 'financing', tooltip: 'Cash spent buying back company stock.' },
  { label: 'Debt Repayment', key: 'debtRepayment', isSubItem: true, section: 'financing', tooltip: 'Cash used to pay down loans.' },
  { label: 'Debt Issuance', key: 'debtIssuance', isSubItem: true, section: 'financing', tooltip: 'Cash received from new borrowings.' },
  { label: 'Financing Cash Flow', key: 'financingCashFlow', isHighlight: true, section: 'financing', tooltip: 'Cash from debt and equity transactions.' },
  
  // Summary
  { label: 'Net Change in Cash', key: 'netCashChange', isHighlight: true, tooltip: 'Total change in cash position for the period.' },
  { label: 'Free Cash Flow', key: 'freeCashFlow', isHighlight: true, tooltip: 'Operating Cash Flow minus CapEx. Cash available for dividends, buybacks, or debt reduction.' },
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
            <span className="text-xs text-muted-foreground">Click any value for details</span>
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
          <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b border-border/50">
                <th className="sticky left-0 bg-card z-20 text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-[200px] min-w-[200px]">
                  Line Item
                </th>
                {displayYears.map((yearData: any, idx: number) => {
                  const yearLabel = yearData.date?.split('-')[0] || yearData.year;
                  return (
                    <th key={idx} className="text-right px-3 py-2.5 font-medium text-xs w-[100px] min-w-[100px]">
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
                
                return (
                  <tr 
                    key={row.key}
                    className={cn(
                      "border-b border-border/30 hover:bg-accent/30 transition-colors",
                      row.isHighlight && "bg-primary/5 font-semibold"
                    )}
                  >
                    <td className={cn(
                      "sticky left-0 z-20 px-4 py-2.5 text-xs",
                      row.isHighlight ? "bg-primary/5" : "bg-card",
                      row.isSubItem && "pl-8 text-muted-foreground"
                    )}>
                      <span className={cn(
                        row.isHighlight && "text-primary",
                        row.key === 'freeCashFlow' && "text-emerald-500"
                      )}>
                        {row.label}
                      </span>
                    </td>
                    
                    {displayYears.map((yearData: any, idx: number) => {
                      const value = yearData[row.key];
                      const prevValue = idx > 0 ? displayYears[idx - 1]?.[row.key] : null;
                      const yoyChange = prevValue && value && prevValue !== 0 
                        ? ((value - prevValue) / Math.abs(prevValue)) * 100 
                        : undefined;
                      
                      return (
                        <FinancialDataCell
                          key={idx}
                          value={formatValue(value)}
                          rawValue={value}
                          label={row.label}
                          tooltip={row.tooltip}
                          source="SEC"
                          sourceDetail={`${ticker} 10-K Filing`}
                          isHighlight={row.isHighlight}
                          yoyChange={yoyChange}
                          className={cn(
                            row.key === 'freeCashFlow' && value != null && value > 0 && "text-emerald-500"
                          )}
                        />
                      );
                    })}
                  </tr>
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
