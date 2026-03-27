import { useState } from 'react';
import { IntegratedStockChart } from '@/components/research/IntegratedStockChart';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search } from 'lucide-react';
import type { SimTrade } from './SimPortfolioDetail';

interface Props {
  defaultTicker?: string;
  trades: SimTrade[];
  onTickerChange?: (ticker: string) => void;
}

export function SimChartSection({ defaultTicker = 'SPY', trades, onTickerChange }: Props) {
  const [chartTicker, setChartTicker] = useState(defaultTicker);
  const [inputValue, setInputValue] = useState(defaultTicker);

  const handleSearch = () => {
    const symbol = inputValue.trim().toUpperCase();
    if (symbol) {
      setChartTicker(symbol);
      onTickerChange?.(symbol);
    }
  };

  // Filter trades for the current ticker to show as markers
  const tickerTrades = trades.filter(t => t.ticker.toUpperCase() === chartTicker.toUpperCase());

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Enter ticker..."
          className="h-8 text-sm border-0 bg-transparent focus-visible:ring-0 p-0"
        />
        <Button variant="ghost" size="sm" onClick={handleSearch} className="h-8 px-3 text-xs">
          Go
        </Button>
        {chartTicker !== inputValue.trim().toUpperCase() && inputValue.trim() && (
          <span className="text-xs text-muted-foreground">Press Enter</span>
        )}
      </div>

      {/* Trade markers legend */}
      {tickerTrades.length > 0 && (
        <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border bg-muted/30 text-xs text-muted-foreground">
          <span>{tickerTrades.length} trade{tickerTrades.length > 1 ? 's' : ''} on {chartTicker}</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success inline-block" /> Buy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive inline-block" /> Sell
          </span>
        </div>
      )}

      <IntegratedStockChart
        symbol={chartTicker}
        height={360}
        showVolume={true}
        defaultRange="3M"
        hideRangeSelector={false}
      />
    </Card>
  );
}
