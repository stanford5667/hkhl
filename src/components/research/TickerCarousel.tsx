import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhancedTickerCard } from './EnhancedTickerCard';
import { cn } from '@/lib/utils';

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
      window.addEventListener('resize', checkScrollability);
      return () => {
        ref.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [tickers]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280;
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
          "absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full",
          "bg-background/95 backdrop-blur border-border shadow-lg",
          "opacity-0 group-hover:opacity-100 transition-all duration-200",
          "hover:bg-primary hover:text-primary-foreground hover:border-primary",
          !canScrollLeft && "hidden"
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
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

      {/* Right Arrow */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => scroll('right')}
        className={cn(
          "absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full",
          "bg-background/95 backdrop-blur border-border shadow-lg",
          "opacity-0 group-hover:opacity-100 transition-all duration-200",
          "hover:bg-primary hover:text-primary-foreground hover:border-primary",
          !canScrollRight && "hidden"
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}
