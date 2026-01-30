/**
 * ExpenseBreakdownCard - Display expenses broken down by cost centers
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExpenseCategory {
  name: string;
  amount: number;
  percentage: number;
  yoyChange?: number;
  color: string;
  tooltip: string;
}

interface ExpenseBreakdownCardProps {
  revenue?: number;
  costOfRevenue?: number;
  operatingExpenses?: number;
  researchAndDevelopment?: number;
  sellingGeneralAdmin?: number;
  interestExpense?: number;
  incomeTax?: number;
  isLoading?: boolean;
}

// Format number to abbreviated form
function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (absValue >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  if (absValue >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

const EXPENSE_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-cyan-500',
];

export function ExpenseBreakdownCard({
  revenue = 0,
  costOfRevenue = 0,
  operatingExpenses = 0,
  researchAndDevelopment,
  sellingGeneralAdmin,
  interestExpense = 0,
  incomeTax = 0,
  isLoading = false,
}: ExpenseBreakdownCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChart className="h-4 w-4 text-primary" />
            Expense Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalExpenses = costOfRevenue + operatingExpenses + interestExpense + Math.max(0, incomeTax);
  
  if (totalExpenses === 0 || revenue === 0) {
    return null;
  }

  // Build expense categories
  const categories: ExpenseCategory[] = [];
  
  if (costOfRevenue > 0) {
    categories.push({
      name: 'Cost of Revenue',
      amount: costOfRevenue,
      percentage: (costOfRevenue / revenue) * 100,
      color: EXPENSE_COLORS[0],
      tooltip: 'Direct costs of producing goods/services (materials, manufacturing labor, etc.)',
    });
  }
  
  // If we have R&D and SG&A breakdown, show them separately
  if (researchAndDevelopment && researchAndDevelopment > 0) {
    categories.push({
      name: 'R&D',
      amount: researchAndDevelopment,
      percentage: (researchAndDevelopment / revenue) * 100,
      color: EXPENSE_COLORS[1],
      tooltip: 'Research & Development expenses for new products and technology.',
    });
  }
  
  if (sellingGeneralAdmin && sellingGeneralAdmin > 0) {
    categories.push({
      name: 'SG&A',
      amount: sellingGeneralAdmin,
      percentage: (sellingGeneralAdmin / revenue) * 100,
      color: EXPENSE_COLORS[2],
      tooltip: 'Selling, General & Administrative: sales, marketing, corporate overhead.',
    });
  }
  
  // If we don't have the breakdown, show total operating expenses
  if (!researchAndDevelopment && !sellingGeneralAdmin && operatingExpenses > 0) {
    categories.push({
      name: 'Operating Expenses',
      amount: operatingExpenses,
      percentage: (operatingExpenses / revenue) * 100,
      color: EXPENSE_COLORS[1],
      tooltip: 'All operating expenses including R&D, sales, marketing, and admin costs.',
    });
  }
  
  if (interestExpense > 0) {
    categories.push({
      name: 'Interest Expense',
      amount: interestExpense,
      percentage: (interestExpense / revenue) * 100,
      color: EXPENSE_COLORS[4],
      tooltip: 'Cost of borrowing money (interest on debt).',
    });
  }
  
  if (incomeTax > 0) {
    categories.push({
      name: 'Income Tax',
      amount: incomeTax,
      percentage: (incomeTax / revenue) * 100,
      color: EXPENSE_COLORS[5],
      tooltip: 'Corporate income taxes paid.',
    });
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="h-4 w-4 text-primary" />
          Expense Breakdown
        </CardTitle>
        <p className="text-[10px] text-muted-foreground mt-1">
          As % of revenue ({formatCurrency(revenue)})
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((category) => (
          <TooltipProvider key={category.name}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1 cursor-help">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{category.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground tabular-nums">
                        {formatCurrency(category.amount)}
                      </span>
                      <span className="font-semibold tabular-nums w-12 text-right">
                        {category.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", category.color)}
                      style={{ width: `${Math.min(100, category.percentage)}%` }}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">{category.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        
        {/* Total summary */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Total Expenses</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground tabular-nums">
                {formatCurrency(totalExpenses)}
              </span>
              <span className="font-semibold tabular-nums w-12 text-right">
                {((totalExpenses / revenue) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="font-medium text-emerald-500">Net Income Margin</span>
            <span className="font-semibold tabular-nums text-emerald-500">
              {(((revenue - totalExpenses) / revenue) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
