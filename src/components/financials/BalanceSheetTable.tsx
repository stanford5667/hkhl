/**
 * BalanceSheetTable - Display balance sheet data from SEC pipeline
 * Shows Assets, Liabilities, and Equity breakdown
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinancialDataCell } from './FinancialDataCell';

interface BalanceSheetTableProps {
  ticker: string;
  companyName?: string;
}

interface BalanceSheetRow {
  label: string;
  key: string;
  isHighlight?: boolean;
  isSubItem?: boolean;
  tooltip?: string;
  section?: 'assets' | 'liabilities' | 'equity';
}

const BALANCE_SHEET_ROWS: BalanceSheetRow[] = [
  // Assets
  { label: 'Total Assets', key: 'totalAssets', isHighlight: true, section: 'assets', tooltip: 'Everything the company owns that has value.' },
  { label: 'Current Assets', key: 'currentAssets', isSubItem: true, section: 'assets', tooltip: 'Assets that can be converted to cash within one year.' },
  { label: 'Cash & Equivalents', key: 'cashAndEquivalents', isSubItem: true, section: 'assets', tooltip: 'Liquid money available immediately.' },
  { label: 'Short-term Investments', key: 'shortTermInvestments', isSubItem: true, section: 'assets', tooltip: 'Investments that mature within one year.' },
  { label: 'Accounts Receivable', key: 'accountsReceivable', isSubItem: true, section: 'assets', tooltip: 'Money owed by customers for goods/services.' },
  { label: 'Inventory', key: 'inventory', isSubItem: true, section: 'assets', tooltip: 'Goods available for sale or materials for production.' },
  { label: 'Non-current Assets', key: 'nonCurrentAssets', isSubItem: true, section: 'assets', tooltip: 'Long-term assets not easily converted to cash.' },
  { label: 'Property, Plant & Equip.', key: 'propertyPlantEquipment', isSubItem: true, section: 'assets', tooltip: 'Physical assets like buildings, machinery, and equipment.' },
  { label: 'Goodwill & Intangibles', key: 'goodwillAndIntangibles', isSubItem: true, section: 'assets', tooltip: 'Non-physical assets including brand value and patents.' },
  
  // Liabilities
  { label: 'Total Liabilities', key: 'totalLiabilities', isHighlight: true, section: 'liabilities', tooltip: 'All debts and obligations the company owes.' },
  { label: 'Current Liabilities', key: 'currentLiabilities', isSubItem: true, section: 'liabilities', tooltip: 'Debts due within one year.' },
  { label: 'Accounts Payable', key: 'accountsPayable', isSubItem: true, section: 'liabilities', tooltip: 'Money owed to suppliers for goods/services.' },
  { label: 'Short-term Debt', key: 'shortTermDebt', isSubItem: true, section: 'liabilities', tooltip: 'Loans and borrowings due within one year.' },
  { label: 'Long-term Debt', key: 'longTermDebt', isSubItem: true, section: 'liabilities', tooltip: 'Loans and borrowings due after one year.' },
  { label: 'Other Liabilities', key: 'otherLiabilities', isSubItem: true, section: 'liabilities', tooltip: 'Other obligations like deferred taxes and lease obligations.' },
  
  // Equity
  { label: "Total Stockholders' Equity", key: 'totalEquity', isHighlight: true, section: 'equity', tooltip: 'Net worth of the company (Assets - Liabilities).' },
  { label: 'Common Stock', key: 'commonStock', isSubItem: true, section: 'equity', tooltip: 'Par value of issued common shares.' },
  { label: 'Retained Earnings', key: 'retainedEarnings', isSubItem: true, section: 'equity', tooltip: 'Accumulated profits not paid out as dividends.' },
  { label: 'Treasury Stock', key: 'treasuryStock', isSubItem: true, section: 'equity', tooltip: 'Company stock that has been repurchased.' },
];

function formatValue(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  
  return value.toLocaleString();
}

function useBalanceSheetData(ticker: string) {
  return useQuery({
    queryKey: ['balance-sheet', ticker],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fmp-fundamentals', {
        body: { action: 'balance-sheet', symbol: ticker }
      });
      
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!ticker,
  });
}

export function BalanceSheetTable({ ticker, companyName }: BalanceSheetTableProps) {
  const { data, isLoading, error, refetch, isRefetching } = useBalanceSheetData(ticker);

  const balanceSheets = data?.balanceSheets || [];
  const source = data?.source || 'SEC XBRL';

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" />
            Balance Sheet
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

  if (error || balanceSheets.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" />
            Balance Sheet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Balance sheet data not available for {ticker}</p>
            <p className="text-xs mt-1">Try refreshing or check back later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Reverse to show oldest first, then newest
  const displayYears = balanceSheets.slice().reverse();

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-4 w-4 text-primary" />
              Balance Sheet
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
                <th className="sticky left-0 bg-card z-20 text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-[180px] min-w-[180px]">
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
              {BALANCE_SHEET_ROWS.map((row) => {
                // Check if any year has data for this row
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
                      <span className={cn(row.isHighlight && "text-primary")}>
                        {row.label}
                      </span>
                    </td>
                    
                    {displayYears.map((yearData: any, idx: number) => {
                      const value = yearData[row.key];
                      const prevValue = idx > 0 ? displayYears[idx - 1]?.[row.key] : null;
                      const yoyChange = prevValue && value ? ((value - prevValue) / Math.abs(prevValue)) * 100 : undefined;
                      
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
