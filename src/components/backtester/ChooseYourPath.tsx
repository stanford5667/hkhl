// Choose Your Path - Manual vs AI Quick Advisor vs AI Deep Advisor landing experience
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  MessageSquare, 
  ChevronRight,
  Clock,
  Shield,
  Brain,
  ClipboardList,
  GraduationCap,
  Lightbulb,
  CheckCircle2,
  Lock,
  Sparkles,
  TrendingUp,
  Target,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ChooseYourPathProps {
  onSelectManual: () => void;
  onSelectAIChat: () => void;
  onSelectQuestionnaire: () => void;
}

const LAST_PATH_KEY = 'portfolio-last-path';

export function ChooseYourPath({ onSelectManual, onSelectAIChat, onSelectQuestionnaire }: ChooseYourPathProps) {
  const [lastPath, setLastPath] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LAST_PATH_KEY);
    if (saved) setLastPath(saved);
  }, []);

  const handleSelect = (path: 'manual' | 'ai-chat' | 'questionnaire', callback: () => void) => {
    localStorage.setItem(LAST_PATH_KEY, path);
    callback();
  };

  return (
    <div className="min-h-[70vh] sm:min-h-[80vh] flex flex-col items-center justify-center px-3 sm:px-6 py-6 sm:py-12">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-6 sm:mb-10 max-w-3xl"
      >
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Build Your Portfolio
        </h1>
        <p className="text-sm sm:text-lg text-muted-foreground mb-4 sm:mb-6 px-2">
          Choose how to create your investment strategy
        </p>
        <Badge className="bg-primary/10 text-primary border-primary/20 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm">
          <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 inline-block" />
          Real Market Data
        </Badge>
      </motion.div>

      {/* Path Cards - Stack on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 max-w-6xl w-full items-stretch">
        {/* Quick Builder Card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex"
        >
          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all duration-300 flex-1",
              "hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 sm:hover:-translate-y-2",
              "border-2 border-transparent hover:border-blue-500/30",
              "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "group"
            )}
            onClick={() => handleSelect('manual', onSelectManual)}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect('manual', onSelectManual)}
            tabIndex={0}
            role="button"
            aria-label="Manual Builder"
          >
            {/* Gradient Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
            
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Last Used Indicator */}
            {lastPath === 'manual' && (
              <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                <Badge variant="outline" className="text-[10px] sm:text-xs bg-background">
                  Last used
                </Badge>
              </div>
            )}
            
            <CardContent className="p-4 sm:p-6 relative flex flex-col h-full">
              {/* Icon + Title Row on Mobile */}
              <div className="flex items-start gap-3 sm:block">
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 w-fit sm:mb-5 group-hover:scale-110 transition-transform shadow-lg shrink-0">
                  <Zap className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                
                <div className="flex-1 sm:flex-none">
                  <h2 className="text-base sm:text-xl font-bold mb-1 sm:mb-2">Manual Builder</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-5">
                    Enter tickers & weights directly
                  </p>
                </div>
              </div>
              
              {/* Features - Hidden on mobile for compactness */}
              <div className="hidden sm:block space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm">
                  <Target className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span>Custom ticker allocations</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Brain className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span>Black-Litterman optimization</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <TrendingUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span>Historical data analysis</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="pt-3 sm:pt-4 border-t border-border/50 mt-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>~2 min</span>
                    <span className="hidden sm:inline ml-2 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[10px]">Experienced</span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Advisor Card (Highlighted) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex md:-mt-2 md:mb-2 order-first md:order-none"
        >
          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all duration-300 flex-1",
              "hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1 sm:hover:-translate-y-2",
              "border-2 border-emerald-500/30 hover:border-emerald-500/50",
              "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
              "group",
              "ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-background"
            )}
            onClick={() => handleSelect('ai-chat', onSelectAIChat)}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect('ai-chat', onSelectAIChat)}
            tabIndex={0}
            role="button"
            aria-label="AI Quick Advisor"
          >
            {/* Gradient Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 sm:h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
            
            {/* Subtle Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 to-teal-500/8" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Most Popular Ribbon */}
            <div className="absolute -top-1 -right-8 rotate-45 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] sm:text-xs font-bold px-8 sm:px-10 py-0.5 sm:py-1 shadow-lg">
              Popular
            </div>
            
            {/* Last Used Indicator */}
            {lastPath === 'ai-chat' && (
              <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                <Badge variant="outline" className="text-[10px] sm:text-xs bg-background">
                  Last used
                </Badge>
              </div>
            )}
            
            <CardContent className="p-4 sm:p-6 relative flex flex-col h-full">
              {/* Icon + Title Row on Mobile */}
              <div className="flex items-start gap-3 sm:block">
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 w-fit sm:mb-5 group-hover:scale-110 transition-transform shadow-lg shrink-0">
                  <div className="relative">
                    <Zap className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                    <Sparkles className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-yellow-300 absolute -top-1 -right-1" />
                  </div>
                </div>
                
                <div className="flex-1 sm:flex-none">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 flex-wrap">
                    <h2 className="text-base sm:text-xl font-bold">AI Quick Advisor</h2>
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 text-[9px] sm:text-xs px-1.5">
                      ✨ Best
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-5">
                    Fast AI chat about your goals
                  </p>
                </div>
              </div>
              
              {/* Features - Hidden on mobile */}
              <div className="hidden sm:block space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm">
                  <MessageSquare className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>Conversational experience</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <GraduationCap className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>Learn as you go</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Lightbulb className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>Quick recommendations</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="pt-3 sm:pt-4 border-t border-emerald-500/20 mt-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>~5 min</span>
                    <span className="hidden sm:inline ml-2 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px]">Beginner</span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Deep Advisor Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex"
        >
          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all duration-300 flex-1",
              "hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 sm:hover:-translate-y-2",
              "border-2 border-transparent hover:border-purple-500/30",
              "focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
              "group"
            )}
            onClick={() => handleSelect('questionnaire', onSelectQuestionnaire)}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect('questionnaire', onSelectQuestionnaire)}
            tabIndex={0}
            role="button"
            aria-label="AI Deep Advisor"
          >
            {/* Gradient Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500" />
            
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Last Used Indicator */}
            {lastPath === 'questionnaire' && (
              <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                <Badge variant="outline" className="text-[10px] sm:text-xs bg-background">
                  Last used
                </Badge>
              </div>
            )}
            
            <CardContent className="p-4 sm:p-6 relative flex flex-col h-full">
              {/* Icon + Title Row on Mobile */}
              <div className="flex items-start gap-3 sm:block">
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 w-fit sm:mb-5 group-hover:scale-110 transition-transform shadow-lg shrink-0">
                  <div className="relative">
                    <Brain className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                    <Sparkles className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-yellow-300 absolute -top-1 -right-1" />
                  </div>
                </div>
                
                <div className="flex-1 sm:flex-none">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 flex-wrap">
                    <h2 className="text-base sm:text-xl font-bold">AI Deep Advisor</h2>
                    <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30 text-[9px] sm:text-xs px-1.5">
                      Thorough
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-5">
                    Full investment policy via questionnaire
                  </p>
                </div>
              </div>
              
              {/* Features - Hidden on mobile */}
              <div className="hidden sm:block space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  <span>Comprehensive risk assessment</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Target className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  <span>Goal-based planning</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <ClipboardList className="h-4 w-4 text-purple-500 flex-shrink-0" />
                  <span>IPS document generated</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="pt-3 sm:pt-4 border-t border-border/50 mt-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>~10-15 min</span>
                    <span className="hidden sm:inline ml-2 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 text-[10px]">In-depth</span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Trust Indicators - Compact on mobile */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-6 sm:mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
          <span>Real data</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
          <span>Private</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
          <span>Pro analysis</span>
        </div>
      </motion.div>
    </div>
  );
}
