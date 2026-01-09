import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  X, 
  Send, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ExternalLink,
  Lightbulb,
  Network,
  FileText,
  Sparkles,
  ArrowRight,
  Building2,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TradeIdea {
  ticker: string;
  company: string;
  direction: "long" | "short" | "watch";
  rationale: string;
  confidence: number;
  isLookThrough?: boolean;
}

interface RelatedArticle {
  id: string;
  title: string;
  summary: string;
  relationship: "contradictory" | "supplementary" | "neutral";
  similarity: number;
  published_at: string;
}

interface ArticleIntelligence {
  full_text: string;
  ai_memo: {
    executive_summary: string;
    key_catalysts: string[];
    macro_implications: string[];
    look_through_assets: TradeIdea[];
  };
  trade_ideas: TradeIdea[];
  related_articles: RelatedArticle[];
}

interface ResearchOneSheetProps {
  articleUri: string;
  articleTitle: string;
  onClose: () => void;
}

export function ResearchOneSheet({ articleUri, articleTitle, onClose }: ResearchOneSheetProps) {
  const [intelligence, setIntelligence] = useState<ArticleIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [askingAi, setAskingAi] = useState(false);

  useEffect(() => {
    fetchIntelligence();
  }, [articleUri]);

  const fetchIntelligence = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('get-article-intelligence', {
        body: { articleUri }
      });

      if (fnError) throw fnError;
      setIntelligence(data);
    } catch (err) {
      console.error('Error fetching intelligence:', err);
      setError('Failed to generate research memo');
    } finally {
      setLoading(false);
    }
  };

  const handleAskAi = async () => {
    if (!aiQuery.trim() || !intelligence) return;

    try {
      setAskingAi(true);
      const { data, error } = await supabase.functions.invoke('ai-market-chat', {
        body: {
          message: aiQuery,
          context: `Article: ${articleTitle}\n\nContent: ${intelligence.full_text?.substring(0, 2000)}\n\nMemo: ${intelligence.ai_memo?.executive_summary}`
        }
      });

      if (error) throw error;
      setAiResponse(data.response);
      setAiQuery("");
    } catch (err) {
      console.error('Error asking AI:', err);
    } finally {
      setAskingAi(false);
    }
  };

  const highlightEntities = (text: string) => {
    if (!text) return null;
    
    // Simple entity highlighting - companies and people patterns
    const companyPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|Corp|Ltd|LLC|Co|Company|Group|Holdings))?\.?)\b/g;
    const tickerPattern = /\$([A-Z]{1,5})\b/g;
    
    let result = text;
    
    // Highlight tickers
    result = result.replace(tickerPattern, '<span class="bg-emerald-500/20 text-emerald-400 px-1 rounded font-mono">$$$1</span>');
    
    // Split into paragraphs for better rendering
    const paragraphs = result.split('\n\n');
    
    return paragraphs.map((p, i) => (
      <p 
        key={i} 
        className="mb-4 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: p }}
      />
    ));
  };

  const getSentimentColor = (direction: string) => {
    switch (direction) {
      case 'long': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'short': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
  };

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'contradictory': return 'bg-rose-500/20 text-rose-400';
      case 'supplementary': return 'bg-emerald-500/20 text-emerald-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <Skeleton className="h-6 w-64" />
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4 p-4">
            <div className="space-y-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <Card className="p-6 max-w-md text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={fetchIntelligence}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold truncate max-w-xl">{articleTitle}</h1>
            <p className="text-xs text-muted-foreground">AI Research Memo • Generated just now</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Three Pane Layout */}
      <div className="h-[calc(100vh-73px-60px)] grid grid-cols-12 gap-0">
        {/* Left Pane - The Source */}
        <div className="col-span-4 border-r flex flex-col">
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Source Document</span>
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="prose prose-sm prose-invert max-w-none">
              {highlightEntities(intelligence?.full_text || '')}
            </div>
          </ScrollArea>
        </div>

        {/* Middle Pane - The Brief */}
        <div className="col-span-5 border-r flex flex-col bg-card/50">
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <span className="font-medium text-sm">Research Memo</span>
            </div>
          </div>
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6 max-w-2xl">
              {/* Executive Summary */}
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  Executive Summary
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {intelligence?.ai_memo?.executive_summary || 'No summary available'}
                </p>
              </section>

              {/* Key Catalysts */}
              {intelligence?.ai_memo?.key_catalysts && intelligence.ai_memo.key_catalysts.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-emerald-500 rounded-full" />
                    Key Catalysts
                  </h2>
                  <ul className="space-y-2">
                    {intelligence.ai_memo.key_catalysts.map((catalyst, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-emerald-400 mt-1 shrink-0" />
                        <span className="text-muted-foreground">{catalyst}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Macro Implications */}
              {intelligence?.ai_memo?.macro_implications && intelligence.ai_memo.macro_implications.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-blue-500 rounded-full" />
                    Macro Implications
                  </h2>
                  <ul className="space-y-2">
                    {intelligence.ai_memo.macro_implications.map((impl, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-blue-400 mt-1 shrink-0" />
                        <span className="text-muted-foreground">{impl}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* AI Response */}
              {aiResponse && (
                <section className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Response
                  </h3>
                  <p className="text-sm text-muted-foreground">{aiResponse}</p>
                </section>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Pane - The Action */}
        <div className="col-span-3 flex flex-col">
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="font-medium text-sm">Trade Intelligence</span>
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* Look-Through Assets */}
              <section>
                <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
                  Look-Through Assets
                </h3>
                <div className="space-y-2">
                  {intelligence?.ai_memo?.look_through_assets?.map((asset, i) => (
                    <Card 
                      key={i} 
                      className={cn(
                        "p-3 cursor-pointer hover:bg-muted/50 transition-colors border",
                        getSentimentColor(asset.direction)
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/stock/${asset.ticker}`}
                            className="font-mono font-bold hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ${asset.ticker}
                          </Link>
                          <Badge variant="outline" className={getSentimentColor(asset.direction)}>
                            {asset.direction === 'long' && <TrendingUp className="h-3 w-3 mr-1" />}
                            {asset.direction === 'short' && <TrendingDown className="h-3 w-3 mr-1" />}
                            {asset.direction === 'watch' && <Minus className="h-3 w-3 mr-1" />}
                            {asset.direction}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round((asset.confidence || 0.7) * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {asset.rationale}
                      </p>
                    </Card>
                  )) || (
                    <p className="text-sm text-muted-foreground">No look-through assets identified</p>
                  )}
                </div>
              </section>

              {/* Direct Trade Ideas */}
              {intelligence?.trade_ideas && intelligence.trade_ideas.filter(t => !t.isLookThrough).length > 0 && (
                <section>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
                    Direct Exposure
                  </h3>
                  <div className="space-y-2">
                    {intelligence.trade_ideas.filter(t => !t.isLookThrough).map((idea, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <Link 
                          to={`/stock/${idea.ticker}`}
                          className="font-mono text-sm hover:text-primary transition-colors"
                        >
                          ${idea.ticker}
                        </Link>
                        <Badge variant="outline" className={cn("text-xs", getSentimentColor(idea.direction))}>
                          {idea.direction}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Knowledge Graph */}
              <section>
                <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Related Intelligence
                </h3>
                <div className="space-y-2">
                  {intelligence?.related_articles?.map((article, i) => (
                    <Card key={i} className="p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getRelationshipColor(article.relationship))}
                        >
                          {article.relationship}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(article.similarity * 100)}% match
                        </span>
                      </div>
                      <h4 className="text-sm font-medium line-clamp-2 mb-1">
                        {article.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {article.summary}
                      </p>
                    </Card>
                  )) || (
                    <p className="text-sm text-muted-foreground">No related articles found</p>
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* AI Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-card border shadow-lg">
            <Sparkles className="h-5 w-5 text-primary ml-2" />
            <Input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ask about this event..."
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
            />
            <Button 
              size="icon" 
              onClick={handleAskAi}
              disabled={!aiQuery.trim() || askingAi}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
