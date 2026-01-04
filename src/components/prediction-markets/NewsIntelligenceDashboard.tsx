import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Zap, TrendingUp, TrendingDown, AlertTriangle, 
  Bell, ChevronRight, MessageSquare, BarChart3, Network,
  Clock, Filter, Sparkles, RefreshCw, ExternalLink
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NewsStatsCards } from './NewsStatsCards';
import { NewsFeedItem } from './NewsFeedItem';
import { AIAnalysisPanel } from './AIAnalysisPanel';
import { SentimentTimeline } from './SentimentTimeline';
import { NewsMarketGraph } from './NewsMarketGraph';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Zap },
  { id: 'politics', label: 'Politics', icon: null },
  { id: 'crypto', label: 'Crypto', icon: null },
  { id: 'economics', label: 'Economics', icon: null },
  { id: 'sports', label: 'Sports', icon: null },
  { id: 'tech', label: 'Tech', icon: null },
  { id: 'science', label: 'Science', icon: null },
];

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  source_url: string;
  category: string;
  severity: string;
  sentiment_score: number;
  entities: string[];
  related_markets: string[];
  detected_at: string;
  ai_extracted_entities?: Record<string, unknown>;
  ai_classification?: Record<string, unknown>;
  ai_sentiment?: Record<string, unknown>;
  ai_market_links?: Record<string, unknown>;
}

export function NewsIntelligenceDashboard() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // Fetch news articles
  const { data: articles = [], isLoading, refetch } = useQuery({
    queryKey: ['news-articles', selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('real_world_events')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(50);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as NewsArticle[];
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const breakingNews = articles.filter(a => 
      a.severity === 'critical' || a.severity === 'high'
    ).length;
    
    const avgSentiment = articles.length > 0
      ? articles.reduce((sum, a) => sum + (a.sentiment_score || 0), 0) / articles.length
      : 0;
    
    const marketsAffected = new Set(
      articles.flatMap(a => a.related_markets || [])
    ).size;
    
    const aiAlerts = articles.filter(a => 
      a.severity === 'critical' && 
      new Date(a.detected_at) > oneHourAgo
    ).length;

    return { breakingNews, avgSentiment, marketsAffected, aiAlerts };
  }, [articles]);

  // Filter articles by search
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(a =>
      a.title?.toLowerCase().includes(query) ||
      a.description?.toLowerCase().includes(query) ||
      a.entities?.some(e => e.toLowerCase().includes(query))
    );
  }, [articles, searchQuery]);

  // Handle AI query
  const handleAskAI = async () => {
    if (!searchQuery.trim()) return;
    setIsAskingAI(true);
    setAiResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-portfolio-chat', {
        body: {
          message: `Based on recent news: ${searchQuery}`,
          context: { articles: articles.slice(0, 10).map(a => ({ title: a.title, sentiment: a.sentiment_score })) }
        }
      });

      if (error) throw error;
      setAiResponse(data?.response || 'No insights available.');
    } catch (err) {
      console.error('AI query error:', err);
      setAiResponse('Unable to process query. Please try again.');
    } finally {
      setIsAskingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">News Intelligence Center</h1>
            <p className="text-sm text-muted-foreground">AI-powered market news analysis</p>
          </div>
        </div>
        
        {/* AI Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ask AI about news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              className="pl-9 w-80"
            />
          </div>
          <Button onClick={handleAskAI} disabled={isAskingAI}>
            <Sparkles className="h-4 w-4 mr-2" />
            {isAskingAI ? 'Thinking...' : 'Ask AI'}
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* AI Response */}
      {aiResponse && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-primary mb-1">AI Insight</p>
                <p className="text-sm">{aiResponse}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto"
                onClick={() => setAiResponse(null)}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <NewsStatsCards stats={stats} />

      {/* Category Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.icon && <cat.icon className="h-4 w-4 mr-1" />}
            {cat.label}
          </Button>
        ))}
        <div className="flex-1" />
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
          <span className="animate-pulse mr-1">●</span> Live
        </Badge>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                News Feed
              </CardTitle>
              <Badge variant="secondary">{filteredArticles.length} articles</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredArticles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mb-2" />
                    <p>No news articles found</p>
                  </div>
                ) : (
                  filteredArticles.map((article) => (
                    <NewsFeedItem
                      key={article.id}
                      article={article}
                      isSelected={selectedArticle?.id === article.id}
                      onSelect={() => setSelectedArticle(article)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* AI Analysis Panel */}
        <AIAnalysisPanel article={selectedArticle} />
      </div>

      {/* Bottom Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Timeline */}
        <SentimentTimeline 
          articles={articles} 
          onArticleSelect={setSelectedArticle}
        />

        {/* News-Market Correlation Graph */}
        <NewsMarketGraph 
          articles={articles}
          onArticleSelect={setSelectedArticle}
        />
      </div>
    </div>
  );
}
