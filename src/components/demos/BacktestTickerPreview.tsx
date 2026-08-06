import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Building2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TickerSpotlight {
  symbol: string;
  name: string;
  description: string;
}

const TICKERS: TickerSpotlight[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    description: 'Designs and manufactures the iPhone, Mac, and services that power the world’s most valuable ecosystem.',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    description: 'Builds the cloud infrastructure, software, and AI tools that run modern businesses and developer workflows.',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    description: 'Makes the chips and software behind the AI boom, gaming graphics, and high-performance computing.',
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF',
    description: 'Tracks the S&P 500 — the simplest way to own a slice of the 500 largest U.S. companies in one trade.',
  },
];

export function BacktestTickerPreview() {
  const [index, setIndex] = useState(0);
  const current = TICKERS[index];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % TICKERS.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Company spotlight
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.symbol}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
              {current.symbol}
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground leading-tight">
                {current.name}
              </span>
              <span className="text-sm font-mono text-primary">{current.symbol}</span>
            </div>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {current.description}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {TICKERS.map((t, i) => (
            <button
              key={t.symbol}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${t.symbol}`}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === index ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
            />
          ))}
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
          Research any ticker <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
