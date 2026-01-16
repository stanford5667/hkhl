/**
 * Learning Context for Quant Lab
 * Tracks user progress, completed lessons, and achievements
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface LearningProgress {
  studiesCompleted: string[];
  conceptsLearned: string[];
  achievementsUnlocked: string[];
  totalStudiesRun: number;
  currentStreak: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  xp: number;
  tutorialCompleted: boolean;
  tutorialStep: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  xp: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_study', name: 'First Analysis', description: 'Run your first quantitative study', icon: '🎯', requirement: 'Run 1 quant study', xp: 50 },
  { id: 'template_user', name: 'Template Master', description: 'Use a pre-built analysis template', icon: '📋', requirement: 'Use a template', xp: 25 },
  { id: 'five_studies', name: 'Getting Serious', description: 'Run 5 different studies', icon: '📊', requirement: 'Run 5 unique studies', xp: 100 },
  { id: 'full_analysis', name: 'Deep Diver', description: 'Run the Complete Analysis template', icon: '🔬', requirement: 'Run complete analysis', xp: 150 },
  { id: 'trend_spotter', name: 'Trend Spotter', description: 'Master trend analysis studies', icon: '📈', requirement: 'Complete all trend studies', xp: 100 },
  { id: 'risk_aware', name: 'Risk Aware', description: 'Complete volatility and risk studies', icon: '⚠️', requirement: 'Complete risk studies', xp: 100 },
  { id: 'concept_learner', name: 'Knowledge Seeker', description: 'Learn 5 new concepts', icon: '💡', requirement: 'Click 5 learn buttons', xp: 75 },
  { id: 'ten_stocks', name: 'Stock Explorer', description: 'Analyze 10 different stocks', icon: '🌍', requirement: 'Analyze 10 tickers', xp: 200 },
  { id: 'parameter_tweaker', name: 'Fine Tuner', description: 'Customize study parameters', icon: '🔧', requirement: 'Adjust parameters', xp: 50 },
  { id: 'saver', name: 'Library Builder', description: 'Save your first study result', icon: '💾', requirement: 'Save a result', xp: 50 },
];

export const LEVEL_THRESHOLDS = {
  beginner: 0,
  intermediate: 300,
  advanced: 800,
};

interface LearningContextType {
  progress: LearningProgress;
  learningMode: boolean;
  setLearningMode: (mode: boolean) => void;
  markStudyCompleted: (studyId: string) => void;
  markConceptLearned: (conceptId: string) => void;
  unlockAchievement: (achievementId: string) => void;
  completeTutorialStep: () => void;
  skipTutorial: () => void;
  resetProgress: () => void;
  addXp: (amount: number) => void;
  getUnlockedAchievements: () => Achievement[];
  checkAndUnlockAchievements: (context: { studyId?: string; templateId?: string; tickerCount?: number; savedResult?: boolean; adjustedParams?: boolean }) => void;
}

const defaultProgress: LearningProgress = {
  studiesCompleted: [],
  conceptsLearned: [],
  achievementsUnlocked: [],
  totalStudiesRun: 0,
  currentStreak: 0,
  level: 'beginner',
  xp: 0,
  tutorialCompleted: false,
  tutorialStep: 0,
};

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<LearningProgress>(() => {
    const saved = localStorage.getItem('quantlab_progress');
    return saved ? JSON.parse(saved) : defaultProgress;
  });
  const [learningMode, setLearningMode] = useState(true);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('quantlab_progress', JSON.stringify(progress));
  }, [progress]);

  const addXp = useCallback((amount: number) => {
    setProgress(prev => {
      const newXp = prev.xp + amount;
      let newLevel = prev.level;
      if (newXp >= LEVEL_THRESHOLDS.advanced) newLevel = 'advanced';
      else if (newXp >= LEVEL_THRESHOLDS.intermediate) newLevel = 'intermediate';
      return { ...prev, xp: newXp, level: newLevel };
    });
  }, []);

  const markStudyCompleted = useCallback((studyId: string) => {
    setProgress(prev => {
      const alreadyDone = prev.studiesCompleted.includes(studyId);
      return {
        ...prev,
        studiesCompleted: alreadyDone ? prev.studiesCompleted : [...prev.studiesCompleted, studyId],
        totalStudiesRun: prev.totalStudiesRun + 1,
      };
    });
  }, []);

  const markConceptLearned = useCallback((conceptId: string) => {
    setProgress(prev => {
      if (prev.conceptsLearned.includes(conceptId)) return prev;
      return {
        ...prev,
        conceptsLearned: [...prev.conceptsLearned, conceptId],
      };
    });
  }, []);

  const unlockAchievement = useCallback((achievementId: string) => {
    setProgress(prev => {
      if (prev.achievementsUnlocked.includes(achievementId)) return prev;
      const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
      return {
        ...prev,
        achievementsUnlocked: [...prev.achievementsUnlocked, achievementId],
        xp: prev.xp + (achievement?.xp || 0),
      };
    });
  }, []);

  const completeTutorialStep = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      tutorialStep: prev.tutorialStep + 1,
      tutorialCompleted: prev.tutorialStep >= 3,
    }));
  }, []);

  const skipTutorial = useCallback(() => {
    setProgress(prev => ({ ...prev, tutorialCompleted: true }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(defaultProgress);
    localStorage.removeItem('quantlab_progress');
  }, []);

  const getUnlockedAchievements = useCallback(() => {
    return ACHIEVEMENTS.filter(a => progress.achievementsUnlocked.includes(a.id));
  }, [progress.achievementsUnlocked]);

  const checkAndUnlockAchievements = useCallback((context: { studyId?: string; templateId?: string; tickerCount?: number; savedResult?: boolean; adjustedParams?: boolean }) => {
    const { studyId, templateId, tickerCount, savedResult, adjustedParams } = context;
    
    // First study
    if (studyId && progress.totalStudiesRun === 0) {
      unlockAchievement('first_study');
    }
    
    // Template used
    if (templateId) {
      unlockAchievement('template_user');
      if (templateId === 'full-analysis') {
        unlockAchievement('full_analysis');
      }
    }
    
    // 5 unique studies
    if (progress.studiesCompleted.length >= 4 && studyId && !progress.studiesCompleted.includes(studyId)) {
      unlockAchievement('five_studies');
    }
    
    // 10 stocks
    if (tickerCount && tickerCount >= 10) {
      unlockAchievement('ten_stocks');
    }
    
    // Saved result
    if (savedResult) {
      unlockAchievement('saver');
    }
    
    // Adjusted params
    if (adjustedParams) {
      unlockAchievement('parameter_tweaker');
    }
    
    // Concept learner
    if (progress.conceptsLearned.length >= 5) {
      unlockAchievement('concept_learner');
    }
  }, [progress, unlockAchievement]);

  return (
    <LearningContext.Provider value={{
      progress,
      learningMode,
      setLearningMode,
      markStudyCompleted,
      markConceptLearned,
      unlockAchievement,
      completeTutorialStep,
      skipTutorial,
      resetProgress,
      addXp,
      getUnlockedAchievements,
      checkAndUnlockAchievements,
    }}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error('useLearning must be used within a LearningProvider');
  }
  return context;
}
