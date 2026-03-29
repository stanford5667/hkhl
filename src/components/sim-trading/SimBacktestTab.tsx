/**
 * Quick Backtest Tab for Sim Portfolio
 * 
 * Embeds the strategy backtester inside the sim portfolio detail view,
 * pre-populated with tickers the user currently holds.
 */

import { useState, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FlaskConical, Loader2 } from 'lucide-react';

const StrategyBacktester = lazy(() =>
  import('@/components/backtester/StrategyBacktester').then(m => ({ default: m.StrategyBacktester }))
);

interface SimBacktestTabProps {
  /** Tickers currently held in the sim portfolio */
  heldTickers: string[];
  /** Currently selected chart ticker */
  activeTicker: string;
  /** Portfolio name for context */
  portfolioName: string;
}

export function SimBacktestTab({ heldTickers, activeTicker, portfolioName }: SimBacktestTabProps) {
  const [selectedTicker, setSelectedTicker] = useState(activeTicker || heldTickers[0] || 'SPY');

  return (
    <div className="space-y-4">
      {/* Ticker selector from held positions */}
      {heldTickers.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Backtest on:</span>
          {heldTickers.map(ticker => (
            <Badge
              key={ticker}
              variant={ticker === selectedTicker ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTicker(ticker)}
            >
              {ticker}
            </Badge>
          ))}
          {!heldTickers.includes(selectedTicker) && selectedTicker !== 'SPY' && (
            <Badge variant="default">{selectedTicker}</Badge>
          )}
        </div>
      )}

      {heldTickers.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <FlaskConical className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">
              Open positions in your portfolio to quickly backtest strategies on those tickers
            </p>
          </CardContent>
        </Card>
      )}

      {/* Embedded backtester */}
      <Suspense fallback={
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading strategy backtester...</p>
          </CardContent>
        </Card>
      }>
        <StrategyBacktester
          ticker={selectedTicker}
          companyName={selectedTicker}
        />
      </Suspense>
    </div>
  );
}
