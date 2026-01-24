import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Search, Clock, X, TrendingUp, Sparkles, Building2, 
  Cpu, Heart, ShoppingCart, Zap, Factory, Landmark, BarChart3 
} from 'lucide-react';
import { TickerSearchAutocomplete } from '@/components/shared/TickerSearchAutocomplete';
import { useBatchQuotes } from '@/hooks/useMarketDataQuery';
import { TickerCarousel } from '@/components/research/TickerCarousel';
import { CategoryCard } from '@/components/research/CategoryCard';

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
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'UNH', name: 'UnitedHealth' },
];

const CATEGORIES = [
  { 
    id: 'technology', 
    title: 'Technology', 
    description: 'Software, semiconductors, and hardware companies', 
    icon: Cpu,
    gradient: 'bg-blue-500',
    tickers: ['AAPL', 'MSFT', 'NVDA', 'GOOGL']
  },
  { 
    id: 'healthcare', 
    title: 'Healthcare', 
    description: 'Pharma, biotech, and medical devices', 
    icon: Heart,
    gradient: 'bg-rose-500',
    tickers: ['UNH', 'JNJ', 'LLY', 'PFE']
  },
  { 
    id: 'financials', 
    title: 'Financial Services', 
    description: 'Banks, insurance, and asset management', 
    icon: Landmark,
    gradient: 'bg-emerald-500',
    tickers: ['JPM', 'V', 'MA', 'BAC']
  },
  { 
    id: 'consumer', 
    title: 'Consumer', 
    description: 'Retail, e-commerce, and consumer goods', 
    icon: ShoppingCart,
    gradient: 'bg-orange-500',
    tickers: ['AMZN', 'WMT', 'HD', 'NKE']
  },
  { 
    id: 'energy', 
    title: 'Energy', 
    description: 'Oil, gas, and renewable energy companies', 
    icon: Zap,
    gradient: 'bg-yellow-500',
    tickers: ['XOM', 'CVX', 'COP', 'SLB']
  },
  { 
    id: 'industrials', 
    title: 'Industrials', 
    description: 'Manufacturing, aerospace, and logistics', 
    icon: Factory,
    gradient: 'bg-slate-500',
    tickers: ['CAT', 'GE', 'UPS', 'BA']
  },
  { 
    id: 'etfs', 
    title: 'Popular ETFs', 
    description: 'Index funds and sector ETFs', 
    icon: BarChart3,
    gradient: 'bg-purple-500',
    tickers: ['SPY', 'QQQ', 'IWM', 'VTI']
  },
  { 
    id: 'mag7', 
    title: 'Magnificent 7', 
    description: 'The mega-cap tech leaders', 
    icon: Sparkles,
    gradient: 'bg-cyan-500',
    tickers: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA']
  },
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

  const handleCategoryClick = (categoryId: string) => {
    // For now, navigate to the first ticker in the category
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (category && category.tickers.length > 0) {
      handleSearch(category.tickers[0]);
    }
  };

  // Prepare ticker data with quotes
  const tickersWithQuotes = POPULAR_TICKERS.map(t => ({
    ...t,
    price: quotes.get(t.symbol)?.price,
    changePercent: quotes.get(t.symbol)?.changePercent
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
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

      {/* Trending Tickers Carousel */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <TrendingUp className="h-4 w-4 text-primary" />
          Trending Now
        </div>
        <TickerCarousel 
          tickers={tickersWithQuotes} 
          onTickerClick={handleSearch} 
        />
      </div>

      {/* Categories Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Building2 className="h-4 w-4 text-primary" />
          Explore Categories
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATEGORIES.map(category => (
            <CategoryCard
              key={category.id}
              title={category.title}
              description={category.description}
              icon={category.icon}
              gradient={category.gradient}
              onClick={() => handleCategoryClick(category.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
