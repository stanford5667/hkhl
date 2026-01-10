/**
 * Comprehensive Investment Plan Results Component
 * A Myers-Briggs-style investor personality assessment
 * Premium, exciting design inspired by top fintech products
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  TrendingUp,
  Target,
  Sparkles,
  Play,
  ArrowRight,
  Check,
  FileText,
  RefreshCw,
  LogOut,
  Users,
  AlertTriangle,
  Clock,
  DollarSign,
  Brain,
  Zap,
  Layers,
  Compass,
  BarChart3,
  ChevronRight,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getInvestorType, getInvestorTypeCode, INVESTOR_TYPES } from '@/data/premiumQuestionnaire';

interface ComprehensiveInvestmentResultsProps {
  responses: Record<string, any>;
  rawPolicy: string;
  userName: string;
  riskScore: number;
  onDemo?: () => void;
  onStartNew?: () => void;
  onSignOut?: () => void;
}

// Dimension icons and labels
const DIMENSIONS = [
  { 
    key: 'risk', 
    label: 'Risk Orientation',
    leftLabel: 'Guardian',
    rightLabel: 'Pioneer',
    icon: Shield,
    color: 'from-emerald-500 to-blue-500'
  },
  { 
    key: 'decision', 
    label: 'Decision Style',
    leftLabel: 'Analytical',
    rightLabel: 'Intuitive',
    icon: Brain,
    color: 'from-purple-500 to-pink-500'
  },
  { 
    key: 'time', 
    label: 'Time Preference',
    leftLabel: 'Patient',
    rightLabel: 'Active',
    icon: Zap,
    color: 'from-amber-500 to-orange-500'
  },
  { 
    key: 'focus', 
    label: 'Focus Style',
    leftLabel: 'Diversifier',
    rightLabel: 'Concentrator',
    icon: Target,
    color: 'from-cyan-500 to-blue-500'
  },
];

export function ComprehensiveInvestmentResults({
  responses,
  rawPolicy,
  userName,
  riskScore,
  onDemo,
  onStartNew,
  onSignOut,
}: ComprehensiveInvestmentResultsProps) {
  const [activeTab, setActiveTab] = useState('profile');
  
  // Calculate investor dimensions
  const dimensions = {
    risk: responses.risk ?? riskScore ?? 50,
    decision: responses.decision ?? 50,
    time: responses.time ?? 50,
    focus: responses.focus ?? 50,
  };
  
  const typeCode = getInvestorTypeCode(dimensions);
  const investorType = getInvestorType(typeCode);
  
  // Derive traits from type
  const traits = getTraitsFromType(typeCode);
  
  // Generate allocation based on investor type
  const allocation = investorType.suggestedAllocation;
  
  const getRiskLabel = (score: number) => {
    if (score < 25) return 'Conservative';
    if (score < 40) return 'Moderately Conservative';
    if (score < 60) return 'Moderate';
    if (score < 75) return 'Moderately Aggressive';
    return 'Aggressive';
  };
  
  const keyMetrics = {
    riskScore: dimensions.risk,
    timeHorizon: `${responses['goal-timeline'] || 10} yrs`,
    portfolioTarget: `$${((responses['goal-amount'] || 50000) / 1000).toFixed(0)}K`,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">{userName}'s Investor Profile</h1>
                <span className="text-muted-foreground text-sm">
                  Generated {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {onSignOut && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={onSignOut}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              )}
              {onStartNew && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onStartNew}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">New Assessment</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Hero Section - Investor Type Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-muted/30 shadow-2xl">
            <div className="p-6 sm:p-8">
              {/* Badge */}
              <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">
                Your Investor Type
              </Badge>
              
              {/* Type Name */}
              <h2 className="text-4xl sm:text-5xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {investorType.name}
              </h2>
              
              {/* Type Code */}
              <div className="text-xl font-mono text-muted-foreground mb-4">
                {typeCode}
              </div>
              
              {/* Tagline */}
              <p className="text-lg text-muted-foreground max-w-2xl mb-6">
                {investorType.tagline}
              </p>
              
              {/* Trait Badges */}
              <div className="flex flex-wrap gap-2 mb-8">
                {traits.map((trait, i) => (
                  <motion.div
                    key={trait}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    <Badge 
                      variant="outline" 
                      className="bg-background/50 border-border/50 text-foreground px-3 py-1"
                    >
                      {trait}
                    </Badge>
                  </motion.div>
                ))}
              </div>
              
              {/* Famous Match */}
              {investorType.famousExamples && investorType.famousExamples.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Famous match: </span>
                  <span className="font-semibold text-foreground">{investorType.famousExamples[0]}</span>
                </div>
              )}
            </div>
            
            {/* Dimension Sliders */}
            <div className="border-t border-border/50 p-6 sm:p-8 bg-muted/30 space-y-6">
              {DIMENSIONS.map((dim, i) => {
                const value = dimensions[dim.key as keyof typeof dimensions];
                const Icon = dim.icon;
                
                return (
                  <motion.div
                    key={dim.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{value >= 50 ? dim.rightLabel : dim.leftLabel}</span>
                      </div>
                      <span className="text-muted-foreground font-mono text-sm">{Math.round(value)}/100</span>
                    </div>
                    
                    {/* Slider Track */}
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={cn("absolute inset-y-0 left-0 bg-gradient-to-r rounded-full", dim.color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: "easeOut" }}
                      />
                      {/* Indicator dot */}
                      <motion.div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-foreground rounded-full shadow-lg border-2 border-background"
                        initial={{ left: 0 }}
                        animate={{ left: `calc(${value}% - 6px)` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    
                    {/* Labels */}
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{dim.leftLabel}</span>
                      <span className="text-xs text-muted-foreground">{dim.rightLabel}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Bottom Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 border-t border-border/50">
              <div className="p-4 sm:p-6 border-r border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Risk Score</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold">{keyMetrics.riskScore}/100</div>
              </div>
              <div className="p-4 sm:p-6 sm:border-r border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Time Horizon</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold">{keyMetrics.timeHorizon}</div>
              </div>
              <div className="p-4 sm:p-6 col-span-2 sm:col-span-1 border-t sm:border-t-0 border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Portfolio Target</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold">{keyMetrics.portfolioTarget}</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Strengths & Challenges */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6 border-border/50 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-lg">Your Investing Strengths</h3>
              </div>
              <ul className="space-y-3">
                {investorType.strengths.map((strength, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{strength}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>
          </motion.div>

          {/* Challenges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6 border-border/50 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="font-semibold text-lg">Areas to Watch</h3>
              </div>
              <ul className="space-y-3">
                {investorType.challenges.map((challenge, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{challenge}</span>
                  </motion.li>
                ))}
              </ul>
            </Card>
          </motion.div>
        </div>

        {/* Allocation Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6 border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Suggested Asset Allocation</h3>
              </div>
              <Badge variant="secondary" className="text-xs">
                Based on your profile
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Stocks', value: allocation.stocks, color: 'bg-blue-500' },
                { label: 'Bonds', value: allocation.bonds, color: 'bg-emerald-500' },
                { label: 'Alternatives', value: allocation.alternatives, color: 'bg-purple-500' },
                { label: 'Cash', value: allocation.cash, color: 'bg-slate-400' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="text-center p-4 bg-muted/50 rounded-xl"
                >
                  <div className="text-3xl font-bold mb-1">{item.value}%</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className={cn("h-1 w-12 mx-auto mt-2 rounded-full", item.color)} />
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Investment Policy Statement CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-6 border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-lg">Complete Investment Policy Statement</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Your comprehensive, personalized investment strategy document
            </p>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Full Report
            </Button>
          </Card>
        </motion.div>

        {/* CTA */}
        {onDemo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="p-8 text-center bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-primary/20">
              <h3 className="text-2xl font-bold mb-3">Ready to Implement Your Strategy?</h3>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Use our platform to track your portfolio, backtest your strategy, and get AI-powered insights.
              </p>
              <Button size="lg" onClick={onDemo} className="gap-2 shadow-lg shadow-primary/25">
                <Play className="w-5 h-5" />
                Demo the Platform
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}

// Helper function to derive traits from type code
function getTraitsFromType(code: string): string[] {
  const traits: string[] = [];
  
  if (code[0] === 'P') {
    traits.push('Aggressive');
  } else {
    traits.push('Conservative');
  }
  
  if (code[1] === 'I') {
    traits.push('Intuitive');
  } else {
    traits.push('Analytical');
  }
  
  if (code[2] === 'A') {
    traits.push('Active');
  } else {
    traits.push('Patient');
  }
  
  if (code[3] === 'C') {
    traits.push('Focused');
  } else {
    traits.push('Diversified');
  }
  
  return traits;
}
