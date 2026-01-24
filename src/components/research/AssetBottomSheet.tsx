import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, ExternalLink, BarChart3, Activity } from 'lucide-react';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription,
  DrawerFooter 
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBatchQuotes } from '@/hooks/useMarketDataQuery';
import { cn } from '@/lib/utils';

interface AssetBottomSheetProps {
  ticker: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetBottomSheet({ ticker, open, onOpenChange }: AssetBottomSheetProps) {
  const navigate = useNavigate();
  const { quotes, isLoading } = useBatchQuotes(ticker ? [ticker] : [], { enabled: !!ticker && open });
  
  const quote = ticker ? quotes.get(ticker) : null;
  const isPositive = (quote?.changePercent ?? 0) > 0;
  const isNegative = (quote?.changePercent ?? 0) < 0;

  const handleViewDetails = () => {
    if (ticker) {
      onOpenChange(false);
      navigate(`/stock/${ticker}`);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-slate-900/95 border-slate-800 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  {ticker}
                </DrawerTitle>
                <DrawerDescription className="text-sm text-muted-foreground">
                  {isLoading ? 'Loading...' : 'Market Overview'}
                </DrawerDescription>
              </div>
              {quote && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-base font-mono px-3 py-1',
                    isPositive && 'border-success text-success bg-success/10',
                    isNegative && 'border-destructive text-destructive bg-destructive/10',
                    !isPositive && !isNegative && 'border-border text-muted-foreground'
                  )}
                >
                  {isPositive && <TrendingUp className="h-4 w-4 mr-1" />}
                  {isNegative && <TrendingDown className="h-4 w-4 mr-1" />}
                  {!isPositive && !isNegative && <Minus className="h-4 w-4 mr-1" />}
                  {isPositive ? '+' : ''}
                  {quote.changePercent?.toFixed(2)}%
                </Badge>
              )}
            </div>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4">
            {/* Price Display */}
            {quote && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-foreground">
                    ${quote.price?.toFixed(2) ?? '—'}
                  </span>
                  <span
                    className={cn(
                      'text-lg font-mono',
                      isPositive && 'text-success',
                      isNegative && 'text-destructive',
                      !isPositive && !isNegative && 'text-muted-foreground'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    ${quote.change?.toFixed(2) ?? '0.00'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Current Price</p>
              </div>
            )}

            {/* Quick Stats Grid */}
            {quote && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <BarChart3 className="h-3 w-3" />
                    Volume
                  </div>
                  <p className="font-mono text-sm text-foreground">
                    {typeof quote.volume === 'number' ? (quote.volume / 1e6).toFixed(2) + 'M' : '—'}
                  </p>
                </div>
                <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Activity className="h-3 w-3" />
                    Day Range
                  </div>
                  <p className="font-mono text-sm text-foreground">
                    {quote.low?.toFixed(2) ?? '—'} - {quote.high?.toFixed(2) ?? '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DrawerFooter className="flex-row gap-3 pt-2 pb-6">
            <Button
              variant="outline"
              className="flex-1 min-h-[44px] border-slate-700 hover:border-slate-600"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              className="flex-1 min-h-[44px] bg-primary hover:bg-primary/90"
              onClick={handleViewDetails}
            >
              Full Analysis
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
