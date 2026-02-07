import { useRef } from 'react';
import { EnhancedTickerCard } from './EnhancedTickerCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = isMobile ? 180 : 280; // Smaller scroll on mobile
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  return (
    <div className="relative group">
      {/* Left Arrow - Hidden on mobile (use swipe) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* Scrollable Container */}
      <div 
        ref={scrollRef}
        className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-1 py-1 -mx-1 snap-x snap-mandatory md:snap-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tickers.map(({ symbol, name, price, changePercent, marketCap }) => (
          <div key={symbol} className="shrink-0 w-[160px] sm:w-[200px] md:w-[260px] snap-start">
            <EnhancedTickerCard
              symbol={symbol}
              name={name}
              price={price}
              changePercent={changePercent}
              marketCap={marketCap}
              onClick={() => onTickerClick(symbol)}
              compact={isMobile}
            />
          </div>
        ))}
      </div>
      
      {/* Right Arrow - Hidden on mobile */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
