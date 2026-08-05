import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BacktestDemo } from './BacktestDemo';
import { ScreenerDemo } from './ScreenerDemo';
import { ThemesDemo } from './ThemesDemo';
import { AcademyDemo } from './AcademyDemo';
import { useInViewOnce } from './useCountUp';

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
  { id: 'backtest', node: <BacktestDemo />, minHeight: 460 },
  { id: 'screener', node: <ScreenerDemo />, minHeight: 380 },
  { id: 'themes', node: <ThemesDemo />, minHeight: 380 },
  { id: 'academy', node: <AcademyDemo />, minHeight: 320 },
];

export function DemoCarousel() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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

  return (
    <div>
      {/* Mobile: scroll-snap carousel · md+: 2x2 grid */}
      <div
        ref={scrollerRef}
        className={cn(
          'flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          'md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0'
        )}
      >
        {DEMOS.map((d) => (
          <div
            key={d.id}
            className="w-[85%] flex-shrink-0 snap-center md:w-auto md:flex-shrink"
          >
            <LazyDemo minHeight={d.minHeight}>{d.node}</LazyDemo>
          </div>
        ))}
      </div>

      {/* Dot indicators (mobile only) */}
      <div className="mt-3 flex items-center justify-center gap-2 md:hidden">
        {DEMOS.map((d, i) => (
          <button
            key={d.id}
            type="button"
            aria-label={`Go to demo ${i + 1}`}
            onClick={() => scrollTo(i)}
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
