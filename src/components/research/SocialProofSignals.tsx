import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, Eye, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrendingTickers } from '@/hooks/useTrendingTickers';

interface Signal {
  id: string;
  icon: React.ReactNode;
  text: string;
  ticker?: string;
  accentClass: string;
}

export function SocialProofSignals() {
  const navigate = useNavigate();
  const { tickers } = useTrendingTickers(5);
  const [activeIndex, setActiveIndex] = useState(0);

  const generateSignals = useCallback((): Signal[] => {
    const signals: Signal[] = [];

    if (tickers.length > 0) {
      const top = tickers[0];
      const pct = top.changePercent ?? 0;
      signals.push({
        id: `trend-${top.symbol}`,
        icon: <TrendingUp className="h-3 w-3" />,
        text: `${top.symbol} trending ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% today`,
        ticker: top.symbol,
        accentClass: pct >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10',
      });
    }

    // Simulated engagement signals (would be real-time in production)
    const userCount = 800 + Math.floor(Math.random() * 400);
    signals.push({
      id: 'users-active',
      icon: <Users className="h-3 w-3" />,
      text: `${userCount.toLocaleString()} investors researching right now`,
      accentClass: 'text-primary bg-primary/10',
    });

    if (tickers.length > 1) {
      signals.push({
        id: `hot-${tickers[1]?.symbol}`,
        icon: <Flame className="h-3 w-3" />,
        text: `${tickers[1].symbol} is the most searched ticker this hour`,
        ticker: tickers[1].symbol,
        accentClass: 'text-chart-4 bg-chart-4/10',
      });
    }

    const viewCount = 2000 + Math.floor(Math.random() * 1500);
    signals.push({
      id: 'analyses',
      icon: <Eye className="h-3 w-3" />,
      text: `${viewCount.toLocaleString()} analyses generated today`,
      accentClass: 'text-primary bg-primary/10',
    });

    return signals;
  }, [tickers]);

  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    setSignals(generateSignals());
  }, [generateSignals]);

  useEffect(() => {
    if (signals.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % signals.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [signals.length]);

  if (signals.length === 0) return null;

  const current = signals[activeIndex];

  return (
    <div className="flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.button
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          onClick={() => current.ticker ? navigate(`/stock/${current.ticker}`) : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-colors",
            current.accentClass,
            current.ticker && "cursor-pointer hover:opacity-80"
          )}
        >
          {current.icon}
          {current.text}
        </motion.button>
      </AnimatePresence>
    </div>
  );
}
