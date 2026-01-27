/**
 * FinancialsSection - Complete Financials View for Company Details
 * Includes Income Statement, Balance Sheet, and Cash Flow tabs
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Scale, Coins, GraduationCap, MessageCircle } from 'lucide-react';
import { IncomeStatementTable } from './IncomeStatementTable';
import { RevenueSegmentsCard } from '@/components/research/RevenueSegmentsCard';
import { useProductSegments } from '@/hooks/useProductSegments';
import { cn } from '@/lib/utils';

interface FinancialsSectionProps {
  ticker: string;
  companyName?: string;
}

export function FinancialsSection({ ticker, companyName }: FinancialsSectionProps) {
  const [activeStatement, setActiveStatement] = useState('income');
  const { data: segmentsData, isLoading: segmentsLoading } = useProductSegments(ticker);
  
  return (
    <div className="space-y-6">
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
          </TabsList>
        </div>
        
        <TabsContent value="income" className="mt-0">
          <IncomeStatementTable ticker={ticker} companyName={companyName} />
        </TabsContent>
        
        <TabsContent value="balance" className="mt-0">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="h-4 w-4 text-primary" />
                Balance Sheet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Balance sheet data coming soon</p>
                <p className="text-xs mt-1">Assets, Liabilities, and Equity breakdown</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cashflow" className="mt-0">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Coins className="h-4 w-4 text-primary" />
                Cash Flow Statement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Coins className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Cash flow data coming soon</p>
                <p className="text-xs mt-1">Operating, Investing, and Financing activities</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Revenue Segmentation & Earnings Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Segments */}
        <div className="lg:col-span-1">
          <RevenueSegmentsCard 
            segments={segmentsData?.segments}
            isLoading={segmentsLoading}
            useMockData={segmentsData?.useMockData}
            ticker={ticker}
          />
        </div>
        
        <div className="lg:col-span-2">
          {/* Earnings Overview */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4 text-primary" />
                Earnings Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Next Earnings</p>
                  <p className="font-semibold text-sm mt-1">—</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">EPS Beat Rate</p>
                  <p className="font-semibold text-sm mt-1 text-success">—</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Revenue Beat Rate</p>
                  <p className="font-semibold text-sm mt-1 text-success">—</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Avg. Price Move</p>
                  <p className="font-semibold text-sm mt-1">—</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Learning Center Quick Links */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Learning Center</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Click on any highlighted term to learn what it means
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
            <p className="text-xs font-medium">📈 Stock Price</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
            <p className="text-xs font-medium">📊 P/E Ratio (Price-to-Earnings)</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
            <p className="text-xs font-medium">🔥 Consecutive Up/Down Days</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
            <p className="text-xs font-medium">📉 Beta</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
