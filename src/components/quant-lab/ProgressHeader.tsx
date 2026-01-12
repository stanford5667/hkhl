/**
 * Progress Header for Quant Lab
 * Shows user's learning progress, XP, level, and achievements
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Star, Sparkles, ChevronDown, ChevronUp, 
  GraduationCap, Target, Zap, Medal, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useLearning, ACHIEVEMENTS, LEVEL_THRESHOLDS } from './LearningContext';

export function ProgressHeader() {
  const [expanded, setExpanded] = useState(false);
  const { progress, getUnlockedAchievements, learningMode, setLearningMode } = useLearning();
  
  const unlockedAchievements = getUnlockedAchievements();
  const nextLevelXp = progress.level === 'beginner' 
    ? LEVEL_THRESHOLDS.intermediate 
    : progress.level === 'intermediate' 
      ? LEVEL_THRESHOLDS.advanced 
      : 1000;
  const currentLevelStart = LEVEL_THRESHOLDS[progress.level];
  const progressToNextLevel = ((progress.xp - currentLevelStart) / (nextLevelXp - currentLevelStart)) * 100;

  const levelConfig = {
    beginner: { label: 'Beginner', color: 'bg-blue-500', icon: BookOpen },
    intermediate: { label: 'Intermediate', color: 'bg-purple-500', icon: GraduationCap },
    advanced: { label: 'Advanced', color: 'bg-amber-500', icon: Trophy },
  };

  const currentLevel = levelConfig[progress.level];

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-4 p-3 bg-gradient-to-r from-purple-500/5 via-primary/5 to-blue-500/5 rounded-lg border border-primary/10">
        <div className="flex items-center gap-4">
          {/* Level Badge */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium",
            currentLevel.color
          )}>
            <currentLevel.icon className="h-4 w-4" />
            {currentLevel.label}
          </div>

          {/* XP Progress */}
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="font-bold text-amber-600 dark:text-amber-400">{progress.xp} XP</span>
            {progress.level !== 'advanced' && (
              <>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progressToNextLevel, 100)}%` }}
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {nextLevelXp - progress.xp} to next level
                </span>
              </>
            )}
          </div>

          {/* Achievements Count */}
          <div className="flex items-center gap-1.5 text-sm">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="font-medium">{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span>
          </div>

          {/* Studies Completed */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>{progress.studiesCompleted.length} studies mastered</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Learning Mode Toggle */}
          <Button
            variant={learningMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLearningMode(!learningMode)}
            className={cn(
              "gap-1.5",
              learningMode && "bg-gradient-to-r from-purple-500 to-primary"
            )}
          >
            <GraduationCap className="h-4 w-4" />
            Learning Mode {learningMode ? 'ON' : 'OFF'}
          </Button>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      {/* Expanded View */}
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 p-4 bg-card rounded-lg border"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Achievements */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Trophy className="h-5 w-5 text-amber-500" />
                Achievements
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {ACHIEVEMENTS.slice(0, 6).map((achievement) => {
                  const isUnlocked = progress.achievementsUnlocked.includes(achievement.id);
                  return (
                    <div
                      key={achievement.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        isUnlocked 
                          ? "bg-amber-500/10 border-amber-500/30" 
                          : "bg-muted/30 border-border opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("text-lg", !isUnlocked && "grayscale")}>
                          {achievement.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            isUnlocked && "text-amber-600 dark:text-amber-400"
                          )}>
                            {achievement.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {isUnlocked ? `+${achievement.xp} XP` : achievement.requirement}
                          </p>
                        </div>
                        {isUnlocked && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Learning Stats */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-primary" />
                Your Progress
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Level Progress</span>
                    <span className="text-muted-foreground">
                      {progress.xp}/{nextLevelXp} XP
                    </span>
                  </div>
                  <Progress value={progressToNextLevel} className="h-3" />
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{progress.totalStudiesRun}</p>
                    <p className="text-xs text-muted-foreground">Studies Run</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-500">{progress.conceptsLearned.length}</p>
                    <p className="text-xs text-muted-foreground">Concepts Learned</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-500">{unlockedAchievements.length}</p>
                    <p className="text-xs text-muted-foreground">Achievements</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}
