/**
 * Reality Scenarios Component
 * 
 * Displays comparison between theoretical (perfect) and realistic execution scenarios
 * to help users understand the impact of execution costs on their strategy.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Info, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionConfig {
  slippageBps: number;
  commissionPerTrade: number;
  applySlippage: boolean;
  applyCommission: boolean;
}

interface RealityScenariosProps {
  theoreticalReturn: number;
  theoreticalWinRate: number;
  theoreticalSharpe: number;
  realisticReturn: number;
  realisticWinRate: number;
  realisticSharpe: number;
  totalSlippageCost: number;
  totalCommissionCost: number;
  executionConfig: ExecutionConfig;
  totalTrades: number;
}

export function RealityScenarios({
  theoreticalReturn,
  theoreticalWinRate,
  theoreticalSharpe,
  realisticReturn,
  realisticWinRate,
  realisticSharpe,
  totalSlippageCost,
  totalCommissionCost,
  executionConfig,
  totalTrades,
}: RealityScenariosProps) {
  const returnDegradation = theoreticalReturn - realisticReturn;
  const winRateDegradation = theoreticalWinRate - realisticWinRate;
  const totalCosts = totalSlippageCost + totalCommissionCost;
  
  // Calculate per-trade costs
  const avgSlippagePerTrade = totalTrades > 0 ? totalSlippageCost / totalTrades : 0;
  const avgCommissionPerTrade = totalTrades > 0 ? totalCommissionCost / totalTrades : 0;
  
  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Reality Check: Execution Costs Impact
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  This shows how slippage ({executionConfig.slippageBps} bps) and 
                  commissions (${executionConfig.commissionPerTrade}/trade) affect your strategy's 
                  actual performance vs theoretical perfect execution.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario Comparison Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Theoretical Column */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                Theoretical
              </Badge>
              <span className="text-[10px] text-muted-foreground">(Perfect Fills)</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Return</span>
                <span className={cn(
                  "font-mono text-sm font-semibold",
                  theoreticalReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {theoreticalReturn >= 0 ? '+' : ''}{theoreticalReturn.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Win Rate</span>
                <span className="font-mono text-sm">{theoreticalWinRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Sharpe</span>
                <span className="font-mono text-sm">{theoreticalSharpe.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Realistic Column */}
          <div className="p-3 rounded-lg bg-secondary/30 border">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                Realistic
              </Badge>
              <span className="text-[10px] text-muted-foreground">(With Costs)</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Return</span>
                <span className={cn(
                  "font-mono text-sm font-semibold",
                  realisticReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {realisticReturn >= 0 ? '+' : ''}{realisticReturn.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Win Rate</span>
                <span className="font-mono text-sm">{realisticWinRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Sharpe</span>
                <span className="font-mono text-sm">{realisticSharpe.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Cost Breakdown */}
        <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-xs font-medium text-rose-400">Execution Costs Breakdown</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Slippage ({executionConfig.slippageBps} bps)
                </span>
                <span className="font-mono text-rose-400">-${totalSlippageCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Commission (×{totalTrades * 2} legs)
                </span>
                <span className="font-mono text-rose-400">-${totalCommissionCost.toFixed(2)}</span>
              </div>
            </div>
            <div className="border-l border-rose-500/20 pl-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Total Drag</span>
                <span className="font-mono font-semibold text-rose-400">-${totalCosts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Return Impact</span>
                <span className="font-mono text-rose-400">
                  -{returnDegradation.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Per-Trade Impact */}
        <div className="flex justify-between items-center text-xs p-2 rounded bg-muted/30">
          <span className="text-muted-foreground">Average cost per round-trip trade:</span>
          <span className="font-mono">
            ${(avgSlippagePerTrade + avgCommissionPerTrade * 2).toFixed(2)}
          </span>
        </div>
        
        {/* Warning if costs are high */}
        {returnDegradation > 5 && (
          <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200">
              <strong>High Friction Strategy:</strong> Execution costs reduce returns by {returnDegradation.toFixed(1)}%. 
              Consider reducing trade frequency or targeting larger price moves.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
