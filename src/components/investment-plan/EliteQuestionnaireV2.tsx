/**
 * ASSETLABS - ELITE INVESTOR PROFILER V2
 * 
 * REFACTORED VERSION with:
 * - All questions directly map to scoring engine inputs
 * - Removed irrelevant/unquantifiable questions
 * - Proper value formats for backend scoring
 * - Streamlined flow (10 essential questions)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  TrendingUp,
  Shield,
  Target,
  Wallet,
  PieChart,
  LineChart,
  Zap,
  Lock,
  ArrowRight,
  Globe,
  Building2,
  Bitcoin,
  Home,
  BarChart3,
  Brain,
  AlertTriangle,
  DollarSign,
  Clock,
  Briefcase,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// QUESTION DATA - DIRECTLY MAPS TO SCORING ENGINE
// ============================================

interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  icon?: any;
  color?: string;
}

interface Question {
  id: string;
  scoringKey: string; // Maps directly to scoring engine
  section: 'goals' | 'risk' | 'financial' | 'constraints';
  question: string;
  subtitle: string;
  type: 'select' | 'slider' | 'multi-select';
  options?: QuestionOption[];
  sliderConfig?: {
    min: number;
    max: number;
    step: number;
    labels: string[];
    toScoringValue: (val: number) => string;
  };
  weight: 'high' | 'medium' | 'low';
}

const QUESTIONS: Question[] = [
  // ========== GOALS SECTION ==========
  {
    id: 'goal-purpose',
    scoringKey: 'goal-purpose',
    section: 'goals',
    question: "What's driving this investment?",
    subtitle: "Your primary goal shapes your entire strategy.",
    type: 'select',
    weight: 'high',
    options: [
      { 
        value: 'retirement', 
        label: 'Retirement', 
        description: 'Building a nest egg for later years',
        icon: Target,
        color: '#3b82f6'
      },
      { 
        value: 'wealth-building', 
        label: 'Wealth Building', 
        description: 'Growing assets over time',
        icon: TrendingUp,
        color: '#10b981'
      },
      { 
        value: 'financial-independence', 
        label: 'Financial Independence', 
        description: 'FIRE or early retirement goals',
        icon: Zap,
        color: '#f59e0b'
      },
      { 
        value: 'house-purchase', 
        label: 'Major Purchase', 
        description: 'Saving for a specific large expense',
        icon: Home,
        color: '#8b5cf6'
      },
    ],
  },
  {
    id: 'goal-timeline',
    scoringKey: 'goal-timeline',
    section: 'goals',
    question: "When do you need this money?",
    subtitle: "Longer horizons allow for more growth-focused strategies.",
    type: 'select',
    weight: 'high',
    options: [
      { 
        value: 'less-than-3', 
        label: 'Less than 3 years', 
        description: 'Short-term, stability is key',
        icon: Clock,
        color: '#ef4444'
      },
      { 
        value: '3-7-years', 
        label: '3-7 years', 
        description: 'Medium-term, balanced approach',
        icon: Clock,
        color: '#f59e0b'
      },
      { 
        value: '7-15-years', 
        label: '7-15 years', 
        description: 'Long-term, can weather volatility',
        icon: Clock,
        color: '#10b981'
      },
      { 
        value: 'more-than-15', 
        label: '15+ years', 
        description: 'Very long-term, maximize growth',
        icon: Clock,
        color: '#3b82f6'
      },
    ],
  },

  // ========== RISK SECTION ==========
  {
    id: 'risk-scenario',
    scoringKey: 'risk-scenario-drop',
    section: 'risk',
    question: "Your portfolio drops 25% in a month. Your reaction?",
    subtitle: "Your instinctive response reveals your true risk tolerance.",
    type: 'select',
    weight: 'high',
    options: [
      { 
        value: 'sell-all', 
        label: 'Sell everything immediately', 
        description: 'Protect what\'s left',
        icon: AlertTriangle,
        color: '#ef4444'
      },
      { 
        value: 'sell-some', 
        label: 'Reduce my exposure', 
        description: 'Cut losses partially',
        icon: Shield,
        color: '#f97316'
      },
      { 
        value: 'hold', 
        label: 'Hold and wait it out', 
        description: 'Stay the course',
        icon: Clock,
        color: '#eab308'
      },
      { 
        value: 'buy-more', 
        label: 'Buy more at the discount', 
        description: 'Opportunity in the dip',
        icon: TrendingUp,
        color: '#22c55e'
      },
    ],
  },
  {
    id: 'risk-max-loss',
    scoringKey: 'risk-max-loss',
    section: 'risk',
    question: "What's the maximum loss you could tolerate in a year?",
    subtitle: "This sets the risk guardrails for your portfolio.",
    type: 'select',
    weight: 'high',
    options: [
      { 
        value: '10', 
        label: 'Up to 10%', 
        description: 'Very conservative',
        icon: Shield,
        color: '#22c55e'
      },
      { 
        value: '20', 
        label: 'Up to 20%', 
        description: 'Moderate risk',
        icon: Scale,
        color: '#eab308'
      },
      { 
        value: '30', 
        label: 'Up to 30%', 
        description: 'Higher risk for higher reward',
        icon: TrendingUp,
        color: '#f97316'
      },
      { 
        value: '40', 
        label: 'Up to 40%', 
        description: 'Aggressive, long-term focused',
        icon: Zap,
        color: '#ef4444'
      },
    ],
  },
  {
    id: 'risk-knowledge',
    scoringKey: 'risk-knowledge-level',
    section: 'risk',
    question: "How would you describe your investing experience?",
    subtitle: "Your knowledge level influences strategy complexity.",
    type: 'select',
    weight: 'medium',
    options: [
      { 
        value: 'beginner', 
        label: 'Beginner', 
        description: 'New to investing or minimal experience',
        icon: Sparkles,
        color: '#3b82f6'
      },
      { 
        value: 'intermediate', 
        label: 'Intermediate', 
        description: 'Understand basics, some experience',
        icon: BarChart3,
        color: '#10b981'
      },
      { 
        value: 'advanced', 
        label: 'Advanced', 
        description: 'Deep understanding, active investor',
        icon: Brain,
        color: '#8b5cf6'
      },
    ],
  },

  // ========== FINANCIAL SECTION ==========
  {
    id: 'income-stability',
    scoringKey: 'liquidity-income-stability',
    section: 'financial',
    question: "How stable is your income?",
    subtitle: "Stable income allows for more aggressive strategies.",
    type: 'select',
    weight: 'high',
    options: [
      { 
        value: 'very-stable', 
        label: 'Very Stable', 
        description: 'Secure job, predictable income',
        icon: Lock,
        color: '#22c55e'
      },
      { 
        value: 'mostly-stable', 
        label: 'Mostly Stable', 
        description: 'Good security with some variability',
        icon: Shield,
        color: '#10b981'
      },
      { 
        value: 'variable', 
        label: 'Variable', 
        description: 'Commission, freelance, or seasonal',
        icon: BarChart3,
        color: '#f59e0b'
      },
      { 
        value: 'uncertain', 
        label: 'Uncertain', 
        description: 'Startup, business owner, or unstable',
        icon: AlertTriangle,
        color: '#ef4444'
      },
    ],
  },
  {
    id: 'emergency-fund',
    scoringKey: 'liquidity-emergency-fund',
    section: 'financial',
    question: "How much emergency savings do you have?",
    subtitle: "A solid emergency fund lets you invest without panic selling.",
    type: 'select',
    weight: 'high',
    options: [
      { 
        value: 'less-than-3', 
        label: 'Less than 3 months', 
        description: 'Limited safety net',
        icon: AlertTriangle,
        color: '#ef4444'
      },
      { 
        value: '3-6-months', 
        label: '3-6 months of expenses', 
        description: 'Standard recommendation',
        icon: Shield,
        color: '#eab308'
      },
      { 
        value: 'more-than-6', 
        label: 'More than 6 months', 
        description: 'Strong safety cushion',
        icon: Lock,
        color: '#22c55e'
      },
    ],
  },

  // ========== CONSTRAINTS/PREFERENCES SECTION ==========
  {
    id: 'volatility-preference',
    scoringKey: 'constraints-volatility-preference',
    section: 'constraints',
    question: "Which return profile do you prefer?",
    subtitle: "This shapes how your portfolio is constructed.",
    type: 'select',
    weight: 'medium',
    options: [
      { 
        value: 'steady', 
        label: 'Steady & Predictable', 
        description: 'Lower returns, smoother ride',
        icon: Shield,
        color: '#22c55e'
      },
      { 
        value: 'moderate', 
        label: 'Balanced', 
        description: 'Some ups and downs for better returns',
        icon: Scale,
        color: '#3b82f6'
      },
      { 
        value: 'growth', 
        label: 'Maximum Growth', 
        description: 'Accept volatility for best long-term gains',
        icon: TrendingUp,
        color: '#f59e0b'
      },
    ],
  },
  {
    id: 'international-preference',
    scoringKey: 'constraints-international',
    section: 'constraints',
    question: "How do you feel about international investments?",
    subtitle: "Global diversification can reduce risk and increase opportunities.",
    type: 'select',
    weight: 'medium',
    options: [
      { 
        value: 'us-only', 
        label: 'US Only', 
        description: 'Stick to domestic markets',
        icon: Building2,
        color: '#3b82f6'
      },
      { 
        value: 'mostly-us', 
        label: 'Mostly US', 
        description: 'Some international exposure',
        icon: Globe,
        color: '#10b981'
      },
      { 
        value: 'balanced', 
        label: 'Global Balance', 
        description: 'Significant international allocation',
        icon: Globe,
        color: '#8b5cf6'
      },
    ],
  },
  {
    id: 'crypto-preference',
    scoringKey: 'constraints-crypto',
    section: 'constraints',
    question: "Are you interested in cryptocurrency exposure?",
    subtitle: "Crypto adds volatility but potential for higher returns.",
    type: 'select',
    weight: 'low',
    options: [
      { 
        value: 'no-crypto', 
        label: 'No Crypto', 
        description: 'Prefer traditional assets only',
        icon: Shield,
        color: '#6b7280'
      },
      { 
        value: 'small-allocation', 
        label: 'Small Allocation (up to 5%)', 
        description: 'Limited exposure as a hedge',
        icon: Bitcoin,
        color: '#f59e0b'
      },
      { 
        value: 'moderate-allocation', 
        label: 'Moderate Allocation (5-10%)', 
        description: 'Meaningful crypto position',
        icon: Bitcoin,
        color: '#f97316'
      },
    ],
  },
];

// Section metadata
const SECTIONS = {
  goals: {
    title: 'Investment Goals',
    description: 'What are you trying to achieve?',
    icon: Target,
    color: 'from-blue-500 to-cyan-500',
  },
  risk: {
    title: 'Risk Profile',
    description: 'Understanding your comfort with volatility',
    icon: Shield,
    color: 'from-amber-500 to-orange-500',
  },
  financial: {
    title: 'Financial Situation',
    description: 'Your current financial foundation',
    icon: Wallet,
    color: 'from-emerald-500 to-teal-500',
  },
  constraints: {
    title: 'Preferences',
    description: 'Customizing your portfolio',
    icon: PieChart,
    color: 'from-purple-500 to-pink-500',
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

interface EliteQuestionnaireV2Props {
  onComplete: (result: {
    responses: Record<string, { value: string | number | string[] }>;
    riskScore: number;
    riskProfile: string;
    userName: string;
  }) => void;
  onCancel?: () => void;
  userName?: string;
}

export function EliteQuestionnaireV2({ onComplete, onCancel, userName: initialUserName }: EliteQuestionnaireV2Props) {
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [userName, setUserName] = useState(initialUserName || '');
  const [showNameInput, setShowNameInput] = useState(!initialUserName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100;
  const currentSection = SECTIONS[currentQuestion?.section];

  // Check if current question is answered
  const isCurrentAnswered = useMemo(() => {
    if (showNameInput) return userName.trim().length > 0;
    return responses[currentQuestion?.id] !== undefined;
  }, [showNameInput, userName, responses, currentQuestion?.id]);

  // Handle option selection
  const handleSelect = useCallback((value: string) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  }, [currentQuestion?.id]);

  // Calculate risk score from responses
  const calculateRiskScore = useCallback(() => {
    let score = 50;

    // Goal timeline impact
    const timeline = responses['goal-timeline'];
    if (timeline === 'more-than-15') score += 15;
    else if (timeline === '7-15-years') score += 8;
    else if (timeline === '3-7-years') score -= 5;
    else if (timeline === 'less-than-3') score -= 15;

    // Risk scenario response
    const scenario = responses['risk-scenario'];
    if (scenario === 'buy-more') score += 20;
    else if (scenario === 'hold') score += 8;
    else if (scenario === 'sell-some') score -= 8;
    else if (scenario === 'sell-all') score -= 20;

    // Max loss tolerance
    const maxLoss = responses['risk-max-loss'];
    if (maxLoss === '40') score += 15;
    else if (maxLoss === '30') score += 8;
    else if (maxLoss === '20') score -= 5;
    else if (maxLoss === '10') score -= 15;

    // Income stability
    const income = responses['income-stability'];
    if (income === 'very-stable') score += 8;
    else if (income === 'mostly-stable') score += 3;
    else if (income === 'variable') score -= 5;
    else if (income === 'uncertain') score -= 12;

    // Emergency fund
    const emergency = responses['emergency-fund'];
    if (emergency === 'more-than-6') score += 8;
    else if (emergency === '3-6-months') score += 0;
    else if (emergency === 'less-than-3') score -= 12;

    // Volatility preference
    const volatility = responses['volatility-preference'];
    if (volatility === 'growth') score += 10;
    else if (volatility === 'moderate') score += 0;
    else if (volatility === 'steady') score -= 10;

    return Math.max(10, Math.min(90, Math.round(score)));
  }, [responses]);

  // Get risk profile label
  const getRiskProfile = (score: number): string => {
    if (score < 25) return 'Conservative';
    if (score < 40) return 'Moderately Conservative';
    if (score < 60) return 'Moderate';
    if (score < 75) return 'Moderately Aggressive';
    return 'Aggressive';
  };

  // Handle next
  const handleNext = useCallback(() => {
    if (showNameInput) {
      setShowNameInput(false);
      return;
    }

    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Complete - format responses for scoring engine
      setIsSubmitting(true);
      
      const scoringResponses: Record<string, { value: string | number | string[] }> = {};
      
      QUESTIONS.forEach(q => {
        if (responses[q.id]) {
          scoringResponses[q.scoringKey] = { value: responses[q.id] };
        }
      });

      const riskScore = calculateRiskScore();
      const riskProfile = getRiskProfile(riskScore);

      onComplete({
        responses: scoringResponses,
        riskScore,
        riskProfile,
        userName: userName || 'Investor',
      });
    }
  }, [showNameInput, currentQuestionIndex, responses, calculateRiskScore, onComplete, userName]);

  // Handle previous
  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (!showNameInput && !initialUserName) {
      setShowNameInput(true);
    }
  }, [currentQuestionIndex, showNameInput, initialUserName]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isCurrentAnswered) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCurrentAnswered, handleNext]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[130px]" />
      </div>

      {/* Header with progress */}
      <header className="relative z-10 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">Investment Plan Builder</span>
            </div>
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-white/50 hover:text-white"
              >
                Cancel
              </Button>
            )}
          </div>
          
          {/* Progress bar */}
          {!showNameInput && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/50">
                <span>{currentSection?.title}</span>
                <span>{currentQuestionIndex + 1} of {QUESTIONS.length}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {/* Name Input */}
          {showNameInput ? (
            <motion.div
              key="name-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <Badge className="bg-gradient-to-r from-blue-500/20 to-emerald-500/20 border-blue-500/30 text-blue-300 mb-4">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Let's Get Started
                </Badge>
                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                  What should we call you?
                </h1>
                <p className="text-white/60 max-w-md mx-auto">
                  We'll personalize your investment strategy report.
                </p>
              </div>

              <div className="max-w-sm mx-auto">
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your first name"
                  className="h-14 text-lg text-center bg-white/5 border-white/20 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </motion.div>
          ) : (
            /* Question */
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Section indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentSection?.color} flex items-center justify-center`}>
                  {currentSection?.icon && <currentSection.icon className="w-4 h-4 text-white" />}
                </div>
                <span className="text-sm text-white/50">{currentSection?.title}</span>
              </div>

              {/* Question */}
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  {currentQuestion.question}
                </h2>
                <p className="text-white/60">
                  {currentQuestion.subtitle}
                </p>
              </div>

              {/* Options */}
              <div className="grid gap-3">
                {currentQuestion.options?.map((option) => {
                  const isSelected = responses[currentQuestion.id] === option.value;
                  const Icon = option.icon;
                  
                  return (
                    <motion.button
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "relative flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200",
                        isSelected
                          ? "bg-white/10 border-blue-500 shadow-lg shadow-blue-500/20"
                          : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
                      )}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-white/20" : "bg-white/5"
                        )}
                        style={{ 
                          backgroundColor: isSelected ? `${option.color}30` : undefined 
                        }}
                      >
                        {Icon && (
                          <Icon 
                            className="w-6 h-6" 
                            style={{ color: isSelected ? option.color : 'rgba(255,255,255,0.5)' }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold mb-0.5">{option.label}</div>
                        {option.description && (
                          <div className="text-sm text-white/50">{option.description}</div>
                        )}
                      </div>

                      {/* Checkmark */}
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12 pt-6 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={showNameInput && !!initialUserName}
            className="text-white/50 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!isCurrentAnswered || isSubmitting}
            className={cn(
              "px-8 transition-all duration-200",
              isCurrentAnswered
                ? "bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white shadow-lg shadow-blue-500/25"
                : "bg-white/10 text-white/50"
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : currentQuestionIndex === QUESTIONS.length - 1 ? (
              <>
                Generate My Plan
                <Sparkles className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Keyboard hint */}
        {isCurrentAnswered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-4 text-xs text-white/30"
          >
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Enter</kbd> to continue
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default EliteQuestionnaireV2;
