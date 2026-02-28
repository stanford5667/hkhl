import { useState, useEffect } from 'react';
import { X, Sparkles, FlaskConical, SlidersHorizontal, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Nudge {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  targetSelector: string;
}

const NUDGES: Nudge[] = [
  {
    id: 'search-nudge',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    title: 'Start here',
    description: 'Search any ticker to get instant AI analysis, financials, and more.',
    targetSelector: '[data-nudge="search"]',
  },
  {
    id: 'quant-nudge',
    icon: <FlaskConical className="h-3.5 w-3.5" />,
    title: 'No code required',
    description: 'Backtest strategies like RSI and Moving Average with real data.',
    targetSelector: '[data-nudge="quant"]',
  },
  {
    id: 'screener-nudge',
    icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
    title: 'Filter the market',
    description: 'Screen 10,000+ stocks by 18+ financial metrics instantly.',
    targetSelector: '[data-nudge="screener"]',
  },
];

const NUDGE_STORAGE_KEY = 'research-nudges-dismissed';

export function OnboardingNudges() {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(NUDGE_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [currentNudgeIndex, setCurrentNudgeIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  // Delay showing nudges
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const activeNudges = NUDGES.filter((n) => !dismissedIds.has(n.id));

  const dismiss = (id: string) => {
    const updated = new Set(dismissedIds);
    updated.add(id);
    setDismissedIds(updated);
    localStorage.setItem(NUDGE_STORAGE_KEY, JSON.stringify([...updated]));
    if (currentNudgeIndex >= activeNudges.length - 1) {
      setCurrentNudgeIndex(0);
    }
  };

  const dismissAll = () => {
    const allIds = new Set(NUDGES.map(n => n.id));
    setDismissedIds(allIds);
    localStorage.setItem(NUDGE_STORAGE_KEY, JSON.stringify([...allIds]));
  };

  if (!visible || activeNudges.length === 0) return null;

  const nudge = activeNudges[currentNudgeIndex % activeNudges.length];

  return (
    <AnimatePresence>
      <motion.div
        key={nudge.id}
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-16 sm:bottom-20 right-3 sm:right-4 z-40 max-w-[240px] sm:max-w-[260px]"
      >
        <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-xl shadow-black/15 p-3">
          <div className="flex items-start gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
              {nudge.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-foreground">{nudge.title}</h4>
                <button
                  onClick={() => dismiss(nudge.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{nudge.description}</p>
            </div>
          </div>

          {/* Progress + navigation */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40">
            <div className="flex items-center gap-1">
              {activeNudges.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === currentNudgeIndex % activeNudges.length
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={dismissAll}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip all
              </button>
              {activeNudges.length > 1 && (
                <button
                  onClick={() => setCurrentNudgeIndex((prev) => (prev + 1) % activeNudges.length)}
                  className="text-[10px] text-primary font-medium hover:text-primary/80 transition-colors"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
