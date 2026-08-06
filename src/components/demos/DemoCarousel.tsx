import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BacktestDemo } from './BacktestDemo';
import { ChatroomDemo } from './ChatroomDemo';
import { AcademyDemo } from './AcademyDemo';
import { useInViewOnce } from './useCountUp';

const AUTO_ADVANCE_MS = 5000;

/** Lazily mounts its child once scrolled near the viewport, reserving height meanwhile. */
function LazyDemo({ children, minHeight }: { children: ReactNode; minHeight: number }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>('300px');
  return (
    <div ref={ref} style={{ minHeight }} className="h-full">
      {inView ? (
        children
      ) : (
        <div
          className="h-full w-full animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40"
          style={{ minHeight }}
          aria-hidden
        />
      )}
    </div>
  );
}

const DEMOS = [
  { id: 'backtest', node: <BacktestDemo />, minHeight: 620 },
  {
    id: 'academy',
    node: (
      <div className="flex flex-col gap-2">
        <p className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white px-1">
          Learn the strategies
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground px-1">
          40+ hours of on-demand video lessons, time-tested strategies, real-world trade breakdowns, and portfolio frameworks from top hedge fund managers.
        </p>
        <AcademyDemo />
      </div>
    ),
    minHeight: 560,
  },
  {
    id: 'chatroom',
    node: (
      <div className="flex flex-col gap-2">
        <p className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white px-1">
          Proprietary investment ideas
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground px-1">
          Real-time trade setups, analyst research notes, and live market discussion — spanning stocks, options, commodities, FX, and more. From long-term allocations to short-term plays, we use a top-down approach to build diversified portfolios.
        </p>
        <ChatroomDemo />
      </div>
    ),
    minHeight: 560,
  },
];

export function DemoCarousel() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const center = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        Array.from(el.children).forEach((child, i) => {
          const c = child as HTMLElement;
          const childCenter = c.offsetLeft + c.offsetWidth / 2;
          const dist = Math.abs(childCenter - center);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });
        setActiveIndex(best);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const scrollTo = (i: number) => {
    const el = scrollerRef.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (!el || !child) return;
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: 'smooth' });
  };

  // Auto-advance through demos with a smooth progress bar.
  useEffect(() => {
    let start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (isPaused || userInteractedRef.current) {
        start = now - progress * AUTO_ADVANCE_MS;
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - start;
      const p = Math.min(elapsed / AUTO_ADVANCE_MS, 1);
      setProgress(p);
      if (p >= 1) {
        const next = (activeIndex + 1) % DEMOS.length;
        setActiveIndex(next);
        scrollTo(next);
        start = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeIndex, isPaused, progress]);

  const handleDotClick = (i: number) => {
    userInteractedRef.current = true;
    setActiveIndex(i);
    scrollTo(i);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* All viewports: vertical stack so each demo is fully visible */}
      <div
        ref={scrollerRef}
        className={cn(
          'flex flex-col gap-3 md:gap-4 md:overflow-visible md:pb-0'
        )}
      >
        {DEMOS.map((d, i) => (
          <div
            key={d.id}
            className={cn(
              'w-full flex-shrink-0 md:w-auto md:flex-shrink transition-all duration-500',
              i === activeIndex && 'md:ring-1 md:ring-cyan-400/30 md:rounded-2xl'
            )}
          >
            <div className="relative overflow-hidden rounded-2xl">
              {/* Progress bar across the top of the active card (desktop only) */}
              <div
                className={cn(
                  'hidden md:block absolute left-0 right-0 top-0 z-20 h-0.5 bg-cyan-400/80 transition-transform duration-100 ease-linear',
                  i === activeIndex ? 'opacity-100' : 'opacity-0'
                )}
                style={{ transform: `scaleX(${i === activeIndex ? progress : 0})`, transformOrigin: 'left' }}
              />
              <LazyDemo minHeight={d.minHeight}>{d.node}</LazyDemo>
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators (desktop only) */}
      <div className="mt-3 hidden items-center justify-center gap-2 md:flex">
        {DEMOS.map((d, i) => (
          <button
            key={d.id}
            type="button"
            aria-label={`Go to demo ${i + 1}`}
            onClick={() => handleDotClick(i)}
            className="flex h-11 w-6 items-center justify-center"
          >
            <span
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === activeIndex ? 'w-5 bg-cyan-400' : 'w-1.5 bg-slate-700'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

