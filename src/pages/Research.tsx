import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Search, Clock, X, TrendingUp, Sparkles, Building2, 
  Cpu, Heart, ShoppingCart, Zap, Factory, Landmark, BarChart3,
  ArrowRight
} from 'lucide-react';
import { TickerSearchAutocomplete } from '@/components/shared/TickerSearchAutocomplete';
import { useBatchQuotes } from '@/hooks/useMarketDataQuery';
import { TickerCarousel } from '@/components/research/TickerCarousel';
import { CategoryCard } from '@/components/research/CategoryCard';
import { cn } from '@/lib/utils';

// Market caps in billions (approximate for display)
const POPULAR_TICKERS = [
  { symbol: 'AAPL', name: 'Apple Inc.', marketCap: 3.4e12 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', marketCap: 3.1e12 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', marketCap: 2.0e12 },
  { symbol: 'AMZN', name: 'Amazon.com', marketCap: 1.9e12 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', marketCap: 3.0e12 },
  { symbol: 'TSLA', name: 'Tesla Inc.', marketCap: 800e9 },
  { symbol: 'META', name: 'Meta Platforms', marketCap: 1.4e12 },
  { symbol: 'SPY', name: 'S&P 500 ETF', marketCap: 500e9 },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', marketCap: 250e9 },
  { symbol: 'JPM', name: 'JPMorgan Chase', marketCap: 600e9 },
  { symbol: 'V', name: 'Visa Inc.', marketCap: 550e9 },
  { symbol: 'UNH', name: 'UnitedHealth', marketCap: 450e9 },
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-12">
          {/* Hero Text */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-primary via-cyan-500 to-primary bg-clip-text text-transparent">
                Research Any Stock
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Real-time data, technical analysis, and AI-powered insights for smarter investing
            </p>
          </div>

          {/* Search Section - Prominent */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className={cn(
              "relative rounded-xl overflow-hidden",
              "bg-card border border-border shadow-lg shadow-primary/5",
              "focus-within:border-primary/50 focus-within:shadow-primary/10 transition-all"
            )}>
              <div className="flex items-center gap-3 p-1">
                <Search className="h-5 w-5 text-muted-foreground ml-3" />
                <TickerSearchAutocomplete
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelect={(result) => handleSearch(result.symbol)}
                  placeholder="Find investments..."
                  className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent"
                  autoFocus
                />
                <Button 
                  size="sm" 
                  className="mr-1 bg-primary hover:bg-primary/90"
                  onClick={() => searchQuery && handleSearch(searchQuery)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Recent:
                </span>
                {recentSearches.slice(0, 5).map(ticker => (
                  <Button
                    key={ticker}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(ticker)}
                    className="h-6 px-2 text-xs"
                  >
                    {ticker}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="h-6 px-1 text-xs text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 space-y-10">
        {/* Trending Tickers Carousel */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Trending Now</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              Swipe to explore →
            </span>
          </div>
          <TickerCarousel 
            tickers={tickersWithQuotes} 
            onTickerClick={handleSearch} 
          />
        </section>

        {/* Categories Grid */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Explore by Category</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
        </section>
      </div>
    </div>
  );
}
