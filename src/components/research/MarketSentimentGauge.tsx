import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface SentimentData {
  score: number; // 0-100 (0 = extreme fear, 100 = extreme greed)
  label: string;
  description: string;
  color: string;
  icon: typeof Activity;
}

const getSentimentData = (score: number): SentimentData => {
  if (score <= 20) return { score, label: 'Extreme Fear', description: 'Investors are very worried', color: 'text-red-500', icon: AlertTriangle };
  if (score <= 40) return { score, label: 'Fear', description: 'Markets are cautious', color: 'text-orange-500', icon: TrendingDown };
  if (score <= 60) return { score, label: 'Neutral', description: 'Balanced sentiment', color: 'text-yellow-500', icon: Activity };
  if (score <= 80) return { score, label: 'Greed', description: 'Optimism is rising', color: 'text-emerald-400', icon: TrendingUp };
  return { score, label: 'Extreme Greed', description: 'Markets are euphoric', color: 'text-emerald-500', icon: Zap };
};

export function MarketSentimentGauge() {
  const [sentimentScore, setSentimentScore] = useState<number>(50);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Calculate sentiment from ai_insights table
    const fetchSentiment = async () => {
      try {
        const { data } = await supabase
          .from('ai_insights')
          .select('sentiment, impact_score')
          .order('created_at', { ascending: false })
          .limit(50);

        if (data && data.length > 0) {
          // Convert sentiments to numeric scores
          const scores = data.map(d => {
            if (d.sentiment === 'bullish') return 70 + (d.impact_score || 0);
            if (d.sentiment === 'bearish') return 30 - (d.impact_score || 0);
            return 50;
          });
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          setSentimentScore(Math.max(0, Math.min(100, avg)));
        } else {
          // Fallback: simulate based on market hours
          const hour = new Date().getHours();
          setSentimentScore(45 + Math.sin(hour) * 15 + Math.random() * 10);
        }
      } catch {
        setSentimentScore(52);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSentiment();
  }, []);

  const sentiment = useMemo(() => getSentimentData(sentimentScore), [sentimentScore]);
  const rotation = -90 + (sentimentScore / 100) * 180; // -90 to 90 degrees

  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-card/60 backdrop-blur-sm rounded-xl border border-border/40 overflow-hidden">
      {/* Animated background glow */}
      <motion.div
        className={cn(
          "absolute inset-0 opacity-10 blur-2xl",
          sentimentScore > 60 ? "bg-emerald-500" : sentimentScore < 40 ? "bg-red-500" : "bg-yellow-500"
        )}
        animate={{ opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative z-10">
        {/* Gauge SVG */}
        <div className="relative w-32 h-20 mb-2">
          <svg viewBox="0 0 100 60" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/30"
              strokeLinecap="round"
            />
            {/* Gradient arc */}
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="25%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="75%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="126"
              strokeDashoffset={isLoading ? 126 : 126 - (sentimentScore / 100) * 126}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
            {/* Needle */}
            <motion.g
              style={{ transformOrigin: '50px 50px' }}
              animate={{ rotate: isLoading ? -90 : rotation }}
              transition={{ type: 'spring', stiffness: 60, damping: 15 }}
            >
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="18"
                stroke="currentColor"
                strokeWidth="2"
                className="text-foreground"
                strokeLinecap="round"
              />
              <circle cx="50" cy="50" r="4" fill="currentColor" className="text-foreground" />
            </motion.g>
          </svg>
        </div>

        {/* Score and Label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={sentiment.label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <sentiment.icon className={cn("h-4 w-4", sentiment.color)} />
              <span className={cn("text-lg font-bold", sentiment.color)}>
                {Math.round(sentimentScore)}
              </span>
            </div>
            <p className={cn("text-xs font-semibold", sentiment.color)}>{sentiment.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sentiment.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Label */}
      <div className="absolute top-2 left-2">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">
          Market Sentiment
        </span>
      </div>
    </div>
  );
}
