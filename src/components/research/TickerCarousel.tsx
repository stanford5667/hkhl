import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InteractiveTickerCard } from './InteractiveTickerCard';
import { cn } from '@/lib/utils';

interface TickerItem {
  symbol: string;
  name: string;
  price?: number;
  changePercent?: number;
}

interface TickerCarouselProps {
  tickers: TickerItem[];
  onTickerClick: (symbol: string) => void;
}

export function TickerCarousel({ tickers, onTickerClick }: TickerCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollability();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScrollability);
      return () => ref.removeEventListener('scroll', checkScrollability);
    }
  }, [tickers]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative group">
      {/* Left Arrow */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => scroll('left')}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full",
          "bg-background/95 backdrop-blur border-border shadow-md",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          !canScrollLeft && "hidden"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tickers.map(({ symbol, name, price, changePercent }) => (
          <div key={symbol} className="flex-shrink-0 w-[160px] sm:w-[180px]">
            <InteractiveTickerCard
              symbol={symbol}
              name={name}
              price={price}
              changePercent={changePercent}
              onClick={() => onTickerClick(symbol)}
            />
          </div>
        ))}
      </div>

      {/* Right Arrow */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => scroll('right')}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full",
          "bg-background/95 backdrop-blur border-border shadow-md",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          !canScrollRight && "hidden"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}
