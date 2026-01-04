import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, TrendingUp, TrendingDown, Target, Lightbulb, 
  History, AlertCircle, CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { NewsArticle } from './NewsIntelligenceDashboard';

interface AIAnalysisPanelProps {
  article: NewsArticle | null;
}

export function AIAnalysisPanel({ article }: AIAnalysisPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [tradeIdeas, setTradeIdeas] = useState<string | null>(null);

  const generateTradeIdeas = async () => {
    if (!article) return;
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-portfolio-chat', {
        body: {
          message: `Generate trade ideas based on this news: "${article.title}". Consider: sentiment (${article.sentiment_score}), category (${article.category}), affected markets (${article.related_markets?.join(', ') || 'none identified'}).`,
          context: { type: 'trade_ideas' }
        }
      });

      if (error) throw error;
      setTradeIdeas(data?.response || 'Unable to generate trade ideas.');
    } catch (err) {
      console.error('Trade ideas error:', err);
      setTradeIdeas('Error generating trade ideas. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!article) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Analysis Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[400px] text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-medium">Select a news article</p>
            <p className="text-sm">Click on any article to see AI-powered analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const classification = article.ai_classification || {};
  const sentiment = article.ai_sentiment || {};
  const marketLinks = article.ai_market_links || {};
  const entities = article.ai_extracted_entities || {};

  const relevanceScore = (classification as Record<string, unknown>).market_relevance_score as number || 50;
  const actionability = (classification as Record<string, unknown>).actionability as string || 'informational';
  const marketImpact = (sentiment as Record<string, unknown>).market_sentiment_impact as Record<string, unknown> || {};
  const affectedMarkets = (marketLinks as Record<string, unknown>).affected_markets as unknown[] || [];
  const potentialMarkets = (marketLinks as Record<string, unknown>).potential_new_markets as unknown[] || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[460px] pr-4">
          <div className="space-y-6">
            {/* Market Impact Summary */}
            <div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-blue-500" />
                Market Impact Summary
              </h4>
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Impact Probability</span>
                  <Badge variant="outline" className={cn(
                    relevanceScore > 70 ? "text-emerald-500" : 
                    relevanceScore > 40 ? "text-amber-500" : "text-muted-foreground"
                  )}>
                    {relevanceScore}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Direction</span>
                  <Badge variant="outline" className={cn(
                    marketImpact.direction === 'bullish' ? "text-emerald-500" :
                    marketImpact.direction === 'bearish' ? "text-rose-500" : "text-muted-foreground"
                  )}>
                    {marketImpact.direction as string || 'Neutral'}
                    {marketImpact.direction === 'bullish' ? <TrendingUp className="h-3 w-3 ml-1" /> :
                     marketImpact.direction === 'bearish' ? <TrendingDown className="h-3 w-3 ml-1" /> : null}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Actionability</span>
                  <Badge variant={actionability === 'immediate' ? 'destructive' : 'secondary'}>
                    {actionability}
                  </Badge>
                </div>
              </div>
              {marketImpact.reasoning && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  "{marketImpact.reasoning as string}"
                </p>
              )}
            </div>

            <Separator />

            {/* Affected Markets */}
            {affectedMarkets.length > 0 && (
              <div>
                <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Recommended Actions
                </h4>
                <div className="space-y-2">
                  {affectedMarkets.slice(0, 4).map((market: unknown, i: number) => {
                    const m = market as Record<string, unknown>;
                    return (
                      <div key={i} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                        <Badge variant="outline" className="shrink-0">
                          {i + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {m.market_title as string}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                m.expected_impact === 'bullish' ? "text-emerald-500" :
                                m.expected_impact === 'bearish' ? "text-rose-500" : ""
                              )}
                            >
                              {m.expected_impact as string}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {m.impact_magnitude as string} impact
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* AI Insight */}
            <div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                AI Insight
              </h4>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm">
                  {relevanceScore > 70 
                    ? `This is a high-impact news event with ${relevanceScore}% market relevance. Consider monitoring related prediction markets for immediate price movements.`
                    : relevanceScore > 40
                    ? `This news has moderate market relevance. Watch for developing patterns over the next 24-48 hours.`
                    : `This is primarily informational content with limited immediate market impact.`
                  }
                </p>
              </div>
            </div>

            {/* Historical Precedent */}
            <div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-purple-500" />
                Historical Context
              </h4>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Category: <span className="text-foreground font-medium">{article.category}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Similar events in this category have historically shown a{' '}
                  <span className={cn(
                    "font-medium",
                    article.sentiment_score > 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {article.sentiment_score > 0 ? 'positive' : 'negative'}
                  </span>{' '}
                  correlation with market movements.
                </p>
              </div>
            </div>

            {/* Trade Ideas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Trade Ideas
                </h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={generateTradeIdeas}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  Generate
                </Button>
              </div>
              {tradeIdeas ? (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{tradeIdeas}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Click "Generate" for AI-powered trade ideas based on this news.
                </p>
              )}
            </div>

            {/* Potential New Markets */}
            {potentialMarkets.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-emerald-500" />
                    Suggested New Markets
                  </h4>
                  <div className="space-y-2">
                    {potentialMarkets.slice(0, 3).map((market: unknown, i: number) => {
                      const m = market as Record<string, unknown>;
                      return (
                        <div key={i} className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-sm">
                          <p className="font-medium">{m.suggested_title as string}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {m.reasoning as string}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
