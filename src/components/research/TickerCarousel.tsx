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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {tickers.map(({ symbol, name, price, changePercent, marketCap }) => (
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
