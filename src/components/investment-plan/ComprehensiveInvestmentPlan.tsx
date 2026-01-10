/**
 * Comprehensive Investment Plan Results Component
 * Displays the generated investment plan with investor type profiling
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  TrendingUp,
  Target,
  PieChart,
  BarChart3,
  Sparkles,
  Play,
  ArrowRight,
  Check,
  FileText,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getInvestorType, getInvestorTypeCode } from '@/data/premiumQuestionnaire';

interface ComprehensiveInvestmentResultsProps {
  responses: Record<string, any>;
  rawPolicy: string;
  userName: string;
  riskScore: number;
  onDemo?: () => void;
  onStartNew?: () => void;
  onSignOut?: () => void;
}

export function ComprehensiveInvestmentResults({
  responses,
  rawPolicy,
  userName,
  riskScore,
  onDemo,
  onStartNew,
  onSignOut,
}: ComprehensiveInvestmentResultsProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Calculate investor type from responses
  const dimensions = {
    risk: responses.risk || 50,
    decision: responses.decision || 50,
    time: responses.time || 50,
    focus: responses.focus || 50,
  };
  
  const typeCode = getInvestorTypeCode(dimensions);
  const investorType = getInvestorType(typeCode);
  
  // Generate allocation based on risk score
  const allocation = [
    { category: 'US Equities', percentage: Math.round(30 + riskScore * 0.4), color: '#3b82f6' },
    { category: 'International', percentage: Math.round(10 + riskScore * 0.15), color: '#8b5cf6' },
    { category: 'Fixed Income', percentage: Math.round(40 - riskScore * 0.35), color: '#10b981' },
    { category: 'Alternatives', percentage: Math.round(10 + riskScore * 0.1), color: '#f59e0b' },
    { category: 'Cash', percentage: Math.max(5, 10 - Math.round(riskScore * 0.08)), color: '#6b7280' },
  ];
  
  const getRiskLabel = (score: number) => {
    if (score < 25) return 'Conservative';
    if (score < 40) return 'Moderately Conservative';
    if (score < 60) return 'Moderate';
    if (score < 75) return 'Moderately Aggressive';
    return 'Aggressive';
  };
  
  const getRiskDescription = (score: number) => {
    if (score < 25) return 'You prioritize capital preservation with steady, predictable returns.';
    if (score < 40) return 'You favor stability while accepting modest growth opportunities.';
    if (score < 60) return 'You balance growth potential with risk management.';
    if (score < 75) return 'You pursue higher returns and can weather significant volatility.';
    return 'You maximize growth potential with a long-term horizon.';
  };
  
  const keyMetrics = {
    expectedReturn: `${(3 + riskScore * 0.07).toFixed(1)}%`,
    volatility: `${(4 + riskScore * 0.18).toFixed(1)}%`,
    maxDrawdown: `-${(8 + riskScore * 0.35).toFixed(0)}%`,
    sharpeRatio: (0.3 + riskScore * 0.008).toFixed(2),
    timeHorizon: `${responses['goal-timeline'] || 10} years`,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg">{userName}'s Investment Plan</h1>
                <span className="text-muted-foreground text-sm">
                  Generated {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {onSignOut && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onSignOut}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
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
                  New Plan
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Risk Score', value: riskScore, suffix: '/100', color: 'text-blue-400' },
            { label: 'Expected Return', value: keyMetrics.expectedReturn, color: 'text-emerald-400' },
            { label: 'Max Drawdown', value: keyMetrics.maxDrawdown, color: 'text-rose-400' },
            { label: 'Sharpe Ratio', value: keyMetrics.sharpeRatio, color: 'text-purple-400' },
            { label: 'Time Horizon', value: keyMetrics.timeHorizon, color: 'text-amber-400' },
          ].map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-muted/30 border border-border rounded-xl p-4"
            >
              <div className="text-muted-foreground text-sm mb-1">{metric.label}</div>
              <div className={cn("text-2xl font-bold", metric.color)}>
                {metric.value}{metric.suffix || ''}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['overview', 'allocation', 'investor-type', 'report'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
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
                <Card className="bg-card border-border p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    Risk Profile: {getRiskLabel(riskScore)}
                  </h3>
                  <div className="relative h-4 bg-muted rounded-full overflow-hidden mb-4">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-yellow-500 to-red-500"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                    />
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-foreground rounded-full shadow-lg"
                      initial={{ left: 0 }}
                      animate={{ left: `calc(${riskScore}% - 8px)` }}
                      transition={{ delay: 0.5, type: 'spring' }}
                    />
                  </div>
                  <p className="text-muted-foreground text-sm">{getRiskDescription(riskScore)}</p>
                </Card>

                {/* Investor Type */}
                <Card className="bg-card border-border p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-400" />
                    Investor Type: {investorType.name}
                  </h3>
                  <Badge className="mb-3 bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {typeCode}
                  </Badge>
                  <p className="text-muted-foreground text-sm italic mb-2">{investorType.tagline}</p>
                  <p className="text-muted-foreground text-sm">{investorType.description}</p>
                </Card>
              </div>
            )}

            {activeTab === 'allocation' && (
              <div className="grid md:grid-cols-3 gap-6">
                {/* Pie chart */}
                <Card className="bg-card border-border p-6 md:col-span-1">
                  <h3 className="font-semibold mb-4">Asset Allocation</h3>
                  <div className="aspect-square relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {allocation.reduce((acc: any[], item, i) => {
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
                <Card className="bg-card border-border p-6 md:col-span-2">
                  <h3 className="font-semibold mb-4">Allocation Breakdown</h3>
                  <div className="space-y-4">
                    {allocation.map((item, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-medium">{item.category}</span>
                          </div>
                          <span className="font-bold">{item.percentage}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: item.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'investor-type' && (
              <div className="space-y-6">
                <Card className="bg-card border-border p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Target className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                      <Badge className="mb-2 bg-purple-500/20 text-purple-400 border-purple-500/30">
                        {typeCode}
                      </Badge>
                      <h2 className="text-2xl font-bold">{investorType.name}</h2>
                      <p className="text-muted-foreground italic">{investorType.tagline}</p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">{investorType.description}</p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-emerald-400">Strengths</h4>
                      <ul className="space-y-2">
                        {investorType.strengths.map((strength, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-emerald-400" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-amber-400">Challenges to Watch</h4>
                      <ul className="space-y-2">
                        {investorType.challenges.map((challenge, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            {challenge}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Suggested Allocation */}
                <Card className="bg-card border-border p-6">
                  <h3 className="font-semibold mb-4">Recommended Allocation for Your Type</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {Object.entries(investorType.suggestedAllocation).map(([asset, percent]) => (
                      <div key={asset} className="text-center p-4 bg-muted/30 rounded-xl">
                        <div className="text-2xl font-bold text-primary">{percent}%</div>
                        <div className="text-xs text-muted-foreground capitalize">{asset}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'report' && (
              <Card className="bg-card border-border p-8">
                <div className="prose prose-invert max-w-none">
                  {rawPolicy ? (
                    <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {rawPolicy}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-12">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Detailed report will be generated here.</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        {onDemo && (
          <Card className="mt-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-border p-8 text-center">
            <h3 className="text-2xl font-bold mb-3">Ready to Implement Your Strategy?</h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Use our platform to track your portfolio, automate rebalancing, and get real-time insights.
            </p>
            <Button size="lg" onClick={onDemo} className="gap-2">
              <Play className="w-5 h-5" />
              Demo the Platform
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
