/**
 * FinancialsSection - Complete Financials View for Company Details
 * Includes Income Statement, Balance Sheet, Cash Flow, and Valuation Suite tabs
 * With margins, growth rates, expense breakdown, and clickable sourced data
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Scale, Coins, GraduationCap, Target } from 'lucide-react';
import { IncomeStatementTable } from './IncomeStatementTable';
import { BalanceSheetTable } from './BalanceSheetTable';
import { CashFlowTable } from './CashFlowTable';
import { FinancialMetricsBar } from './FinancialMetricsBar';
import { ExpenseBreakdownCard } from './ExpenseBreakdownCard';
import { RevenueSegmentsCard } from '@/components/research/RevenueSegmentsCard';
import { useProductSegments } from '@/hooks/useProductSegments';
import { useComprehensiveFundamentals } from '@/hooks/useComprehensiveFundamentals';
import { ValuationSuite } from './valuation/ValuationSuite';

interface FinancialsSectionProps {
  ticker: string;
  companyName?: string;
}

export function FinancialsSection({ ticker, companyName }: FinancialsSectionProps) {
  const [activeStatement, setActiveStatement] = useState('income');
  const { data: segmentsData, isLoading: segmentsLoading } = useProductSegments(ticker);
  const fundamentals = useComprehensiveFundamentals(ticker);
  
  // Extract metrics for the bar
  const grossMargin = fundamentals.grossMargin;
  const netMargin = fundamentals.netMargin;
  const operatingMargin = fundamentals.operatingMargin;
  const revenueGrowth = fundamentals.revenueGrowthYoY;
  
  return (
    <div className="space-y-4">
      {/* Key Margins & Growth Metrics Bar */}
      <FinancialMetricsBar
        grossMargin={grossMargin}
        netMargin={netMargin}
        operatingMargin={operatingMargin}
        revenueGrowth={revenueGrowth}
        isLoading={fundamentals.isLoading}
      />
      
      {/* Main Financials Tabs */}
      <Tabs value={activeStatement} onValueChange={setActiveStatement}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-9 p-1 bg-secondary/50">
            <TabsTrigger 
              value="income" 
              className="text-xs px-3 data-[state=active]:bg-background"
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Income Statement
            </TabsTrigger>
            <TabsTrigger 
              value="balance" 
              className="text-xs px-3 data-[state=active]:bg-background"
            >
              <Scale className="h-3.5 w-3.5 mr-1.5" />
              Balance Sheet
            </TabsTrigger>
            <TabsTrigger 
              value="cashflow" 
              className="text-xs px-3 data-[state=active]:bg-background"
            >
              <Coins className="h-3.5 w-3.5 mr-1.5" />
              Cash Flow
            </TabsTrigger>
            <TabsTrigger 
              value="valuation" 
              className="text-xs px-3 data-[state=active]:bg-background"
            >
              <Target className="h-3.5 w-3.5 mr-1.5" />
              Valuation
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="income" className="mt-0">
          <IncomeStatementTable ticker={ticker} companyName={companyName} />
        </TabsContent>
        
        <TabsContent value="balance" className="mt-0">
          <BalanceSheetTable ticker={ticker} companyName={companyName} />
        </TabsContent>
        
        <TabsContent value="cashflow" className="mt-0">
          <CashFlowTable ticker={ticker} companyName={companyName} />
        </TabsContent>
        
        <TabsContent value="valuation" className="mt-0">
          <ValuationSuite ticker={ticker} companyName={companyName} />
        </TabsContent>
      </Tabs>
      
      {/* Revenue Segmentation & Expense Breakdown (hide on valuation tab) */}
      {activeStatement !== 'valuation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueSegmentsCard 
            segments={segmentsData?.segments}
            isLoading={segmentsLoading}
            useMockData={segmentsData?.useMockData}
            ticker={ticker}
          />
          
          <ExpenseBreakdownCard
            revenue={fundamentals.revenue}
            costOfRevenue={fundamentals.costOfRevenue}
            operatingExpenses={fundamentals.operatingExpenses}
            interestExpense={fundamentals.interestExpense}
            incomeTax={fundamentals.incomeTax}
            isLoading={fundamentals.isLoading}
          />
        </div>
      )}
      
      {/* Learning Center */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Understanding Financial Statements</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Click on any value in the tables above to learn what it means and see its source
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}
