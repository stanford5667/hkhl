import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowRight, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrendingTickers } from '@/hooks/useTrendingTickers';

export function StickyEngagementBar() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const { tickers } = useTrendingTickers(3);

  // Show after scrolling past hero section
  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (dismissed || !visible) return null;

  const topMover = tickers[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      >
        <div className="max-w-3xl mx-auto px-3 pb-3 pointer-events-auto">
          <div className="relative flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/20">
            {/* Left: Live pulse + top mover */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="text-[10px] font-medium text-success uppercase tracking-wide">Live</span>
              </div>
              {topMover && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono font-semibold text-foreground">{topMover.symbol}</span>
                  <span className={cn(
                    "flex items-center text-[11px] font-medium",
                    (topMover.changePercent ?? 0) >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {(topMover.changePercent ?? 0) >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {(topMover.changePercent ?? 0) >= 0 ? '+' : ''}{(topMover.changePercent ?? 0).toFixed(2)}%
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline truncate">{topMover.name}</span>
                </div>
              )}
            </div>

            {/* Right: CTA */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => topMover ? navigate(`/stock/${topMover.symbol}`) : navigate('/research')}
              >
                <Zap className="h-3 w-3" />
                Explore
                <ArrowRight className="h-3 w-3" />
              </Button>
              <button
                onClick={() => setDismissed(true)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
