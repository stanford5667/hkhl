/**
 * DataTracePanel - Collapsible debug panel showing raw JSON payload
 * Confirms isDataDynamic: true and data source integrity
 */

import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Shield, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValuationInput } from './types';

interface DataTracePanelProps {
  input: ValuationInput;
}

export function DataTracePanel({ input }: DataTracePanelProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 rounded-md bg-secondary/20 hover:bg-secondary/40 transition-colors text-xs">
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
        <Database className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">Data Trace</span>
        <Badge
          variant="outline"
          className={cn(
            'ml-auto text-[9px]',
            input.isDataDynamic
              ? 'border-emerald-500/50 text-emerald-500'
              : 'border-destructive/50 text-destructive'
          )}
        >
          <Shield className="h-2.5 w-2.5 mr-1" />
          {input.isDataDynamic ? 'LIVE' : 'STATIC'}
        </Badge>
        <Badge variant="outline" className="text-[9px]">
          Quality: {input.dataQuality}/10
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-3 rounded-md bg-secondary/10 border border-border/30 overflow-auto max-h-[320px]">
          <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">
{JSON.stringify(
  {
    isDataDynamic: input.isDataDynamic,
    dataSource: input.dataSource,
    dataQuality: input.dataQuality,
    currentPrice: input.currentPrice,
    forwardEPS: input.forwardEPS,
    trailingEPS: input.trailingEPS,
    forwardPE: input.forwardPE,
    trailingPE: input.trailingPE,
    beta: input.beta,
    returnOnEquity: input.returnOnEquity,
    payoutRatio: input.payoutRatio,
    freeCashFlow: input.freeCashFlow,
    marketCap: input.marketCap,
    totalDebt: input.totalDebt,
    totalEquity: input.totalEquity,
    debtToEquity: input.debtToEquity,
    sharesOutstanding: input.sharesOutstanding,
  },
  null,
  2
)}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
