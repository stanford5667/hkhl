import { EnhancedTickerCard } from './EnhancedTickerCard';

interface TickerItem {
  symbol: string;
  name: string;
  price?: number;
  changePercent?: number;
  marketCap?: number;
}

interface TickerCarouselProps {
  tickers: TickerItem[];
  onTickerClick: (symbol: string) => void;
}

export function TickerCarousel({ tickers, onTickerClick }: TickerCarouselProps) {
  // Show max 8 tickers in a clean grid - 4 columns on large screens
  const displayTickers = tickers.slice(0, 8);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {displayTickers.map(({ symbol, name, price, changePercent, marketCap }) => (
        <EnhancedTickerCard
          key={symbol}
          symbol={symbol}
          name={name}
          price={price}
          changePercent={changePercent}
          marketCap={marketCap}
          onClick={() => onTickerClick(symbol)}
        />
      ))}
    </div>
  );
}
