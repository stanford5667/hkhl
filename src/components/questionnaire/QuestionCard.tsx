/**
 * UNIFIED QUESTION CARD
 * 
 * Consistent question presentation across all questionnaires
 * 
 * Features:
 * - Icon header with gradient background
 * - Question title and subtitle
 * - Why we ask - expandable explanation
 * - Action buttons (Back/Next/Skip)
 * - Mobile-optimized layout
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Info, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  // Question content
  icon?: React.ReactNode;
  iconGradient?: string;
  question: string;
  subtitle?: string;
  explanation?: string;
  
  // Form content
  children: React.ReactNode;
  
  // Actions
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  canProceed?: boolean;
  showBack?: boolean;
  showSkip?: boolean;
  nextLabel?: string;
  isLastStep?: boolean;
  
  // Styling
  className?: string;
}

export function QuestionCard({
  icon,
  iconGradient = 'from-primary/20 to-blue-500/10',
  question,
  subtitle,
  explanation,
  children,
  onNext,
  onBack,
  onSkip,
  canProceed = true,
  showBack = true,
  showSkip = false,
  nextLabel = 'Continue',
  isLastStep = false,
  className,
}: QuestionCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <Card className={cn(
      "p-4 sm:p-6 md:p-8 shadow-lg border-border/50 bg-card/95 backdrop-blur-sm max-w-full overflow-hidden",
      className
    )}>
      {/* Icon Header */}
      {icon && (
        <div className="flex justify-center mb-4 sm:mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl",
              "bg-gradient-to-br border border-border/50",
              iconGradient
            )}
          >
            {React.cloneElement(icon as React.ReactElement, { 
              className: "h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-primary" 
            })}
          </motion.div>
        </div>
      )}
      
      {/* Question Title */}
      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-center leading-tight sm:leading-snug mb-2 px-1">
        {question}
      </h3>
      
      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground text-center mb-4 sm:mb-6 px-1">
          {subtitle}
        </p>
      )}
      
      {/* Why We Ask - Collapsible */}
      {explanation && (
        <Collapsible open={showExplanation} onOpenChange={setShowExplanation}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6 mx-auto">
              <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Why we ask this</span>
              <ChevronDown className={cn(
                "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform",
                showExplanation && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-muted/50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-xs sm:text-sm text-muted-foreground text-center">
              {explanation}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {/* Form Content */}
      <div className="mb-6 sm:mb-8">
        {children}
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-4 border-t border-border/50">
        {showBack && onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full sm:w-auto"
          >
            Back
          </Button>
        )}
        
        <div className="flex-1" />
        
        {showSkip && onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-muted-foreground"
          >
            Skip
          </Button>
        )}
        
        {onNext && (
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className={cn(
              "w-full sm:w-auto gap-2",
              isLastStep && "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            )}
          >
            {isLastStep ? 'Complete' : nextLabel}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
