/**
 * Performance Ranking Panel
 * 
 * Displays real-time performance scores for each Market Intel component.
 * Shows UI polish, data accuracy, and loading speed with auto-iteration logic.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Gauge, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Sparkles,
  Clock,
  Target,
  Palette,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface ComponentScore {
  id: string;
  name: string;
  uiPolish: number;
  dataAccuracy: number;
  loadingSpeed: number;
  overall: number;
  issues: string[];
  technicalDebt: string[];
  dataMismatches: string[];
  lastTested: Date;
  status: 'testing' | 'passed' | 'failed' | 'iterating';
  iterationCount: number;
}

interface PerformanceRankingPanelProps {
  scores: ComponentScore[];
  onRetest?: (componentId: string) => void;
  onAutoIterate?: (componentId: string) => void;
  showDuringDev?: boolean;
}

export function PerformanceRankingPanel({ 
  scores, 
  onRetest, 
  onAutoIterate,
  showDuringDev = true,
}: PerformanceRankingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoIterating, setAutoIterating] = useState<string | null>(null);
  
  const overallAverage = scores.length > 0 
    ? scores.reduce((sum, s) => sum + s.overall, 0) / scores.length 
    : 0;
    
  const allPassing = scores.every(s => s.overall >= 10);
  const failingCount = scores.filter(s => s.overall < 10).length;

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-emerald-400';
    if (score >= 7) return 'text-yellow-400';
    if (score >= 5) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 10) return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (score >= 7) return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    return <XCircle className="h-4 w-4 text-rose-400" />;
  };

  const getStatusBadge = (status: ComponentScore['status']) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">10/10 Passed</Badge>;
      case 'testing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Testing...</Badge>;
      case 'iterating':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Auto-Iterating</Badge>;
      case 'failed':
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">Needs Improvement</Badge>;
    }
  };

  // Auto-iteration trigger
  const handleAutoIterate = useCallback((componentId: string) => {
    setAutoIterating(componentId);
    onAutoIterate?.(componentId);
    
    // Simulate iteration completion
    setTimeout(() => {
      setAutoIterating(null);
    }, 2000);
  }, [onAutoIterate]);

  if (!showDuringDev) return null;

  return (
    <Card className="bg-gradient-to-br from-card to-secondary/30 border-primary/20 mt-6">
      <CardContent className="p-4">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Gauge className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Development Performance Ranking</h3>
                    {allPassing ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                        <Sparkles className="h-3 w-3" />
                        All 10/10
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {failingCount} component{failingCount !== 1 ? 's' : ''} need{failingCount === 1 ? 's' : ''} work
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automated testing loop • UI polish, data accuracy, loading speed
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={cn("text-2xl font-bold", getScoreColor(overallAverage))}>
                    {overallAverage.toFixed(1)}/10
                  </div>
                  <div className="text-xs text-muted-foreground">Overall Average</div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="mt-4 space-y-3">
              {scores.map((score) => (
                <ComponentScoreCard
                  key={score.id}
                  score={score}
                  isAutoIterating={autoIterating === score.id}
                  onRetest={() => onRetest?.(score.id)}
                  onAutoIterate={() => handleAutoIterate(score.id)}
                />
              ))}
            </div>
            
            {/* Summary Footer */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">UI Polish Avg</div>
                  <div className={cn("font-bold", getScoreColor(
                    scores.reduce((sum, s) => sum + s.uiPolish, 0) / Math.max(scores.length, 1)
                  ))}>
                    {(scores.reduce((sum, s) => sum + s.uiPolish, 0) / Math.max(scores.length, 1)).toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Data Accuracy Avg</div>
                  <div className={cn("font-bold", getScoreColor(
                    scores.reduce((sum, s) => sum + s.dataAccuracy, 0) / Math.max(scores.length, 1)
                  ))}>
                    {(scores.reduce((sum, s) => sum + s.dataAccuracy, 0) / Math.max(scores.length, 1)).toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Loading Speed Avg</div>
                  <div className={cn("font-bold", getScoreColor(
                    scores.reduce((sum, s) => sum + s.loadingSpeed, 0) / Math.max(scores.length, 1)
                  ))}>
                    {(scores.reduce((sum, s) => sum + s.loadingSpeed, 0) / Math.max(scores.length, 1)).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function ComponentScoreCard({ 
  score, 
  isAutoIterating,
  onRetest, 
  onAutoIterate,
}: { 
  score: ComponentScore; 
  isAutoIterating: boolean;
  onRetest: () => void;
  onAutoIterate: () => void;
}) {
  const needsIteration = score.overall < 10;
  
  const getScoreColor = (value: number) => {
    if (value >= 9) return 'text-emerald-400';
    if (value >= 7) return 'text-yellow-400';
    if (value >= 5) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getProgressColor = (value: number) => {
    if (value >= 9) return 'bg-emerald-500';
    if (value >= 7) return 'bg-yellow-500';
    if (value >= 5) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all",
      score.overall >= 10 
        ? "bg-emerald-500/5 border-emerald-500/20" 
        : "bg-card border-border"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg",
            score.overall >= 10 
              ? "bg-emerald-500/20 text-emerald-400" 
              : score.overall >= 7 
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-rose-500/20 text-rose-400"
          )}>
            {score.overall.toFixed(0)}
          </div>
          <div>
            <h4 className="font-medium">{score.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              {score.overall >= 10 ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                  10/10 Passed
                </Badge>
              ) : isAutoIterating ? (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Auto-Iterating...
                </Badge>
              ) : (
                <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs">
                  Needs Improvement
                </Badge>
              )}
              {score.iterationCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  Iteration #{score.iterationCount}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRetest}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {needsIteration && !isAutoIterating && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onAutoIterate}
              className="text-xs gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Auto-Iterate
            </Button>
          )}
        </div>
      </div>
      
      {/* Score Breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <ScoreMetric
          icon={<Palette className="h-3.5 w-3.5" />}
          label="UI Polish"
          value={score.uiPolish}
        />
        <ScoreMetric
          icon={<Target className="h-3.5 w-3.5" />}
          label="Data Accuracy"
          value={score.dataAccuracy}
        />
        <ScoreMetric
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Loading Speed"
          value={score.loadingSpeed}
        />
      </div>
      
      {/* Issues & Technical Debt */}
      {(score.issues.length > 0 || score.technicalDebt.length > 0 || score.dataMismatches.length > 0) && (
        <div className="space-y-2 pt-3 border-t border-border">
          {score.issues.length > 0 && (
            <div className="text-xs">
              <span className="text-muted-foreground">Issues: </span>
              <span className="text-rose-400">{score.issues.join(', ')}</span>
            </div>
          )}
          {score.technicalDebt.length > 0 && (
            <div className="text-xs">
              <span className="text-muted-foreground">Technical Debt: </span>
              <span className="text-amber-400">{score.technicalDebt.join(', ')}</span>
            </div>
          )}
          {score.dataMismatches.length > 0 && (
            <div className="text-xs">
              <span className="text-muted-foreground">Data Mismatch: </span>
              <span className="text-rose-400">{score.dataMismatches.join(', ')}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Last Tested */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
        <Clock className="h-3 w-3" />
        <span>Tested: {score.lastTested.toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function ScoreMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 9) return 'text-emerald-400';
    if (v >= 7) return 'text-yellow-400';
    if (v >= 5) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getProgressColor = (v: number) => {
    if (v >= 9) return 'bg-emerald-500';
    if (v >= 7) return 'bg-yellow-500';
    if (v >= 5) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all", getProgressColor(value))}
            style={{ width: `${(value / 10) * 100}%` }}
          />
        </div>
        <span className={cn("text-sm font-medium w-8", getColor(value))}>
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
