/**
 * ASSETLABS - ELITE INVESTOR PROFILER V2
 * 
 * REFACTORED VERSION with:
 * - All questions directly map to scoring engine inputs
 * - Myers-Briggs style investor DNA questions (4 dimensions)
 * - Proper value formats for backend scoring
 * - Streamlined flow (15 essential questions)
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
  Zap,
  Lock,
  Globe,
  Building2,
  Bitcoin,
  Home,
  BarChart3,
  Brain,
  AlertTriangle,
  Clock,
  Scale,
  Mountain,
  Compass,
  Heart,
  TreePine,
  Eye,
  Layers,
  DollarSign,
  Info,
  LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { MobileAuthSheet } from '@/components/auth/MobileAuthSheet';
import { 
  getInvestorTypeCode, 
  getInvestorType,
  InvestorDimensions,
} from '@/data/premiumQuestionnaire';

// ============================================
// QUESTION DATA - MAPS TO SCORING ENGINE + INVESTOR DNA
// ============================================

interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  icon?: any;
  color?: string;
  dimensionScores?: Partial<InvestorDimensions>;
}

interface Question {
  id: string;
  scoringKey?: string;
  section: 'goals' | 'risk' | 'financial' | 'constraints' | 'personality';
  question: string;
  subtitle: string;
  type: 'select' | 'scenario' | 'currency';
  options?: QuestionOption[];
  scenarioA?: QuestionOption;
  scenarioB?: QuestionOption;
  weight: 'high' | 'medium' | 'low';
  placeholder?: string;
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
      { value: 'retirement', label: 'Retirement', description: 'Building a nest egg for later years', icon: Target, color: '#3b82f6' },
      { value: 'wealth-building', label: 'Wealth Building', description: 'Growing assets over time', icon: TrendingUp, color: '#10b981' },
      { value: 'financial-independence', label: 'Financial Independence', description: 'FIRE or early retirement goals', icon: Zap, color: '#f59e0b' },
      { value: 'house-purchase', label: 'Major Purchase', description: 'Saving for a specific large expense', icon: Home, color: '#8b5cf6' },
    ],
  },
  {
    id: 'investment-capital',
    scoringKey: 'financial-investment-capital',
    section: 'goals',
    question: "How much are you investing?",
    subtitle: "The amount you're putting to work in this portfolio.",
    type: 'currency',
    weight: 'high',
    placeholder: '100,000',
  },
  {
    id: 'liquid-net-worth',
    scoringKey: 'financial-liquid-net-worth',
    section: 'goals',
    question: "What's your total liquid net worth?",
    subtitle: "Cash + investments + easily accessible assets (excluding home equity).",
    type: 'currency',
    weight: 'high',
    placeholder: '500,000',
  },
  {
    id: 'goal-amount',
    scoringKey: 'goal-amount',
    section: 'goals',
    question: "What's your target goal amount?",
    subtitle: "The dollar amount you're aiming to reach with this portfolio.",
    type: 'currency',
    weight: 'high',
    placeholder: '1,000,000',
  },
  {
    id: 'monthly-contribution',
    scoringKey: 'financial-monthly-contribution',
    section: 'goals',
    question: "How much can you contribute monthly?",
    subtitle: "Regular contributions compound powerfully over time.",
    type: 'currency',
    weight: 'high',
    placeholder: '1,000',
  },
  {
    id: 'disposable-income',
    scoringKey: 'financial-disposable-income',
    section: 'financial',
    question: "What's your annual disposable income?",
    subtitle: "Income remaining after taxes and essential expenses (housing, utilities, food, insurance).",
    type: 'currency',
    weight: 'high',
    placeholder: '50,000',
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
      { value: 'less-than-3', label: 'Less than 3 years', description: 'Short-term, stability is key', icon: Clock, color: '#ef4444' },
      { value: '3-7-years', label: '3-7 years', description: 'Medium-term, balanced approach', icon: Clock, color: '#f59e0b' },
      { value: '7-15-years', label: '7-15 years', description: 'Long-term, can weather volatility', icon: Clock, color: '#10b981' },
      { value: 'more-than-15', label: '15+ years', description: 'Very long-term, maximize growth', icon: Clock, color: '#3b82f6' },
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
      { value: 'sell-all', label: 'Sell everything immediately', description: 'Protect what\'s left', icon: AlertTriangle, color: '#ef4444' },
      { value: 'sell-some', label: 'Reduce my exposure', description: 'Cut losses partially', icon: Shield, color: '#f97316' },
      { value: 'hold', label: 'Hold and wait it out', description: 'Stay the course', icon: Clock, color: '#eab308' },
      { value: 'buy-more', label: 'Buy more at the discount', description: 'Opportunity in the dip', icon: TrendingUp, color: '#22c55e' },
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
      { value: '10', label: 'Up to 10%', description: 'Very conservative', icon: Shield, color: '#22c55e' },
      { value: '20', label: 'Up to 20%', description: 'Moderate risk', icon: Scale, color: '#eab308' },
      { value: '30', label: 'Up to 30%', description: 'Higher risk for higher reward', icon: TrendingUp, color: '#f97316' },
      { value: '40', label: 'Up to 40%', description: 'Aggressive, long-term focused', icon: Zap, color: '#ef4444' },
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
      { value: 'beginner', label: 'Beginner', description: 'New to investing or minimal experience', icon: Sparkles, color: '#3b82f6' },
      { value: 'intermediate', label: 'Intermediate', description: 'Understand basics, some experience', icon: BarChart3, color: '#10b981' },
      { value: 'advanced', label: 'Advanced', description: 'Deep understanding, active investor', icon: Brain, color: '#8b5cf6' },
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
      { value: 'very-stable', label: 'Very Stable', description: 'Secure job, predictable income', icon: Lock, color: '#22c55e' },
      { value: 'mostly-stable', label: 'Mostly Stable', description: 'Good security with some variability', icon: Shield, color: '#10b981' },
      { value: 'variable', label: 'Variable', description: 'Commission, freelance, or seasonal', icon: BarChart3, color: '#f59e0b' },
      { value: 'uncertain', label: 'Uncertain', description: 'Startup, business owner, or unstable', icon: AlertTriangle, color: '#ef4444' },
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
      { value: 'less-than-3', label: 'Less than 3 months', description: 'Limited safety net', icon: AlertTriangle, color: '#ef4444' },
      { value: '3-6-months', label: '3-6 months of expenses', description: 'Standard recommendation', icon: Shield, color: '#eab308' },
      { value: 'more-than-6', label: 'More than 6 months', description: 'Strong safety cushion', icon: Lock, color: '#22c55e' },
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
      { value: 'steady', label: 'Steady & Predictable', description: 'Lower returns, smoother ride', icon: Shield, color: '#22c55e' },
      { value: 'moderate', label: 'Balanced', description: 'Some ups and downs for better returns', icon: Scale, color: '#3b82f6' },
      { value: 'growth', label: 'Maximum Growth', description: 'Accept volatility for best long-term gains', icon: TrendingUp, color: '#f59e0b' },
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
      { value: 'us-only', label: 'US Only', description: 'Stick to domestic markets', icon: Building2, color: '#3b82f6' },
      { value: 'mostly-us', label: 'Mostly US', description: 'Some international exposure', icon: Globe, color: '#10b981' },
      { value: 'balanced', label: 'Global Balance', description: 'Significant international allocation', icon: Globe, color: '#8b5cf6' },
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
      { value: 'no-crypto', label: 'No Crypto', description: 'Prefer traditional assets only', icon: Shield, color: '#6b7280' },
      { value: 'small-allocation', label: 'Small Allocation (up to 5%)', description: 'Limited exposure as a hedge', icon: Bitcoin, color: '#f59e0b' },
      { value: 'moderate-allocation', label: 'Moderate Allocation (5-10%)', description: 'Meaningful crypto position', icon: Bitcoin, color: '#f97316' },
    ],
  },

  // ========== PERSONALITY / INVESTOR DNA SECTION ==========
  {
    id: 'personality-journey',
    section: 'personality',
    question: "If investing were a journey, which describes you better?",
    subtitle: "This reveals whether you're a Guardian (cautious) or Pioneer (bold).",
    type: 'scenario',
    weight: 'high',
    scenarioA: {
      value: 'A',
      label: 'The Mountain Climber',
      description: 'Calculated ascent with safety ropes. Every step is planned. The view from the top is worth the careful journey.',
      icon: Mountain,
      color: '#3b82f6',
      dimensionScores: { risk: -25 }
    },
    scenarioB: {
      value: 'B',
      label: 'The Explorer',
      description: 'Uncharted territories excite you. Yes, there are risks, but the greatest discoveries come from bold moves.',
      icon: Compass,
      color: '#f59e0b',
      dimensionScores: { risk: 25 }
    }
  },
  {
    id: 'personality-regret',
    section: 'personality',
    question: "Which regret would haunt you more?",
    subtitle: "This reveals your core investment psychology - loss aversion vs opportunity cost.",
    type: 'scenario',
    weight: 'high',
    scenarioA: {
      value: 'A',
      label: 'Missing out on 50% gains',
      description: 'You played it safe while others made a fortune. The opportunity was right there.',
      icon: TrendingUp,
      color: '#10b981',
      dimensionScores: { risk: 20, focus: 10 }
    },
    scenarioB: {
      value: 'B',
      label: 'Losing 30% of your savings',
      description: 'You took a risk and it didn\'t work out. That money took years to save.',
      icon: Shield,
      color: '#ef4444',
      dimensionScores: { risk: -20, focus: -10 }
    }
  },
  {
    id: 'personality-decision',
    section: 'personality',
    question: "How do you typically make important decisions?",
    subtitle: "This determines if you're Analytical (data-driven) or Intuitive (gut-driven).",
    type: 'scenario',
    weight: 'high',
    scenarioA: {
      value: 'A',
      label: 'Research Mode',
      description: 'Gather data, compare options, create spreadsheets. Make decisions based on thorough analysis.',
      icon: BarChart3,
      color: '#3b82f6',
      dimensionScores: { decision: -25 }
    },
    scenarioB: {
      value: 'B',
      label: 'Instinct Mode',
      description: 'Trust your experience and intuition. The best decisions often come from pattern recognition, not spreadsheets.',
      icon: Heart,
      color: '#ec4899',
      dimensionScores: { decision: 25 }
    }
  },
  {
    id: 'personality-gardening',
    section: 'personality',
    question: "Your approach to growing wealth is more like:",
    subtitle: "This reveals if you're Patient (long-term) or Active (hands-on).",
    type: 'scenario',
    weight: 'high',
    scenarioA: {
      value: 'A',
      label: 'Plant and let it grow',
      description: 'Choose good investments, then trust the process. Check occasionally but don\'t over-tend.',
      icon: TreePine,
      color: '#10b981',
      dimensionScores: { time: -25 }
    },
    scenarioB: {
      value: 'B',
      label: 'Active cultivation',
      description: 'Regular attention, pruning, adjusting. Great portfolios require constant care and optimization.',
      icon: Zap,
      color: '#f59e0b',
      dimensionScores: { time: 25 }
    }
  },
  {
    id: 'personality-diversification',
    section: 'personality',
    question: "Which investing wisdom resonates more with you?",
    subtitle: "This determines if you're a Diversifier or Concentrator.",
    type: 'scenario',
    weight: 'high',
    scenarioA: {
      value: 'A',
      label: '"Don\'t put all eggs in one basket"',
      description: 'Classic wisdom. Diversification protects against the unexpected.',
      icon: Layers,
      color: '#8b5cf6',
      dimensionScores: { focus: -25 }
    },
    scenarioB: {
      value: 'B',
      label: '"Put eggs in one basket, watch it closely"',
      description: 'Mark Twain and Warren Buffett agree - concentration builds wealth faster.',
      icon: Eye,
      color: '#f97316',
      dimensionScores: { focus: 25 }
    }
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
  personality: {
    title: 'Investor DNA',
    description: 'Discover your investing personality',
    icon: Brain,
    color: 'from-indigo-500 to-blue-500',
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
    investorType: string;
    investorTypeName: string;
    userName: string;
    dimensions: InvestorDimensions;
  }) => void;
  onCancel?: () => void;
}

export function EliteQuestionnaireV2({ onComplete, onCancel }: EliteQuestionnaireV2Props) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / QUESTIONS.length) * 100;
  const currentSection = SECTIONS[currentQuestion?.section];

  // Check if current question is answered
  const isCurrentAnswered = useMemo(() => {
    if (currentQuestion?.type === 'currency') {
      const val = responses[currentQuestion?.id];
      if (!val) return false;
      const num = parseFloat(val.replace(/[^0-9.]/g, ''));
      return !isNaN(num) && num > 0;
    }
    return responses[currentQuestion?.id] !== undefined;
  }, [responses, currentQuestion?.id, currentQuestion?.type]);

  // Handle option selection
  const handleSelect = useCallback((value: string) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  }, [currentQuestion?.id]);

  // Calculate investor dimensions from personality questions
  const calculateDimensions = useCallback((): InvestorDimensions => {
    let risk = 50, decision = 50, time = 50, focus = 50;
    
    QUESTIONS.filter(q => q.section === 'personality' && q.type === 'scenario').forEach(q => {
      const response = responses[q.id];
      if (!response) return;
      
      const scenario = response === 'A' ? q.scenarioA : q.scenarioB;
      if (scenario?.dimensionScores) {
        if (scenario.dimensionScores.risk) risk += scenario.dimensionScores.risk;
        if (scenario.dimensionScores.decision) decision += scenario.dimensionScores.decision;
        if (scenario.dimensionScores.time) time += scenario.dimensionScores.time;
        if (scenario.dimensionScores.focus) focus += scenario.dimensionScores.focus;
      }
    });
    
    return {
      risk: Math.max(0, Math.min(100, risk)),
      decision: Math.max(0, Math.min(100, decision)),
      time: Math.max(0, Math.min(100, time)),
      focus: Math.max(0, Math.min(100, focus)),
    };
  }, [responses]);

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

  // Get user name from profile or email
  const getUserDisplayName = useCallback(() => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Investor';
  }, [user]);

  // Handle next
  const handleNext = useCallback(() => {
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Check if user is authenticated before submitting
      if (!isAuthenticated) {
        setShowAuthSheet(true);
        return;
      }

      // Complete - format responses for scoring engine
      setIsSubmitting(true);
      
      const scoringResponses: Record<string, { value: string | number | string[] }> = {};
      
      // Only include questions with scoringKey
      QUESTIONS.forEach(q => {
        if (responses[q.id] && q.scoringKey) {
          // Parse currency values as numbers
          if (q.type === 'currency') {
            const numVal = parseFloat(responses[q.id].replace(/[^0-9.]/g, ''));
            scoringResponses[q.scoringKey] = { value: numVal };
          } else {
            scoringResponses[q.scoringKey] = { value: responses[q.id] };
          }
        }
      });

      const riskScore = calculateRiskScore();
      const riskProfile = getRiskProfile(riskScore);
      const dimensions = calculateDimensions();
      const typeCode = getInvestorTypeCode(dimensions);
      const investorType = getInvestorType(typeCode);

      onComplete({
        responses: scoringResponses,
        riskScore,
        riskProfile,
        investorType: typeCode,
        investorTypeName: investorType.name,
        userName: getUserDisplayName(),
        dimensions,
      });
    }
  }, [currentQuestionIndex, responses, calculateRiskScore, calculateDimensions, onComplete, isAuthenticated, getUserDisplayName]);

  // Handle previous
  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  // Handle successful auth - auto-submit
  const handleAuthSuccess = useCallback(() => {
    setShowAuthSheet(false);
    // After auth, trigger submit
    handleNext();
  }, [handleNext]);

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

  // Render scenario question (A/B choice)
  const renderScenarioQuestion = (question: Question) => {
    const selectedValue = responses[question.id];
    
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[question.scenarioA, question.scenarioB].map((scenario) => {
          if (!scenario) return null;
          const isSelected = selectedValue === scenario.value;
          const Icon = scenario.icon;
          
          return (
            <motion.button
              key={scenario.value}
              onClick={() => handleSelect(scenario.value)}
              className={cn(
                "relative flex flex-col items-center text-center p-6 rounded-xl border transition-all duration-200",
                isSelected
                  ? "bg-white/10 border-blue-500 shadow-lg shadow-blue-500/20"
                  : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                  isSelected ? "bg-white/20" : "bg-white/5"
                )}
                style={{ backgroundColor: isSelected ? `${scenario.color}30` : undefined }}
              >
                {Icon && (
                  <Icon 
                    className="w-8 h-8" 
                    style={{ color: isSelected ? scenario.color : 'rgba(255,255,255,0.5)' }}
                  />
                )}
              </div>
              <h3 className="font-semibold text-lg mb-2">{scenario.label}</h3>
              <p className="text-sm text-white/60">{scenario.description}</p>
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  // Render select question
  const renderSelectQuestion = (question: Question) => {
    return (
      <div className="grid gap-3">
        {question.options?.map((option) => {
          const isSelected = responses[question.id] === option.value;
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
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "bg-white/20" : "bg-white/5"
                )}
                style={{ backgroundColor: isSelected ? `${option.color}30` : undefined }}
              >
                {Icon && (
                  <Icon 
                    className="w-6 h-6" 
                    style={{ color: isSelected ? option.color : 'rgba(255,255,255,0.5)' }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold mb-0.5">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-white/50">{option.description}</div>
                )}
              </div>
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  // Format currency input
  const formatCurrency = (value: string): string => {
    const num = value.replace(/[^0-9]/g, '');
    if (!num) return '';
    return new Intl.NumberFormat('en-US').format(parseInt(num));
  };

  // Calculate risk/reward insight based on capital, net worth, and goal
  const getRiskRewardInsight = useMemo(() => {
    const capital = parseFloat((responses['investment-capital'] || '0').replace(/[^0-9.]/g, ''));
    const netWorth = parseFloat((responses['liquid-net-worth'] || '0').replace(/[^0-9.]/g, ''));
    const goal = parseFloat((responses['goal-amount'] || '0').replace(/[^0-9.]/g, ''));
    const timeline = responses['goal-timeline'];
    
    if (!capital || !goal || !timeline) return null;
    
    const growthNeeded = goal / capital;
    const years = timeline === 'less-than-3' ? 2 : timeline === '3-7-years' ? 5 : timeline === '7-15-years' ? 10 : 20;
    const requiredCAGR = (Math.pow(growthNeeded, 1 / years) - 1) * 100;
    const portfolioRatio = netWorth > 0 ? (capital / netWorth) * 100 : 0;
    
    let riskLevel: 'low' | 'moderate' | 'high' | 'very-high' = 'moderate';
    let message = '';
    
    if (requiredCAGR > 15) {
      riskLevel = 'very-high';
      message = `To grow from $${formatCurrency(capital.toString())} to $${formatCurrency(goal.toString())} in ${years} years, you'd need ~${requiredCAGR.toFixed(1)}% annual returns. This is aggressive—consider extending your timeline or adjusting your goal.`;
    } else if (requiredCAGR > 10) {
      riskLevel = 'high';
      message = `Your goal requires ~${requiredCAGR.toFixed(1)}% annual returns. This is achievable with an aggressive equity-heavy portfolio, but expect significant volatility.`;
    } else if (requiredCAGR > 6) {
      riskLevel = 'moderate';
      message = `Your goal requires ~${requiredCAGR.toFixed(1)}% annual returns. A balanced portfolio can historically achieve this with moderate risk.`;
    } else {
      riskLevel = 'low';
      message = `Your goal requires only ~${requiredCAGR.toFixed(1)}% annual returns. This is conservative and achievable with a lower-risk approach.`;
    }
    
    if (portfolioRatio > 80) {
      message += ` Note: You're investing ${portfolioRatio.toFixed(0)}% of your liquid net worth—ensure you maintain adequate emergency reserves.`;
    }
    
    return { riskLevel, message, requiredCAGR };
  }, [responses]);

  // Render currency input question
  const renderCurrencyQuestion = (question: Question) => {
    const currentValue = responses[question.id] || '';
    
    return (
      <div className="space-y-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <DollarSign className="w-6 h-6 text-white/50" />
          </div>
          <Input
            type="text"
            inputMode="numeric"
            value={currentValue}
            onChange={(e) => {
              const formatted = formatCurrency(e.target.value);
              setResponses(prev => ({ ...prev, [question.id]: formatted }));
            }}
            placeholder={question.placeholder || '0'}
            className="h-16 text-2xl pl-12 bg-white/5 border-white/20 focus:border-blue-500 text-white placeholder:text-white/30"
            autoFocus
          />
        </div>
        
        {/* Show risk/reward insight after goal amount is entered */}
        {question.id === 'goal-amount' && getRiskRewardInsight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-4 rounded-xl border flex gap-3",
              getRiskRewardInsight.riskLevel === 'very-high' ? "bg-rose-500/10 border-rose-500/30" :
              getRiskRewardInsight.riskLevel === 'high' ? "bg-amber-500/10 border-amber-500/30" :
              getRiskRewardInsight.riskLevel === 'moderate' ? "bg-blue-500/10 border-blue-500/30" :
              "bg-emerald-500/10 border-emerald-500/30"
            )}
          >
            <Info className={cn(
              "w-5 h-5 shrink-0 mt-0.5",
              getRiskRewardInsight.riskLevel === 'very-high' ? "text-rose-400" :
              getRiskRewardInsight.riskLevel === 'high' ? "text-amber-400" :
              getRiskRewardInsight.riskLevel === 'moderate' ? "text-blue-400" :
              "text-emerald-400"
            )} />
            <p className="text-sm text-white/80">{getRiskRewardInsight.message}</p>
          </motion.div>
        )}
      </div>
    );
  };

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
              <span className="font-semibold">Strategy Builder</span>
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
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentSection?.color} flex items-center justify-center`}>
                {currentSection?.icon && <currentSection.icon className="w-4 h-4 text-white" />}
              </div>
              <span className="text-sm text-white/50">{currentSection?.title}</span>
              {currentQuestion.section === 'personality' && (
                <Badge variant="outline" className="ml-2 border-indigo-500/30 text-indigo-300 text-xs">
                  Investor DNA
                </Badge>
              )}
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                {currentQuestion.question}
              </h2>
              <p className="text-white/60">
                {currentQuestion.subtitle}
              </p>
            </div>
            {currentQuestion.type === 'scenario' 
              ? renderScenarioQuestion(currentQuestion)
              : currentQuestion.type === 'currency'
              ? renderCurrencyQuestion(currentQuestion)
              : renderSelectQuestion(currentQuestion)
            }
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12 pt-6 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
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

      {/* Auth Sheet for unauthenticated users */}
      <MobileAuthSheet
        open={showAuthSheet}
        onOpenChange={setShowAuthSheet}
        title="Create an account to generate your strategy"
        description="Sign up for free to receive your personalized investment plan."
      />
    </div>
  );
}

export default EliteQuestionnaireV2;
