/**
 * Strategy Signal Badge
 * 
 * Shows the current signal state from a linked backtest strategy
 * on sim portfolio positions (HOLD / BUY / SELL).
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StrategySignalBadgeProps {
  strategyName: string | null;
  signal?: 'buy' | 'sell' | 'hold' | null;
}

export function StrategySignalBadge({ strategyName, signal }: StrategySignalBadgeProps) {
  if (!strategyName) return null;

  const signalConfig = {
    buy: { label: 'BUY Signal', icon: TrendingUp, variant: 'default' as const, className: 'bg-success/20 text-success border-success/30 hover:bg-success/30' },
    sell: { label: 'SELL Signal', icon: TrendingDown, variant: 'default' as const, className: 'bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30' },
    hold: { label: 'HOLD', icon: Minus, variant: 'outline' as const, className: 'text-muted-foreground' },
  };

  const config = signalConfig[signal || 'hold'];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={config.variant} className={`text-[10px] gap-1 ${config.className}`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Strategy: {strategyName}</p>
        <p className="text-xs text-muted-foreground">Signal based on linked backtest rules</p>
      </TooltipContent>
    </Tooltip>
  );
}
