/**
 * WelcomeOnboarding Component
 * 
 * A brief onboarding flow that introduces key concepts to first-time users.
 * Shows only once per browser (tracked in localStorage).
 * 
 * Features:
 * - 4 clean screens with smooth transitions
 * - Progress indicator
 * - Skip option
 * - Educational preview
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Target,
  Scale,
  PieChart,
  HelpCircle,
  Sparkles,
  MessageSquare,
  ClipboardList,
  SlidersHorizontal,
  ArrowRight,
  X,
  ChevronRight,
  BarChart3,
  LineChart,
  Wallet,
  Shield,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ONBOARDING_KEY = 'portfolio_visualizer_onboarding_completed';

interface OnboardingProps {
  onComplete: () => void;
}

export default function WelcomeOnboarding({ onComplete }: OnboardingProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  
  const totalScreens = 4;
  
  const handleNext = useCallback(() => {
    if (currentScreen < totalScreens - 1) {
      setCurrentScreen(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentScreen]);
  
  const handleComplete = useCallback(() => {
    setIsExiting(true);
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setTimeout(() => {
      onComplete();
    }, 300);
  }, [onComplete]);
  
  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);
  
  const goToScreen = useCallback((index: number) => {
    setCurrentScreen(index);
  }, []);
  
  // Screen content configuration
  const screens = [
    // Screen 1: Welcome
    {
      title: "Welcome to Portfolio Visualizer",
      content: (
        <div className="text-center space-y-8">
          {/* Illustration */}
          <div className="relative mx-auto w-48 h-48">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full"
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="relative">
                <LineChart className="h-20 w-20 text-primary" strokeWidth={1.5} />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute -top-2 -right-2"
                >
                  <TrendingUp className="h-8 w-8 text-emerald-500" />
                </motion.div>
              </div>
            </motion.div>
            
            {/* Floating elements */}
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute top-4 right-0"
            >
              <div className="bg-background border rounded-lg p-2 shadow-lg">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
            </motion.div>
            
            <motion.div
              animate={{ y: [0, 6, 0], rotate: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-4 left-0"
            >
              <div className="bg-background border rounded-lg p-2 shadow-lg">
                <Wallet className="h-5 w-5 text-amber-500" />
              </div>
            </motion.div>
          </div>
          
          <div className="space-y-4 max-w-md mx-auto">
            <p className="text-lg text-muted-foreground">
              We'll help you build an investment portfolio tailored to your goals
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm">
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Real Market Data
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI-Powered
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Everything here uses <span className="text-foreground font-medium">real market data</span> — no simulations or made-up numbers
            </p>
          </div>
        </div>
      ),
    },
    
    // Screen 2: What We'll Learn
    {
      title: "What We'll Learn Together",
      content: (
        <div className="space-y-8">
          <div className="grid gap-6 max-w-lg mx-auto">
            {[
              {
                icon: Target,
                color: 'text-blue-500',
                bgColor: 'bg-blue-500/10',
                title: 'Your Goals',
                description: "What you're investing for and when you need it",
              },
              {
                icon: Scale,
                color: 'text-purple-500',
                bgColor: 'bg-purple-500/10',
                title: 'Your Risk Profile',
                description: 'How much volatility you can comfortably handle',
              },
              {
                icon: PieChart,
                color: 'text-emerald-500',
                bgColor: 'bg-emerald-500/10',
                title: 'Your Portfolio',
                description: 'The right mix of investments for you',
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.15, duration: 0.4 }}
                className="flex items-start gap-4 p-4 rounded-xl border bg-card"
              >
                <div className={`p-3 rounded-lg ${item.bgColor}`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
          
          <p className="text-center text-sm text-muted-foreground max-w-md mx-auto">
            We'll use this information to recommend an investment strategy that matches your unique situation
          </p>
        </div>
      ),
    },
    
    // Screen 3: Educational Tooltips
    {
      title: "Don't Worry About Jargon",
      content: (
        <div className="space-y-8">
          <p className="text-center text-muted-foreground max-w-md mx-auto">
            Any time you see a term you don't know, look for the{' '}
            <span className="inline-flex items-center gap-1 text-primary">
              <HelpCircle className="h-4 w-4" />
            </span>
          </p>
          
          {/* Interactive Example */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="max-w-sm mx-auto"
          >
            <div className="bg-card border rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Risk Metric</span>
                <Badge variant="outline">Example</Badge>
              </div>
              
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold">1.24</span>
                <TooltipProvider delayDuration={0}>
                  <Tooltip defaultOpen>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px]">
                      <p className="font-medium mb-1">Sharpe Ratio</p>
                      <p className="text-xs text-muted-foreground">
                        Measures risk-adjusted returns. Higher is better — above 1.0 is considered good.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <span className="text-sm font-medium">Sharpe Ratio</span>
            </div>
          </motion.div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span>We'll explain everything in plain English</span>
          </div>
        </div>
      ),
    },
    
    // Screen 4: Choose Your Path
    {
      title: "Choose Your Path",
      content: (
        <div className="space-y-6">
          <p className="text-center text-muted-foreground max-w-md mx-auto">
            Take 5 minutes with our AI Quick Advisor, or dive right in if you know what you want
          </p>
          
          <div className="grid gap-4 max-w-lg mx-auto">
            {[
              {
                icon: MessageSquare,
                title: 'AI Portfolio Advisor',
                description: 'Chat naturally about your goals',
                time: '~5 min',
                color: 'text-primary',
                bgColor: 'bg-primary/10',
              },
              {
                icon: ClipboardList,
                title: 'Guided Questionnaire',
                description: 'Step-by-step questions',
                time: '~8 min',
                color: 'text-purple-500',
                bgColor: 'bg-purple-500/10',
              },
              {
                icon: SlidersHorizontal,
                title: 'Manual Builder',
                description: 'Full control over allocations',
                time: 'Flexible',
                color: 'text-emerald-500',
                bgColor: 'bg-emerald-500/10',
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
                className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors cursor-pointer group"
              >
                <div className={`p-3 rounded-lg ${item.bgColor} group-hover:scale-110 transition-transform`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {item.time}
                </Badge>
              </motion.div>
            ))}
          </div>
        </div>
      ),
      buttonText: "Get Started",
    },
  ];
  
  const currentScreenData = screens[currentScreen];
  
  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] bg-background border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Skip button */}
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground gap-1"
              >
                Skip
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 pt-10 sm:pt-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentScreen}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 sm:space-y-6"
                >
                  {/* Title */}
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center">
                    {currentScreenData.title}
                  </h1>
                  
                  {/* Screen Content */}
                  <div className="min-h-0 flex flex-col justify-center">
                    {currentScreenData.content}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Footer - fixed at bottom */}
            <div className="shrink-0 px-4 sm:px-8 py-4 sm:pb-6 border-t bg-muted/30">
              <div className="flex items-center justify-between gap-4">
                {/* Progress Dots */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {Array.from({ length: totalScreens }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToScreen(index)}
                      className={`transition-all duration-300 rounded-full ${
                        index === currentScreen
                          ? 'w-5 sm:w-6 h-2 bg-primary'
                          : index < currentScreen
                          ? 'w-2 h-2 bg-primary/50 hover:bg-primary/70'
                          : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                      aria-label={`Go to screen ${index + 1}`}
                    />
                  ))}
                </div>
                
                {/* Continue Button */}
                <Button
                  onClick={handleNext}
                  className="gap-2 px-4 sm:px-6"
                  size="lg"
                >
                  {currentScreenData.buttonText || 'Continue'}
                  {currentScreen < totalScreens - 1 ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// HOOK TO CHECK IF ONBOARDING SHOULD SHOW
// ============================================

export function useWelcomeOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true';
    setShowOnboarding(!hasCompleted);
    setIsChecking(false);
  }, []);
  
  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  }, []);
  
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  }, []);
  
  return {
    showOnboarding,
    isChecking,
    completeOnboarding,
    resetOnboarding,
  };
}
