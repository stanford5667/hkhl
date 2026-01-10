/**
 * ASSETLABS - ELITE INVESTOR PROFILER
 * 
 * A sleek, modern questionnaire that:
 * - Email capture ONLY at the end (after questionnaire completion)
 * - No excessive popups - clean inline education
 * - Beautiful graphics and data visualizations
 * - All asset classes (not just ETFs)
 * - Detailed written report
 * - Premium feel inspired by Stripe, Linear, Vercel
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Sparkles,
  TrendingUp,
  Shield,
  Target,
  Wallet,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Lock,
  ArrowRight,
  Play,
  Info,
  Globe,
  Building2,
  Gem,
  Bitcoin,
  Home,
  Briefcase,
  Brain,
  Mountain,
  Compass,
  Heart,
  TreePine,
  Clock,
  Layers,
  Eye,
  Users,
  X,
} from 'lucide-react';
import { ComprehensiveInvestmentResults } from './ComprehensiveInvestmentPlan';
import { AuthStep } from './AuthStep';
import { 
  LineChartGraphic, 
  MiniPieChart, 
  BarChartMini, 
  TickerTape,
  PulseGrid,
} from './FinanceGraphics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  INVESTOR_TYPES, 
  calculateInvestorDimensions, 
  getInvestorTypeCode, 
  getInvestorType 
} from '@/data/premiumQuestionnaire';

// ============================================
// SECTION METADATA
// ============================================
const SECTION_META: Record<string, { title: string; description: string; icon: any; color: string }> = {
  welcome: {
    title: 'Getting Started',
    description: 'Let\'s personalize your experience',
    icon: Sparkles,
    color: 'from-blue-500 to-purple-500',
  },
  goals: {
    title: 'Your Investment Goals',
    description: 'Understanding what you want to achieve helps us build the right strategy',
    icon: Target,
    color: 'from-emerald-500 to-teal-500',
  },
  risk: {
    title: 'Risk Assessment',
    description: 'Your comfort with volatility shapes your portfolio allocation',
    icon: Shield,
    color: 'from-amber-500 to-orange-500',
  },
  financial: {
    title: 'Financial Situation',
    description: 'Your current position influences how much risk you can take',
    icon: Wallet,
    color: 'from-violet-500 to-purple-500',
  },
  preferences: {
    title: 'Investment Preferences',
    description: 'Your philosophy and interests guide our recommendations',
    icon: PieChart,
    color: 'from-pink-500 to-rose-500',
  },
  vision: {
    title: 'Your Vision',
    description: 'Defining success helps us measure progress',
    icon: TrendingUp,
    color: 'from-cyan-500 to-blue-500',
  },
  personality: {
    title: 'Your Investor DNA',
    description: 'Discover your investing personality – like Myers-Briggs for finance',
    icon: Brain,
    color: 'from-indigo-500 to-blue-500',
  },
};

// ============================================
// QUESTION DATA - COMPREHENSIVE
// ============================================
const QUESTIONS = [
  // Welcome
  {
    id: 'name',
    section: 'welcome',
    question: "What should we call you?",
    subtitle: "We'll use this to personalize your investment strategy report.",
    type: 'text',
    placeholder: 'Your first name',
    visual: 'gradient-orb',
  },
  // Goals
  {
    id: 'goal-primary',
    section: 'goals',
    question: "What's your primary investment objective?",
    subtitle: "This determines the core focus of your portfolio strategy.",
    type: 'visual-select',
    options: [
      { value: 'wealth-growth', label: 'Wealth Growth', icon: TrendingUp, description: 'Maximize long-term capital appreciation' },
      { value: 'retirement', label: 'Retirement', icon: Target, description: 'Build a secure retirement nest egg' },
      { value: 'income', label: 'Passive Income', icon: Wallet, description: 'Generate regular cash flow from investments' },
      { value: 'preservation', label: 'Wealth Preservation', icon: Shield, description: 'Protect and maintain purchasing power' },
    ],
  },
  {
    id: 'goal-timeline',
    section: 'goals',
    question: "What's your investment time horizon?",
    subtitle: "Longer horizons allow for more growth-oriented strategies.",
    type: 'timeline-slider',
  },
  {
    id: 'goal-amount',
    section: 'goals',
    question: "What's your investable amount?",
    subtitle: "This helps us recommend appropriate diversification and investment vehicles.",
    type: 'amount-slider',
  },
  // Risk
  {
    id: 'risk-scenario',
    section: 'risk',
    question: "Your portfolio drops 25% in a month. Your reaction?",
    subtitle: "Your instinctive response reveals your true risk tolerance.",
    type: 'scenario-select',
    visual: 'chart-drop',
    options: [
      { value: 'sell-all', label: 'Sell everything', score: 1, color: '#ef4444' },
      { value: 'sell-some', label: 'Reduce exposure', score: 2, color: '#f97316' },
      { value: 'hold', label: 'Stay the course', score: 3, color: '#eab308' },
      { value: 'buy-more', label: 'Buy the dip', score: 4, color: '#22c55e' },
    ],
  },
  {
    id: 'risk-tolerance',
    section: 'risk',
    question: "What's the maximum annual loss you could tolerate?",
    subtitle: "This sets the guardrails for your portfolio's volatility.",
    type: 'risk-dial',
  },
  {
    id: 'risk-experience',
    section: 'risk',
    question: "Have you invested through a major market downturn?",
    subtitle: "Past experience shapes how you'll handle future volatility.",
    type: 'experience-select',
    options: [
      { value: 'never', label: 'No prior experience', insight: "We'll start you with a steadier allocation" },
      { value: 'watched', label: 'Yes, but sold early', insight: 'Understanding your triggers helps us build a better plan' },
      { value: 'held', label: 'Yes, and held through', insight: 'Battle-tested discipline is valuable' },
      { value: 'bought', label: 'Yes, and bought more', insight: 'Contrarian strength is rare and powerful' },
    ],
  },
  // Financial Situation
  {
    id: 'income-stability',
    section: 'financial',
    question: "How stable is your primary income?",
    subtitle: "Stable income allows for more aggressive investing.",
    type: 'stability-select',
    options: [
      { value: 'very-stable', label: 'Very Stable', icon: Lock, description: 'Secure employment, predictable income' },
      { value: 'stable', label: 'Mostly Stable', icon: Shield, description: 'Good job security with some variability' },
      { value: 'variable', label: 'Variable', icon: BarChart3, description: 'Commission, freelance, or seasonal' },
      { value: 'uncertain', label: 'Uncertain', icon: Zap, description: 'Business owner or startup' },
    ],
  },
  {
    id: 'emergency-fund',
    section: 'financial',
    question: "How many months of expenses in emergency savings?",
    subtitle: "A solid emergency fund lets you invest without needing to sell at bad times.",
    type: 'month-slider',
  },
  {
    id: 'existing-assets',
    section: 'financial',
    question: "What do you currently own?",
    subtitle: "Select all that apply. This helps us understand your starting point.",
    type: 'asset-multi',
    options: [
      { value: 'stocks', label: 'Stocks', icon: LineChart },
      { value: 'bonds', label: 'Bonds', icon: Shield },
      { value: 'real-estate', label: 'Real Estate', icon: Home },
      { value: 'crypto', label: 'Crypto', icon: Bitcoin },
      { value: 'business', label: 'Business Equity', icon: Building2 },
      { value: 'alternatives', label: 'Alternatives', icon: Gem },
      { value: 'none', label: 'Starting Fresh', icon: Sparkles },
    ],
  },
  // Preferences
  {
    id: 'pref-style',
    section: 'preferences',
    question: "Which investment philosophy resonates with you?",
    subtitle: "Your approach influences how we construct your portfolio.",
    type: 'philosophy-select',
    options: [
      { value: 'passive', label: 'Index Investing', description: 'Low-cost, broad market exposure', philosophy: 'The market is efficient; capture its returns' },
      { value: 'active', label: 'Active Management', description: 'Seeking alpha through selection', philosophy: 'Skill and research can beat the market' },
      { value: 'value', label: 'Value Investing', description: 'Finding underpriced assets', philosophy: 'Price is what you pay, value is what you get' },
      { value: 'growth', label: 'Growth Investing', description: 'High-growth companies', philosophy: "Tomorrow's winners are worth paying up for" },
      { value: 'income', label: 'Income Focused', description: 'Dividends and yield', philosophy: 'Cash flow today is worth more than promises' },
    ],
  },
  {
    id: 'pref-assets',
    section: 'preferences',
    question: "Which asset classes interest you most?",
    subtitle: "Select multiple. We'll incorporate your interests into the allocation.",
    type: 'asset-interest',
    options: [
      { value: 'us-stocks', label: 'US Equities', icon: LineChart, color: '#3b82f6' },
      { value: 'intl-stocks', label: 'International', icon: Globe, color: '#8b5cf6' },
      { value: 'bonds', label: 'Fixed Income', icon: Shield, color: '#10b981' },
      { value: 'real-estate', label: 'Real Estate', icon: Home, color: '#f59e0b' },
      { value: 'crypto', label: 'Digital Assets', icon: Bitcoin, color: '#f97316' },
      { value: 'alternatives', label: 'Alternatives', icon: Gem, color: '#ec4899' },
      { value: 'commodities', label: 'Commodities', icon: Briefcase, color: '#6366f1' },
    ],
  },
  {
    id: 'pref-involvement',
    section: 'preferences',
    question: "How hands-on do you want to be?",
    subtitle: "This affects whether we recommend self-managed or advisory solutions.",
    type: 'involvement-slider',
  },
  // Vision
  {
    id: 'vision-success',
    section: 'vision',
    question: "What does investment success look like for you in 10 years?",
    subtitle: "Paint a picture of your financial future. This helps us align your strategy with your life goals.",
    type: 'text',
    placeholder: 'E.g., Financial independence, a second home, college funds for kids...',
    multiline: true,
  },
  // Personality / Investor DNA - Myers-Briggs style questions
  {
    id: 'personality-journey',
    section: 'personality',
    question: "If investing were a journey, which describes you better?",
    subtitle: "This reveals your natural approach to uncertainty and reward.",
    type: 'scenario',
    scenarioA: {
      label: 'The Mountain Climber',
      description: 'Calculated ascent with safety ropes. Every step is planned. The view from the top is worth the careful journey.',
      traits: ['Methodical', 'Risk-aware', 'Patient'],
      iconName: 'Mountain',
      dimensionScores: { risk: -25 }
    },
    scenarioB: {
      label: 'The Explorer',
      description: 'Uncharted territories excite you. Yes, there are risks, but the greatest discoveries come from bold moves.',
      traits: ['Adventurous', 'Opportunistic', 'Bold'],
      iconName: 'Compass',
      dimensionScores: { risk: 25 }
    }
  },
  {
    id: 'personality-dinner-party',
    section: 'personality',
    question: "At a dinner party, someone shares an exciting investment tip. Your instinct?",
    subtitle: "This reveals how you process new investment information.",
    type: 'scenario',
    scenarioA: {
      label: '"Interesting, I\'ll research it thoroughly first"',
      description: 'You appreciate the tip but need to verify everything yourself before considering it.',
      traits: ['Cautious', 'Due-diligence focused'],
      iconName: 'Brain',
      dimensionScores: { risk: -15, decision: -15 }
    },
    scenarioB: {
      label: '"Tell me more! This could be the next big thing"',
      description: 'Your ears perk up at opportunity. You love hearing about potential winners.',
      traits: ['Opportunistic', 'Excitement-driven'],
      iconName: 'Sparkles',
      dimensionScores: { risk: 15, decision: 15 }
    }
  },
  {
    id: 'personality-regret',
    section: 'personality',
    question: "Which regret would haunt you more?",
    subtitle: "This reveals your core investment psychology.",
    type: 'scenario',
    scenarioA: {
      label: 'Missing out on 50% gains',
      description: 'You played it safe while others made a fortune. The opportunity was right there.',
      traits: ['Fear of missing out', 'Growth-oriented'],
      iconName: 'TrendingUp',
      dimensionScores: { risk: 20, focus: 10 }
    },
    scenarioB: {
      label: 'Losing 30% of your savings',
      description: 'You took a risk and it didn\'t work out. That money took years to save.',
      traits: ['Loss aversion', 'Security-oriented'],
      iconName: 'Shield',
      dimensionScores: { risk: -20, focus: -10 }
    }
  },
  {
    id: 'personality-restaurant',
    section: 'personality',
    question: "How do you pick a restaurant in a new city?",
    subtitle: "How you make everyday decisions often mirrors how you make investment decisions.",
    type: 'scenario',
    scenarioA: {
      label: 'Research Mode',
      description: 'Check reviews, compare ratings, look at menus, maybe create a shortlist. Information is power.',
      traits: ['Analytical', 'Thorough', 'Data-driven'],
      iconName: 'BarChart3',
      dimensionScores: { decision: -25 }
    },
    scenarioB: {
      label: 'Instinct Mode',
      description: 'Walk around, see what feels right, trust the vibe. The best finds are often unexpected.',
      traits: ['Intuitive', 'Spontaneous', 'Trusts gut'],
      iconName: 'Heart',
      dimensionScores: { decision: 25 }
    }
  },
  {
    id: 'personality-gardening',
    section: 'personality',
    question: "Your approach to a garden would be:",
    subtitle: "This metaphor reveals your investment temperament.",
    type: 'scenario',
    scenarioA: {
      label: 'Plant and let nature work',
      description: 'Choose good seeds, plant them well, then trust the process. Check occasionally but don\'t over-tend.',
      traits: ['Patient', 'Long-term thinker', 'Hands-off'],
      iconName: 'TreePine',
      dimensionScores: { time: -25 }
    },
    scenarioB: {
      label: 'Active cultivation',
      description: 'Regular attention, pruning, adjusting. A great garden requires constant care and optimization.',
      traits: ['Active', 'Engaged', 'Hands-on'],
      iconName: 'Zap',
      dimensionScores: { time: 25 }
    }
  },
  {
    id: 'personality-winner',
    section: 'personality',
    question: "Your investment is up 40% in 6 months. What do you do?",
    subtitle: "This reveals your trading temperament.",
    type: 'scenario',
    scenarioA: {
      label: 'Hold for the long term',
      description: 'Winners keep winning. If the thesis is intact, why sell? Let it compound.',
      traits: ['Patient', 'Conviction holder'],
      iconName: 'Clock',
      dimensionScores: { time: -20, focus: 10 }
    },
    scenarioB: {
      label: 'Take some profits',
      description: 'Lock in gains, reduce risk. Use the profits to find the next opportunity.',
      traits: ['Active manager', 'Profit taker'],
      iconName: 'Target',
      dimensionScores: { time: 20, focus: -10 }
    }
  },
  {
    id: 'personality-buffet',
    section: 'personality',
    question: "At an all-you-can-eat buffet, you:",
    subtitle: "This reveals your natural allocation instincts.",
    type: 'scenario',
    scenarioA: {
      label: 'Sample everything',
      description: 'A little of this, a little of that. Why limit yourself? Variety is the spice of life.',
      traits: ['Diversifier', 'Variety seeker'],
      iconName: 'Layers',
      dimensionScores: { focus: -25 }
    },
    scenarioB: {
      label: 'Fill up on your favorites',
      description: 'You know what you like. Why waste plate space on things you\'re lukewarm about?',
      traits: ['Concentrator', 'Conviction-driven'],
      iconName: 'Target',
      dimensionScores: { focus: 25 }
    }
  },
  {
    id: 'personality-wisdom',
    section: 'personality',
    question: "Which investing wisdom resonates more?",
    subtitle: "This reveals your portfolio philosophy.",
    type: 'scenario',
    scenarioA: {
      label: '"Don\'t put all eggs in one basket"',
      description: 'Classic wisdom. Diversification protects against the unexpected.',
      traits: ['Traditional', 'Risk-averse'],
      iconName: 'Layers',
      dimensionScores: { focus: -20 }
    },
    scenarioB: {
      label: '"Put eggs in one basket, watch it closely"',
      description: 'Mark Twain and Warren Buffett agree - concentration builds wealth.',
      traits: ['Contrarian', 'High-conviction'],
      iconName: 'Eye',
      dimensionScores: { focus: 20 }
    }
  },
];

// ============================================
// PAGE GROUPINGS - One question per page
// ============================================
const PAGES = QUESTIONS.filter(q => q.id !== 'name').map(q => ({
  id: q.id,
  section: q.section,
  title: SECTION_META[q.section]?.title || q.section,
  questions: [q.id],
}));

// Helper to get question by ID
const getQuestionById = (id: string) => QUESTIONS.find(q => q.id === id);

// ============================================
// MAIN COMPONENT
// ============================================

interface EliteQuestionnaireProps {
  onComplete?: (result: {
    responses: Record<string, any>;
    riskScore: number;
    riskProfile: string;
    investorType: string;
    investorTypeName: string;
    planContent: string;
    userName: string;
  }) => void;
  onCancel?: () => void;
  userId?: string;
}

export function EliteQuestionnaire({ onComplete, onCancel, userId }: EliteQuestionnaireProps) {
  const { toast } = useToast();
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({
    // Initialize slider defaults so users don't have to interact to continue
    'goal-timeline': 10,
    'goal-amount': 50000,
    'risk-tolerance': 20,
    'emergency-fund': 6,
    'pref-involvement': 50,
  });
  const [phase, setPhase] = useState<'auth' | 'questionnaire' | 'email-capture' | 'generating' | 'results'>(userId ? 'questionnaire' : 'auth');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [rawPolicy, setRawPolicy] = useState<string | undefined>(undefined);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isCheckingSession, setIsCheckingSession] = useState(!userId);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  
  // Check if page has scrollable content
  useEffect(() => {
    const checkScroll = () => {
      const hasScroll = document.documentElement.scrollHeight > window.innerHeight + 100;
      const isNearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 100;
      setShowScrollIndicator(hasScroll && !isNearBottom);
    };
    
    checkScroll();
    window.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    
    // Check after content loads
    const timer = setTimeout(checkScroll, 500);
    
    return () => {
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timer);
    };
  }, [currentPageIndex, phase]);
  
  // Check for existing session and previous report on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is logged in, check for existing report
          const { data: existingPlan } = await supabase
            .from('investment_plans')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (existingPlan?.plan_content || existingPlan?.responses) {
            // User has a previous report, show it
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', session.user.id)
              .single();
            
            setEmail(session.user.email || '');
            
            // Parse responses if stored as JSON
            const savedResponses = existingPlan?.responses as Record<string, any> || {};
            
            // Reconstruct the plan from saved data
            const savedPlan = {
              userName: profile?.full_name || existingPlan?.name || 'Investor',
              email: session.user.email,
              generatedAt: existingPlan?.updated_at || existingPlan?.created_at,
              riskProfile: {
                score: existingPlan?.risk_score || 50,
                label: existingPlan?.risk_profile || 'Moderate',
                description: getRiskDescription(existingPlan?.risk_score || 50),
              },
              investorType: {
                code: existingPlan?.investor_type || 'GAPD',
                name: existingPlan?.investor_type_name || 'The Steward',
              },
              allocation: savedResponses?.allocation || buildAllocation(existingPlan?.risk_score || 50, [], 'passive', 50000),
              recommendations: savedResponses?.recommendations || buildRecommendations(existingPlan?.risk_score || 50, [], 'passive', 50000),
              keyMetrics: savedResponses?.keyMetrics || {
                expectedReturn: `${(3 + (existingPlan?.risk_score || 50) * 0.07).toFixed(1)}%`,
                volatility: `${(4 + (existingPlan?.risk_score || 50) * 0.18).toFixed(1)}%`,
                maxDrawdown: `-${(8 + (existingPlan?.risk_score || 50) * 0.35).toFixed(0)}%`,
                sharpRatio: (0.3 + (existingPlan?.risk_score || 50) * 0.008).toFixed(2),
                timeHorizon: '10 years',
              },
              narrative: savedResponses?.narrative || '',
              actionPlan: savedResponses?.actionPlan || [],
              investmentAmount: savedResponses?.investmentAmount || 50000,
            };
            
            if (existingPlan?.plan_content) {
              setRawPolicy(existingPlan.plan_content);
            }
            
            setGeneratedPlan(savedPlan);
            setShowWelcome(false);
            setPhase('results');
            
            toast({
              title: 'Welcome back!',
              description: `Your investment report has been restored.`,
            });
          } else {
            // User is logged in but no report, go to questionnaire
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', session.user.id)
              .single();
            
            setEmail(session.user.email || '');
            setResponses(prev => ({ ...prev, name: profile?.full_name?.split(' ')[0] || '' }));
            setShowWelcome(false);
            setPhase('questionnaire');
          }
        } else {
          // No session - explicitly reset to auth state
          setPhase('auth');
          setShowWelcome(true);
          setGeneratedPlan(null);
          setRawPolicy(undefined);
          setEmail('');
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // On error, default to auth state
        setPhase('auth');
        setShowWelcome(true);
      } finally {
        setIsCheckingSession(false);
      }
    };
    
    checkExistingSession();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setPhase('auth');
        setShowWelcome(true);
        setGeneratedPlan(null);
        setRawPolicy(undefined);
        setEmail('');
        setResponses({
          'goal-timeline': 10,
          'goal-amount': 50000,
          'risk-tolerance': 20,
          'emergency-fund': 6,
          'pref-involvement': 50,
        });
      }
    });
    
    return () => subscription.unsubscribe();
  }, [toast]);
  
  const currentPage = PAGES[currentPageIndex];
  const currentPageQuestions = currentPage?.questions.map(id => getQuestionById(id)).filter(Boolean) || [];
  const progress = ((currentPageIndex + 1) / PAGES.length) * 100;
  
  const userName = responses['name'] || 'Investor';

  // Handle answer for specific question
  const handleAnswer = useCallback((questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  }, []);

  // Check if all required questions on current page are answered
  const isPageComplete = useMemo(() => {
    return currentPageQuestions.every(q => {
      if (!q) return true;
      const answer = responses[q.id];
      if (answer === undefined || answer === '') return false;
      if (Array.isArray(answer) && answer.length === 0) return false;
      return true;
    });
  }, [currentPageQuestions, responses]);

  const handlePrevious = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
      // Scroll to top when navigating to previous page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPageIndex]);

  // Calculate risk score
  const calculateRiskProfile = useCallback(() => {
    let score = 50;
    
    // Scenario response
    const scenario = responses['risk-scenario'];
    if (scenario === 'buy-more') score += 20;
    else if (scenario === 'hold') score += 10;
    else if (scenario === 'sell-some') score -= 10;
    else if (scenario === 'sell-all') score -= 20;
    
    // Timeline
    const timeline = responses['goal-timeline'];
    if (timeline >= 20) score += 15;
    else if (timeline >= 10) score += 10;
    else if (timeline >= 5) score += 0;
    else if (timeline >= 3) score -= 10;
    else score -= 20;
    
    // Experience
    const exp = responses['risk-experience'];
    if (exp === 'bought') score += 15;
    else if (exp === 'held') score += 5;
    else if (exp === 'watched') score -= 5;
    else if (exp === 'never') score -= 10;
    
    // Tolerance
    const tolerance = responses['risk-tolerance'];
    if (tolerance) score += (tolerance - 20) / 2;
    
    // Emergency fund
    const emergency = responses['emergency-fund'];
    if (emergency >= 12) score += 10;
    else if (emergency >= 6) score += 5;
    else if (emergency < 3) score -= 15;
    
    return Math.max(10, Math.min(90, Math.round(score)));
  }, [responses]);

  // Calculate investor dimensions from personality questions
  const calculateInvestorType = useCallback(() => {
    let risk = 50, decision = 50, time = 50, focus = 50;
    
    // Process personality question responses
    const personalityQuestions = QUESTIONS.filter(q => q.section === 'personality' && q.type === 'scenario');
    
    personalityQuestions.forEach(question => {
      const response = responses[question.id];
      if (!response) return;
      
      const scenario = response === 'A' ? question.scenarioA : question.scenarioB;
      if (scenario?.dimensionScores) {
        if (scenario.dimensionScores.risk) risk += scenario.dimensionScores.risk;
        if (scenario.dimensionScores.decision) decision += scenario.dimensionScores.decision;
        if (scenario.dimensionScores.time) time += scenario.dimensionScores.time;
        if (scenario.dimensionScores.focus) focus += scenario.dimensionScores.focus;
      }
    });
    
    const dimensions = {
      risk: Math.max(0, Math.min(100, risk)),
      decision: Math.max(0, Math.min(100, decision)),
      time: Math.max(0, Math.min(100, time)),
      focus: Math.max(0, Math.min(100, focus))
    };
    
    const typeCode = getInvestorTypeCode(dimensions);
    const investorType = getInvestorType(typeCode);
    
    return { dimensions, typeCode, investorType };
  }, [responses]);

  // Generate comprehensive plan
  const generatePlan = useCallback(async () => {
    const riskScore = calculateRiskProfile();
    const interests = responses['pref-assets'] || [];
    const style = responses['pref-style'];
    const amount = responses['goal-amount'] || 50000;
    
    // Calculate investor type from personality questions
    const { dimensions, typeCode, investorType } = calculateInvestorType();
    
    // Build allocation based on risk and preferences
    const baseAllocation = buildAllocation(riskScore, interests, style, amount);
    const recommendations = buildRecommendations(riskScore, interests, style, amount);
    
    return {
      userName,
      email,
      generatedAt: new Date().toISOString(),
      riskProfile: {
        score: riskScore,
        label: getRiskLabel(riskScore),
        description: getRiskDescription(riskScore),
      },
      investorType: {
        code: typeCode,
        ...investorType,
        dimensions,
      },
      allocation: baseAllocation,
      recommendations,
      keyMetrics: {
        expectedReturn: `${(3 + riskScore * 0.07).toFixed(1)}%`,
        volatility: `${(4 + riskScore * 0.18).toFixed(1)}%`,
        maxDrawdown: `-${(8 + riskScore * 0.35).toFixed(0)}%`,
        sharpRatio: (0.3 + riskScore * 0.008).toFixed(2),
        timeHorizon: `${responses['goal-timeline'] || 10} years`,
      },
      narrative: buildNarrative(riskScore, responses, userName),
      actionPlan: buildActionPlan(riskScore, responses),
      investmentAmount: amount,
    };
  }, [responses, userName, email, calculateRiskProfile, calculateInvestorType]);

  // Submit and generate plan
  const handleEmailSubmit = useCallback(async () => {
    // If we have a userId prop, we don't need email validation
    if (!userId && (!email || !email.includes('@'))) {
      toast({ title: 'Please enter a valid email', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    setPhase('generating');
    
    // Simulate loading steps
    const steps = [
      'Analyzing your risk profile...',
      'Calculating optimal allocation...',
      'Selecting investment vehicles...',
      'Building your personalized strategy...',
      'Generating detailed report...',
    ];
    
    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(i);
      await new Promise(r => setTimeout(r, 1200));
    }
    
    try {
      const plan = await generatePlan();
      const { typeCode, investorType } = calculateInvestorType();
      
      // If we have onComplete callback, use it instead of saving to leads table
      if (onComplete) {
        // Generate a simple markdown plan content
        const planContent = `
# ${userName || 'Your'}'s Personalized Investment Plan
*Generated on ${new Date().toLocaleDateString()}*

## Executive Summary
Based on your responses, you have a **${plan.riskProfile.label}** risk profile with a score of ${plan.riskProfile.score}/100. ${plan.riskProfile.description}

## Your Investor Type: ${investorType.name}
*${investorType.tagline}*

${investorType.description}

### Strengths
${investorType.strengths.map((s: string) => `- ${s}`).join('\n')}

### Challenges to Watch
${investorType.challenges.map((c: string) => `- ${c}`).join('\n')}

## Recommended Asset Allocation

| Asset Class | Allocation |
|-------------|------------|
${plan.allocation.map((a: any) => `| ${a.name} | ${a.value}% |`).join('\n')}

## Key Metrics
- **Expected Annual Return:** ${plan.keyMetrics.expectedReturn}
- **Expected Volatility:** ${plan.keyMetrics.volatility}
- **Maximum Drawdown:** ${plan.keyMetrics.maxDrawdown}
- **Sharpe Ratio:** ${plan.keyMetrics.sharpRatio}
- **Investment Horizon:** ${plan.keyMetrics.timeHorizon}

## Investment Philosophy
${plan.narrative.executive}

## Implementation Guide
${plan.narrative.implementationGuide}

## Rebalancing Strategy
${plan.narrative.rebalancing}

## Action Plan

${plan.actionPlan.map((a: any, i: number) => `### ${i + 1}. ${a.title} (${a.timeframe})
${a.description}`).join('\n\n')}

---
*This is educational guidance, not financial advice. Consider consulting a licensed advisor for personalized recommendations.*

*Powered by AssetLabs.ai*
`;
        
        onComplete({
          responses,
          riskScore: plan.riskProfile.score,
          riskProfile: plan.riskProfile.label,
          investorType: typeCode,
          investorTypeName: investorType.name,
          planContent,
          userName: userName || 'Investor',
        });
        
        setIsSubmitting(false);
        return;
      }
      
      // Original flow for standalone questionnaire
      // Save to backend and get the raw policy
      const { data: apiResponse } = await supabase.functions.invoke('handle-policy-request', {
        body: {
          email,
          name: userName,
          responses,
          riskScore: plan.riskProfile.score,
          riskProfile: plan.riskProfile.label,
          planPreview: {
            allocation: plan.allocation,
            recommendations: plan.recommendations,
            keyMetrics: plan.keyMetrics,
            narrative: plan.narrative,
            actionPlan: plan.actionPlan,
            investmentAmount: plan.investmentAmount,
          },
        }
      }).catch(() => ({ data: null }));
      
      // Capture raw policy from API response if available
      if (apiResponse?.plan) {
        setRawPolicy(apiResponse.plan);
      }
      
      // Auto-save: Save to investment_plans table for future restoration
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('investment_plans')
          .upsert({
            user_id: session.user.id,
            name: userName || 'My Investment Plan',
            responses: {
              allocation: plan.allocation,
              recommendations: plan.recommendations,
              keyMetrics: plan.keyMetrics,
              narrative: plan.narrative,
              actionPlan: plan.actionPlan,
              investmentAmount: plan.investmentAmount,
            },
            risk_score: plan.riskProfile.score,
            risk_profile: plan.riskProfile.label,
            investor_type: (plan as any).investorType?.code || '',
            investor_type_name: (plan as any).investorType?.name || '',
            plan_content: apiResponse?.plan || '',
            status: 'complete',
          });
      }
      
      setGeneratedPlan(plan);
      setPhase('results');
      
      toast({
        title: 'Report saved!',
        description: 'Your investment report has been automatically saved.',
      });
    } catch (error) {
      console.error(error);
      const plan = await generatePlan();
      setGeneratedPlan(plan);
      setPhase('results');
    }
    
    setIsSubmitting(false);
  }, [email, responses, userName, generatePlan, toast, onComplete, userId, calculateInvestorType]);

  // Navigation - must come after handleEmailSubmit
  const handleNext = useCallback(() => {
    if (currentPageIndex < PAGES.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
      // Scroll to top when navigating to next page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Skip email capture since we already have email from auth
      handleEmailSubmit();
    }
  }, [currentPageIndex, handleEmailSubmit]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'questionnaire') return;
      if (e.key === 'Enter' && isPageComplete) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isPageComplete, handleNext]);

  // ============================================
  // RENDER PHASES
  // ============================================

  // LOADING STATE - checking for existing session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden flex items-center justify-center px-4 sm:px-6">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-blue-500/20 rounded-full blur-[100px] sm:blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-emerald-500/15 rounded-full blur-[80px] sm:blur-[130px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse">
            <Sparkles className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
          </div>
          <p className="text-white/60 text-sm">Loading your experience...</p>
        </motion.div>
      </div>
    );
  }

  // WELCOME SCREEN
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden flex items-center justify-center px-4 sm:px-6">
        {/* Animated background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-blue-500/20 rounded-full blur-[100px] sm:blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-emerald-500/15 rounded-full blur-[80px] sm:blur-[130px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-purple-500/10 rounded-full blur-[60px] sm:blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-lg sm:max-w-2xl w-full"
        >
          {/* Main card */}
          <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 p-6 sm:p-10 md:p-14 shadow-2xl">
            {/* Decorative corner accents - hidden on mobile */}
            <div className="hidden sm:block absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-blue-500/40 rounded-tl-3xl" />
            <div className="hidden sm:block absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-emerald-500/40 rounded-br-3xl" />
            
            {/* Logo */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="flex justify-center mb-5 sm:mb-8"
            >
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Sparkles className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
              </div>
            </motion.div>

            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center mb-4 sm:mb-6"
            >
              <Badge className="bg-gradient-to-r from-blue-500/20 to-emerald-500/20 border-blue-500/30 text-blue-300 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium">
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-2" />
                AI-Powered • 3 min
              </Badge>
            </motion.div>

            {/* Title */}
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl sm:text-4xl md:text-5xl font-bold text-center mb-3 sm:mb-4 tracking-tight"
            >
              <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                Unlock Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                Investment Strategy
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-sm sm:text-lg text-white/60 text-center mb-6 sm:mb-10 max-w-md mx-auto leading-relaxed"
            >
              Answer a few questions and receive a personalized portfolio strategy tailored to your goals.
            </motion.p>

            {/* Features */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-10"
            >
              {[
                { icon: PieChart, label: 'Custom Allocation', color: 'from-blue-500 to-blue-600' },
                { icon: Shield, label: 'Risk Analysis', color: 'from-purple-500 to-purple-600' },
                { icon: TrendingUp, label: 'Action Plan', color: 'from-emerald-500 to-emerald-600' },
              ].map((feature, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-4 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/5">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                    <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-white/50 text-center leading-tight">{feature.label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={() => setShowWelcome(false)}
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 hover:from-blue-600 hover:via-purple-600 hover:to-emerald-600 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 active:scale-[0.98] sm:hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/30"
              >
                Start My Strategy
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </motion.div>

            {/* Trust indicator */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center justify-center gap-2 mt-4 sm:mt-6 text-xs sm:text-sm text-white/30"
            >
              <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Create your profile • Results in 3 min</span>
            </motion.div>
          </div>

          {/* Floating elements */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute -left-8 top-1/4 hidden lg:block"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 backdrop-blur border border-blue-500/20 flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-blue-400" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="absolute -right-8 top-1/3 hidden lg:block"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 backdrop-blur border border-emerald-500/20 flex items-center justify-center">
              <Target className="w-7 h-7 text-emerald-400" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="absolute -right-4 bottom-1/4 hidden lg:block"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 backdrop-blur border border-purple-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-purple-400" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // AUTH PHASE - User registration/login
  if (phase === 'auth') {
    return (
      <AuthStep
        progress={5}
        onComplete={async (userData) => {
          setResponses(prev => ({ 
            ...prev, 
            name: userData.firstName
          }));
          setEmail(userData.email);
          
          // Check if user has an existing report
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: existingPlan } = await supabase
                .from('investment_plans')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              
              if (existingPlan?.plan_content || existingPlan?.responses) {
                // Parse responses if stored as JSON
                const savedResponses = existingPlan?.responses as Record<string, any> || {};
                
                // User has a previous report, show it
                const savedPlan = {
                  userName: userData.firstName || existingPlan?.name || 'Investor',
                  email: userData.email,
                  generatedAt: existingPlan?.updated_at || existingPlan?.created_at,
                  riskProfile: {
                    score: existingPlan?.risk_score || 50,
                    label: existingPlan?.risk_profile || 'Moderate',
                    description: getRiskDescription(existingPlan?.risk_score || 50),
                  },
                  investorType: {
                    code: existingPlan?.investor_type || 'GAPD',
                    name: existingPlan?.investor_type_name || 'The Steward',
                  },
                  allocation: savedResponses?.allocation || buildAllocation(existingPlan?.risk_score || 50, [], 'passive', 50000),
                  recommendations: savedResponses?.recommendations || buildRecommendations(existingPlan?.risk_score || 50, [], 'passive', 50000),
                  keyMetrics: savedResponses?.keyMetrics || {
                    expectedReturn: `${(3 + (existingPlan?.risk_score || 50) * 0.07).toFixed(1)}%`,
                    volatility: `${(4 + (existingPlan?.risk_score || 50) * 0.18).toFixed(1)}%`,
                    maxDrawdown: `-${(8 + (existingPlan?.risk_score || 50) * 0.35).toFixed(0)}%`,
                    sharpRatio: (0.3 + (existingPlan?.risk_score || 50) * 0.008).toFixed(2),
                    timeHorizon: '10 years',
                  },
                  narrative: savedResponses?.narrative || '',
                  actionPlan: savedResponses?.actionPlan || [],
                  investmentAmount: savedResponses?.investmentAmount || 50000,
                };
                
                if (existingPlan?.plan_content) {
                  setRawPolicy(existingPlan.plan_content);
                }
                
                setGeneratedPlan(savedPlan);
                setPhase('results');
                
                toast({
                  title: 'Welcome back!',
                  description: `Your investment report has been restored.`,
                });
                return;
              }
            }
          } catch (error) {
            // No existing report found, continue to questionnaire
            console.log('No existing report found, starting fresh');
          }
          
          setPhase('questionnaire');
        }}
      />
    );
  }

  // GENERATING PHASE
  if (phase === 'generating') {
    return <GeneratingScreen step={loadingStep} userName={userName} />;
  }

  // EMAIL CAPTURE PHASE
  if (phase === 'email-capture') {
    return (
      <EmailCaptureScreen
        email={email}
        setEmail={setEmail}
        onSubmit={handleEmailSubmit}
        isSubmitting={isSubmitting}
        userName={userName}
        riskScore={calculateRiskProfile()}
      />
    );
  }

  // RESULTS PHASE - Using new Comprehensive Investment Results with Myers-Briggs profiling
  if (phase === 'results' && generatedPlan) {
    return (
      <ComprehensiveInvestmentResults 
        responses={responses}
        rawPolicy={rawPolicy || ''}
        userName={userName}
        riskScore={generatedPlan.riskProfile.score}
        onDemo={() => {
          toast({ title: 'Demo coming soon!', description: 'Platform demo is in development' });
        }}
        onStartNew={() => {
          // Reset state to start a new questionnaire
          setResponses({
            'goal-timeline': 10,
            'goal-amount': 50000,
            'risk-tolerance': 20,
            'emergency-fund': 6,
            'pref-involvement': 50,
          });
          setCurrentPageIndex(0);
          setGeneratedPlan(null);
          setRawPolicy(undefined);
          setPhase('questionnaire');
          toast({ title: 'Starting fresh!', description: 'Complete the questionnaire for a new investment report.' });
        }}
        onSignOut={async () => {
          await supabase.auth.signOut();
          toast({
            title: 'Signed out',
            description: 'You have been logged out successfully.',
          });
        }}
      />
    );
  }

  // QUESTIONNAIRE PHASE - Multi-question pages with improved styling
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <PulseGrid className="opacity-20" />
        <div className="absolute top-0 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-primary/10 rounded-full blur-[80px] sm:blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-accent/10 rounded-full blur-[60px] sm:blur-[100px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {onCancel && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCancel}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold tracking-tight text-sm sm:text-base">AssetLabs</span>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-xs sm:text-sm text-muted-foreground font-mono">
                {currentPageIndex + 1}/{PAGES.length}
              </span>
              <div className="w-16 sm:w-32 h-1 sm:h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-secondary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - scrollable for multi-question pages */}
      <main className="relative pt-16 sm:pt-24 pb-24 sm:pb-28 px-4 sm:px-6 min-h-screen">
        <div className="max-w-2xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-8"
            >
              {/* Page header with icon */}
              {(() => {
                const sectionMeta = SECTION_META[currentPage.section];
                const SectionIcon = sectionMeta?.icon || Sparkles;
                return (
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4 pt-2 sm:pt-4">
                    <div className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center bg-gradient-to-br",
                      sectionMeta?.color || "from-blue-500 to-emerald-500"
                    )}>
                      <SectionIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-lg sm:text-xl font-semibold truncate">{currentPage.title}</h1>
                      <p className="text-muted-foreground text-xs sm:text-sm truncate">{sectionMeta?.description}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Questions on this page */}
              <div className="space-y-6 sm:space-y-10">
                {currentPageQuestions.map((question, idx) => {
                  if (!question) return null;
                  const questionValue = responses[question.id];
                  
                  return (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.3 }}
                      className="space-y-3 sm:space-y-4"
                    >
                      {/* Question number badge for multi-question pages */}
                      {currentPageQuestions.length > 1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground/60 font-mono">
                            {idx + 1} of {currentPageQuestions.length}
                          </span>
                          {questionValue !== undefined && questionValue !== '' && 
                           !(Array.isArray(questionValue) && questionValue.length === 0) && (
                            <Check className="w-3.5 h-3.5 text-success" />
                          )}
                        </div>
                      )}
                      
                      {/* Question text */}
                      <div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight mb-1.5 sm:mb-2 leading-tight text-foreground">
                          {question.question}
                        </h2>
                        {question.subtitle && (
                          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                            {question.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Question input */}
                      <div>
                        <QuestionRenderer
                          question={question}
                          value={questionValue}
                          onChange={(v) => handleAnswer(question.id, v)}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Scroll indicator */}
      <AnimatePresence>
        {showScrollIndicator && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          >
            <div className="flex flex-col items-center gap-1 text-white/40">
              <span className="text-xs">Scroll for more</span>
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer navigation */}
      <footer className="fixed bottom-0 left-0 right-0 glass-nav safe-area-pb">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentPageIndex === 0}
              className="text-muted-foreground hover:text-foreground hover:bg-muted px-3 sm:px-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <Button
              onClick={handleNext}
              disabled={!isPageComplete}
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 px-4 sm:px-6 flex-1 sm:flex-none max-w-[200px] sm:max-w-none"
            >
              {currentPageIndex === PAGES.length - 1 ? 'Get My Strategy' : 'Continue'}
              <ChevronRight className="w-4 h-4 ml-1 sm:ml-2" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// QUESTION RENDERER
// ============================================
function QuestionRenderer({ question, value, onChange }: { question: any; value: any; onChange: (v: any) => void }) {
  switch (question.type) {
    case 'text':
      if (question.multiline) {
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground min-h-[100px] sm:min-h-[120px] text-base sm:text-lg"
          />
        );
      }
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground h-12 sm:h-14 text-base sm:text-lg"
          autoFocus
        />
      );

    case 'visual-select':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {question.options.map((opt: any) => (
            <motion.button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "relative p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 text-left transition-all",
                value === opt.value
                  ? "border-success/50 bg-success/10 ring-1 ring-success/30"
                  : "border-border bg-muted/50 hover:border-border/80 hover:bg-muted/70"
              )}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0",
                  value === opt.value ? "bg-success/20" : "bg-muted"
                )}>
                  <opt.icon className={cn(
                    "w-5 h-5 sm:w-6 sm:h-6",
                    value === opt.value ? "text-success" : "text-muted-foreground"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1 text-foreground">{opt.label}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{opt.description}</div>
                </div>
                {value === opt.value && (
                  <div className="shrink-0">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      );

    case 'timeline-slider':
      const timelineValue = value || 10;
      const timelineLabel = timelineValue < 3 ? 'Short-term' : timelineValue < 10 ? 'Medium-term' : 'Long-term';
      return (
        <div className="bg-muted/50 border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground mb-1">Your timeline</div>
              <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                {timelineValue} {timelineValue === 1 ? 'year' : 'years'}
              </div>
            </div>
            <Badge className={cn(
              "text-[10px] sm:text-xs",
              timelineValue < 3 ? "bg-warning/20 text-warning border-warning/30" :
              timelineValue < 10 ? "bg-primary/20 text-primary border-primary/30" :
              "bg-success/20 text-success border-success/30"
            )}>
              {timelineLabel}
            </Badge>
          </div>
          <Slider
            value={[timelineValue]}
            onValueChange={([v]) => onChange(v)}
            min={1}
            max={30}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
            <span>1 year</span>
            <span>15 years</span>
            <span>30 years</span>
          </div>
        </div>
      );

    case 'amount-slider':
      const amounts = [10000, 25000, 50000, 100000, 250000, 500000, 1000000, 5000000];
      const amountIndex = amounts.findIndex(a => a === value) >= 0 ? amounts.findIndex(a => a === value) : 2;
      const portfolioLabel = amountIndex < 2 ? 'Starter' : amountIndex < 4 ? 'Growth' : amountIndex < 6 ? 'Wealth' : 'Premium';
      return (
        <div className="bg-muted/50 border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground mb-1">Investable amount</div>
              <div className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-success to-primary bg-clip-text text-transparent">
                ${(amounts[amountIndex] || 50000).toLocaleString()}
              </div>
            </div>
            <Badge className={cn(
              "text-[10px] sm:text-xs",
              amountIndex < 2 ? "bg-primary/20 text-primary border-primary/30" :
              amountIndex < 4 ? "bg-success/20 text-success border-success/30" :
              amountIndex < 6 ? "bg-accent/20 text-accent-foreground border-accent/30" :
              "bg-warning/20 text-warning border-warning/30"
            )}>
              {portfolioLabel}
            </Badge>
          </div>
          <Slider
            value={[amountIndex]}
            onValueChange={([v]) => onChange(amounts[v])}
            min={0}
            max={amounts.length - 1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground">
            <span>$10K</span>
            <span>$500K</span>
            <span>$5M+</span>
          </div>
        </div>
      );

    case 'scenario-select':
      return (
        <div className="space-y-4 sm:space-y-5">
          {/* Chart visualization with labels */}
          <div className="bg-muted/50 border border-border rounded-xl sm:rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Simulated portfolio drop</span>
              <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] sm:text-xs">-25%</Badge>
            </div>
            <div className="h-20 sm:h-28 flex items-end gap-1">
              {[100, 95, 88, 75, 78, 82, 77, 75].map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{ backgroundColor: h >= 85 ? 'hsl(var(--success))' : h >= 80 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))' }}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                />
              ))}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">How would you react?</p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {question.options.map((opt: any) => (
              <motion.button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={cn(
                  "p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 text-center transition-all",
                  value === opt.value
                    ? "border-success/50 bg-success/10 ring-1 ring-success/30"
                    : "border-border hover:border-border/80"
                )}
                whileTap={{ scale: 0.98 }}
              >
                <div className="font-medium text-sm sm:text-base text-foreground">{opt.label}</div>
              </motion.button>
            ))}
          </div>
        </div>
      );

    case 'risk-dial':
      const riskValue = value || 20;
      const riskLabel = riskValue <= 15 ? 'Conservative' : riskValue <= 25 ? 'Moderate' : riskValue <= 35 ? 'Growth' : 'Aggressive';
      return (
        <div className="bg-muted/50 border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="relative h-28 sm:h-40 flex items-center justify-center">
            {/* Dial visualization */}
            <svg className="w-48 sm:w-64 h-24 sm:h-32" viewBox="0 0 200 100">
              <defs>
                <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--success))" />
                  <stop offset="50%" stopColor="hsl(var(--warning))" />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" />
                </linearGradient>
              </defs>
              <path
                d="M 20 90 A 80 80 0 0 1 180 90"
                fill="none"
                stroke="url(#dialGradient)"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <motion.circle
                cx="100"
                cy="90"
                r="8"
                fill="hsl(var(--foreground))"
                initial={false}
                animate={{
                  cx: 20 + ((riskValue - 5) / 45) * 160,
                  cy: 90 - Math.sin(((riskValue - 5) / 45) * Math.PI) * 80
                }}
                transition={{ type: 'spring', stiffness: 100 }}
              />
            </svg>
            <div className="absolute bottom-0 text-center">
              <div className="text-2xl sm:text-4xl font-bold text-foreground">{riskValue}%</div>
              <div className="text-muted-foreground text-[10px] sm:text-xs">max annual loss you can tolerate</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm text-muted-foreground">Risk tolerance</span>
            <Badge className={cn(
              "text-[10px] sm:text-xs",
              riskValue <= 15 ? "bg-success/20 text-success border-success/30" :
              riskValue <= 25 ? "bg-primary/20 text-primary border-primary/30" :
              riskValue <= 35 ? "bg-warning/20 text-warning border-warning/30" :
              "bg-destructive/20 text-destructive border-destructive/30"
            )}>
              {riskLabel}
            </Badge>
          </div>
          <Slider
            value={[riskValue]}
            onValueChange={([v]) => onChange(v)}
            min={5}
            max={50}
            step={5}
            className="w-full"
          />
        </div>
      );

    case 'experience-select':
    case 'stability-select':
      return (
        <div className="space-y-2">
          {question.options.map((opt: any) => (
            <motion.button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4",
                value === opt.value
                  ? "border-success/50 bg-success/10 ring-1 ring-success/30"
                  : "border-border hover:border-border/80 hover:bg-muted/30"
              )}
              whileTap={{ scale: 0.99 }}
            >
              {opt.icon && (
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  value === opt.value ? "bg-success/20" : "bg-muted"
                )}>
                  <opt.icon className={cn("w-5 h-5", value === opt.value ? "text-success" : "text-muted-foreground")} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{opt.label}</div>
                {(opt.description || opt.insight) && (
                  <div className="text-sm text-muted-foreground mt-0.5">{opt.description || opt.insight}</div>
                )}
              </div>
              {value === opt.value && <Check className="w-5 h-5 text-success shrink-0" />}
            </motion.button>
          ))}
        </div>
      );

    case 'month-slider':
      const months = value || 3;
      const fundStatus = months < 3 ? 'At risk' : months < 6 ? 'Building' : months >= 12 ? 'Excellent' : 'On track';
      return (
        <div className="bg-muted/50 border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Emergency fund</div>
              <div className="text-4xl font-bold text-foreground">
                {months} <span className="text-xl font-normal text-muted-foreground">months</span>
              </div>
            </div>
            <Badge className={cn(
              "text-xs",
              months < 3 ? "bg-destructive/20 text-destructive border-destructive/30" :
              months < 6 ? "bg-warning/20 text-warning border-warning/30" :
              months >= 12 ? "bg-success/20 text-success border-success/30" :
              "bg-primary/20 text-primary border-primary/30"
            )}>
              {fundStatus}
            </Badge>
          </div>
          <Slider
            value={[months]}
            onValueChange={([v]) => onChange(v)}
            min={0}
            max={24}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span className="text-success/60">6+ recommended</span>
            <span>24+</span>
          </div>
        </div>
      );

    case 'asset-multi':
    case 'asset-interest':
      const selected = value || [];
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {question.options.map((opt: any) => {
              const isSelected = selected.includes(opt.value);
              return (
                <motion.button
                  key={opt.value}
                  onClick={() => {
                    if (opt.value === 'none') {
                      onChange(['none']);
                    } else {
                      if (isSelected) {
                        onChange(selected.filter((v: string) => v !== opt.value));
                      } else {
                        onChange([...selected.filter((v: string) => v !== 'none'), opt.value]);
                      }
                    }
                  }}
                  className={cn(
                    "p-4 rounded-xl border-2 text-center transition-all relative",
                    isSelected
                      ? "border-success/50 bg-success/10 ring-1 ring-success/30"
                      : "border-border hover:border-border/80"
                  )}
                  whileTap={{ scale: 0.97 }}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4 text-success" />
                    </div>
                  )}
                  <opt.icon className={cn(
                    "w-6 h-6 mx-auto mb-2",
                    isSelected ? "text-success" : "text-muted-foreground"
                  )} />
                  <div className="text-sm font-medium text-foreground">{opt.label}</div>
                </motion.button>
              );
            })}
          </div>
          {selected.length > 0 && selected[0] !== 'none' && (
            <p className="text-xs text-muted-foreground text-center">{selected.length} selected</p>
          )}
        </div>
      );

    case 'philosophy-select':
      return (
        <div className="space-y-2">
          {question.options.map((opt: any) => (
            <motion.button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                value === opt.value
                  ? "border-success/50 bg-success/10 ring-1 ring-success/30"
                  : "border-border hover:border-border/80 hover:bg-muted/30"
              )}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-foreground">{opt.label}</div>
                {value === opt.value && <Check className="w-5 h-5 text-success" />}
              </div>
              <div className="text-sm text-muted-foreground mb-2">{opt.description}</div>
              <div className="text-xs text-muted-foreground/70 italic border-l-2 border-border pl-2">"{opt.philosophy}"</div>
            </motion.button>
          ))}
        </div>
      );

    case 'involvement-slider':
      const involvementLabels = ['Fully Automated', 'Quarterly Check-ins', 'Monthly Reviews', 'Weekly Trading', 'Daily Active'];
      const involvementDescriptions = [
        'Set it and forget it. Perfect for busy professionals.',
        'Review performance every few months. Low maintenance.',
        'Stay informed with monthly portfolio reviews.',
        'Active management with weekly adjustments.',
        'Hands-on trading and constant monitoring.'
      ];
      const involvement = value !== undefined ? value : 1;
      return (
        <div className="bg-muted/50 border border-border rounded-2xl p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-2xl font-semibold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
              {involvementLabels[involvement]}
            </div>
            <p className="text-sm text-muted-foreground">
              {involvementDescriptions[involvement]}
            </p>
          </div>
          <Slider
            value={[involvement]}
            onValueChange={([v]) => onChange(v)}
            min={0}
            max={4}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>🧘 Hands-off</span>
            <span>⚡ Hands-on</span>
          </div>
        </div>
      );

    case 'scenario':
      // Myers-Briggs style A/B forced choice with visual cards
      const getIcon = (iconName: string) => {
        const icons: Record<string, any> = {
          Mountain, Compass, Brain, Sparkles, TrendingUp, Shield, 
          BarChart3, Heart, TreePine, Zap, Clock, Target, Layers, Eye, Users
        };
        return icons[iconName] || Sparkles;
      };
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['A', 'B'].map((choice) => {
            const scenario = choice === 'A' ? question.scenarioA : question.scenarioB;
            const isSelected = value === choice;
            const Icon = getIcon(scenario?.iconName || 'Sparkles');
            
            return (
              <motion.button
                key={choice}
                onClick={() => onChange(choice)}
                className={cn(
                  "relative p-6 sm:p-8 rounded-2xl border-2 text-left transition-all",
                  isSelected
                    ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-border/80 hover:bg-card/80"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
                
                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-4",
                  isSelected ? "bg-primary/20" : "bg-muted"
                )}>
                  <Icon className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                
                {/* Label */}
                <h3 className={cn(
                  "font-bold text-lg sm:text-xl mb-2",
                  isSelected ? "text-foreground" : "text-foreground/90"
                )}>
                  {scenario?.label}
                </h3>
                
                {/* Description */}
                <p className="text-sm sm:text-base text-muted-foreground mb-4 leading-relaxed">
                  {scenario?.description}
                </p>
                
                {/* Traits */}
                {scenario?.traits && scenario.traits.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {scenario.traits.map((trait: string, i: number) => (
                      <Badge 
                        key={i} 
                        variant={isSelected ? "default" : "secondary"}
                        className={cn(
                          "text-xs font-medium",
                          isSelected 
                            ? "bg-primary/30 text-primary-foreground border-primary/50" 
                            : "bg-secondary text-secondary-foreground border-secondary/50"
                        )}
                      >
                        {trait}
                      </Badge>
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      );

    default:
      return null;
  }
}


// ============================================
// EMAIL CAPTURE SCREEN
// ============================================
function EmailCaptureScreen({ email, setEmail, onSubmit, isSubmitting, userName, riskScore }: any) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-md w-full text-center"
      >
        {/* Animated rings */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-white/20"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                delay: i * 0.4,
                repeat: Infinity,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3">
          Your Strategy is Ready, {userName}
        </h1>
        <p className="text-white/50 mb-8">
          Enter your email to unlock your personalized investment report with detailed recommendations across all asset classes.
        </p>

        {/* Preview stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{riskScore}</div>
            <div className="text-xs text-white/40">Risk Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">7+</div>
            <div className="text-xs text-white/40">Asset Classes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">15+</div>
            <div className="text-xs text-white/40">Recommendations</div>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="h-14 text-lg bg-white/5 border-white/10 text-white placeholder:text-white/30 text-center"
            autoFocus
          />
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !email.includes('@')}
            className="w-full h-14 text-lg bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600"
          >
            Access My Investment Report
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        <p className="text-white/30 text-xs mt-6">
          Your data is encrypted and never sold. Unsubscribe anytime.
        </p>
      </motion.div>
    </div>
  );
}

// ============================================
// GENERATING SCREEN
// ============================================
function GeneratingScreen({ step, userName }: { step: number; userName: string }) {
  const steps = [
    { label: 'Analyzing risk profile', icon: Shield },
    { label: 'Calculating allocation', icon: PieChart },
    { label: 'Selecting investments', icon: Briefcase },
    { label: 'Building strategy', icon: Target },
    { label: 'Generating report', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/10 to-emerald-500/10 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative max-w-md w-full text-center"
      >
        <motion.div
          className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <h2 className="text-2xl font-bold mb-2">Building Your Strategy</h2>
        <p className="text-white/50 mb-8">{userName}, we're crafting your personalized plan...</p>

        <div className="space-y-3">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border",
                i === step 
                  ? "bg-white/10 border-white/20" 
                  : i < step 
                    ? "border-white/10" 
                    : "border-white/5"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                i < step ? "bg-emerald-500/20" : i === step ? "bg-blue-500/20" : "bg-white/5"
              )}>
                {i < step ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <s.icon className={cn(
                    "w-5 h-5",
                    i === step ? "text-blue-400" : "text-white/30"
                  )} />
                )}
              </div>
              <span className={cn(
                "font-medium",
                i <= step ? "text-white" : "text-white/30"
              )}>
                {s.label}
              </span>
              {i === step && (
                <motion.div
                  className="ml-auto w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getRiskLabel(score: number): string {
  if (score < 25) return 'Conservative';
  if (score < 40) return 'Moderately Conservative';
  if (score < 60) return 'Moderate';
  if (score < 75) return 'Moderately Aggressive';
  return 'Aggressive';
}

function getRiskDescription(score: number): string {
  if (score < 25) return 'You prioritize capital preservation with steady, predictable returns.';
  if (score < 40) return 'You favor stability while accepting modest growth opportunities.';
  if (score < 60) return 'You balance growth potential with risk management.';
  if (score < 75) return 'You pursue higher returns and can weather significant volatility.';
  return 'You maximize growth potential with a long-term horizon.';
}

function buildAllocation(riskScore: number, interests: string[], style: string, amount: number) {
  // Base allocation adjusted by risk
  const equityBase = 30 + (riskScore * 0.5);
  const fixedBase = 50 - (riskScore * 0.4);
  
  const allocation = [];
  
  // US Equities breakdown
  if (interests.includes('us-stocks') || interests.length === 0) {
    allocation.push({
      category: 'US Equities',
      percentage: Math.round(equityBase * 0.6),
      color: '#3b82f6',
      subcategories: [
        { name: 'Large Cap Growth', percentage: 35 },
        { name: 'Large Cap Value', percentage: 30 },
        { name: 'Mid Cap', percentage: 20 },
        { name: 'Small Cap', percentage: 15 },
      ]
    });
  }
  
  // International
  if (interests.includes('intl-stocks') || interests.length === 0) {
    allocation.push({
      category: 'International Equities',
      percentage: Math.round(equityBase * 0.25),
      color: '#8b5cf6',
      subcategories: [
        { name: 'Developed Markets', percentage: 60 },
        { name: 'Emerging Markets', percentage: 40 },
      ]
    });
  }
  
  // Fixed Income
  allocation.push({
    category: 'Fixed Income',
    percentage: Math.round(fixedBase),
    color: '#10b981',
    subcategories: [
      { name: 'Government Bonds', percentage: 40 },
      { name: 'Corporate Bonds', percentage: 35 },
      { name: 'Municipal Bonds', percentage: 15 },
      { name: 'TIPS', percentage: 10 },
    ]
  });
  
  // Real Estate
  if (interests.includes('real-estate') || riskScore > 40) {
    allocation.push({
      category: 'Real Estate',
      percentage: Math.min(15, Math.round(riskScore * 0.15)),
      color: '#f59e0b',
      subcategories: [
        { name: 'REITs', percentage: 60 },
        { name: 'Real Estate Funds', percentage: 40 },
      ]
    });
  }
  
  // Alternatives
  if (interests.includes('alternatives') || interests.includes('commodities') || riskScore > 50) {
    allocation.push({
      category: 'Alternatives',
      percentage: Math.min(10, Math.round(riskScore * 0.1)),
      color: '#ec4899',
      subcategories: [
        { name: 'Commodities', percentage: 40 },
        { name: 'Gold', percentage: 30 },
        { name: 'Private Equity', percentage: 30 },
      ]
    });
  }
  
  // Digital Assets
  if (interests.includes('crypto') && riskScore > 45) {
    allocation.push({
      category: 'Digital Assets',
      percentage: Math.min(5, Math.round((riskScore - 45) * 0.15)),
      color: '#f97316',
      subcategories: [
        { name: 'Bitcoin', percentage: 60 },
        { name: 'Ethereum', percentage: 30 },
        { name: 'Other', percentage: 10 },
      ]
    });
  }
  
  // Cash
  allocation.push({
    category: 'Cash & Equivalents',
    percentage: Math.max(2, 10 - Math.round(riskScore * 0.08)),
    color: '#6b7280',
    subcategories: [
      { name: 'Money Market', percentage: 60 },
      { name: 'Short-term Treasuries', percentage: 40 },
    ]
  });
  
  return allocation;
}

function buildRecommendations(riskScore: number, interests: string[], style: string, amount: number) {
  const recommendations: any[] = [];
  
  // ETFs
  recommendations.push(
    { type: 'ETF', ticker: 'VTI', name: 'Vanguard Total Stock Market', category: 'US Equities', expense: '0.03%', allocation: 25, reason: 'Broad US market exposure at minimal cost' },
    { type: 'ETF', ticker: 'VXUS', name: 'Vanguard Total International', category: 'International', expense: '0.07%', allocation: 15, reason: 'Global diversification outside US' },
    { type: 'ETF', ticker: 'BND', name: 'Vanguard Total Bond', category: 'Fixed Income', expense: '0.03%', allocation: 20, reason: 'Investment-grade bond stability' },
  );
  
  // Individual Stocks (for larger portfolios)
  if (amount >= 100000 && riskScore > 40) {
    recommendations.push(
      { type: 'Stock', ticker: 'AAPL', name: 'Apple Inc.', category: 'Tech - Large Cap', reason: 'Quality tech leader with strong cash flows' },
      { type: 'Stock', ticker: 'MSFT', name: 'Microsoft Corp.', category: 'Tech - Large Cap', reason: 'Cloud and enterprise software dominance' },
      { type: 'Stock', ticker: 'JNJ', name: 'Johnson & Johnson', category: 'Healthcare', reason: 'Defensive dividend aristocrat' },
      { type: 'Stock', ticker: 'JPM', name: 'JPMorgan Chase', category: 'Financials', reason: 'Leading bank with diverse revenue' },
    );
  }
  
  // REITs
  if (interests.includes('real-estate') || riskScore > 45) {
    recommendations.push(
      { type: 'REIT', ticker: 'VNQ', name: 'Vanguard Real Estate ETF', category: 'Real Estate', expense: '0.12%', reason: 'Diversified REIT exposure' },
      { type: 'REIT', ticker: 'O', name: 'Realty Income Corp.', category: 'Real Estate', reason: 'Monthly dividend "aristocrat"' },
    );
  }
  
  // Bonds (for conservative)
  if (riskScore < 50 || amount >= 250000) {
    recommendations.push(
      { type: 'Bond ETF', ticker: 'TLT', name: 'iShares 20+ Year Treasury', category: 'Long-term Bonds', expense: '0.15%', reason: 'Long duration treasury exposure' },
      { type: 'Bond ETF', ticker: 'LQD', name: 'iShares Investment Grade Corp', category: 'Corporate Bonds', expense: '0.14%', reason: 'Quality corporate bond income' },
    );
  }
  
  // Alternatives
  if (interests.includes('alternatives') || interests.includes('commodities')) {
    recommendations.push(
      { type: 'Commodity', ticker: 'GLD', name: 'SPDR Gold Trust', category: 'Commodities', expense: '0.40%', reason: 'Inflation hedge and safe haven' },
      { type: 'Commodity', ticker: 'DBC', name: 'Invesco DB Commodity', category: 'Commodities', expense: '0.85%', reason: 'Broad commodity exposure' },
    );
  }
  
  // Crypto
  if (interests.includes('crypto') && riskScore > 50) {
    recommendations.push(
      { type: 'Crypto', ticker: 'BTC', name: 'Bitcoin', category: 'Digital Assets', reason: 'Digital gold, store of value thesis' },
      { type: 'Crypto', ticker: 'ETH', name: 'Ethereum', category: 'Digital Assets', reason: 'Smart contract platform leader' },
    );
  }
  
  return recommendations;
}

function buildNarrative(riskScore: number, responses: any, userName: string) {
  const timeline = responses['goal-timeline'] || 10;
  const goal = responses['goal-primary'] || 'wealth-growth';
  const style = responses['pref-style'] || 'passive';
  const amount = responses['goal-amount'] || 50000;
  
  return {
    executive: `${userName}, based on your ${getRiskLabel(riskScore).toLowerCase()} risk profile and ${timeline}-year horizon, we've designed a diversified portfolio strategy targeting ${goal === 'income' ? 'income generation' : 'long-term wealth accumulation'}. Your $${amount.toLocaleString()} portfolio is allocated across ${buildAllocation(riskScore, [], style, amount).length} asset classes to optimize risk-adjusted returns.`,
    
    riskAnalysis: `Your risk score of ${riskScore}/100 places you in the ${getRiskLabel(riskScore)} category. This means you ${riskScore > 50 ? 'can tolerate higher volatility in pursuit of greater returns' : 'prefer stability and capital preservation over aggressive growth'}. We've calibrated your equity exposure to ${30 + Math.round(riskScore * 0.5)}% to align with this profile.`,
    
    allocationRationale: `The portfolio's ${riskScore > 50 ? 'growth-oriented' : 'balanced'} structure reflects your ${timeline > 10 ? 'long' : timeline > 5 ? 'medium' : 'shorter'}-term horizon. ${timeline > 10 ? 'With time on your side, we can afford to weather market volatility for potentially higher returns.' : 'We\'ve emphasized stability to protect against near-term fluctuations.'}`,
    
    implementationGuide: `We recommend ${style === 'passive' ? 'a systematic, buy-and-hold approach using low-cost index funds' : style === 'active' ? 'selective positions in individual securities alongside core index holdings' : 'a value-oriented selection methodology focused on quality at reasonable prices'}. Start by establishing core positions, then systematically add to them through dollar-cost averaging.`,
    
    rebalancing: `Review your portfolio ${timeline < 5 ? 'monthly' : 'quarterly'} and rebalance when any allocation drifts more than 5% from target. This disciplined approach captures value from market movements while maintaining your risk profile.`,
  };
}

function buildActionPlan(riskScore: number, responses: any) {
  const amount = responses['goal-amount'] || 50000;
  const hasEmergency = (responses['emergency-fund'] || 0) >= 6;
  
  const actions = [];
  
  if (!hasEmergency) {
    actions.push({
      priority: 1,
      title: 'Build Emergency Fund First',
      description: 'Before investing, ensure you have 3-6 months of expenses in liquid savings.',
      timeframe: '1-3 months',
    });
  }
  
  actions.push(
    {
      priority: hasEmergency ? 1 : 2,
      title: 'Open Investment Accounts',
      description: 'Set up brokerage accounts (taxable and tax-advantaged). Consider Fidelity, Schwab, or Vanguard for low costs.',
      timeframe: 'This week',
    },
    {
      priority: hasEmergency ? 2 : 3,
      title: 'Establish Core Holdings',
      description: `Deploy initial capital into your primary ETF positions (VTI, VXUS, BND). Start with ${amount > 100000 ? '70%' : '100%'} of funds.`,
      timeframe: '1-2 weeks',
    },
    {
      priority: hasEmergency ? 3 : 4,
      title: 'Automate Contributions',
      description: 'Set up automatic monthly investments to remove emotion and ensure consistency.',
      timeframe: '30 days',
    },
    {
      priority: 4,
      title: 'Add Satellite Positions',
      description: 'Once core is established, consider adding individual stocks, REITs, or alternative assets.',
      timeframe: '60-90 days',
    },
    {
      priority: 5,
      title: 'Schedule Portfolio Review',
      description: 'Set quarterly calendar reminders to review allocation and rebalance as needed.',
      timeframe: 'Ongoing',
    },
  );
  
  return actions;
}

// ============================================
// RESULTS SCREEN
// ============================================
function ResultsScreen({ plan, onSignOut }: { plan: any; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-semibold">{plan.userName}'s Investment Strategy</span>
                <span className="text-white/40 text-sm ml-3">
                  Generated {new Date(plan.generatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-white/10 text-white hover:bg-white/5"
                onClick={onSignOut}
              >
                Sign Out
              </Button>
              <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5">
                Export PDF
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-blue-500 to-emerald-500">
                Start Implementing
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Risk Score', value: plan.riskProfile.score, suffix: '/100', color: 'blue' },
            { label: 'Expected Return', value: plan.keyMetrics.expectedReturn, color: 'emerald' },
            { label: 'Max Drawdown', value: plan.keyMetrics.maxDrawdown, color: 'rose' },
            { label: 'Sharpe Ratio', value: plan.keyMetrics.sharpRatio, color: 'purple' },
            { label: 'Time Horizon', value: plan.keyMetrics.timeHorizon, color: 'amber' },
          ].map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="text-white/40 text-sm mb-1">{metric.label}</div>
              <div className={cn(
                "text-2xl font-bold",
                metric.color === 'blue' && "text-blue-400",
                metric.color === 'emerald' && "text-emerald-400",
                metric.color === 'rose' && "text-rose-400",
                metric.color === 'purple' && "text-purple-400",
                metric.color === 'amber' && "text-amber-400",
              )}>
                {metric.value}{metric.suffix || ''}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['overview', 'allocation', 'recommendations', 'report', 'actions'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab
                  ? "bg-white text-black"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {activeTab === 'overview' && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Risk Profile */}
                <Card className="bg-white/5 border-white/10 p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    Risk Profile: {plan.riskProfile.label}
                  </h3>
                  <div className="relative h-4 bg-white/10 rounded-full overflow-hidden mb-4">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                    />
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
                      initial={{ left: 0 }}
                      animate={{ left: `calc(${plan.riskProfile.score}% - 8px)` }}
                      transition={{ delay: 0.5, type: 'spring' }}
                    />
                  </div>
                  <p className="text-white/60 text-sm">{plan.riskProfile.description}</p>
                </Card>

                {/* Executive Summary */}
                <Card className="bg-white/5 border-white/10 p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    Executive Summary
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {plan.narrative.executive}
                  </p>
                </Card>
              </div>
            )}

            {activeTab === 'allocation' && (
              <div className="grid md:grid-cols-3 gap-6">
                {/* Pie chart placeholder */}
                <Card className="bg-white/5 border-white/10 p-6 md:col-span-1">
                  <h3 className="font-semibold mb-4">Asset Allocation</h3>
                  <div className="aspect-square relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {plan.allocation.reduce((acc: any[], item: any, i: number) => {
                        const prevPercent = acc.reduce((sum, a) => sum + a.percentage, 0);
                        const circumference = 2 * Math.PI * 40;
                        const offset = (prevPercent / 100) * circumference;
                        const length = (item.percentage / 100) * circumference;
                        
                        return [...acc, {
                          ...item,
                          element: (
                            <circle
                              key={i}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke={item.color}
                              strokeWidth="20"
                              strokeDasharray={`${length} ${circumference - length}`}
                              strokeDashoffset={-offset}
                              className="transition-all duration-500"
                            />
                          )
                        }];
                      }, []).map((item: any) => item.element)}
                    </svg>
                  </div>
                </Card>

                {/* Allocation details */}
                <Card className="bg-white/5 border-white/10 p-6 md:col-span-2">
                  <h3 className="font-semibold mb-4">Allocation Breakdown</h3>
                  <div className="space-y-4">
                    {plan.allocation.map((item: any, i: number) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-medium">{item.category}</span>
                          </div>
                          <span className="font-bold">{item.percentage}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: item.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                          />
                        </div>
                        {item.subcategories && (
                          <div className="mt-2 pl-5 flex flex-wrap gap-2">
                            {item.subcategories.map((sub: any, j: number) => (
                              <Badge key={j} variant="outline" className="border-white/10 text-white/50 text-xs">
                                {sub.name}: {sub.percentage}%
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div className="space-y-4">
                {['ETF', 'Stock', 'REIT', 'Bond ETF', 'Commodity', 'Crypto'].map(type => {
                  const items = plan.recommendations.filter((r: any) => r.type === type);
                  if (items.length === 0) return null;
                  
                  return (
                    <Card key={type} className="bg-white/5 border-white/10 p-6">
                      <h3 className="font-semibold mb-4">{type}s</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {items.map((rec: any, i: number) => (
                          <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono font-bold text-lg text-blue-400">{rec.ticker}</span>
                              {rec.allocation && (
                                <Badge className="bg-white/10">{rec.allocation}%</Badge>
                              )}
                            </div>
                            <div className="text-sm text-white/80 mb-1">{rec.name}</div>
                            <div className="text-xs text-white/40 mb-2">{rec.category}</div>
                            {rec.expense && (
                              <div className="text-xs text-white/40">Expense: {rec.expense}</div>
                            )}
                            <div className="text-xs text-white/50 mt-2 pt-2 border-t border-white/10">
                              {rec.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {activeTab === 'report' && (
              <Card className="bg-white/5 border-white/10 p-8">
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold mb-6">Investment Policy Statement</h2>
                  
                  <section className="mb-8">
                    <h3 className="text-lg font-semibold text-blue-400 mb-3">Executive Summary</h3>
                    <p className="text-white/70 leading-relaxed">{plan.narrative.executive}</p>
                  </section>
                  
                  <section className="mb-8">
                    <h3 className="text-lg font-semibold text-emerald-400 mb-3">Risk Analysis</h3>
                    <p className="text-white/70 leading-relaxed">{plan.narrative.riskAnalysis}</p>
                  </section>
                  
                  <section className="mb-8">
                    <h3 className="text-lg font-semibold text-purple-400 mb-3">Allocation Rationale</h3>
                    <p className="text-white/70 leading-relaxed">{plan.narrative.allocationRationale}</p>
                  </section>
                  
                  <section className="mb-8">
                    <h3 className="text-lg font-semibold text-amber-400 mb-3">Implementation Guide</h3>
                    <p className="text-white/70 leading-relaxed">{plan.narrative.implementationGuide}</p>
                  </section>
                  
                  <section>
                    <h3 className="text-lg font-semibold text-rose-400 mb-3">Rebalancing Strategy</h3>
                    <p className="text-white/70 leading-relaxed">{plan.narrative.rebalancing}</p>
                  </section>
                </div>
              </Card>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-4">
                {plan.actionPlan.map((action: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="bg-white/5 border-white/10 p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold shrink-0">
                          {action.priority}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{action.title}</h4>
                            <Badge variant="outline" className="border-white/20 text-white/60">
                              {action.timeframe}
                            </Badge>
                          </div>
                          <p className="text-white/60 text-sm">{action.description}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}

                {/* CTA */}
                <Card className="bg-gradient-to-r from-blue-500/20 to-emerald-500/20 border-white/20 p-8 text-center">
                  <h3 className="text-2xl font-bold mb-3">Ready to Implement Your Strategy?</h3>
                  <p className="text-white/60 mb-6 max-w-lg mx-auto">
                    Use our platform to track your portfolio, automate rebalancing, and get real-time insights on your investments.
                  </p>
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 px-8">
                    <Play className="w-5 h-5 mr-2" />
                    Demo the Platform
                  </Button>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default EliteQuestionnaire;
