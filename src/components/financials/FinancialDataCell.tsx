/**
 * FinancialDataCell - Clickable financial data cell with source attribution
 * Shows source, explanation, and commentary when clicked
 */

import React, { useState } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { FileText, Globe, Database, Calculator, ExternalLink, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialDataCellProps {
  value: string;
  rawValue?: number;
  label: string;
  tooltip?: string;
  source?: 'SEC' | 'Polygon' | 'FMP' | 'Calculated' | 'Estimate';
  sourceDetail?: string;
  isEstimate?: boolean;
  isHighlight?: boolean;
  yoyChange?: number;
  commentary?: string;
  className?: string;
}

const SOURCE_CONFIG = {
  SEC: {
    icon: FileText,
    label: 'SEC Filing',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  Polygon: {
    icon: Database,
    label: 'Polygon.io',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  FMP: {
    icon: Globe,
    label: 'Financial Modeling Prep',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  Calculated: {
    icon: Calculator,
    label: 'Calculated',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  Estimate: {
    icon: Calculator,
    label: 'Analyst Estimate',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
};

// Explanations for common financial terms
const TERM_EXPLANATIONS: Record<string, { definition: string; importance: string }> = {
  revenue: {
    definition: 'Total money earned from selling goods or services before any expenses are deducted.',
    importance: 'Shows the company\'s ability to generate sales and indicates market demand for its products.',
  },
  costOfRevenue: {
    definition: 'Direct costs of producing goods or services sold, including materials and labor.',
    importance: 'Lower cost of revenue relative to revenue indicates better efficiency and higher gross margins.',
  },
  grossProfit: {
    definition: 'Revenue minus cost of revenue. The profit before operating expenses.',
    importance: 'Measures production efficiency and pricing power. Higher is better.',
  },
  operatingExpenses: {
    definition: 'Costs to run the business that aren\'t directly tied to production (R&D, marketing, admin).',
    importance: 'Shows how efficiently the company manages its overhead costs.',
  },
  operatingIncome: {
    definition: 'Profit from core business operations, before interest and taxes.',
    importance: 'Key measure of operational efficiency and sustainable profitability.',
  },
  netIncome: {
    definition: 'Total profit after all expenses, interest, and taxes are deducted.',
    importance: 'The bottom line - what shareholders ultimately earn. Drives dividend capacity and reinvestment.',
  },
  eps: {
    definition: 'Net income divided by shares outstanding. Earnings attributable to each share.',
    importance: 'Primary metric for valuation comparisons and investor returns.',
  },
  ebitda: {
    definition: 'Earnings Before Interest, Taxes, Depreciation, and Amortization.',
    importance: 'Measures operational cash generation ability, used for comparing companies with different capital structures.',
  },
  grossMargin: {
    definition: 'Gross profit as a percentage of revenue.',
    importance: 'Shows pricing power and production efficiency. Higher margins = more buffer for other costs.',
  },
  netMargin: {
    definition: 'Net income as a percentage of revenue.',
    importance: 'Overall profitability efficiency. Shows how much of each dollar of revenue becomes profit.',
  },
  revenueGrowth: {
    definition: 'Year-over-year percentage change in revenue.',
    importance: 'Indicates business expansion rate and market share gains.',
  },
};

export function FinancialDataCell({
  value,
  rawValue,
  label,
  tooltip,
  source = 'SEC',
  sourceDetail,
  isEstimate = false,
  isHighlight = false,
  yoyChange,
  commentary,
  className,
}: FinancialDataCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const sourceConfig = SOURCE_CONFIG[isEstimate ? 'Estimate' : source];
  const SourceIcon = sourceConfig.icon;
  
  // Get explanation for this field
  const fieldKey = label.toLowerCase().replace(/[^a-z]/g, '');
  const explanation = TERM_EXPLANATIONS[fieldKey] || tooltip ? { 
    definition: tooltip || `${label} data point.`,
    importance: 'Key financial metric for analysis.'
  } : null;
  
  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <button
          className={cn(
            "text-right px-3 py-2 w-full",
            "hover:bg-accent/50 transition-colors cursor-pointer",
            "focus:outline-none focus:ring-1 focus:ring-primary/50",
            isEstimate && "bg-primary/5",
            className
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex flex-col items-end gap-0.5">
            <span className={cn(
              "text-xs tabular-nums whitespace-nowrap",
              isHighlight && isEstimate && "text-primary font-semibold",
              isHighlight && !isEstimate && "font-semibold",
            )}>
              {value}
            </span>
            {yoyChange !== undefined && yoyChange !== 0 && (
              <span className={cn(
                "text-[9px] tabular-nums font-normal whitespace-nowrap",
                yoyChange > 0 ? "text-emerald-500" : "text-destructive"
              )}>
                {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}%
              </span>
            )}
          </div>
        </button>
      </HoverCardTrigger>
      
      <HoverCardContent 
        className="w-80 p-0 bg-popover border-border shadow-xl"
        side="top"
        align="end"
      >
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm">{label}</h4>
              <p className="text-lg font-bold tabular-nums mt-0.5">{value}</p>
            </div>
            <Badge className={cn("text-[10px]", sourceConfig.bgColor, sourceConfig.color)}>
              <SourceIcon className="h-3 w-3 mr-1" />
              {sourceConfig.label}
            </Badge>
          </div>
          
          {/* YoY Change */}
          {yoyChange !== undefined && (
            <div className={cn(
              "px-2 py-1.5 rounded-md text-xs",
              yoyChange > 0 ? "bg-emerald-500/10 text-emerald-600" : yoyChange < 0 ? "bg-destructive/10 text-destructive" : "bg-muted"
            )}>
              <span className="font-medium">Year-over-Year:</span>{' '}
              {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}% 
              {yoyChange > 0 ? ' increase' : yoyChange < 0 ? ' decrease' : ' (no change)'}
            </div>
          )}
          
          {/* Explanation */}
          {explanation && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-muted-foreground leading-relaxed">
                    {explanation.definition}
                  </p>
                </div>
              </div>
              <div className="pl-5 text-xs text-primary/80 italic">
                💡 {explanation.importance}
              </div>
            </div>
          )}
          
          {/* Commentary */}
          {commentary && (
            <div className="text-xs text-muted-foreground border-t border-border pt-2">
              {commentary}
            </div>
          )}
          
          {/* Source Detail */}
          {sourceDetail && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground border-t border-border pt-2">
              <FileText className="h-3 w-3" />
              <span>{sourceDetail}</span>
              <ExternalLink className="h-3 w-3 ml-auto" />
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
