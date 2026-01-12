/**
 * Tutorial Overlay for Quant Lab
 * Guided walkthrough for first-time users
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronLeft, X, FlaskConical, 
  Search, BarChart3, Play, Trophy, Sparkles,
  Target, Lightbulb, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useLearning } from './LearningContext';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Quant Lab! 🎉',
    subtitle: 'Professional stock analysis made simple',
    content: 'You\'re about to learn how Wall Street analysts study stocks - but without the complicated math or expensive software. Let\'s take a quick tour!',
    icon: FlaskConical,
    highlight: null,
    tips: [
      'No coding required - just clicks and sliders',
      'Real data from actual stock markets',
      'Learn as you go with built-in explanations'
    ],
  },
  {
    id: 'ticker',
    title: 'Step 1: Pick a Stock',
    subtitle: 'Enter any ticker symbol',
    content: 'Start by typing a stock symbol (like AAPL for Apple or TSLA for Tesla). You can also click one of the popular stocks to try it out.',
    icon: Search,
    highlight: 'ticker-input',
    tips: [
      'Try familiar companies first',
      'SPY and QQQ are index ETFs - great for practice',
      'You can change the time period to analyze more or less history'
    ],
  },
  {
    id: 'templates',
    title: 'Step 2: Choose Your Analysis',
    subtitle: 'Use templates or pick individual studies',
    content: 'Templates are pre-built combinations of studies - perfect for beginners. "Quick Health Check" is a great starting point!',
    icon: BarChart3,
    highlight: 'templates',
    tips: [
      '🩺 Quick Health Check - Best for beginners',
      '🚀 Momentum Check - Is the stock trending?',
      '⚠️ Risk Assessment - How volatile is it?'
    ],
  },
  {
    id: 'run',
    title: 'Step 3: Run & Learn',
    subtitle: 'See your results with explanations',
    content: 'Click "Run All Studies" and watch the magic happen. Each result comes with a plain-English interpretation so you know what it means.',
    icon: Play,
    highlight: 'run-button',
    tips: [
      'Look for 🟢 (bullish) and 🔴 (bearish) signals',
      'Click "What does this mean?" for deeper explanations',
      'Save results you want to reference later'
    ],
  },
  {
    id: 'complete',
    title: 'You\'re Ready! 🎓',
    subtitle: 'Start analyzing like a pro',
    content: 'You now know the basics. Keep the Learning Mode on to see explanations as you explore. The more you use it, the more you\'ll learn!',
    icon: Trophy,
    highlight: null,
    tips: [
      'Earn XP by running studies and learning concepts',
      'Unlock achievements as you explore',
      'Save your analyses to build your research library'
    ],
  },
];

export function TutorialOverlay() {
  const { progress, completeTutorialStep, skipTutorial, addXp } = useLearning();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Don't show if tutorial completed
  if (progress.tutorialCompleted) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const progressPercent = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      completeTutorialStep();
      addXp(100); // Bonus XP for completing tutorial
    } else {
      setCurrentStep(prev => prev + 1);
      completeTutorialStep();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    skipTutorial();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      >
        {/* Centered Tutorial Card */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg"
          >
            {/* Progress Bar */}
            <div className="mb-4 flex items-center gap-3">
              <Progress value={progressPercent} className="flex-1 h-2" />
              <span className="text-sm text-muted-foreground">
                {currentStep + 1}/{TUTORIAL_STEPS.length}
              </span>
            </div>

            {/* Card */}
            <div className="bg-card border-2 border-primary/20 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-purple-500/10 via-primary/10 to-blue-500/10 p-6 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-primary shadow-lg">
                      <step.icon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{step.title}</h2>
                      <p className="text-sm text-muted-foreground">{step.subtitle}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleSkip}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                <p className="text-foreground/90 leading-relaxed">
                  {step.content}
                </p>

                {/* Tips */}
                <div className="space-y-2">
                  {step.tips.map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Completion bonus */}
                {isLastStep && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 rounded-lg border border-amber-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-amber-500/20">
                        <Trophy className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold">Tutorial Complete Bonus!</p>
                        <p className="text-sm text-muted-foreground">You'll earn +100 XP</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer with navigation */}
              <div className="p-4 bg-muted/30 border-t flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  Skip Tutorial
                </Button>

                <Button
                  onClick={handleNext}
                  className="gap-1 bg-gradient-to-r from-purple-500 to-primary hover:from-purple-600 hover:to-primary/90"
                >
                  {isLastStep ? (
                    <>
                      Get Started
                      <GraduationCap className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
