// Choose Your Path - Manual vs AI Chat vs IPS Questionnaire landing experience
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
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-12">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10 max-w-3xl"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Build Your Investment Portfolio
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Choose how you'd like to create your personalized investment strategy
        </p>
        <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm">
          <BarChart3 className="h-4 w-4 mr-2 inline-block" />
          📊 Powered by Real Market Data from Polygon.io
        </Badge>
      </motion.div>

      {/* Path Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl w-full items-stretch">
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
              "hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2",
              "border-2 border-transparent hover:border-blue-500/30",
              "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "group"
            )}
            onClick={() => handleSelect('manual', onSelectManual)}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect('manual', onSelectManual)}
            tabIndex={0}
            role="button"
            aria-label="Quick Builder - Enter tickers and weights directly for experienced investors"
          >
            {/* Gradient Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
            
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Last Used Indicator */}
            {lastPath === 'manual' && (
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="text-xs bg-background">
                  Last used
                </Badge>
              </div>
            )}
            
            <CardContent className="p-6 relative flex flex-col h-full">
              {/* Icon */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 w-fit mb-5 group-hover:scale-110 transition-transform shadow-lg">
                <Zap className="h-7 w-7 text-white" />
              </div>
              
              {/* Title */}
              <h2 className="text-xl font-bold mb-2">Quick Builder</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Already know what you want? Enter your tickers and weights directly.
              </p>
              
              {/* Features */}
              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm">
                  <Target className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span>Enter custom ticker allocations</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Brain className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span>Black-Litterman optimization</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <TrendingUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span>Real historical data analysis</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                    For Experienced Investors
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>~2 minutes</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Chat Advisor Card (Highlighted) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex md:-mt-2 md:mb-2"
        >
          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all duration-300 flex-1",
              "hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-2",
              "border-2 border-emerald-500/30 hover:border-emerald-500/50",
              "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
              "group",
              "ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-background"
            )}
            onClick={() => handleSelect('ai-chat', onSelectAIChat)}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect('ai-chat', onSelectAIChat)}
            tabIndex={0}
            role="button"
            aria-label="AI Chat Advisor - Have a conversation with AI to discover the right portfolio"
          >
            {/* Gradient Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
            
            {/* Subtle Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 to-teal-500/8" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Most Popular Ribbon */}
            <div className="absolute -top-1 -right-8 rotate-45 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-10 py-1 shadow-lg">
              Popular
            </div>
            
            {/* Last Used Indicator */}
            {lastPath === 'ai-chat' && (
              <div className="absolute top-3 left-3">
                <Badge variant="outline" className="text-xs bg-background">
                  Last used
                </Badge>
              </div>
            )}
            
            <CardContent className="p-6 relative flex flex-col h-full">
              {/* Icon */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 w-fit mb-5 group-hover:scale-110 transition-transform shadow-lg">
                <div className="relative">
                  <MessageSquare className="h-7 w-7 text-white" />
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300 absolute -top-1 -right-1" />
                </div>
              </div>
              
              {/* Title with Badge */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold">AI Chat Advisor</h2>
                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 text-xs">
                  ✨ Recommended
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                Have a conversation with our AI to discover the right portfolio for your goals.
              </p>
              
              {/* Features */}
              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm">
                  <MessageSquare className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>Natural conversation about your goals</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <GraduationCap className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>Learn as you go - every term explained</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Lightbulb className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span>Personalized recommendations</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="pt-4 border-t border-emerald-500/20">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Best for Learning
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>~5-10 minutes</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Guided Questionnaire Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex"
        >
          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all duration-300 flex-1",
              "hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2",
              "border-2 border-transparent hover:border-purple-500/30",
              "focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
              "group"
            )}
            onClick={() => handleSelect('questionnaire', onSelectQuestionnaire)}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect('questionnaire', onSelectQuestionnaire)}
            tabIndex={0}
            role="button"
            aria-label="Guided Questionnaire - Step-by-step questions to build an Investor Policy Statement"
          >
            {/* Gradient Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500" />
            
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {/* Last Used Indicator */}
            {lastPath === 'questionnaire' && (
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="text-xs bg-background">
                  Last used
                </Badge>
              </div>
            )}
            
            <CardContent className="p-6 relative flex flex-col h-full">
              {/* Icon */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 w-fit mb-5 group-hover:scale-110 transition-transform shadow-lg">
                <ClipboardList className="h-7 w-7 text-white" />
              </div>
              
              {/* Title */}
              <h2 className="text-xl font-bold mb-2">Guided Questionnaire</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Step-by-step questions to build a complete Investor Policy Statement.
              </p>
              
              {/* Features */}
              <div className="space-y-3 mb-6 flex-1">
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
                  <span>Professional IPS document</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                    Most Thorough
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>~10-15 minutes</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-purple-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Trust Indicators */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>All analysis uses real market data</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-500" />
          <span>Your data is never shared</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
          <span className="font-medium">Polygon.io</span>
          <span>•</span>
          <span>Institutional-grade analysis</span>
        </div>
      </motion.div>
    </div>
  );
}
