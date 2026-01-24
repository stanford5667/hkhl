import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, TrendingUp, ArrowRight, Sparkles, Clock, X
} from 'lucide-react';

const POPULAR_TICKERS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
];

export default function ResearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentAssetSearches');
    return saved ? JSON.parse(saved) : [];
  });

  const handleSearch = (ticker: string) => {
    const normalized = ticker.toUpperCase().trim();
    if (!normalized) return;
    
    // Save to recent searches
    const updated = [normalized, ...recentSearches.filter(t => t !== normalized)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentAssetSearches', JSON.stringify(updated));
    
    // Navigate to stock detail page
    navigate(`/stock/${normalized}`);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentAssetSearches');
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Search className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Research</h1>
          <p className="text-muted-foreground text-lg">
            Search for any stock or ETF to analyze historical patterns
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch(searchQuery)}
            placeholder="Enter ticker symbol (e.g., AAPL, MSFT, SPY)"
            className="pl-12 pr-28 py-6 text-lg bg-card border-border"
          />
          <Button
            onClick={() => handleSearch(searchQuery)}
            disabled={!searchQuery.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Go
          </Button>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Recent Searches
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRecentSearches}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.slice(0, 8).map(ticker => (
                <Button
                  key={ticker}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearch(ticker)}
                  className="border-border hover:bg-accent"
                >
                  {ticker}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* Popular Tickers */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Popular Tickers</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {POPULAR_TICKERS.map(({ symbol, name }) => (
              <Button
                key={symbol}
                variant="outline"
                onClick={() => handleSearch(symbol)}
                className="flex flex-col items-start h-auto py-3 px-4 border-border hover:bg-accent hover:border-primary/50 transition-all"
              >
                <span className="font-bold text-foreground">{symbol}</span>
                <span className="text-xs text-muted-foreground truncate w-full text-left">{name}</span>
              </Button>
            ))}
          </div>
        </Card>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Price Patterns</p>
              <p className="text-xs text-muted-foreground">Historical streaks & signals</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Technical Analysis</p>
              <p className="text-xs text-muted-foreground">RSI, Bollinger & more</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border">
            <Search className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Deep Research</p>
              <p className="text-xs text-muted-foreground">AI-powered insights</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
