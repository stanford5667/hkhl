/**
 * Study Explainer Component
 * Shows educational content before/during study execution
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Lightbulb, TrendingUp, TrendingDown, 
  Target, ChevronDown, ChevronUp, Sparkles, Info,
  PlayCircle, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useLearning } from './LearningContext';

interface StudyExplainerProps {
  study: {
    id: string;
    name: string;
    description: string;
    whatItMeasures: string;
    whyItMatters: string;
    howToUse: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
    icon: any;
  };
  isExpanded?: boolean;
  onToggle?: () => void;
  showFullExplanation?: boolean;
}

export function StudyExplainer({ 
  study, 
  isExpanded = false, 
  onToggle,
  showFullExplanation = false 
}: StudyExplainerProps) {
  const { learningMode, markConceptLearned } = useLearning();
  const [showDetails, setShowDetails] = useState(showFullExplanation);

  const difficultyColors = {
    beginner: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    intermediate: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    advanced: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  const handleLearnMore = () => {
    setShowDetails(!showDetails);
    if (!showDetails) {
      markConceptLearned(study.id);
    }
  };

  if (!learningMode) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Quick Summary */}
      <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground/90">{study.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge 
              variant="outline" 
              className={cn("text-xs capitalize", difficultyColors[study.difficulty])}
            >
              {study.difficulty}
            </Badge>
            {study.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Learn More Toggle */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLearnMore}
            className="w-full justify-between hover:bg-primary/5"
          >
            <span className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Learn more about {study.name}
            </span>
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 space-y-4 p-4 bg-muted/30 rounded-lg border"
          >
            {/* What it measures */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Target className="h-3.5 w-3.5" />
                What it measures
              </div>
              <p className="text-sm text-foreground/90">
                {study.whatItMeasures}
              </p>
            </div>

            {/* Why it matters */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Lightbulb className="h-3.5 w-3.5" />
                Why it matters to you
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-foreground/90">
                  {study.whyItMatters}
                </p>
              </div>
            </div>

            {/* How to use */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <PlayCircle className="h-3.5 w-3.5" />
                How to interpret results
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-xs mb-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Bullish Sign
                  </div>
                  <p className="text-xs text-foreground/80">
                    {study.howToUse.includes('bullish') 
                      ? study.howToUse 
                      : 'Values above threshold (e.g., RSI >50, win rate >55%, positive avg return) suggest favorable historical outcomes'
                    }
                  </p>
                </div>
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium text-xs mb-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    Bearish Sign
                  </div>
                  <p className="text-xs text-foreground/80">
                    Values below threshold (e.g., RSI &lt;30, win rate &lt;50%, negative avg return) suggest unfavorable historical outcomes
                  </p>
                </div>
              </div>
            </div>

            {/* XP Bonus */}
            <div className="flex items-center justify-center pt-2">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1">
                <Sparkles className="h-3 w-3" />
                +10 XP for learning!
              </Badge>
            </div>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Inline Study Tip - Quick tooltip for parameters
 */
interface StudyTipProps {
  tip: string;
  children?: React.ReactNode;
}

export function StudyTip({ tip, children }: StudyTipProps) {
  const { learningMode } = useLearning();
  
  if (!learningMode) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {children}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
        <HelpCircle className="h-3 w-3" />
        {tip}
      </span>
    </div>
  );
}
