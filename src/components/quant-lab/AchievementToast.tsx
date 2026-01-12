/**
 * Achievement Toast Component
 * Shows a celebration when users unlock achievements
 */

import { motion } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AchievementToastProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    xp: number;
  };
}

export function AchievementToast({ achievement }: AchievementToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl shadow-xl"
    >
      {/* Trophy Icon */}
      <div className="relative">
        <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
          <span className="text-2xl">{achievement.icon}</span>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="absolute -top-1 -right-1 p-1 rounded-full bg-yellow-400"
        >
          <Star className="h-3 w-3 text-yellow-800 fill-yellow-800" />
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-amber-600 dark:text-amber-400">
            Achievement Unlocked!
          </span>
          <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
        </div>
        <p className="font-semibold">{achievement.name}</p>
        <p className="text-sm text-muted-foreground">{achievement.description}</p>
      </div>

      {/* XP Badge */}
      <div className="text-center">
        <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm">
          +{achievement.xp} XP
        </div>
      </div>
    </motion.div>
  );
}
