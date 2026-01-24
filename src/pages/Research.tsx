import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, Clock, X, TrendingUp } from 'lucide-react';
import { TickerSearchAutocomplete } from '@/components/shared/TickerSearchAutocomplete';
import { useBatchQuotes } from '@/hooks/useMarketDataQuery';
import { InteractiveTickerCard } from '@/components/research/InteractiveTickerCard';

const POPULAR_TICKERS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
];

export default function ResearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentAssetSearches');
    return saved ? JSON.parse(saved) : [];
  });

  const { quotes } = useBatchQuotes(POPULAR_TICKERS.map(t => t.symbol), { enabled: true });

  const handleSearch = (ticker: string) => {
    const normalized = ticker.toUpperCase().trim();
    if (!normalized) return;
    
    const updated = [normalized, ...recentSearches.filter(t => t !== normalized)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentAssetSearches', JSON.stringify(updated));
    navigate(`/stock/${normalized}`);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentAssetSearches');
  };


  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl mx-auto">
      {/* Search Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          <span className="text-sm font-medium">Search for any asset</span>
        </div>
        <TickerSearchAutocomplete
          value={searchQuery}
          onChange={setSearchQuery}
          onSelect={(result) => handleSearch(result.symbol)}
          placeholder="Enter ticker symbol..."
          className="w-full"
          autoFocus
        />
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Recent
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRecentSearches}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.slice(0, 6).map(ticker => (
              <Button
                key={ticker}
                variant="outline"
                size="sm"
                onClick={() => handleSearch(ticker)}
                className="h-7 px-2 text-xs border-border"
              >
                {ticker}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Popular Tickers with Mini Charts */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          Popular Assets
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {POPULAR_TICKERS.map(({ symbol, name }) => {
            const quote = quotes.get(symbol);
            return (
              <InteractiveTickerCard
                key={symbol}
                symbol={symbol}
                name={name}
                price={quote?.price}
                changePercent={quote?.changePercent}
                onClick={() => handleSearch(symbol)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
