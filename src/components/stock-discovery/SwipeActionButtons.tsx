import React from "react";
import { motion } from "framer-motion";
import { X, Heart, Bookmark, RotateCcw, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SwipeDirection } from "@/hooks/useStockDiscoveryFeed";

interface SwipeActionButtonsProps {
  onAction: (direction: SwipeDirection) => void;
  onUndo: () => void;
  onViewDetails: () => void;
  canUndo: boolean;
  disabled?: boolean;
}

interface ActionButton {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  size: "sm" | "lg";
  color: string;
  disabled?: boolean;
}

export function SwipeActionButtons({
  onAction,
  onUndo,
  onViewDetails,
  canUndo,
  disabled = false,
}: SwipeActionButtonsProps) {
  const buttons: ActionButton[] = [
    {
      icon: RotateCcw,
      label: "Undo",
      onClick: onUndo,
      size: "sm",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20",
      disabled: !canUndo,
    },
    {
      icon: X,
      label: "Pass",
      onClick: () => onAction("left"),
      size: "lg",
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20",
    },
    {
      icon: Bookmark,
      label: "Save",
      onClick: () => onAction("up"),
      size: "sm",
      color: "text-violet-400 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20",
    },
    {
      icon: Heart,
      label: "Like",
      onClick: () => onAction("right"),
      size: "lg",
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20",
    },
    {
      icon: BarChart3,
      label: "Research",
      onClick: onViewDetails,
      size: "sm",
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20",
    },
  ];

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      {buttons.map((btn, i) => {
        const Icon = btn.icon;
        const isLarge = btn.size === "lg";
        const isDisabled = disabled || btn.disabled;

        return (
          <motion.button
            key={btn.label}
            className={cn(
              "rounded-full border backdrop-blur-sm flex items-center justify-center transition-all duration-200",
              isLarge ? "h-16 w-16 sm:h-18 sm:w-18" : "h-12 w-12 sm:h-14 sm:w-14",
              btn.color,
              isDisabled && "opacity-30 cursor-not-allowed"
            )}
            whileHover={!isDisabled ? { scale: 1.12 } : {}}
            whileTap={!isDisabled ? { scale: 0.9 } : {}}
            onClick={() => !isDisabled && btn.onClick()}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 20 }}
            title={btn.label}
          >
            <Icon className={cn(isLarge ? "h-7 w-7" : "h-5 w-5")} />
          </motion.button>
        );
      })}
    </div>
  );
}
