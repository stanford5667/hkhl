/**
 * Visual Strategy Builder Page
 * 
 * Drag-and-drop interface for creating trading strategies
 * that export to the existing backtest system.
 * Pro-only feature.
 */

import { useUsage } from '@/contexts/UsageContext';
import { useUpgrade } from '@/hooks/useUpgrade';
import { VisualStrategyBuilder } from '@/components/builder/VisualStrategyBuilder';
import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Builder() {
  const { isPro } = useUsage();
  const { startCheckout } = useUpgrade();

  if (!isPro) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 mx-auto mb-4 flex items-center justify-center">
            <Crown className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Visual Strategy Builder</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Build custom trading strategies with 20+ technical indicators, drag-and-drop logic, and institutional-grade backtesting.
          </p>
          <Button onClick={startCheckout} className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            <Crown className="h-4 w-4" />
            Upgrade to Pro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <VisualStrategyBuilder />
    </div>
  );
}
