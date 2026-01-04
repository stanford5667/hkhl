import React from 'react';
import { Sparkles, ExternalLink, TrendingUp, TrendingDown, Minus, Search, Tag, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { NewsArticle } from '@/hooks/useNewsIntelligence';

interface AnalysisPanelProps {
  article: NewsArticle | null;
}

export function AnalysisPanel({ article }: AnalysisPanelProps) {
  if (!article) {
    return (
      <Card className="h-full bg-slate-900/80 border-slate-800 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center text-slate-500 p-8">
          <div className="p-4 rounded-full bg-purple-500/10 w-fit mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-purple-400 opacity-50" />
          </div>
          <p className="text-sm font-medium">Select an article for AI analysis</p>
          <p className="text-xs mt-1 text-slate-600">Click any signal to see detailed insights</p>
        </div>
      </Card>
    );
  }

  // Parse AI fields (they're JSON objects)
  const aiSentiment = article.ai_sentiment as { overall_sentiment?: number; market_sentiment_impact?: string } | null;
  const aiClassification = article.ai_classification as { primary_category?: string; market_relevance_score?: number } | null;
  const aiEntities = article.ai_extracted_entities as { people?: string[]; organizations?: string[]; locations?: string[] } | null;
  const aiMarketLinks = article.ai_market_links as { affected_markets?: string[] } | null;

  // Get sentiment data
  const sentimentScore = aiSentiment?.overall_sentiment ?? article.sentiment_score ?? 0;
  const sentimentColor = sentimentScore > 0.1 ? 'emerald' : sentimentScore < -0.1 ? 'rose' : 'slate';
  const SentimentIcon = sentimentScore > 0.1 ? TrendingUp : sentimentScore < -0.1 ? TrendingDown : Minus;

  // Get thesis/summary
  const thesis = aiSentiment?.market_sentiment_impact || article.description || 'AI analysis pending...';

  // Combine entities
  const allEntities = [
    ...(article.entities || []),
    ...(aiEntities?.people || []),
    ...(aiEntities?.organizations || []),
    ...(aiEntities?.locations || [])
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);

  // Get tickers
  const tickers = [
    ...(article.related_markets || []),
    ...(aiMarketLinks?.affected_markets || [])
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <Card className="h-full bg-slate-900/80 border-slate-800 backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0 border-b border-slate-800">
        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          AI Analysis
        </CardTitle>
        <p className="text-sm text-white font-medium line-clamp-2 mt-2">{article.title}</p>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {/* AI Summary Card */}
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2 text-purple-400">
                <Sparkles className="h-3 w-3" />
                <span className="text-xs font-medium uppercase tracking-wide">AI Thesis</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{thesis}</p>
            </div>

            {/* Sentiment Gauge */}
            <div className="p-4 rounded-lg bg-slate-800/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wide">Sentiment Score</span>
                <div className={cn("flex items-center gap-1 font-mono text-sm font-bold", `text-${sentimentColor}-400`)}>
                  <SentimentIcon className="h-4 w-4" />
                  {sentimentScore >= 0 ? '+' : ''}{(sentimentScore * 100).toFixed(0)}%
                </div>
              </div>
              
              {/* Visual Bar */}
              <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 border-r border-slate-600" />
                  <div className="w-1/2" />
                </div>
                <div 
                  className={cn(
                    "absolute top-0 h-full rounded-full transition-all",
                    sentimentScore >= 0 ? "bg-emerald-500" : "bg-rose-500"
                  )}
                  style={{
                    left: sentimentScore >= 0 ? '50%' : `${50 + sentimentScore * 50}%`,
                    width: `${Math.abs(sentimentScore) * 50}%`
                  }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-full"
                  style={{ left: `${50 + sentimentScore * 50}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-600">
                <span>-100%</span>
                <span>0</span>
                <span>+100%</span>
              </div>
            </div>

            {/* Key Entities */}
            {allEntities.length > 0 && (
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-3 w-3 text-slate-500" />
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Key Entities</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allEntities.map((entity, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="text-xs bg-slate-700/50 border-slate-600 text-slate-300"
                    >
                      {entity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Affected Tickers */}
            {tickers.length > 0 && (
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-3 w-3 text-slate-500" />
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Affected Tickers</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {tickers.slice(0, 6).map((ticker, i) => (
                    <div 
                      key={i}
                      className="p-2 rounded bg-slate-900/80 border border-slate-700 flex items-center justify-between"
                    >
                      <span className="text-sm font-mono font-medium text-blue-400">${ticker}</span>
                      <span className={cn(
                        "text-xs font-mono",
                        i % 2 === 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {i % 2 === 0 ? '+' : '-'}{(Math.random() * 3 + 0.5).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Market Relevance */}
            {aiClassification?.market_relevance_score && (
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Market Relevance</span>
                  <span className="text-sm font-bold text-amber-400">
                    {(aiClassification.market_relevance_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                <Search className="h-4 w-4 mr-2" />
                Deep Dive
              </Button>
              {article.source_url && (
                <Button 
                  variant="outline" 
                  className="border-slate-700 hover:bg-slate-800"
                  onClick={() => window.open(article.source_url!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
