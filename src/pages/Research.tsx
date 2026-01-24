import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, Clock, X, TrendingUp, TrendingDown } from 'lucide-react';
import { TickerSearchAutocomplete } from '@/components/shared/TickerSearchAutocomplete';
import { useBatchQuotes } from '@/hooks/useMarketDataQuery';

const POPULAR_TICKERS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'Nasdaq 100' },
  { symbol: 'JPM', name: 'JPMorgan' },
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

  const formatPrice = (price: number | undefined) => {
    if (!price) return '—';
    return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  };

  const formatChange = (change: number | undefined) => {
    if (change === undefined) return null;
    const isPositive = change >= 0;
    return (
      <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    );
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

      {/* Popular Tickers with Prices */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          Popular
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {POPULAR_TICKERS.map(({ symbol, name }) => {
            const quote = quotes.get(symbol);
            return (
              <button
                key={symbol}
                onClick={() => handleSearch(symbol)}
                className="flex flex-col items-start p-3 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-sm text-foreground">{symbol}</span>
                  {formatChange(quote?.changePercent)}
                </div>
                <span className="text-xs text-muted-foreground truncate w-full">{name}</span>
                <span className="text-sm font-medium text-foreground mt-1">
                  {formatPrice(quote?.price)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
