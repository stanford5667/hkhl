import { useState } from "react";
import { useNewsIntelligence, NewsArticle, NewsCategory } from "@/hooks/useNewsIntelligence";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Sparkles, 
  Clock, 
  TrendingUp,
  ExternalLink,
  Newspaper,
  Zap,
  Globe,
  Cpu,
  Trophy,
  Beaker,
  Film,
  Coins,
  BarChart3,
  ArrowUpRight,
  RefreshCw,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const categories: { id: NewsCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'For You', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'politics', label: 'Politics', icon: <Globe className="h-4 w-4" /> },
  { id: 'economics', label: 'Markets', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'crypto', label: 'Crypto', icon: <Coins className="h-4 w-4" /> },
  { id: 'tech', label: 'Technology', icon: <Cpu className="h-4 w-4" /> },
  { id: 'science', label: 'Science', icon: <Beaker className="h-4 w-4" /> },
  { id: 'sports', label: 'Sports', icon: <Trophy className="h-4 w-4" /> },
  { id: 'entertainment', label: 'Entertainment', icon: <Film className="h-4 w-4" /> },
];

export default function NewsIntelligence() {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { articles, isLoading, stats, fetchNews, isFetchingNews } = useNewsIntelligence({
    category: selectedCategory,
    searchQuery,
  });

  // Split articles into featured and regular
  const featuredArticle = articles[0];
  const secondaryArticles = articles.slice(1, 3);
  const remainingArticles = articles.slice(3);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Newspaper className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">News</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">AI-curated market intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{stats.total}</span>
                  <span className="hidden lg:inline">stories</span>
                </div>
                {stats.critical > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="font-medium text-rose-500">{stats.critical}</span>
                    <span className="hidden lg:inline text-rose-500">breaking</span>
                  </div>
                )}
              </div>
              
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNews()}
                disabled={isFetchingNews}
                className="gap-2"
              >
                {isFetchingNews ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Fetch News</span>
              </Button>
            </div>
          </div>

          {/* Category Pills */}
          <ScrollArea className="mt-4 -mx-4 px-4">
            <div className="flex gap-2 pb-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "rounded-full gap-2 shrink-0 transition-all",
                    selectedCategory === cat.id && "shadow-md"
                  )}
                >
                  {cat.icon}
                  {cat.label}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <LoadingState />
        ) : articles.length === 0 ? (
          <EmptyState onFetch={() => fetchNews()} isFetching={isFetchingNews} />
        ) : (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Featured Article - Large Card */}
              {featuredArticle && (
                <FeaturedCard article={featuredArticle} />
              )}
              
              {/* Secondary Articles Stack */}
              <div className="flex flex-col gap-4">
                {secondaryArticles.map((article) => (
                  <SecondaryCard key={article.id} article={article} />
                ))}
              </div>
            </div>

            {/* More Stories Grid */}
            {remainingArticles.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">More Stories</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {remainingArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Featured Card - Large hero style
function FeaturedCard({ article }: { article: NewsArticle }) {
  const categoryStyle = getCategoryStyle(article.category);
  const sentimentColor = getSentimentColor(article.sentiment_score);
  
  return (
    <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card via-card to-muted/20">
      <CardContent className="p-6 h-full flex flex-col min-h-[320px]">
        {/* Top Row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-xs font-medium", categoryStyle)}>
              {article.category || 'General'}
            </Badge>
            {article.severity === 'critical' && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                Breaking
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(article.detected_at), { addSuffix: true })}
          </span>
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-bold leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-3">
          {article.title}
        </h2>
        
        {/* Description */}
        {article.description && (
          <p className="text-muted-foreground line-clamp-2 mb-4 flex-grow text-sm">
            {article.description}
          </p>
        )}

        {/* AI Summary */}
        {article.ai_insight?.thesis && (
          <div className="bg-primary/5 rounded-xl p-4 mb-4 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Summary</span>
            </div>
            <p className="text-sm leading-relaxed">{article.ai_insight.thesis}</p>
            
            {/* Related Tickers */}
            {article.ai_insight.related_tickers && article.ai_insight.related_tickers.length > 0 && (
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {article.ai_insight.related_tickers.slice(0, 4).map((ticker) => (
                  <Badge key={ticker} variant="secondary" className="font-mono text-xs">
                    ${ticker}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {article.source || 'News'}
            </span>
            {article.sentiment_score !== null && (
              <div className="flex items-center gap-1">
                <TrendingUp className={cn("h-3.5 w-3.5", sentimentColor)} />
                <span className={cn("text-xs font-medium", sentimentColor)}>
                  {article.sentiment_score >= 0 ? '+' : ''}{(article.sentiment_score * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
          {article.source_url && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
              <a href={article.source_url} target="_blank" rel="noopener noreferrer">
                Read more
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Secondary Card - Medium horizontal style
function SecondaryCard({ article }: { article: NewsArticle }) {
  const categoryStyle = getCategoryStyle(article.category);
  
  return (
    <Card className="group overflow-hidden hover:shadow-md transition-all duration-200 flex-1">
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Badge className={cn("text-xs", categoryStyle)}>
            {article.category || 'General'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(article.detected_at), { addSuffix: true })}
          </span>
        </div>
        
        <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        
        {/* Compact AI insight */}
        {article.ai_insight?.thesis && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 mb-3 flex-grow">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="line-clamp-2 leading-relaxed">{article.ai_insight.thesis}</p>
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
          <span className="font-medium">{article.source || 'News'}</span>
          {article.source_url && (
            <a 
              href={article.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              Read <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Regular Article Card - Compact grid style
function ArticleCard({ article }: { article: NewsArticle }) {
  const categoryStyle = getCategoryStyle(article.category);
  
  return (
    <Card className="group overflow-hidden hover:shadow-md transition-all duration-200 h-full flex flex-col">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className={cn("text-[10px]", categoryStyle)}>
            {article.category || 'General'}
          </Badge>
          {article.severity === 'critical' && (
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </div>
        
        <h3 className="font-medium line-clamp-3 mb-2 group-hover:text-primary transition-colors text-sm leading-snug flex-grow">
          {article.title}
        </h3>
        
        {/* Minimal AI hint */}
        {article.ai_insight?.thesis && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-3">
            <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
            <p className="line-clamp-2 leading-relaxed">{article.ai_insight.thesis}</p>
          </div>
        )}
        
        {/* Tickers if available */}
        {article.related_markets && article.related_markets.length > 0 && !article.ai_insight?.thesis && (
          <div className="flex gap-1 flex-wrap mb-3">
            {article.related_markets.slice(0, 3).map((ticker) => (
              <Badge key={ticker} variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                {ticker}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-auto pt-2 border-t">
          <span>{article.source || 'News'}</span>
          <span>{formatDistanceToNow(new Date(article.detected_at), { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function getCategoryStyle(category: string | null): string {
  const styles: Record<string, string> = {
    politics: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    economics: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    crypto: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    tech: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    science: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    sports: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    entertainment: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  };
  return styles[category || ''] || 'bg-muted text-muted-foreground';
}

function getSentimentColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score > 0.2) return 'text-emerald-500';
  if (score < -0.2) return 'text-rose-500';
  return 'text-muted-foreground';
}

// Loading State
function LoadingState() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// Empty State with fetch button
function EmptyState({ onFetch, isFetching }: { onFetch?: () => void; isFetching?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Newspaper className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No stories yet</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Click the button below to fetch the latest news from multiple sources.
      </p>
      {onFetch && (
        <Button onClick={onFetch} disabled={isFetching} className="gap-2">
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Fetch Latest News
        </Button>
      )}
    </div>
  );
}
