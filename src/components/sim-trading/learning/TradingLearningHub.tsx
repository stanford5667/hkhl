/**
 * Trading Learning Hub
 * Central panel showing mistake patterns, weekly report card, badges, and reflections
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  GraduationCap, Brain, Trophy, AlertTriangle, TrendingUp,
  ChevronDown, ChevronUp, Lightbulb, Target, BarChart3
} from 'lucide-react';
import { detectMistakePatterns, type MistakePattern } from './MistakePatterns';
import { generateWeeklyReport, type WeeklyReport, type ReportGrade } from './WeeklyReportCard';
import { TRADING_BADGES, checkBadgeEligibility, type TradingBadge } from './TradingBadges';
import type { SimTrade } from '../SimPortfolioDetail';
import type { Position } from '../SimPortfolioDetail';
import { toast } from 'sonner';

interface Props {
  portfolioId: string;
  trades: SimTrade[];
  positions: Position[];
  initialCapital: number;
  currentValue: number;
  cashBalance: number;
  goals?: { max_drawdown_pct: number; risk_budget_pct: number; target_annual_return_pct: number } | null;
}

export function TradingLearningHub({ portfolioId, trades, positions, initialCapital, currentValue, cashBalance, goals }: Props) {
  const { user } = useAuth();
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>([]);
  const [reflectionCount, setReflectionCount] = useState(0);
  const [journalEntryCount, setJournalEntryCount] = useState(0);

  // Fetch reflection count and unlocked badges
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('sim_trade_reflections' as any).select('id', { count: 'exact', head: true }).eq('portfolio_id', portfolioId).eq('user_id', user.id),
      supabase.from('sim_trading_achievements' as any).select('achievement_id').eq('portfolio_id', portfolioId).eq('user_id', user.id),
      supabase.from('sim_portfolio_journal').select('id', { count: 'exact', head: true }).eq('portfolio_id', portfolioId),
    ]).then(([refRes, badgeRes, journalRes]) => {
      setReflectionCount(refRes.count || 0);
      if (badgeRes.data) setUnlockedBadgeIds((badgeRes.data as any[]).map(b => b.achievement_id));
      setJournalEntryCount(journalRes.count || 0);
    });
  }, [user, portfolioId, trades.length]);

  // Detect mistake patterns
  const patterns = useMemo(() =>
    detectMistakePatterns({ trades, positions, initialCapital, currentValue, cashBalance, goals }),
    [trades, positions, initialCapital, currentValue, cashBalance, goals]
  );

  // Generate weekly report
  const report = useMemo(() =>
    generateWeeklyReport(trades, positions, initialCapital, currentValue, cashBalance, goals || null, reflectionCount, journalEntryCount),
    [trades, positions, initialCapital, currentValue, cashBalance, goals, reflectionCount, journalEntryCount]
  );

  // Check and unlock badges
  const eligibleBadges = useMemo(() => {
    const maxPosPct = positions.length > 0
      ? Math.max(...positions.map(p => ((p.current_value || 0) / currentValue) * 100))
      : 0;
    return checkBadgeEligibility({
      tradeCount: trades.length,
      positionCount: positions.length,
      reflectionCount,
      maxPositionPct: maxPosPct,
      stopOrderCount: 0,
      journalStreakDays: journalEntryCount,
      hasViewedReport: true,
      hasViewedMistakes: patterns.length > 0,
      educationClicks: 0,
    });
  }, [trades.length, positions, reflectionCount, journalEntryCount, patterns.length, currentValue]);

  // Persist new badges
  useEffect(() => {
    if (!user) return;
    const newBadges = eligibleBadges.filter(id => !unlockedBadgeIds.includes(id));
    if (newBadges.length === 0) return;

    const inserts = newBadges.map(id => ({
      user_id: user.id,
      portfolio_id: portfolioId,
      achievement_id: id,
    }));

    supabase.from('sim_trading_achievements' as any).insert(inserts).then(({ error }) => {
      if (!error) {
        setUnlockedBadgeIds(prev => [...prev, ...newBadges]);
        const badge = TRADING_BADGES.find(b => b.id === newBadges[0]);
        if (badge) {
          toast.success(`${badge.icon} Badge Unlocked: ${badge.name}!`);
        }
      }
    });
  }, [eligibleBadges, unlockedBadgeIds, user, portfolioId]);

  const gradeColorMap: Record<string, string> = {
    'A': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'B': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    'C': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'D': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    'F': 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  const tierColors: Record<string, string> = {
    bronze: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    silver: 'bg-slate-400/10 text-slate-300 border-slate-400/30',
    gold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          Trading Learning Hub
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="report" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-8">
            <TabsTrigger value="report" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" /> Report Card
            </TabsTrigger>
            <TabsTrigger value="patterns" className="text-xs">
              <Brain className="h-3 w-3 mr-1" /> Patterns
              {patterns.length > 0 && (
                <span className="ml-1 bg-red-500/20 text-red-400 rounded-full px-1.5 text-[9px]">{patterns.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="badges" className="text-xs">
              <Trophy className="h-3 w-3 mr-1" /> Badges
              <span className="ml-1 text-[9px] text-muted-foreground">{unlockedBadgeIds.length}/{TRADING_BADGES.length}</span>
            </TabsTrigger>
          </TabsList>

          {/* Report Card Tab */}
          <TabsContent value="report" className="mt-3">
            <div className="space-y-3">
              {/* Overall grade */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Weekly Grade</span>
                <div className={`text-2xl font-bold px-4 py-1 rounded-lg border ${gradeColorMap[report.overallGrade] || ''}`}>
                  {report.overallGrade}
                </div>
              </div>

              {/* Individual grades */}
              <div className="space-y-2">
                {report.grades.map((g) => (
                  <div key={g.category} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        <span>{g.icon}</span> {g.category}
                      </span>
                      <Badge className={`text-[10px] ${gradeColorMap[g.grade] || ''}`}>{g.grade} ({g.score})</Badge>
                    </div>
                    <Progress value={g.score} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">{g.detail}</p>
                    {g.score < 80 && (
                      <p className="text-[10px] text-primary flex items-center gap-1">
                        <Lightbulb className="h-2.5 w-2.5" /> {g.tip}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Improvement tips */}
              {report.improvementTips.length > 0 && (
                <div className="rounded bg-primary/5 border border-primary/20 p-2.5 space-y-1.5">
                  <span className="text-[10px] font-semibold text-primary uppercase flex items-center gap-1">
                    <Target className="h-3 w-3" /> Focus Areas This Week
                  </span>
                  {report.improvementTips.map((tip, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">{tip}</p>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Mistake Patterns Tab */}
          <TabsContent value="patterns" className="mt-3">
            <ScrollArea className="max-h-[350px]">
              {patterns.length === 0 ? (
                <div className="text-center py-6">
                  <Brain className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No recurring patterns detected yet. Keep trading and the system will identify behavioral biases as they emerge.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground mb-2">
                    {patterns.length} behavioral pattern{patterns.length !== 1 ? 's' : ''} detected — click to learn more
                  </p>
                  {patterns.map((pattern) => {
                    const isExpanded = expandedPattern === pattern.id;
                    const severityColor = {
                      low: 'border-blue-500/30 bg-blue-500/5',
                      medium: 'border-amber-500/30 bg-amber-500/5',
                      high: 'border-red-500/30 bg-red-500/5',
                    }[pattern.severity];

                    return (
                      <div key={pattern.id} className={`rounded border overflow-hidden ${severityColor}`}>
                        <button
                          type="button"
                          onClick={() => setExpandedPattern(isExpanded ? null : pattern.id)}
                          className="w-full text-left p-2.5 flex items-start gap-2"
                        >
                          <span className="text-lg leading-none">{pattern.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold">{pattern.name}</span>
                              <Badge variant="outline" className={`text-[9px] ${
                                pattern.severity === 'high' ? 'text-red-400 border-red-500/30' :
                                pattern.severity === 'medium' ? 'text-amber-400 border-amber-500/30' :
                                'text-blue-400 border-blue-500/30'
                              }`}>
                                {pattern.severity} ({pattern.occurrences}x)
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{pattern.description}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border/20 p-3 space-y-2">
                            <div className="rounded bg-muted/40 p-2">
                              <span className="text-[10px] font-semibold text-primary flex items-center gap-1 mb-1">
                                <Brain className="h-3 w-3" /> The Psychology Behind This
                              </span>
                              <p className="text-[10px] text-muted-foreground">{pattern.lesson}</p>
                            </div>
                            <div className="rounded bg-emerald-500/10 border border-emerald-500/20 p-2">
                              <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 mb-1">
                                <Lightbulb className="h-3 w-3" /> How to Fix This
                              </span>
                              <p className="text-[10px] text-muted-foreground">{pattern.howToFix}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="mt-3">
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-3">
                {(['discipline', 'risk', 'learning', 'milestone'] as const).map(category => {
                  const catBadges = TRADING_BADGES.filter(b => b.category === category);
                  const catName = {
                    discipline: '🎯 Discipline',
                    risk: '🛡️ Risk Management',
                    learning: '📚 Learning',
                    milestone: '🏆 Milestones',
                  }[category];

                  return (
                    <div key={category}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">{catName}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {catBadges.map(badge => {
                          const unlocked = unlockedBadgeIds.includes(badge.id);
                          return (
                            <div
                              key={badge.id}
                              className={`rounded border p-2 transition-all ${
                                unlocked
                                  ? `${tierColors[badge.tier]} border`
                                  : 'bg-muted/20 border-border/30 opacity-50'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className={`text-base ${unlocked ? '' : 'grayscale'}`}>{badge.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-semibold truncate">{badge.name}</p>
                                  <p className="text-[9px] text-muted-foreground truncate">{badge.description}</p>
                                </div>
                              </div>
                              {!unlocked && (
                                <p className="text-[8px] text-muted-foreground mt-1 italic">{badge.requirement}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
