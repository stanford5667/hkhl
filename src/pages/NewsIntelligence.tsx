import { useState, useMemo } from "react";
import { Zap, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNewsIntelligence, NewsArticle, NewsCategory, NewsSeverity, TimeRange } from "@/hooks/useNewsIntelligence";
import { formatDistanceToNow } from "date-fns";
import { QuickStats, ActivityPulse, NewsFeedList, AnalysisPanel, NewsFilters, TickerHeatmap } from "@/components/news";

// Breaking News Hero Component
function BreakingNewsHero({ article, onSelect }: { article: NewsArticle; onSelect: (article: NewsArticle) => void }) {
  return (
    <Card className="bg-gradient-to-r from-rose-950/50 to-slate-900/80 border-rose-500/30 backdrop-blur-sm animate-fade-in">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-3 rounded-lg bg-rose-500/20 animate-pulse">
          <AlertTriangle className="h-6 w-6 text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="destructive" className="text-xs uppercase tracking-wider">
              Breaking
            </Badge>
            <span className="text-xs text-rose-400">
              {formatDistanceToNow(new Date(article.detected_at), { addSuffix: true })}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white truncate">{article.title}</h3>
          {article.description && (
            <p className="text-sm text-slate-400 line-clamp-1 mt-1">{article.description}</p>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
          onClick={() => onSelect(article)}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}

// Main Page Component
export default function NewsIntelligence() {
  const [category, setCategory] = useState<NewsCategory>('all');
  const [severity, setSeverity] = useState<NewsSeverity>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const { articles, isLoading, stats, refetch } = useNewsIntelligence({
    category,
    severity,
    timeRange,
  });

  // Filter articles by selected ticker
  const filteredArticles = useMemo(() => {
    if (!selectedTicker) return articles;
    return articles.filter(a => 
      a.related_markets?.includes(selectedTicker)
    );
  }, [articles, selectedTicker]);

  // Find breaking news (most recent critical article)
  const breakingNews = filteredArticles.find(a => a.severity === 'critical');

  return (
    <div className="p-6 space-y-4 bg-[#0a0a0f] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Intelligence Feed</h1>
            <p className="text-sm text-slate-500">AI-powered market signal detection</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Live Indicator */}
          <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LIVE
          </Badge>

          {/* Filter Controls */}
          <NewsFilters
            category={category}
            setCategory={(v) => setCategory(v as NewsCategory)}
            severity={severity}
            setSeverity={(v) => setSeverity(v as NewsSeverity)}
            timeRange={timeRange}
            setTimeRange={(v) => setTimeRange(v as TimeRange)}
            onRefresh={refetch}
            isRefreshing={isLoading}
          />
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Breaking News - spans full width when present */}
        {breakingNews && (
          <div className="col-span-12">
            <BreakingNewsHero article={breakingNews} onSelect={setSelectedArticle} />
          </div>
        )}
        
        {/* Top Row Widgets */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 h-44">
          <ActivityPulse articles={articles} />
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-4 h-44">
          <QuickStats stats={{
            ...stats,
            marketsAffected: articles.filter(a => a.related_markets && a.related_markets.length > 0).length
          }} />
        </div>
        <div className="col-span-12 lg:col-span-4 h-44">
          <TickerHeatmap 
            articles={articles}
            selectedTicker={selectedTicker}
            onTickerClick={setSelectedTicker}
          />
        </div>
        
        {/* Main Content */}
        <div className="col-span-12 lg:col-span-7 h-[500px]">
          <NewsFeedList 
            articles={filteredArticles} 
            selectedId={selectedArticle?.id || null}
            onSelect={setSelectedArticle}
            isLoading={isLoading}
          />
        </div>
        <div className="col-span-12 lg:col-span-5 h-[500px]">
          <AnalysisPanel article={selectedArticle} />
        </div>
      </div>
    </div>
  );
}
