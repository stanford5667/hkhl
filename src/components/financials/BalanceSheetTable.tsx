/**
 * BalanceSheetTable - Display balance sheet data from SEC pipeline
 * Shows Assets, Liabilities, and Equity breakdown
 * Matches Income Statement visual format
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Scale, RefreshCw, HelpCircle, Crown, Lock } from 'lucide-react';
import { HistoryExpandColumn } from './HistoryExpandColumn';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinancialDataCell } from './FinancialDataCell';
import { useUsage } from '@/contexts/UsageContext';
import { useUpgrade } from '@/hooks/useUpgrade';
import { UpgradeModal } from '@/components/premium/UpgradeModal';

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
  { label: "Stockholders' Equity", key: 'totalEquity', isHighlight: true, section: 'equity', tooltip: 'Net worth of the company (Assets - Liabilities).' },
  { label: 'Common Stock', key: 'commonStock', isSubItem: true, section: 'equity', tooltip: 'Par value of issued common shares.' },
  { label: 'Retained Earnings', key: 'retainedEarnings', isSubItem: true, section: 'equity', tooltip: 'Accumulated profits not paid out as dividends.' },
  { label: 'Treasury Stock', key: 'treasuryStock', isSubItem: true, section: 'equity', tooltip: 'Company stock that has been repurchased.' },
];

// Derived metrics for balance sheet
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
    label: 'Assets Growth %',
    parentKey: 'totalAssets',
    compute: (current, prev) => {
      if (!prev?.totalAssets || !current?.totalAssets) return null;
      return ((current.totalAssets - prev.totalAssets) / Math.abs(prev.totalAssets)) * 100;
    },
    format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—',
    tooltip: 'Year-over-year total assets growth',
    colorize: true,
  },
  {
    label: 'Current Ratio',
    parentKey: 'currentAssets',
    compute: (current) => {
      if (!current?.currentAssets || !current?.currentLiabilities) return null;
      return current.currentAssets / current.currentLiabilities;
    },
    format: (v) => v != null ? `${v.toFixed(2)}x` : '—',
    tooltip: 'Current Assets / Current Liabilities. Measures short-term liquidity.',
  },
  {
    label: 'Debt/Equity',
    parentKey: 'totalLiabilities',
    compute: (current) => {
      if (!current?.totalLiabilities || !current?.totalEquity) return null;
      return current.totalLiabilities / current.totalEquity;
    },
    format: (v) => v != null ? `${v.toFixed(2)}x` : '—',
    tooltip: 'Total Liabilities / Equity. Measures financial leverage.',
  },
  {
    label: 'Equity Growth %',
    parentKey: 'totalEquity',
    compute: (current, prev) => {
      if (!prev?.totalEquity || !current?.totalEquity) return null;
      return ((current.totalEquity - prev.totalEquity) / Math.abs(prev.totalEquity)) * 100;
    },
    format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—',
    tooltip: 'Year-over-year stockholders equity change',
    colorize: true,
  },
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
  const { isPro } = useUsage();
  const { promptUpgrade, showUpgradeDialog, setShowUpgradeDialog, upgradeFeature } = useUpgrade();
  const [showFullHistory, setShowFullHistory] = React.useState(false);

  const balanceSheets = data?.balanceSheets || [];
  const source = data?.source || 'SEC XBRL';
  
  // Free users: 4 most recent years. Pro: all data.
  const FREE_HISTORICAL_LIMIT = 4;

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
  const allYears = balanceSheets.slice().reverse();
  const totalYears = allYears.length;
  const lockedHistoricalCount = isPro ? 0 : Math.max(0, totalYears - FREE_HISTORICAL_LIMIT);
  const hasLockedHistorical = lockedHistoricalCount > 0;
  
  // When collapsed, skip locked historical columns entirely
  const filteredYears = showFullHistory ? allYears : allYears.slice(lockedHistoricalCount);
  
  const displayYears = filteredYears.map((item: any) => ({
    ...item,
    isLocked: false,
    isLockedHistorical: false,
  }));

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
        <div className="overflow-x-auto">
          <div className="relative inline-block min-w-full">
           <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/50">
                <th className="sticky left-0 z-20 text-left px-4 py-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap min-w-[180px]" style={{ backgroundColor: 'hsl(var(--card))', boxShadow: '4px 0 6px -2px rgba(0,0,0,0.4)' }}>
                  Line Item
                </th>
                {hasLockedHistorical && (
                  <HistoryExpandColumn
                    lockedCount={lockedHistoricalCount}
                    isPro={isPro}
                    showFullHistory={showFullHistory}
                    onToggle={() => setShowFullHistory(!showFullHistory)}
                    onUpgrade={() => promptUpgrade('financialProjections')}
                    as="th"
                  />
                )}
                {displayYears.map((yearData: any, idx: number) => {
                  const yearLabel = yearData.date?.split('-')[0] || yearData.year;
                  const isLocked = yearData.isLocked;
                  return (
                    <th 
                      key={idx} 
                      className={cn(
                        "text-right px-3 py-2.5 font-medium text-xs whitespace-nowrap min-w-[120px]",
                        isLocked && "cursor-pointer"
                      )}
                      onClick={isLocked ? () => promptUpgrade('financialProjections') : undefined}
                    >
                      <span className={cn(isLocked && "opacity-50 flex items-center justify-end gap-1")}>
                        {isLocked && <Lock className="h-2.5 w-2.5 inline" />}
                        {yearLabel}
                      </span>
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
                              row.isHighlight && "text-primary"
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
                        
                        {hasLockedHistorical && (
                          <td className="min-w-[40px] max-w-[40px] border-r border-border/30"></td>
                        )}
                        
                        {displayYears.map((yearData: any, idx: number) => {
                          const value = yearData[row.key];
                          const isLocked = yearData.isLocked;
                          
                          if (isLocked) {
                            return (
                              <td 
                                key={idx}
                                className="p-0 min-w-[120px] cursor-pointer whitespace-nowrap"
                                onClick={() => promptUpgrade('financialProjections')}
                              >
                                <div className="px-3 py-2.5 text-right select-none">
                                  <span className="text-xs tabular-nums blur-[6px] opacity-50 pointer-events-none">
                                    {formatValue(value)}
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
                          
                          {hasLockedHistorical && (
                            <td className="min-w-[40px] max-w-[40px] border-r border-border/30"></td>
                          )}
                          
                          {displayYears.map((yearData: any, idx: number) => {
                            const prev = idx > 0 ? displayYears[idx - 1] : null;
                            const computedValue = metric.compute(yearData, prev);
                            const formattedValue = metric.format(computedValue);
                            const isLocked = yearData.isLocked;
                            
                            return (
                              <td 
                                key={idx}
                                className={cn(
                                  "px-3 py-1.5 text-right text-[10px] tabular-nums min-w-[120px] whitespace-nowrap",
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
          </div>
        </div>
        
        <div className="px-4 py-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground">
            Source: {source}
          </span>
        </div>
      </CardContent>
      
      <UpgradeModal
        isOpen={showUpgradeDialog}
        feature={upgradeFeature}
        onClose={() => setShowUpgradeDialog(false)}
      />
    </Card>
  );
}
