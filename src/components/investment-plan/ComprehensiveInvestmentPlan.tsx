/**
 * ENHANCED INVESTMENT PLAN RESULTS
 * 
 * Beautiful visual rendering with:
 * - AI-generated personalized strategy (Lovable AI)
 * - Myers-Briggs style investor archetypes
 * - Animated donut charts
 * - Combined Strategy & Profile tab (shown first)
 * - Risk gauge visualization
 * - Full policy renderer
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Share2, ArrowRight, PieChart, BarChart3, Target, Sparkles,
  CheckCircle, Clock, AlertCircle, Shield, TrendingUp, Zap, Brain,
  Compass, Flame, Anchor, Scale, Rocket, Eye, Heart, Lightbulb,
  ChevronDown, ChevronUp, ExternalLink, Copy, Check, Play,
  BookOpen, Calendar, DollarSign, Percent, LineChart, Building2,
  Globe, Gem, Wallet, Lock, AlertTriangle, RefreshCw, LogOut,
  FileText, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// Tabs removed - now using unified scrollable view
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════════════════════════
// INVESTOR ARCHETYPES (Myers-Briggs Style)
// ═══════════════════════════════════════════════════════════════════════════════

const INVESTOR_ARCHETYPES = {
  'The Guardian': {
    range: [0, 20],
    icon: Shield,
    color: 'blue',
    tagline: 'Protector of Wealth',
    description: 'You prioritize security above all else. Your investment philosophy centers on capital preservation and steady, predictable returns.',
    traits: ['Risk-averse', 'Patient', 'Disciplined', 'Methodical'],
    strengths: ['Emotional stability during downturns', 'Consistent saving habits', 'Long-term thinking'],
    blindSpots: ['May miss growth opportunities', 'Inflation erosion risk', 'Over-concentration in "safe" assets'],
    famousInvestor: 'Benjamin Graham',
    spirit: '🛡️',
  },
  'The Sentinel': {
    range: [20, 35],
    icon: Anchor,
    color: 'cyan',
    tagline: 'Steady & Strategic',
    description: 'You believe in measured progress. Security matters, but you understand that some growth is necessary to meet long-term goals.',
    traits: ['Cautious optimist', 'Research-driven', 'Values stability', 'Systematic'],
    strengths: ['Balanced decision-making', 'Thorough due diligence', 'Resistant to FOMO'],
    blindSpots: ['Analysis paralysis', 'Slow to act on opportunities', 'May be too conservative for timeline'],
    famousInvestor: 'John Bogle',
    spirit: '⚓',
  },
  'The Architect': {
    range: [35, 50],
    icon: Compass,
    color: 'emerald',
    tagline: 'Builder of Balanced Portfolios',
    description: 'You see investing as engineering the perfect system. Balance and diversification are your guiding principles.',
    traits: ['Analytical', 'Systematic', 'Detail-oriented', 'Balanced'],
    strengths: ['Excellent at diversification', 'Data-driven decisions', 'Consistent rebalancing'],
    blindSpots: ['May over-complicate', 'Could miss concentrated bets', 'Tendency to over-optimize'],
    famousInvestor: 'Ray Dalio',
    spirit: '🏗️',
  },
  'The Navigator': {
    range: [50, 65],
    icon: Eye,
    color: 'violet',
    tagline: 'Adaptive & Opportunistic',
    description: 'You blend strategy with flexibility. You have a plan but adapt when compelling opportunities arise.',
    traits: ['Adaptable', 'Opportunistic', 'Forward-thinking', 'Curious'],
    strengths: ['Spotting market trends', 'Tactical adjustments', 'Open to new ideas'],
    blindSpots: ['May overtrade', 'Chasing performance', 'Information overload'],
    famousInvestor: 'Peter Lynch',
    spirit: '🧭',
  },
  'The Trailblazer': {
    range: [65, 80],
    icon: Rocket,
    color: 'amber',
    tagline: 'Growth-Focused Pioneer',
    description: 'You believe in the power of growth and are willing to endure volatility for potentially superior returns.',
    traits: ['Ambitious', 'Confident', 'Action-oriented', 'Visionary'],
    strengths: ['High conviction investing', 'Early trend adoption', 'Strong risk tolerance'],
    blindSpots: ['Overconfidence', 'Concentrated positions', 'May ignore warning signs'],
    famousInvestor: 'Cathie Wood',
    spirit: '🚀',
  },
  'The Maverick': {
    range: [80, 100],
    icon: Flame,
    color: 'rose',
    tagline: 'Bold & Unconventional',
    description: 'You thrive on high-stakes opportunities. You understand that outsized returns require outsized risks.',
    traits: ['Bold', 'Independent', 'Contrarian', 'High-energy'],
    strengths: ['Exceptional upside capture', 'Thrives under pressure', 'Strong conviction'],
    blindSpots: ['Excessive risk-taking', 'Emotional decisions', 'Portfolio concentration'],
    famousInvestor: 'Michael Burry',
    spirit: '🔥',
  },
};

function getArchetype(riskScore: number) {
  for (const [name, archetype] of Object.entries(INVESTOR_ARCHETYPES)) {
    if (riskScore >= archetype.range[0] && riskScore < archetype.range[1]) {
      return { name, ...archetype };
    }
  }
  return { name: 'The Maverick', ...INVESTOR_ARCHETYPES['The Maverick'] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Extract value from response (handles both {value: x} and primitive x)
// ═══════════════════════════════════════════════════════════════════════════════

function getResponseValue(value: any, defaultValue: any = null): any {
  if (value === undefined || value === null) return defaultValue;
  // Handle wrapped object format {value: x}
  if (typeof value === 'object' && 'value' in value) {
    return value.value ?? defaultValue;
  }
  return value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ComprehensiveInvestmentResultsProps {
  responses: Record<string, any>;
  rawPolicy: string;
  userName: string;
  riskScore: number;
  onDemo?: () => void;
  onStartNew?: () => void;
  onSignOut?: () => void;
  onExport?: () => void;
}

export function ComprehensiveInvestmentResults({ 
  responses,
  rawPolicy, 
  userName,
  riskScore,
  onDemo,
  onStartNew,
  onSignOut,
  onExport,
}: ComprehensiveInvestmentResultsProps) {
  // activeTab removed - now using unified scrollable view
  const [copied, setCopied] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<string | null>(null);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(true);
  const { toast } = useToast();

  // Get investor archetype
  const archetype = useMemo(() => getArchetype(riskScore || 50), [riskScore]);
  
  // Calculate 4-dimension scores for the investor DNA visualization
  const investorDimensions = useMemo(() => {
    const score = riskScore || 50;
    // Derive dimensions from responses and risk score - use helper to handle {value: x} objects
    const timeline = getResponseValue(responses['goal-timeline'], 10);
    const involvement = getResponseValue(responses['pref-involvement'], 50);
    const diversification = getResponseValue(responses['pref-diversification'], 50);
    const prefStyle = getResponseValue(responses['pref-style'], 'balanced');
    
    return {
      // Guardian (0) vs Pioneer (100) - based on risk score
      risk: score,
      // Analytical (0) vs Intuitive (100) - based on investment style preference
      decision: prefStyle === 'active' ? 70 : prefStyle === 'value' ? 30 : 50,
      // Patient (0) vs Active (100) - based on timeline and involvement
      time: Math.min(100, Math.max(0, 100 - (Number(timeline) * 5) + (Number(involvement) * 0.3))),
      // Diversifier (0) vs Concentrator (100) - based on diversification preference
      focus: 100 - (Number(diversification) || 50),
    };
  }, [riskScore, responses]);

  // Generate investor type code from dimensions
  const investorTypeCode = useMemo(() => {
    const { risk, decision, time, focus } = investorDimensions;
    return (
      (risk < 50 ? 'G' : 'P') +
      (decision < 50 ? 'A' : 'I') +
      (time < 50 ? 'P' : 'A') +
      (focus < 50 ? 'D' : 'C')
    );
  }, [investorDimensions]);

  // Parse allocation based on risk score
  const allocation = useMemo(() => {
    const score = riskScore || 50;
    return [
      { category: 'US Equities', percentage: Math.round(30 + score * 0.4), color: '#3b82f6' },
      { category: 'International', percentage: Math.round(10 + score * 0.15), color: '#8b5cf6' },
      { category: 'Fixed Income', percentage: Math.round(40 - score * 0.35), color: '#10b981' },
      { category: 'Real Estate', percentage: 8, color: '#f59e0b' },
      { category: 'Alternatives', percentage: Math.round(score * 0.08), color: '#ec4899' },
      { category: 'Cash', percentage: Math.max(2, 12 - Math.round(score * 0.1)), color: '#6b7280' },
    ].filter(a => a.percentage > 0);
  }, [riskScore]);

  // NOTE: We no longer recommend specific securities/ETFs - focus on asset allocation only

  // Get saved key metrics from responses (calculated by EliteQuestionnaire)
  const savedKeyMetrics = responses?.keyMetrics as {
    expectedReturn?: string;
    volatility?: string;
    maxDrawdown?: string;
    sharpRatio?: string;
    timeHorizon?: string;
  } | undefined;

  // Get goal amount - check both investmentAmount (saved format) and goal-amount (questionnaire format)
  const goalAmount = useMemo(() => {
    // First check for saved investmentAmount (from database)
    const savedAmount = responses?.investmentAmount;
    if (savedAmount && typeof savedAmount === 'number' && savedAmount > 0) {
      return savedAmount;
    }
    // Then check for questionnaire response
    const questionnaireAmount = getResponseValue(responses['goal-amount'], null);
    if (questionnaireAmount && typeof questionnaireAmount === 'number' && questionnaireAmount > 0) {
      return questionnaireAmount;
    }
    // Default fallback
    return 50000;
  }, [responses]);

  // Format large amounts nicely
  const formatInvestmentAmount = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  // Action items - use helper for response values
  const actionItems = useMemo(() => [
    { priority: 1, title: 'Open brokerage account', description: 'Choose a low-cost broker like Fidelity, Schwab, or Vanguard', timeframe: 'This week' },
    { priority: 2, title: 'Fund your account', description: `Transfer your initial investment of ${formatInvestmentAmount(goalAmount)}`, timeframe: '1-2 weeks' },
    { priority: 3, title: 'Implement your allocation', description: 'Build your portfolio according to your target asset allocation', timeframe: '30 days' },
    { priority: 4, title: 'Set up automatic investing', description: 'Schedule recurring contributions to maintain momentum', timeframe: '30 days' },
    { priority: 5, title: 'Schedule quarterly review', description: 'Add calendar reminder to review and rebalance portfolio', timeframe: 'Ongoing' },
  ], [goalAmount]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const riskLabel = riskScore < 30 ? 'Conservative' : riskScore < 50 ? 'Moderate' : riskScore < 70 ? 'Growth' : 'Aggressive';
  const timeHorizon = savedKeyMetrics?.timeHorizon 
    ? parseInt(savedKeyMetrics.timeHorizon) || getResponseValue(responses['goal-timeline'], 10)
    : getResponseValue(responses['goal-timeline'], 10);
  
  // Use saved metrics from the questionnaire calculation - these are the accurate, formula-based values
  const expectedReturn = savedKeyMetrics?.expectedReturn?.replace('%', '') || (4 + riskScore * 0.06).toFixed(1);
  const maxDrawdown = savedKeyMetrics?.maxDrawdown?.replace('%', '') || `-${(10 + riskScore * 0.25).toFixed(0)}`;
  const expectedVolatility = savedKeyMetrics?.volatility?.replace('%', '') || (6 + riskScore * 0.14).toFixed(1);
  const sharpeRatio = savedKeyMetrics?.sharpRatio || Math.max(0, ((parseFloat(expectedReturn) - 4.5) / parseFloat(expectedVolatility))).toFixed(2);

  // Check if rawPolicy contains an AI-generated strategy (to avoid regeneration)
  const hasExistingStrategy = useMemo(() => {
    if (!rawPolicy || rawPolicy.length < 100) return false;
    // AI-generated strategies contain specific section headers
    return rawPolicy.includes('## Your Investment Philosophy') || 
           rawPolicy.includes('## Portfolio Construction') ||
           rawPolicy.includes('## Behavioral Guardrails');
  }, [rawPolicy]);

  // Generate AI strategy on mount ONLY if we don't have an existing strategy
  useEffect(() => {
    // If we already have a saved AI strategy, use it directly
    if (hasExistingStrategy) {
      setAiStrategy(rawPolicy);
      setIsLoadingStrategy(false);
      return;
    }

    const generateAIStrategy = async () => {
      setIsLoadingStrategy(true);
      try {
        // Log what we're sending to help debug
        console.log('Generating AI strategy with:', { 
          goalAmount, 
          investmentAmount: responses?.investmentAmount,
          savedKeyMetrics 
        });
        
        const { data, error } = await supabase.functions.invoke('generate-investment-strategy', {
          body: {
            profile: {
              riskScore,
              riskLabel,
              investorType: investorTypeCode,
              investorTypeName: archetype.name,
              timeHorizon,
              goalAmount,
              keyMetrics: savedKeyMetrics, // Pass saved metrics to edge function
              allocation: allocation.map(a => ({ category: a.category, percentage: a.percentage })),
              responses,
              userName,
            },
          },
        });

        if (error) {
          console.error('AI strategy error:', error);
          // Fall back to rawPolicy if AI fails
          if (rawPolicy) {
            setAiStrategy(rawPolicy);
          }
          toast({
            title: 'Using standard strategy',
            description: 'AI personalization unavailable at this time.',
            variant: 'default',
          });
        } else if (data?.strategy) {
          setAiStrategy(data.strategy);
        } else if (rawPolicy) {
          setAiStrategy(rawPolicy);
        }
      } catch (err) {
        console.error('Failed to generate AI strategy:', err);
        if (rawPolicy) {
          setAiStrategy(rawPolicy);
        }
      } finally {
        setIsLoadingStrategy(false);
      }
    };

    generateAIStrategy();
  }, [hasExistingStrategy, riskScore, riskLabel, investorTypeCode, archetype.name, timeHorizon, goalAmount, allocation, responses, userName, rawPolicy, toast]);


  return (
    <div className="min-h-screen w-full bg-background text-foreground pb-24 sm:pb-32 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-semibold">{userName}'s Investment Strategy</h1>
                <p className="text-sm text-white/40">
                  Generated {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyLink}
                className="border-white/10 text-white hover:bg-white/5 hidden sm:flex"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Share'}
              </Button>
              {onExport && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onExport}
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}
              {onStartNew && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onStartNew}
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  <RefreshCw className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">New</span>
                </Button>
              )}
              {onDemo && (
                <Button 
                  size="sm"
                  onClick={onDemo}
                  className="bg-gradient-to-r from-blue-500 to-emerald-500"
                >
                  <Play className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Demo Platform</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ════════════════════════════════════════════════════════════════════
            HERO: Investor Archetype Card
        ════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className={cn(
            "relative overflow-hidden border-0 p-6 sm:p-8",
            archetype.color === 'blue' && "bg-gradient-to-br from-blue-500/20 to-blue-900/40",
            archetype.color === 'cyan' && "bg-gradient-to-br from-cyan-500/20 to-cyan-900/40",
            archetype.color === 'emerald' && "bg-gradient-to-br from-emerald-500/20 to-emerald-900/40",
            archetype.color === 'violet' && "bg-gradient-to-br from-violet-500/20 to-violet-900/40",
            archetype.color === 'amber' && "bg-gradient-to-br from-amber-500/20 to-amber-900/40",
            archetype.color === 'rose' && "bg-gradient-to-br from-rose-500/20 to-rose-900/40",
          )}>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            </div>

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Left: Archetype Info */}
              <div className="min-w-0">
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl",
                    archetype.color === 'blue' && "bg-blue-500/30",
                    archetype.color === 'cyan' && "bg-cyan-500/30",
                    archetype.color === 'emerald' && "bg-emerald-500/30",
                    archetype.color === 'violet' && "bg-violet-500/30",
                    archetype.color === 'amber' && "bg-amber-500/30",
                    archetype.color === 'rose' && "bg-rose-500/30",
                  )}>
                    {archetype.spirit}
                  </div>
                  <div>
                    <Badge className="mb-1 bg-white/10 text-white/80 border-0">
                      Your Investor Type
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-bold">{archetype.name}</h2>
                  </div>
                </div>

                <p className="text-lg sm:text-xl text-white/60 mb-4">{archetype.tagline}</p>
                <p className="text-white/70 mb-6">{archetype.description}</p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {archetype.traits.map((trait, i) => (
                    <Badge key={i} variant="outline" className="border-white/20 text-white/70">
                      {trait}
                    </Badge>
                  ))}
                </div>

                <div className="text-sm text-white/50">
                  <span className="text-white/70">Famous investor with similar profile:</span>{' '}
                  <span className="font-medium text-white/90">{archetype.famousInvestor}</span>
                </div>
              </div>

              {/* Right: Risk Score & Quick Stats */}
              <div className="space-y-6 min-w-0">
                {/* Risk Score Gauge */}
                <div className="bg-white/5 rounded-2xl p-4 sm:p-6">
                  <div className="text-center mb-4">
                    <div className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-blue-400 via-emerald-400 to-rose-400 bg-clip-text text-transparent">
                      {riskScore}
                    </div>
                    <div className="text-white/40">Risk Score</div>
                  </div>
                  
                  {/* Gauge */}
                  <div className="relative h-4 bg-white/10 rounded-full overflow-hidden mb-2">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-emerald-500 via-amber-500 to-rose-500" />
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-white/50"
                      initial={{ left: 0 }}
                      animate={{ left: `calc(${riskScore}% - 8px)` }}
                      transition={{ delay: 0.5, type: 'spring' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Conservative</span>
                    <span>Moderate</span>
                    <span>Aggressive</span>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { 
                      label: 'Investment', 
                      value: formatInvestmentAmount(goalAmount), 
                      icon: DollarSign, 
                      color: 'emerald',
                      tooltip: 'Your target investment amount'
                    },
                    { 
                      label: 'Goal Return', 
                      value: `${expectedReturn}%`, 
                      icon: TrendingUp, 
                      color: 'blue',
                      tooltip: 'Target annual return based on your risk profile and allocation'
                    },
                    { 
                      label: 'Goal Max Drawdown', 
                      value: `${maxDrawdown}%`, 
                      icon: AlertTriangle, 
                      color: 'rose',
                      tooltip: 'Maximum portfolio decline you should be prepared for'
                    },
                    { 
                      label: 'Time Horizon', 
                      value: `${timeHorizon} years`, 
                      icon: Clock, 
                      color: 'amber',
                      tooltip: 'Your investment timeframe for this strategy'
                    },
                    { 
                      label: 'Goal Volatility', 
                      value: `${expectedVolatility}%`, 
                      icon: LineChart, 
                      color: 'violet',
                      tooltip: 'Expected annual portfolio volatility'
                    },
                    { 
                      label: 'Goal Sharpe', 
                      value: sharpeRatio, 
                      icon: BarChart3, 
                      color: 'cyan',
                      tooltip: 'Target risk-adjusted return (higher is better)'
                    },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 group relative">
                      <stat.icon className={cn(
                        "w-4 h-4 mb-2",
                        stat.color === 'emerald' && "text-emerald-400",
                        stat.color === 'blue' && "text-blue-400",
                        stat.color === 'rose' && "text-rose-400",
                        stat.color === 'amber' && "text-amber-400",
                        stat.color === 'violet' && "text-violet-400",
                        stat.color === 'cyan' && "text-cyan-400",
                      )} />
                      <div className="text-lg font-bold">{stat.value}</div>
                      <div className="text-xs text-white/40">{stat.label}</div>
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 rounded-lg text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 max-w-[200px] text-center">
                        {stat.tooltip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════════
            INVESTOR DNA: 4-Dimension Sliders (Myers-Briggs Style)
        ════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="bg-white/5 border-white/10 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Badge className="mb-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border-0">
                  Investor DNA
                </Badge>
                <h3 className="text-xl sm:text-2xl font-bold">Your Personality Code: <span className="text-blue-400 font-mono">{investorTypeCode}</span></h3>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { 
                  left: 'Guardian', 
                  right: 'Pioneer', 
                  leftIcon: Shield, 
                  rightIcon: Rocket,
                  value: investorDimensions.risk,
                  leftDesc: 'Capital preservation focus',
                  rightDesc: 'Growth-seeking mindset',
                  gradientFrom: '#3b82f6',
                  gradientTo: '#f43f5e'
                },
                { 
                  left: 'Analytical', 
                  right: 'Intuitive', 
                  leftIcon: Brain, 
                  rightIcon: Heart,
                  value: investorDimensions.decision,
                  leftDesc: 'Data-driven decisions',
                  rightDesc: 'Gut-feel investing',
                  gradientFrom: '#10b981',
                  gradientTo: '#8b5cf6'
                },
                { 
                  left: 'Patient', 
                  right: 'Active', 
                  leftIcon: Clock, 
                  rightIcon: Zap,
                  value: investorDimensions.time,
                  leftDesc: 'Long-term horizon',
                  rightDesc: 'Tactical trading',
                  gradientFrom: '#06b6d4',
                  gradientTo: '#f59e0b'
                },
                { 
                  left: 'Diversifier', 
                  right: 'Concentrator', 
                  leftIcon: Globe, 
                  rightIcon: Target,
                  value: investorDimensions.focus,
                  leftDesc: 'Spread across assets',
                  rightDesc: 'High-conviction bets',
                  gradientFrom: '#14b8a6',
                  gradientTo: '#f97316'
                },
              ].map((dimension, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="bg-white/5 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <dimension.leftIcon className="w-4 h-4 text-white/60" />
                      <span className="text-sm font-medium">{dimension.left}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{dimension.right}</span>
                      <dimension.rightIcon className="w-4 h-4 text-white/60" />
                    </div>
                  </div>
                  
                  {/* Slider Track */}
                  <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                    <div 
                      className="absolute inset-0 opacity-50"
                      style={{ background: `linear-gradient(to right, ${dimension.gradientFrom}, ${dimension.gradientTo})` }}
                    />
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-white/80"
                      initial={{ left: '50%' }}
                      animate={{ left: `calc(${dimension.value}% - 10px)` }}
                      transition={{ delay: 0.5 + i * 0.1, type: 'spring', stiffness: 100 }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-[10px] text-white/40">
                    <span>{dimension.leftDesc}</span>
                    <span>{dimension.rightDesc}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════════
            UNIFIED VIEW: Strategy, Allocation & Actions (All in One)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="space-y-8">
          
          {/* ═══════════════════════════════════════════════════════════════
              SECTION 1: AI-Generated Strategy
          ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/5 border-white/10 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Your Personalized Investment Strategy</h3>
                  <p className="text-sm text-white/50">AI-generated based on your unique profile</p>
                </div>
              </div>
              
              {isLoadingStrategy ? (
                <div className="text-center py-16">
                  <Loader2 className="w-10 h-10 mx-auto mb-4 text-blue-400 animate-spin" />
                  <p className="text-white/60">Generating your personalized strategy...</p>
                  <p className="text-sm text-white/40 mt-2">This takes about 10-15 seconds</p>
                </div>
              ) : aiStrategy ? (
                <div className="prose prose-invert max-w-none">
                  <PolicyRenderer content={aiStrategy} />
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-white/20" />
                  <p className="text-white/60">Strategy document not available</p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 2: Profile Insights (Strengths & Blind Spots)
          ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* Strengths */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Your Investment Strengths
              </h3>
              <ul className="space-y-3">
                {archetype.strengths.map((strength, i) => (
                  <motion.li 
                    key={i} 
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + 0.1 * i }}
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-white/70">{strength}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>

            {/* Blind Spots */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                Watch Out For
              </h3>
              <ul className="space-y-3">
                {archetype.blindSpots.map((spot, i) => (
                  <motion.li 
                    key={i} 
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + 0.1 * i }}
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    </div>
                    <span className="text-white/70">{spot}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 3: Target Allocation
          ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-400" />
                Target Asset Allocation
              </h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* Donut Chart */}
                <div className="flex justify-center items-center">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {allocation.reduce((acc: any[], item, i) => {
                        const prevPercent = acc.reduce((sum, a) => sum + a.percentage, 0);
                        const circumference = 2 * Math.PI * 40;
                        const offset = (prevPercent / 100) * circumference;
                        const length = (item.percentage / 100) * circumference;
                        
                        return [...acc, {
                          ...item,
                          element: (
                            <motion.circle
                              key={i}
                              cx="50" cy="50" r="40"
                              fill="none"
                              stroke={item.color}
                              strokeWidth="20"
                              strokeDasharray={`${length} ${circumference - length}`}
                              strokeDashoffset={-offset}
                              initial={{ strokeDasharray: `0 ${circumference}` }}
                              animate={{ strokeDasharray: `${length} ${circumference - length}` }}
                              transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                            />
                          )
                        }];
                      }, []).map((item: any) => item.element)}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{allocation.length}</div>
                        <div className="text-xs text-white/40">Asset Classes</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Allocation List */}
                <div className="md:col-span-2 space-y-4">
                  {allocation.map((item, i) => (
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
                          transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allocation Rationale */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  Why This Allocation?
                </h4>
                <div className="space-y-3 text-white/70 text-sm">
                  <p>
                    Based on your <strong className="text-white">{riskLabel}</strong> risk profile 
                    and <strong className="text-white">{timeHorizon}-year</strong> time horizon, 
                    this allocation targets{' '}
                    {riskScore > 60 ? 'growth with acceptable volatility' : 
                     riskScore > 40 ? 'a balance of growth and stability' : 
                     'capital preservation with modest growth'}.
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong className="text-white">Equities ({allocation.filter(a => a.category.includes('Equit') || a.category.includes('International')).reduce((s, a) => s + a.percentage, 0)}%):</strong>{' '}
                      {riskScore > 50 ? 'Higher allocation for growth potential' : 'Moderate allocation for balanced growth'}
                    </li>
                    <li>
                      <strong className="text-white">Fixed Income ({allocation.find(a => a.category.includes('Fixed'))?.percentage || 0}%):</strong>{' '}
                      {riskScore < 50 ? 'Significant allocation for stability and income' : 'Lower allocation given higher risk tolerance'}
                    </li>
                    <li>
                      <strong className="text-white">Real Assets & Alternatives:</strong>{' '}
                      Diversification across uncorrelated assets to reduce portfolio volatility
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 4: Risk Profile Breakdown
          ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-400" />
                Your Risk Profile Breakdown
              </h3>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  { label: 'Risk Tolerance', value: riskScore, description: 'Emotional ability to handle losses', color: 'blue' },
                  { label: 'Risk Capacity', value: Math.min(100, riskScore + 10), description: 'Financial ability to take risk', color: 'emerald' },
                  { label: 'Risk Required', value: Math.max(0, riskScore - 5), description: 'Risk needed to meet goals', color: 'violet' },
                ].map((metric, i) => (
                  <div key={i} className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-3">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                        <motion.circle
                          cx="48" cy="48" r="40" fill="none"
                          stroke={metric.color === 'blue' ? '#3b82f6' : metric.color === 'emerald' ? '#10b981' : '#8b5cf6'}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${metric.value * 2.51} 251`}
                          initial={{ strokeDasharray: '0 251' }}
                          animate={{ strokeDasharray: `${metric.value * 2.51} 251` }}
                          transition={{ delay: 0.5 + i * 0.2, duration: 1 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold">{metric.value}</span>
                      </div>
                    </div>
                    <div className="font-medium">{metric.label}</div>
                    <div className="text-xs text-white/40">{metric.description}</div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 5: Action Items
          ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-emerald-400" />
                Your Action Plan
              </h3>
              <div className="space-y-4">
                {actionItems.map((action, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="bg-white/5 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold shrink-0">
                        {action.priority}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold">{action.title}</h4>
                          <Badge variant="outline" className="border-white/20 text-white/60">
                            {action.timeframe}
                          </Badge>
                        </div>
                        <p className="text-white/60 text-sm">{action.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION 6: CTA Card
          ═══════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-gradient-to-r from-blue-500/20 to-emerald-500/20 border-white/20 p-8 text-center">
              <h3 className="text-2xl font-bold mb-3">Ready to Implement Your Strategy?</h3>
              <p className="text-white/60 mb-6 max-w-lg mx-auto">
                Use our platform to track your portfolio in real-time, receive rebalancing alerts, 
                and get AI-powered insights on your investments.
              </p>
              <Button 
                size="lg" 
                onClick={onDemo}
                className="bg-white text-black hover:bg-white/90 px-8"
              >
                <Play className="w-5 h-5 mr-2" />
                Demo the Platform
              </Button>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-white/40 text-sm">
          <p className="mb-2">
            This is educational guidance, not financial advice. Consider consulting a licensed advisor.
          </p>
          <p>Powered by Your Platform</p>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY RENDERER - Converts markdown to beautiful components
// ═══════════════════════════════════════════════════════════════════════════════

function PolicyRenderer({ content }: { content: string }) {
  const sections = content.split(/(?=^## )/gm);

  return (
    <div className="space-y-8">
      {sections.map((section, i) => {
        const lines = section.trim().split('\n');
        const titleMatch = lines[0]?.match(/^##?\s+(.+)/);
        const title = titleMatch?.[1] || '';
        const body = lines.slice(1).join('\n');

        if (!title && !body.trim()) return null;

        return (
          <section key={i} className="border-b border-white/10 pb-8 last:border-0">
            {title && (
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                {title.includes('OBJECTIVE') && <Target className="w-5 h-5 text-blue-400" />}
                {title.includes('RISK') && <Shield className="w-5 h-5 text-amber-400" />}
                {title.includes('ALLOCATION') && <PieChart className="w-5 h-5 text-emerald-400" />}
                {title.includes('ETF') && <BarChart3 className="w-5 h-5 text-violet-400" />}
                {title.includes('POSITION') && <Scale className="w-5 h-5 text-cyan-400" />}
                {title.includes('MANAGEMENT') && <Calendar className="w-5 h-5 text-pink-400" />}
                {title.includes('EMOTIONAL') && <Heart className="w-5 h-5 text-rose-400" />}
                {title.includes('ACTION') && <Rocket className="w-5 h-5 text-orange-400" />}
                {title.includes('REFERENCE') && <BookOpen className="w-5 h-5 text-white/60" />}
                {title}
              </h2>
            )}
            <div className="text-white/70 leading-relaxed">
              <MarkdownContent content={body} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const elements: JSX.Element[] = [];
  let currentTable: string[][] = [];
  let inTable = false;

  const lines = content.split('\n');

  lines.forEach((line, i) => {
    // Table detection
    if (line.includes('|') && line.trim().startsWith('|')) {
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
      if (cells.some(c => c.match(/^-+$/))) return;
      currentTable.push(cells);
      inTable = true;
      return;
    } else if (inTable && currentTable.length > 0) {
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/10">
                {currentTable[0]?.map((cell, j) => (
                  <th key={j} className="text-left p-3 border border-white/10 text-white font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentTable.slice(1).map((row, ri) => (
                <tr key={ri} className="hover:bg-white/5">
                  {row.map((cell, ci) => (
                    <td key={ci} className="p-3 border border-white/10 text-white/70">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = [];
      inTable = false;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-lg font-semibold text-white mt-6 mb-3">
          {line.replace('### ', '')}
        </h3>
      );
      return;
    }

    // Bold
    if (line.includes('**')) {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      elements.push(
        <p key={i} className="mb-2">
          {parts.map((part, j) => 
            j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
          )}
        </p>
      );
      return;
    }

    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <li key={i} className="ml-4 mb-1 list-disc">
          {line.replace(/^[\s]*[-*]\s/, '')}
        </li>
      );
      return;
    }

    // Numbered lists
    if (line.match(/^\d+\.\s/)) {
      elements.push(
        <li key={i} className="ml-4 mb-1 list-decimal">
          {line.replace(/^\d+\.\s/, '')}
        </li>
      );
      return;
    }

    // Regular paragraph
    if (line.trim()) {
      elements.push(<p key={i} className="mb-2">{line}</p>);
    }
  });

  return <>{elements}</>;
}

export default ComprehensiveInvestmentResults;
