import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Bookmark, Flame, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeStatsBarProps {
  likes: number;
  passes: number;
  saves: number;
  total: number;
  remaining: number;
}

export function SwipeStatsBar({ likes, passes, saves, total, remaining }: SwipeStatsBarProps) {
  const stats = [
    { icon: Heart, label: "Liked", value: likes, color: "text-emerald-400" },
    { icon: X, label: "Passed", value: passes, color: "text-rose-400" },
    { icon: Bookmark, label: "Saved", value: saves, color: "text-violet-400" },
  ];

  return (
    <motion.div
      className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-card/50 border border-border/40 backdrop-blur-md"
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <s.icon className={cn("h-3.5 w-3.5", s.color)} />
            <AnimatePresence mode="popLayout">
              <motion.span
                key={s.value}
                className="text-sm font-bold text-foreground tabular-nums"
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {s.value}
              </motion.span>
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Streak indicator */}
        {total > 0 && (
          <div className="flex items-center gap-1 text-amber-400">
            <Flame className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{total}</span>
          </div>
        )}

        <div className="h-3 w-px bg-border" />

        <span className="text-xs text-muted-foreground font-medium">
          {remaining} left
        </span>
      </div>
    </motion.div>
  );
}
