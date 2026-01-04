import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Sparkles, TrendingUp, Newspaper, 
  BarChart3, Loader2, X, ArrowRight, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'market' | 'news' | 'arbitrage' | 'insight';
  data: any;
}

interface ParsedQuery {
  intent: string;
  filters: Record<string, any>;
  sort?: string;
}

interface NaturalLanguageSearchProps {
  onMarketSelect?: (marketId: string) => void;
  className?: string;
}

const EXAMPLE_QUERIES = [
  "High volume crypto markets",
  "What's moving today?",
  "Find arbitrage opportunities",
  "Markets resolving this week",
  "Where are whales buying?",
  "Best opportunities for $1000",
  "Compare Trump odds across platforms",
  "Underpriced sports markets"
];

const QUICK_FILTERS = [
  { label: "🔥 Trending", query: "What markets are moving most today?" },
  { label: "🐋 Whale Activity", query: "Show me where whales are active" },
  { label: "💰 Arbitrage", query: "Find arbitrage opportunities" },
  { label: "📰 Breaking News", query: "What news is affecting markets?" },
  { label: "⏰ Closing Soon", query: "Markets resolving this week" },
  { label: "🎯 Trade Ideas", query: "Best trading opportunities right now" }
];

const ResultCard = ({ 
  result, 
  onSelect 
}: { 
  result: SearchResult; 
  onSelect?: (id: string) => void;
}) => {
  const { type, data } = result;

  if (type === 'market') {
    const totalVolume = data.market_outcomes?.reduce(
      (sum: number, o: any) => sum + (o.volume_total || 0), 0
    ) || 0;
    const topOutcome = data.market_outcomes?.[0];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => onSelect?.(data.id)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {data.platform}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {data.category}
              </Badge>
            </div>
            <h4 className="font-medium text-sm line-clamp-2">{data.title}</h4>
            {topOutcome && (
              <p className="text-xs text-muted-foreground mt-1">
                {topOutcome.title}: {((topOutcome.current_price || 0) * 100).toFixed(0)}%
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-primary">
              {((topOutcome?.current_price || 0) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">
              ${(totalVolume / 1000).toFixed(0)}k vol
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === 'news') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Newspaper className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{data.narrative_title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {data.narrative_summary}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {data.article_count || 0} articles
              </Badge>
              {data.momentum_score && (
                <Badge 
                  variant={data.momentum_score > 0.5 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {data.momentum_score > 0.5 ? "🔥 High momentum" : "Developing"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === 'arbitrage') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border rounded-lg bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h4 className="font-medium text-sm">{data.type} Arbitrage</h4>
              <p className="text-xs text-muted-foreground">
                {data.platforms?.join(' ↔ ')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-500">
              +{data.profit_potential?.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {data.confidence ? `${(data.confidence * 100).toFixed(0)}% conf` : 'Risk-free'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === 'insight') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border rounded-lg bg-purple-500/5 border-purple-500/20"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">
              {data.type === 'whale_summary' ? '🐋 Whale Activity Summary' : 
               data.type === 'comparison' ? '📊 Market Comparison' :
               data.type === 'top_movers' ? '🔥 Top Movers' : 'Insight'}
            </h4>
            {data.type === 'whale_summary' && (
              <div className="mt-2 space-y-1">
                <p className="text-sm">
                  Sentiment: <span className={cn(
                    "font-medium",
                    data.sentiment === 'bullish' && "text-emerald-500",
                    data.sentiment === 'bearish' && "text-rose-500"
                  )}>
                    {data.sentiment?.charAt(0).toUpperCase() + data.sentiment?.slice(1)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.bullish_count} buys / {data.bearish_count} sells in last 24h
                </p>
              </div>
            )}
            {data.type === 'top_movers' && data.data?.slice(0, 3).map((m: any, i: number) => (
              <div key={i} className="text-xs mt-1 flex justify-between">
                <span className="truncate">{m.prediction_markets?.title || m.title}</span>
                <span className={cn(
                  "font-medium",
                  m.price_change_24h > 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {m.price_change_24h > 0 ? '+' : ''}{(m.price_change_24h * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export const NaturalLanguageSearch: React.FC<NaturalLanguageSearchProps> = ({
  onMarketSelect,
  className
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestedFilters, setSuggestedFilters] = useState<string[]>([]);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter example queries based on input
  const filteredSuggestions = query.length > 0 
    ? EXAMPLE_QUERIES.filter(q => 
        q.toLowerCase().includes(query.toLowerCase())
      )
    : EXAMPLE_QUERIES;

  const executeSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setShowSuggestions(false);

    try {
      const { data, error } = await supabase.functions.invoke('ai-query-parser', {
        body: { query: searchQuery }
      });

      if (error) throw error;

      setResults(data.results || []);
      setSummary(data.summary);
      setSuggestedFilters(data.suggestedFilters || []);
      setParsedQuery(data.parsedQuery);
    } catch (error) {
      console.error('Search error:', error);
      setSummary("I had trouble processing that query. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    executeSearch(suggestion);
  };

  const handleQuickFilter = (filterQuery: string) => {
    setQuery(filterQuery);
    executeSearch(filterQuery);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSummary(null);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Natural Language Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Ask anything about prediction markets..."
              className="pl-12 pr-24 h-14 text-base bg-muted/30"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={clearSearch}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button 
                type="submit" 
                size="sm"
                disabled={isLoading || !query.trim()}
                className="h-10 px-4"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && !hasSearched && filteredSuggestions.length > 0 && (
              <motion.div
                ref={suggestionsRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 w-full mt-2 bg-popover border rounded-lg shadow-lg overflow-hidden"
              >
                <div className="p-2">
                  <p className="text-xs text-muted-foreground px-2 py-1">Try asking:</p>
                  {filteredSuggestions.slice(0, 6).map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Quick Filters */}
        {!hasSearched && (
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((filter, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-colors py-1.5 px-3"
                onClick={() => handleQuickFilter(filter.query)}
              >
                {filter.label}
              </Badge>
            ))}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Searching markets...</p>
            </div>
          </div>
        )}

        {/* Results */}
        {!isLoading && hasSearched && (
          <div className="space-y-4">
            {/* Summary */}
            {summary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-muted/30 rounded-lg border"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 text-sm whitespace-pre-wrap">
                    {summary}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Suggested Filters */}
            {suggestedFilters.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground" />
                {suggestedFilters.map((filter, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleQuickFilter(`${query} ${filter}`)}
                  >
                    {filter}
                  </Badge>
                ))}
              </div>
            )}

            {/* Results List */}
            {results.length > 0 ? (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3 pr-4">
                  {results.map((result, i) => (
                    <ResultCard 
                      key={i} 
                      result={result} 
                      onSelect={onMarketSelect}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No results found. Try a different query.</p>
              </div>
            )}

            {/* Parsed Query Debug (optional, can be hidden) */}
            {parsedQuery && (
              <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
                Intent: {parsedQuery.intent} | Filters: {JSON.stringify(parsedQuery.filters)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
