import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Target, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  Newspaper, Anchor, MessageSquare, BarChart3, AlertTriangle,
  Clock, Calendar, Eye, Calculator, Bookmark, X, Zap, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TradeIdea } from './TradeIdeasDashboard';

interface TradeIdeaCardProps {
  idea: TradeIdea;
  userBankroll: number;
  onViewAnalysis: () => void;
  onCalculateSize: () => void;
  onTrack: () => void;
  onDismiss: () => void;
}

const EVIDENCE_ICONS: Record<string, typeof Newspaper> = {
  news: Newspaper,
  whale: Anchor,
  sentiment: MessageSquare,
  calibration: BarChart3,
  arbitrage: Zap,
  technical: TrendingUp,
};

const STRENGTH_COLORS: Record<string, string> = {
  strong: 'text-emerald-500',
  moderate: 'text-amber-500',
  weak: 'text-muted-foreground',
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  high: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  very_high: 'bg-rose-600/10 text-rose-600 border-rose-600/30',
};

export function TradeIdeaCard({
  idea,
  userBankroll,
  onViewAnalysis,
  onCalculateSize,
  onTrack,
  onDismiss,
}: TradeIdeaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const expectedReturn = ((idea.target_price - idea.entry_price) / idea.entry_price) * 100;
  const suggestedAmount = (userBankroll * (idea.suggested_allocation / 100));
  const isBullish = idea.direction === 'buy_yes' || idea.direction === 'sell_no';

  const getIdeaTypeLabel = () => {
    if (idea.supporting_evidence?.some(e => e.type === 'arbitrage')) {
      return { label: 'ARBITRAGE OPPORTUNITY', color: 'text-purple-500', icon: Zap };
    }
    if (idea.confidence >= 75) {
      return { label: 'HIGH CONVICTION', color: 'text-emerald-500', icon: Target };
    }
    if (idea.confidence >= 60) {
      return { label: 'MODERATE CONVICTION', color: 'text-amber-500', icon: Target };
    }
    return { label: 'SPECULATIVE', color: 'text-muted-foreground', icon: Target };
  };

  const ideaType = getIdeaTypeLabel();
  const IdeaIcon = ideaType.icon;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IdeaIcon className={cn("h-5 w-5", ideaType.color)} />
              <span className={cn("font-semibold text-sm", ideaType.color)}>
                {ideaType.label}
              </span>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                expectedReturn >= 0 
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-500 border-rose-500/30"
              )}
            >
              {expectedReturn >= 0 ? '+' : ''}{expectedReturn.toFixed(1)}%
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 space-y-4">
          {/* Market Info */}
          <div>
            <h3 className="font-medium">
              {idea.market?.title || 'Market Title Unavailable'}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>Platform: {idea.market?.platform || 'Unknown'}</span>
              <span>•</span>
              <span>Category: {idea.market?.category || 'Unknown'}</span>
            </div>
          </div>

          {/* Trade Direction */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">TRADE:</span>
              <Badge 
                variant="outline"
                className={cn(
                  isBullish 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" 
                    : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                )}
              >
                {isBullish ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {idea.direction.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <span className="text-sm">
              @ <span className="font-mono font-medium">{idea.entry_price.toFixed(2)}</span>
            </span>
            <span className="text-sm text-muted-foreground">→</span>
            <span className="text-sm">
              Target <span className="font-mono font-medium text-emerald-500">{idea.target_price.toFixed(2)}</span>
            </span>
          </div>

          {/* Confidence Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium">{idea.confidence}%</span>
            </div>
            <Progress 
              value={idea.confidence} 
              className="h-2"
            />
          </div>

          {/* Thesis Summary */}
          <div>
            <p className="text-sm font-medium mb-1">THESIS:</p>
            <p className="text-sm text-muted-foreground italic">
              "{idea.thesis_summary}"
            </p>
          </div>

          {/* Collapsible Details */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show Details
                  </>
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4 pt-4">
              <Separator />

              {/* Evidence */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Evidence:
                </p>
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  {idea.supporting_evidence?.map((evidence, i) => {
                    const Icon = EVIDENCE_ICONS[evidence.type] || BarChart3;
                    return (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <span className="flex-1">{evidence.description}</span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", STRENGTH_COLORS[evidence.strength])}
                        >
                          {evidence.strength}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Counter Arguments */}
              {idea.counter_arguments && idea.counter_arguments.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Counter-Arguments:
                  </p>
                  <div className="space-y-2 pl-4 border-l-2 border-amber-500/30">
                    {idea.counter_arguments.map((counter, i) => (
                      <div key={i} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="flex-1">{counter.argument}</span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              counter.severity === 'high' ? 'text-rose-500' :
                              counter.severity === 'medium' ? 'text-amber-500' : 'text-muted-foreground'
                            )}
                          >
                            {counter.severity}
                          </Badge>
                        </div>
                        {counter.mitigation && (
                          <p className="text-xs text-muted-foreground mt-1 pl-4">
                            Mitigation: {counter.mitigation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Sizing & Risk */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Sizing
                  </p>
                  <p className="text-sm font-medium">
                    ${suggestedAmount.toFixed(0)} ({idea.suggested_allocation.toFixed(1)}% of bankroll)
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Risk
                  </p>
                  <Badge variant="outline" className={RISK_COLORS[idea.risk_level]}>
                    {idea.risk_level.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Horizon
                  </p>
                  <p className="text-sm font-medium capitalize">
                    {idea.time_horizon?.replace('_', ' ') || 'N/A'}
                  </p>
                </div>
                {idea.catalyst_events && idea.catalyst_events.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Next Catalyst
                    </p>
                    <p className="text-sm font-medium">
                      {idea.catalyst_events[0].event}
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-muted/20 flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onViewAnalysis}>
            <Eye className="h-4 w-4 mr-1" />
            View Full Analysis
          </Button>
          <Button variant="outline" size="sm" onClick={onCalculateSize}>
            <Calculator className="h-4 w-4 mr-1" />
            Calculate My Size
          </Button>
          <Button variant="outline" size="sm" onClick={onTrack}>
            <Bookmark className="h-4 w-4 mr-1" />
            Track
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="h-4 w-4 mr-1" />
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
