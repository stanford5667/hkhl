import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Shield,
  Wallet,
  Settings,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Lightbulb,
  Info,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { TermHighlight } from '@/components/shared/EducationalTooltip';
import { QUESTIONNAIRE_SECTIONS, getAllQuestions } from '@/data/investorQuestionnaire';
import {
  InvestorPolicyStatement,
  QuestionnaireQuestion,
  QuestionnaireResponse,
} from '@/types/investorPolicy';

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

const sectionGradients: Record<string, string> = {
  goals: 'from-purple-500/5 via-blue-500/5 to-indigo-500/5',
  risk: 'from-rose-500/5 via-orange-500/5 to-amber-500/5',
  finances: 'from-emerald-500/5 via-teal-500/5 to-cyan-500/5',
  preferences: 'from-violet-500/5 via-fuchsia-500/5 to-pink-500/5',
  knowledge: 'from-blue-500/5 via-indigo-500/5 to-purple-500/5',
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
  const [showExplanation, setShowExplanation] = useState(false);
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
      setShowExplanation(false);
    } else if (currentSectionIndex < QUESTIONNAIRE_SECTIONS.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
      setShowExplanation(false);
    } else {
      setShowSummary(true);
    }
  }, [currentQuestionIndex, currentSectionIndex, currentSection]);

  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowExplanation(false);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
      const prevSection = QUESTIONNAIRE_SECTIONS[currentSectionIndex - 1];
      setCurrentQuestionIndex(prevSection.questions.length - 1);
      setShowExplanation(false);
    }
  }, [currentQuestionIndex, currentSectionIndex]);

  const handleSkip = useCallback(() => {
    handleNext();
  }, [handleNext]);

  const navigateToSection = useCallback((sectionIndex: number) => {
    setCurrentSectionIndex(sectionIndex);
    setCurrentQuestionIndex(0);
    setShowExplanation(false);
    setShowSummary(false);
  }, []);

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
    // Build IPS from responses
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

    const getTimeHorizon = () => {
      const timeline = responses['goal-timeline']?.value;
      const horizons: Record<string, string> = {
        'less-than-1': '< 1 year',
        '1-3-years': '1-3 years',
        '3-5-years': '3-5 years',
        '5-10-years': '5-10 years',
        '10-20-years': '10-20 years',
        'more-than-20': '20+ years',
      };
      return horizons[timeline as string] || 'Not specified';
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

  // Get impact preview based on current answer
  const getImpactPreview = useCallback(() => {
    if (!currentQuestion || !currentAnswer) return null;
    
    const option = currentQuestion.options?.find(o => o.value === currentAnswer);
    if (option) {
      return option.description;
    }
    return null;
  }, [currentQuestion, currentAnswer]);

  if (showSummary) {
    return <SummaryScreen responses={responses} onComplete={handleComplete} onBack={() => setShowSummary(false)} />;
  }

  if (!currentQuestion) return null;

  const SectionIcon = sectionIcons[currentSection.id] || Target;
  const currentGradient = sectionGradients[currentSection.id] || sectionGradients.goals;

  return (
    <div className={cn("min-h-screen bg-gradient-to-br", currentGradient, "transition-all duration-500")}>
      <div className="flex min-h-screen">
        {/* Sidebar - Hidden on mobile */}
        <aside className="hidden lg:flex flex-col w-72 border-r bg-background/80 backdrop-blur-sm p-6">
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-1">Build Your Profile</h2>
            <p className="text-sm text-muted-foreground">
              Answer these questions to get personalized recommendations
            </p>
          </div>
          
          <nav className="space-y-2 flex-1">
            {QUESTIONNAIRE_SECTIONS.map((section, idx) => {
              const Icon = sectionIcons[section.id] || Target;
              const sectionQuestionCount = section.questions.length;
              const answeredInSection = section.questions.filter(q => responses[q.id]).length;
              const isComplete = answeredInSection === sectionQuestionCount;
              const isCurrent = idx === currentSectionIndex;
              
              return (
                <button
                  key={section.id}
                  onClick={() => navigateToSection(idx)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                    isCurrent
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full",
                    isComplete ? "bg-emerald-500/20 text-emerald-500" :
                    isCurrent ? "bg-primary/20 text-primary" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{section.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {answeredInSection}/{sectionQuestionCount} answered
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
          
          <div className="pt-6 border-t">
            <Button variant="ghost" onClick={onBack} className="w-full justify-start">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Exit Questionnaire
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Top Progress Bar */}
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Question {questionsBeforeCurrent + 1} of {totalQuestions}
                  </span>
                </div>
                <Badge variant="secondary" className="gap-1.5">
                  <SectionIcon className="h-3 w-3" />
                  {currentSection.title}
                </Badge>
              </div>
              <Progress value={overallProgress} className="h-2" />
              
              {/* Section indicators */}
              <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
                {QUESTIONNAIRE_SECTIONS.map((section, idx) => {
                  const answeredInSection = section.questions.filter(q => responses[q.id]).length;
                  const isComplete = answeredInSection === section.questions.length;
                  const isCurrent = idx === currentSectionIndex;
                  const isPast = idx < currentSectionIndex;
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => navigateToSection(idx)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                        isComplete ? "bg-emerald-500/20 text-emerald-600" :
                        isCurrent ? "bg-primary/20 text-primary" :
                        isPast ? "bg-muted text-muted-foreground" :
                        "bg-muted/50 text-muted-foreground/50"
                      )}
                    >
                      {isComplete ? <Check className="h-3 w-3" /> : 
                       isCurrent ? <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> :
                       <span className="w-2 h-2 rounded-full bg-current opacity-30" />}
                      <span className="hidden sm:inline">{section.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Question Content */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-6 sm:p-8 shadow-lg border-0 bg-card/95 backdrop-blur">
                    {/* Question */}
                    <h3 className="text-xl sm:text-2xl font-semibold text-foreground leading-snug mb-4">
                      {currentQuestion.technicalTerm ? (
                        <>
                          {currentQuestion.question.split(currentQuestion.technicalTerm)[0]}
                          <TermHighlight
                            term={currentQuestion.technicalTerm}
                            definition={currentQuestion.technicalDefinition || ''}
                            impact={currentQuestion.impactDescription}
                          >
                            {currentQuestion.technicalTerm}
                          </TermHighlight>
                          {currentQuestion.question.split(currentQuestion.technicalTerm)[1]}
                        </>
                      ) : (
                        currentQuestion.question
                      )}
                    </h3>

                    {/* Why we ask this - Collapsible */}
                    <Collapsible open={showExplanation} onOpenChange={setShowExplanation}>
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
                          <Info className="h-4 w-4" />
                          <span>Why we ask this</span>
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-transform",
                            showExplanation && "rotate-90"
                          )} />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm text-muted-foreground">
                          {currentQuestion.explanation}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Input Area */}
                    <div className="space-y-4">
                      <QuestionInput
                        question={currentQuestion}
                        value={currentAnswer}
                        onChange={handleAnswer}
                      />
                    </div>

                    {/* Impact Preview */}
                    <AnimatePresence>
                      {getImpactPreview() && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-6"
                        >
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <div>
                                <div className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
                                  What this means for your portfolio
                                </div>
                                <p className="text-sm text-foreground/80">
                                  {getImpactPreview()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Inconsistency Warning */}
                    <AnimatePresence>
                      {inconsistencyWarning && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4"
                        >
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                              <div>
                                <div className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
                                  Something to consider
                                </div>
                                <p className="text-sm text-foreground/80">
                                  {inconsistencyWarning}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Did You Know - For risk questions */}
                    {currentQuestion.category === 'risk' && Math.random() > 0.5 && (
                      <div className="mt-6 bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">
                              Did you know?
                            </div>
                            <p className="text-sm text-foreground/80">
                              {didYouKnowInsights[Math.floor(Math.random() * didYouKnowInsights.length)]}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-6">
                    <Button
                      variant="ghost"
                      onClick={handlePrevious}
                      disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={handleSkip}
                      className="text-muted-foreground"
                    >
                      Skip for now
                      <span className="ml-1 text-xs opacity-60">(affects accuracy)</span>
                    </Button>

                    <Button
                      onClick={handleNext}
                      disabled={!currentAnswer}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      {currentSectionIndex === QUESTIONNAIRE_SECTIONS.length - 1 &&
                       currentQuestionIndex === currentSection.questions.length - 1
                        ? 'See Results'
                        : 'Continue'}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
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
          {question.options?.map((option) => {
            const isSelected = value === option.value;
            return (
              <motion.button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      );

    case 'multi-select':
      const selectedValues = (value as string[]) || [];
      return (
        <div className="flex flex-wrap gap-2">
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
                  "px-4 py-2 rounded-full border-2 transition-all",
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
        <div className="space-y-6">
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
          <div className="flex justify-between text-sm text-muted-foreground px-1">
            <span>5%</span>
            <span className="font-semibold text-foreground text-lg">
              {sliderValue}%
            </span>
            <span>40%+</span>
          </div>
          {currentOption && (
            <div className="text-center">
              <Badge variant="secondary" className="text-sm">
                {currentOption.label}: {currentOption.description}
              </Badge>
            </div>
          )}
          
          {/* Visual representation for slider */}
          <div className="flex items-end justify-center gap-1 h-16">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const threshold = i * 5;
              const isActive = sliderValue >= threshold;
              const isLoss = i <= 4;
              return (
                <motion.div
                  key={i}
                  className={cn(
                    "w-6 rounded-t transition-colors",
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
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-rose-500" /> Lower risk
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" /> Higher risk
            </span>
          </div>
        </div>
      );

    case 'text':
      return (
        <Textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Share your thoughts..."
          className="min-h-[120px] resize-none"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={(value as number) || ''}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-3 rounded-lg border bg-background text-lg"
          placeholder="Enter a number..."
        />
      );

    default:
      return null;
  }
}

// Summary Screen Component
interface SummaryScreenProps {
  responses: Record<string, QuestionnaireResponse>;
  onComplete: () => void;
  onBack: () => void;
}

function SummaryScreen({ responses, onComplete, onBack }: SummaryScreenProps) {
  // Derive insights from responses
  const getRiskLevel = () => {
    const riskAnswer = responses['risk-scenario-drop']?.value;
    if (['sell-all', 'sell-some'].includes(riskAnswer as string)) return 'conservative';
    if (['panic-but-hold', 'hold'].includes(riskAnswer as string)) return 'moderate';
    return 'aggressive';
  };

  const getTimeHorizon = () => {
    const timeline = responses['goal-timeline']?.value;
    const horizons: Record<string, string> = {
      'less-than-1': 'very short-term (< 1 year)',
      '1-3-years': 'short-term (1-3 years)',
      '3-5-years': 'medium-term (3-5 years)',
      '5-10-years': 'medium-long term (5-10 years)',
      '10-20-years': 'long-term (10-20 years)',
      'more-than-20': 'very long-term (20+ years)',
    };
    return horizons[timeline as string] || 'not specified';
  };

  const getPurpose = () => {
    const purpose = responses['goal-purpose']?.value;
    const purposes: Record<string, string> = {
      'retirement': 'Retirement',
      'house-purchase': 'House Down Payment',
      'education': 'Education Funding',
      'wealth-building': 'Wealth Building',
      'income-generation': 'Income Generation',
      'financial-independence': 'Financial Independence',
    };
    return purposes[purpose as string] || 'General investing';
  };

  const riskLevel = getRiskLevel();
  const timeHorizon = getTimeHorizon();
  const purpose = getPurpose();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-emerald-500/5 p-4 sm:p-6 lg:p-8"
    >
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 sm:p-8 shadow-lg">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-emerald-500 mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                Your Investor Profile
              </h2>
              <p className="text-muted-foreground">
                Based on your answers, here's what we learned about you
              </p>
            </div>

            {/* Key Insight */}
            <div className="bg-gradient-to-r from-primary/10 to-emerald-500/10 rounded-xl p-6 mb-8">
              <p className="text-lg text-center font-medium">
                You're a <span className="text-primary font-semibold">{riskLevel}-risk</span> investor 
                with a <span className="text-primary font-semibold">{timeHorizon}</span> horizon 
                focused on <span className="text-primary font-semibold">{purpose}</span>.
              </p>
            </div>

            {/* Profile Cards */}
            <div className="grid gap-4 sm:grid-cols-2 mb-8">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-medium">Risk Tolerance</span>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {riskLevel} - You prefer 
                  {riskLevel === 'conservative' ? ' stability over high returns' :
                   riskLevel === 'moderate' ? ' a balanced approach' :
                   ' growth potential despite volatility'}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="font-medium">Investment Goal</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {purpose} over {timeHorizon}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <span className="font-medium">Experience Level</span>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {responses['risk-knowledge-level']?.value || 'Beginner'}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <span className="font-medium">Emergency Fund</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {responses['finance-emergency-fund']?.value || '3-6'} months of expenses
                </p>
              </div>
            </div>

            {/* Considerations */}
            <div className="mb-8">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Key Considerations
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {riskLevel === 'conservative' && (
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Your portfolio will prioritize capital preservation over high returns
                  </li>
                )}
                {['less-than-1', '1-3-years'].includes(responses['goal-timeline']?.value as string) && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    Short timeline limits aggressive strategies - focus on stability
                  </li>
                )}
                {responses['finance-emergency-fund']?.value === 'none' && (
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500">•</span>
                    Consider building an emergency fund before aggressive investing
                  </li>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                className="flex-1"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Review Answers
              </Button>
              <Button
                onClick={onComplete}
                className="flex-1 bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate My Portfolio
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default InvestorPolicyQuestionnaire;
