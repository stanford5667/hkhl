/**
 * UNIFIED QUESTIONNAIRE SHELL
 * 
 * Consistent wrapper for all questionnaires:
 * - Investment Plan questionnaire
 * - Portfolio Builder AI Co-Pilot
 * - Portfolio Builder IPS Questionnaire
 * 
 * Features:
 * - Consistent header with progress
 * - Mobile-first responsive design
 * - Animated step transitions
 * - Unified color system using design tokens
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface QuestionnaireStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  color?: string;
}

interface QuestionnaireShellProps {
  // Navigation
  steps: QuestionnaireStep[];
  currentStepIndex: number;
  onBack: () => void;
  onStepClick?: (index: number) => void;
  
  // Progress
  progress: number; // 0-100
  currentStepProgress?: string; // e.g., "Question 3 of 15"
  
  // Styling
  accentColor?: 'primary' | 'emerald' | 'purple' | 'blue' | 'amber';
  showSidebar?: boolean;
  
  // Content
  children: React.ReactNode;
  
  // Header customization
  title?: string;
  subtitle?: string;
}

const accentColors = {
  primary: {
    gradient: 'from-primary/10 to-blue-500/5',
    stepActive: 'bg-primary text-primary-foreground',
    stepComplete: 'bg-primary/20 text-primary',
    stepPending: 'bg-muted text-muted-foreground',
    progressBar: 'bg-primary',
    border: 'border-primary/30',
  },
  emerald: {
    gradient: 'from-emerald-500/10 to-teal-500/5',
    stepActive: 'bg-emerald-500 text-white',
    stepComplete: 'bg-emerald-500/20 text-emerald-500',
    stepPending: 'bg-muted text-muted-foreground',
    progressBar: 'bg-emerald-500',
    border: 'border-emerald-500/30',
  },
  purple: {
    gradient: 'from-purple-500/10 to-violet-500/5',
    stepActive: 'bg-purple-500 text-white',
    stepComplete: 'bg-purple-500/20 text-purple-500',
    stepPending: 'bg-muted text-muted-foreground',
    progressBar: 'bg-purple-500',
    border: 'border-purple-500/30',
  },
  blue: {
    gradient: 'from-blue-500/10 to-cyan-500/5',
    stepActive: 'bg-blue-500 text-white',
    stepComplete: 'bg-blue-500/20 text-blue-500',
    stepPending: 'bg-muted text-muted-foreground',
    progressBar: 'bg-blue-500',
    border: 'border-blue-500/30',
  },
  amber: {
    gradient: 'from-amber-500/10 to-orange-500/5',
    stepActive: 'bg-amber-500 text-white',
    stepComplete: 'bg-amber-500/20 text-amber-500',
    stepPending: 'bg-muted text-muted-foreground',
    progressBar: 'bg-amber-500',
    border: 'border-amber-500/30',
  },
};

export function QuestionnaireShell({
  steps,
  currentStepIndex,
  onBack,
  onStepClick,
  progress,
  currentStepProgress,
  accentColor = 'primary',
  showSidebar = false,
  children,
  title,
  subtitle,
}: QuestionnaireShellProps) {
  const colors = accentColors[accentColor];
  const currentStep = steps[currentStepIndex];

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br transition-all duration-500",
      colors.gradient,
      "bg-background"
    )}>
      <div className="flex min-h-screen">
        {/* Sidebar - Hidden on mobile, optional on desktop */}
        {showSidebar && (
          <aside className="hidden lg:flex flex-col w-72 border-r border-border bg-card/80 backdrop-blur-sm p-6">
            <div className="mb-8">
              {title && <h2 className="text-lg font-semibold mb-1">{title}</h2>}
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            
            <nav className="space-y-2 flex-1">
              {steps.map((step, idx) => {
                const isComplete = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => onStepClick?.(idx)}
                    disabled={idx > currentStepIndex}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                      isCurrent && "bg-primary/10 text-primary",
                      isComplete && "hover:bg-muted/50 text-muted-foreground hover:text-foreground cursor-pointer",
                      !isComplete && !isCurrent && "text-muted-foreground/50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                      isComplete && colors.stepComplete,
                      isCurrent && colors.stepActive,
                      !isComplete && !isCurrent && colors.stepPending
                    )}>
                      {isComplete ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{step.title}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
            
            <div className="pt-6 border-t border-border">
              <Button variant="ghost" onClick={onBack} className="w-full justify-start">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Exit
              </Button>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Top Progress Bar - Sticky */}
          <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border px-3 sm:px-4 py-2 sm:py-3">
            <div className="max-w-3xl mx-auto">
              {/* Mobile back + progress text */}
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onBack} 
                    className="lg:hidden h-7 w-7 sm:h-8 sm:w-8"
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  {currentStepProgress && (
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {currentStepProgress}
                    </span>
                  )}
                </div>
                {currentStep && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "gap-1 sm:gap-1.5 text-xs py-0.5 px-2",
                      colors.border,
                      "bg-card"
                    )}
                  >
                    {currentStep.icon}
                    <span className="hidden sm:inline">{currentStep.title}</span>
                  </Badge>
                )}
              </div>
              
              {/* Progress bar */}
              <div className="relative">
                <Progress 
                  value={progress} 
                  className="h-1.5 sm:h-2"
                />
              </div>
              
              {/* Step indicators - Horizontal scroll on mobile */}
              <div className="flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                {steps.map((step, idx) => {
                  const isComplete = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => idx <= currentStepIndex && onStepClick?.(idx)}
                      disabled={idx > currentStepIndex}
                      className={cn(
                        "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0",
                        isComplete && "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 cursor-pointer",
                        isCurrent && "bg-primary/20 text-primary",
                        !isComplete && !isCurrent && "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-3 w-3" />
                      ) : isCurrent ? (
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-current opacity-30" />
                      )}
                      <span className="hidden sm:inline">{step.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Question Content Area */}
          <div className="flex-1 flex items-start sm:items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto">
            <div className="w-full max-w-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStepIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
