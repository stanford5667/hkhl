import { AlertTriangle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDevMode } from '@/contexts/DevModeContext';
import { cn } from '@/lib/utils';

interface MarketDataPausedBannerProps {
  className?: string;
}

export function MarketDataPausedBanner({ className }: MarketDataPausedBannerProps) {
  const { marketDataEnabled, setMarketDataEnabled } = useDevMode();

  // Don't show if data is enabled
  if (marketDataEnabled) return null;

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 px-4 py-2 rounded-lg",
      "bg-amber-500/10 border border-amber-500/30 text-amber-400",
      className
    )}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-sm">
          Live market data is paused. Showing cached data.
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMarketDataEnabled(true)}
        className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 shrink-0"
      >
        <Wifi className="h-4 w-4 mr-1" />
        Enable Live Data
      </Button>
    </div>
  );
}
