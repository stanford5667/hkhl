import React, { useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  X,
  Bookmark,
  BarChart3,
  Zap,
  Activity,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StockCard, SwipeDirection } from "@/hooks/useStockDiscoveryFeed";

interface StockSwipeCardProps {
  card: StockCard;
  isTop: boolean;
  onSwipe: (ticker: string, direction: SwipeDirection) => void;
  onTap?: (ticker: string) => void;
}

const SWIPE_THRESHOLD = 120;
const SWIPE_UP_THRESHOLD = 80;

// Sector -> gradient + emoji mapping
const SECTOR_STYLES: Record<
  string,
  { gradient: string; emoji: string; accent: string }
> = {
  Technology: {
    gradient: "from-blue-600 via-indigo-700 to-violet-900",
    emoji: "💻",
    accent: "text-blue-400",
  },
  Healthcare: {
    gradient: "from-emerald-600 via-teal-700 to-cyan-900",
    emoji: "🧬",
    accent: "text-emerald-400",
  },
  "Financial Services": {
    gradient: "from-amber-600 via-yellow-700 to-orange-900",
    emoji: "🏦",
    accent: "text-amber-400",
  },
  "Consumer Cyclical": {
    gradient: "from-pink-600 via-rose-700 to-red-900",
    emoji: "🛍️",
    accent: "text-pink-400",
  },
  "Consumer Defensive": {
    gradient: "from-lime-600 via-green-700 to-emerald-900",
    emoji: "🛒",
    accent: "text-lime-400",
  },
  Energy: {
    gradient: "from-orange-600 via-red-700 to-rose-900",
    emoji: "⚡",
    accent: "text-orange-400",
  },
  Industrials: {
    gradient: "from-slate-500 via-zinc-700 to-neutral-900",
    emoji: "🏭",
    accent: "text-slate-400",
  },
  "Communication Services": {
    gradient: "from-purple-600 via-fuchsia-700 to-pink-900",
    emoji: "📡",
    accent: "text-purple-400",
  },
  "Real Estate": {
    gradient: "from-cyan-600 via-sky-700 to-blue-900",
    emoji: "🏢",
    accent: "text-cyan-400",
  },
  Utilities: {
    gradient: "from-yellow-600 via-amber-700 to-orange-900",
    emoji: "💡",
    accent: "text-yellow-400",
  },
  "Basic Materials": {
    gradient: "from-stone-500 via-amber-800 to-yellow-900",
    emoji: "⛏️",
    accent: "text-stone-400",
  },
};

const DEFAULT_STYLE = {
  gradient: "from-gray-600 via-gray-700 to-gray-900",
  emoji: "📊",
  accent: "text-gray-400",
};

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  mega: { label: "MEGA CAP", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  large: { label: "LARGE CAP", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  mid: { label: "MID CAP", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  small: { label: "SMALL CAP", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  micro: { label: "MICRO CAP", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
};

const SIGNAL_CONFIG = {
  bullish: { icon: TrendingUp, label: "Bullish", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  bearish: { icon: TrendingDown, label: "Bearish", color: "text-rose-400", bg: "bg-rose-500/20" },
  neutral: { icon: Minus, label: "Neutral", color: "text-zinc-400", bg: "bg-zinc-500/20" },
};

export function StockSwipeCard({ card, isTop, onSwipe, onTap }: StockSwipeCardProps) {
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Visual feedback transforms
  const rotateZ = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [0, 60, 150], [0, 0.5, 1]);
  const nopeOpacity = useTransform(x, [-150, -60, 0], [1, 0.5, 0]);
  const saveOpacity = useTransform(y, [-120, -40, 0], [1, 0.5, 0]);
  const scale = useTransform(
    x,
    [-300, -100, 0, 100, 300],
    [0.92, 0.98, 1, 0.98, 0.92]
  );

  const style = SECTOR_STYLES[card.sector] || DEFAULT_STYLE;
  const tier = TIER_LABELS[card.market_cap_tier] || TIER_LABELS.large;
  const signal = SIGNAL_CONFIG[card.signal || "neutral"];
  const SignalIcon = signal.icon;

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;

    // Check swipe up first
    if (offset.y < -SWIPE_UP_THRESHOLD && Math.abs(offset.x) < 100) {
      setExitDirection("up");
      onSwipe(card.ticker, "up");
      return;
    }

    // Right swipe = like
    if (offset.x > SWIPE_THRESHOLD || velocity.x > 500) {
      setExitDirection("right");
      onSwipe(card.ticker, "right");
      return;
    }

    // Left swipe = pass
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -500) {
      setExitDirection("left");
      onSwipe(card.ticker, "left");
      return;
    }
  };

  const exitVariants: Record<SwipeDirection, any> = {
    left: { x: -600, opacity: 0, rotate: -30, transition: { duration: 0.4 } },
    right: { x: 600, opacity: 0, rotate: 30, transition: { duration: 0.4 } },
    up: { y: -600, opacity: 0, scale: 0.8, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      className={cn(
        "absolute inset-0 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing",
        "shadow-2xl shadow-black/40",
        !isTop && "pointer-events-none"
      )}
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : 0,
        rotateZ: isTop ? rotateZ : 0,
        scale: isTop ? scale : 0.95,
        zIndex: isTop ? 10 : 5,
      }}
      drag={isTop}
      dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={isTop ? handleDragEnd : undefined}
      animate={exitDirection ? exitVariants[exitDirection] : {}}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.6 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={() => !exitDirection && onTap?.(card.ticker)}
    >
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br",
          style.gradient
        )}
      />

      {/* Noise overlay texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Swipe feedback overlays */}
      {isTop && (
        <>
          {/* LIKE overlay */}
          <motion.div
            className="absolute inset-0 bg-emerald-500/20 z-20 flex items-center justify-center pointer-events-none"
            style={{ opacity: likeOpacity }}
          >
            <div className="border-4 border-emerald-400 rounded-2xl px-8 py-4 rotate-[-12deg]">
              <span className="text-emerald-400 text-5xl font-black tracking-wider">
                LIKE
              </span>
            </div>
          </motion.div>

          {/* NOPE overlay */}
          <motion.div
            className="absolute inset-0 bg-rose-500/20 z-20 flex items-center justify-center pointer-events-none"
            style={{ opacity: nopeOpacity }}
          >
            <div className="border-4 border-rose-400 rounded-2xl px-8 py-4 rotate-[12deg]">
              <span className="text-rose-400 text-5xl font-black tracking-wider">
                NOPE
              </span>
            </div>
          </motion.div>

          {/* SAVE overlay */}
          <motion.div
            className="absolute inset-0 bg-violet-500/20 z-20 flex items-center justify-center pointer-events-none"
            style={{ opacity: saveOpacity }}
          >
            <div className="border-4 border-violet-400 rounded-2xl px-8 py-4">
              <span className="text-violet-400 text-4xl font-black tracking-wider flex items-center gap-2">
                <Bookmark className="h-10 w-10" /> SAVE
              </span>
            </div>
          </motion.div>
        </>
      )}

      {/* Card Content */}
      <div className="relative z-10 h-full flex flex-col p-6 sm:p-8 text-white">
        {/* Top section: Ticker + Signal */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-4xl sm:text-5xl font-black tracking-tight">
                {card.ticker}
              </span>
              <div className={cn("p-1.5 rounded-xl", signal.bg)}>
                <SignalIcon className={cn("h-5 w-5", signal.color)} />
              </div>
            </div>
            <p className="text-white/70 text-sm sm:text-base font-medium truncate max-w-[240px]">
              {card.name}
            </p>
          </div>

          <span className="text-4xl">{style.emoji}</span>
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge
            variant="outline"
            className={cn("text-[10px] font-bold uppercase tracking-widest border", tier.color)}
          >
            {tier.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-semibold text-white/60 border-white/20 uppercase tracking-wider">
            {card.industry}
          </Badge>
        </div>

        {/* Middle: Description */}
        <div className="flex-1 flex flex-col justify-center mt-6">
          <p className="text-white/80 text-base sm:text-lg leading-relaxed line-clamp-4">
            {card.description}
          </p>

          {/* Sector pill */}
          <div className="flex items-center gap-2 mt-4">
            <div className="h-2 w-2 rounded-full bg-white/40" />
            <span className="text-white/50 text-xs font-medium uppercase tracking-wider">
              {card.sector}
            </span>
          </div>
        </div>

        {/* Bottom: Quick metrics */}
        <div className="mt-auto space-y-4">
          {/* Momentum bar */}
          {card.momentum_score != null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 font-medium flex items-center gap-1">
                  <Activity className="h-3 w-3" /> Momentum
                </span>
                <span className="text-white/80 font-bold">
                  {card.momentum_score}/100
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    card.momentum_score > 60
                      ? "bg-emerald-400"
                      : card.momentum_score > 40
                      ? "bg-yellow-400"
                      : "bg-rose-400"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${card.momentum_score}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Tags cloud */}
          {card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 text-[10px] font-medium"
                >
                  #{tag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}

          {/* Swipe hints */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-rose-400/70">
              <X className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Pass
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-violet-400/70">
              <ChevronUp className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Details
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400/70">
              <Heart className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Like
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
