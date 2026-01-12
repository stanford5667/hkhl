/**
 * Investor Policy Statement (IPS) Questionnaire
 * Uses unified questionnaire components for consistent UI
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Shield,
  Wallet,
  Settings,
  GraduationCap,
  Check,
  AlertCircle,
  Lightbulb,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TermHighlight } from '@/components/shared/EducationalTooltip';
import { QUESTIONNAIRE_SECTIONS, getAllQuestions } from '@/data/investorQuestionnaire';
import {
  InvestorPolicyStatement,
  QuestionnaireQuestion,
  QuestionnaireResponse,
} from '@/types/investorPolicy';

// Import unified questionnaire components
import {
  QuestionnaireShell,
  QuestionnaireStep,
  QuestionCard,
  OptionCard,
  StatsGrid,
  RiskGauge,
} from '@/components/questionnaire';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface InvestorPolicyQuestionnaireProps {
  onComplete: (policy: InvestorPolicyStatement) => void;
  onBack: () => void;
  initialData?: Partial<InvestorPolicyStatement>;
}

const sectionIcons: Record<string, React.ElementType> = {
  goals: Target,
  risk: Shield,
  finances: Wallet,
  preferences: Settings,
  knowledge: GraduationCap,
};

const didYouKnowInsights = [
  "Studies show that investors who sell during market drops miss an average of 60% of the subsequent recovery gains.",
  "Your emotional risk tolerance is often 30-40% lower than your stated tolerance when real money is involved.",
  "Historically, diversified portfolios recover from most downturns within 2-3 years.",
  "The best performing investor accounts are often those that were forgotten about.",
  "Time in the market beats timing the market over 90% of the time for periods longer than 15 years.",
];

export function InvestorPolicyQuestionnaire({
  onComplete,
  onBack,
  initialData,
}: InvestorPolicyQuestionnaireProps) {
  const allQuestions = useMemo(() => getAllQuestions(), []);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, QuestionnaireResponse>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [inconsistencyWarning, setInconsistencyWarning] = useState<string | null>(null);

  const currentSection = QUESTIONNAIRE_SECTIONS[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];
  
  // Calculate overall progress
  const totalQuestions = allQuestions.length;
  const answeredQuestions = Object.keys(responses).length;
  const overallProgress = (answeredQuestions / totalQuestions) * 100;

  // Calculate questions answered before current
  const questionsBeforeCurrent = useMemo(() => {
    let count = 0;
    for (let i = 0; i < currentSectionIndex; i++) {
      count += QUESTIONNAIRE_SECTIONS[i].questions.length;
    }
    count += currentQuestionIndex;
    return count;
  }, [currentSectionIndex, currentQuestionIndex]);

  const currentAnswer = currentQuestion ? responses[currentQuestion.id]?.value : undefined;

  // Build steps for QuestionnaireShell
  const steps: QuestionnaireStep[] = QUESTIONNAIRE_SECTIONS.map(section => {
    const Icon = sectionIcons[section.id] || Target;
    return {
      id: section.id,
      title: section.title,
      icon: <Icon className="h-4 w-4" />,
    };
  });

  // Check for inconsistencies
  useEffect(() => {
    const timeline = responses['goal-timeline']?.value;
    const riskScenario = responses['risk-scenario-drop']?.value;
    
    if (timeline && riskScenario) {
      const isShortTimeline = ['less-than-1', '1-3-years'].includes(timeline as string);
      const isHighRisk = ['buy-more', 'hold'].includes(riskScenario as string);
      
      if (isShortTimeline && isHighRisk) {
        setInconsistencyWarning(
          "Your timeline is short but you indicated high risk tolerance. This is worth noting: a short timeline usually means less ability to recover from losses, regardless of emotional tolerance."
        );
        return;
      }
    }
    setInconsistencyWarning(null);
  }, [responses]);

  const handleAnswer = useCallback((value: string | number | string[]) => {
    if (!currentQuestion) return;
    
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        value,
        answeredAt: new Date(),
      },
    }));
  }, [currentQuestion]);

  const handleNext = useCallback(() => {
    if (!currentSection) return;
    
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSectionIndex < QUESTIONNAIRE_SECTIONS.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    } else {
      setShowSummary(true);
    }
    // Scroll to top on mobile when navigating to next question
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentQuestionIndex, currentSectionIndex, currentSection]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
      const prevSection = QUESTIONNAIRE_SECTIONS[currentSectionIndex - 1];
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
    // Scroll to top on mobile when navigating to previous question
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentQuestionIndex, currentSectionIndex]);

  const navigateToSection = useCallback((sectionIndex: number) => {
    if (sectionIndex <= currentSectionIndex) {
      setCurrentSectionIndex(sectionIndex);
      setCurrentQuestionIndex(0);
      setShowSummary(false);
      // Scroll to top on mobile when navigating to a section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentSectionIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && currentAnswer !== undefined) {
        e.preventDefault();
        handleNext();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAnswer, handleNext]);

  const buildPolicyStatement = useCallback((): InvestorPolicyStatement => {
    const getRiskScore = () => {
      const riskAnswer = responses['risk-scenario-drop']?.value;
      const scores: Record<string, number> = {
        'sell-all': 20,
        'sell-some': 35,
        'panic-but-hold': 50,
        'hold': 70,
        'buy-more': 90,
      };
      return scores[riskAnswer as string] || 50;
    };

    return {
      id: crypto.randomUUID(),
      goals: [],
      riskProfile: {
        emotionalTolerance: getRiskScore(),
        financialCapacity: getRiskScore(),
        experienceLevel: (responses['risk-knowledge-level']?.value as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
        previousLosses: {
          experienced: responses['risk-past-losses']?.value !== 'never-invested',
          reaction: responses['risk-past-losses']?.value as string || '',
        },
        incomeStability: 'stable',
      },
      liquidityNeeds: {
        emergencyFundMonths: Number(responses['finance-emergency-fund']?.value) || 3,
        upcomingExpenses: [],
        incomeReliability: 'somewhat-reliable',
      },
      constraints: {
        ethicalExclusions: (responses['preference-ethical']?.value as string[]) || [],
        concentrationLimits: {
          maxSinglePosition: 10,
          maxSectorExposure: 25,
        },
        taxConsiderations: {
          bracket: responses['finance-tax-bracket']?.value as string || 'unknown',
          harvestingInterest: responses['finance-tax-accounts']?.value === 'yes-taxable',
          accountTypes: [],
        },
      },
      createdAt: new Date(),
      lastReviewed: new Date(),
      rebalancingRules: {
        frequency: responses['preference-review-frequency']?.value as string || 'quarterly',
        threshold: 5,
      },
      investmentPhilosophy: responses['goal-success-vision']?.value as string || '',
    };
  }, [responses]);

  const handleComplete = useCallback(() => {
    const policy = buildPolicyStatement();
    onComplete(policy);
  }, [buildPolicyStatement, onComplete]);

  // Render Summary Screen
  if (showSummary) {
    const riskScore = (() => {
      const riskAnswer = responses['risk-scenario-drop']?.value;
      const scores: Record<string, number> = {
        'sell-all': 20,
        'sell-some': 35,
        'panic-but-hold': 50,
        'hold': 70,
        'buy-more': 90,
      };
      return scores[riskAnswer as string] || 50;
    })();

    return (
      <QuestionnaireShell
        steps={steps}
        currentStepIndex={QUESTIONNAIRE_SECTIONS.length - 1}
        onBack={() => setShowSummary(false)}
        onStepClick={navigateToSection}
        progress={100}
        currentStepProgress="Summary"
        accentColor="emerald"
      >
        <QuestionCard
          icon={<Sparkles className="h-7 w-7 text-emerald-500" />}
          iconGradient="from-emerald-500/20 to-teal-500/10"
          question="Your Investor Policy Statement is ready!"
          subtitle="Review your profile before generating your personalized strategy"
          onNext={handleComplete}
          onBack={() => setShowSummary(false)}
          nextLabel="Generate Portfolio"
          isLastStep={true}
        >
          <div className="space-y-4 sm:space-y-6">
            {/* Risk Gauge */}
            <div className="flex justify-center">
              <RiskGauge score={riskScore} size="lg" />
            </div>

            {/* Summary Stats */}
            <StatsGrid
              stats={[
                { label: 'Questions Answered', value: answeredQuestions },
                { label: 'Sections Completed', value: QUESTIONNAIRE_SECTIONS.length },
              ]}
              columns={2}
            />

            {/* Section Summary */}
            <Card className="bg-card/50">
              <CardContent className="py-3 sm:py-4 space-y-2 sm:space-y-3 px-3 sm:px-6">
                {QUESTIONNAIRE_SECTIONS.map((section, idx) => {
                  const Icon = sectionIcons[section.id] || Target;
                  const answeredInSection = section.questions.filter(q => responses[q.id]).length;
                  const isComplete = answeredInSection === section.questions.length;
                  
                  return (
                    <div 
                      key={section.id}
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-muted/50"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className={cn(
                          "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0",
                          isComplete ? "bg-emerald-500/20 text-emerald-500" : "bg-muted"
                        )}>
                          {isComplete ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                        </div>
                        <span className="font-medium text-sm sm:text-base truncate">{section.title}</span>
                      </div>
                      <Badge variant={isComplete ? "default" : "secondary"} className="shrink-0 text-xs">
                        {answeredInSection}/{section.questions.length}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </QuestionCard>
      </QuestionnaireShell>
    );
  }

  if (!currentQuestion) return null;

  const SectionIcon = sectionIcons[currentSection.id] || Target;

  return (
    <QuestionnaireShell
      steps={steps}
      currentStepIndex={currentSectionIndex}
      onBack={onBack}
      onStepClick={navigateToSection}
      progress={overallProgress}
      currentStepProgress={`Question ${questionsBeforeCurrent + 1} of ${totalQuestions}`}
      accentColor="primary"
    >
      <QuestionCard
        icon={<SectionIcon className="h-7 w-7 text-primary" />}
        iconGradient="from-primary/20 to-blue-500/10"
        question={currentQuestion.question}
        explanation={currentQuestion.explanation}
        onNext={handleNext}
        onBack={handlePrevious}
        showBack={currentSectionIndex > 0 || currentQuestionIndex > 0}
        showSkip={true}
        onSkip={handleNext}
        canProceed={currentAnswer !== undefined}
        isLastStep={
          currentSectionIndex === QUESTIONNAIRE_SECTIONS.length - 1 &&
          currentQuestionIndex === currentSection.questions.length - 1
        }
        nextLabel={
          currentSectionIndex === QUESTIONNAIRE_SECTIONS.length - 1 &&
          currentQuestionIndex === currentSection.questions.length - 1
            ? 'See Results'
            : 'Continue'
        }
      >
        <div className="space-y-3 sm:space-y-4">
          <QuestionInput
            question={currentQuestion}
            value={currentAnswer}
            onChange={handleAnswer}
          />
          
          {/* Inconsistency Warning */}
          <AnimatePresence>
            {inconsistencyWarning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-xs font-medium text-amber-600 uppercase tracking-wide mb-0.5 sm:mb-1">
                        Something to consider
                      </div>
                      <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                        {inconsistencyWarning}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Did You Know - For risk questions */}
          {currentQuestion.category === 'risk' && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-medium text-blue-600 uppercase tracking-wide mb-0.5 sm:mb-1">
                    Did you know?
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                    {didYouKnowInsights[Math.floor(Math.random() * didYouKnowInsights.length)]}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </QuestionCard>
    </QuestionnaireShell>
  );
}

// Question Input Component
interface QuestionInputProps {
  question: QuestionnaireQuestion;
  value: string | number | string[] | undefined;
  onChange: (value: string | number | string[]) => void;
}

function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  switch (question.inputType) {
    case 'select':
    case 'scenario':
      return (
        <div className="space-y-2">
          {question.options?.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={value === option.value}
              onClick={() => onChange(option.value)}
              compact
            />
          ))}
        </div>
      );

    case 'multi-select':
      const selectedValues = (value as string[]) || [];
      return (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {question.options?.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <motion.button
                key={option.value}
                onClick={() => {
                  if (isSelected) {
                    onChange(selectedValues.filter(v => v !== option.value));
                  } else {
                    onChange([...selectedValues, option.value]);
                  }
                }}
                className={cn(
                  "px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 transition-all text-xs sm:text-sm",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {option.label}
              </motion.button>
            );
          })}
        </div>
      );

    case 'slider':
      const sliderValue = typeof value === 'number' ? value : 
                         typeof value === 'string' ? parseInt(value) : 20;
      const currentOption = question.options?.find(o => parseInt(o.value) <= sliderValue);
      
      return (
        <div className="space-y-4 sm:space-y-6">
          <div className="px-2">
            <Slider
              value={[sliderValue]}
              onValueChange={(vals) => onChange(vals[0])}
              min={5}
              max={40}
              step={5}
              className="w-full"
            />
          </div>
          <div className="flex justify-between text-xs sm:text-sm text-muted-foreground px-1">
            <span>5%</span>
            <span className="font-semibold text-foreground text-base sm:text-lg">
              {sliderValue}%
            </span>
            <span>40%+</span>
          </div>
          {currentOption && (
            <div className="text-center">
              <Badge variant="secondary" className="text-xs sm:text-sm max-w-full">
                <span className="truncate">{currentOption.label}: {currentOption.description}</span>
              </Badge>
            </div>
          )}
          
          {/* Visual representation for slider */}
          <div className="flex items-end justify-center gap-0.5 sm:gap-1 h-12 sm:h-16">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const threshold = i * 5;
              const isActive = sliderValue >= threshold;
              const isLoss = i <= 4;
              return (
                <motion.div
                  key={i}
                  className={cn(
                    "w-4 sm:w-6 rounded-t transition-colors",
                    isActive
                      ? isLoss
                        ? "bg-rose-500"
                        : "bg-emerald-500"
                      : "bg-muted"
                  )}
                  animate={{ height: `${i * 12}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
              );
            })}
          </div>
          <div className="flex justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-rose-500" /> Potential loss
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" /> Higher tolerance
            </span>
          </div>
        </div>
      );

    default:
      // Handle text/textarea input types
      if (question.inputType === 'text' || (question.inputType as string) === 'textarea') {
        return (
          <Textarea
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your response..."
            className="min-h-[120px] resize-none"
          />
        );
      }
      return null;
  }
}
