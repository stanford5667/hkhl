import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Search, Clock, X, TrendingUp, Sparkles, Building2, 
  Cpu, Heart, ShoppingCart, Zap, Factory, Landmark, BarChart3,
  ArrowRight, Loader2
} from 'lucide-react';
import { TickerSearchAutocomplete } from '@/components/shared/TickerSearchAutocomplete';
import { useTrendingTickers } from '@/hooks/useTrendingTickers';
import { useCategoryCounts, useETFCount } from '@/hooks/useCategoryCounts';
import { TickerCarousel } from '@/components/research/TickerCarousel';
import { CategoryCard } from '@/components/research/CategoryCard';
import { MarketOverviewDashboard } from '@/components/research/MarketOverviewDashboard';
import { MarketIntelligenceSection } from '@/components/research/MarketIntelligenceSection';
import { DiscoveryFeed } from '@/components/research/DiscoveryFeed';
import { cn } from '@/lib/utils';

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

  // Fetch trending tickers from database with live quotes
  const { tickers: trendingTickers, isLoading: tickersLoading } = useTrendingTickers(12);
  
  // Fetch category stock counts from database
  const { data: categoryCounts = {} } = useCategoryCounts();
  const { data: etfCount = 0 } = useETFCount();

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

  // Prepare ticker data for carousel
  const tickersWithQuotes = trendingTickers.map(t => ({
    symbol: t.symbol,
    name: t.name,
    price: t.price,
    changePercent: t.changePercent ?? undefined,
    marketCap: t.marketCap ?? undefined,
  }));

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-4">
          {/* Hero Text */}
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
              <span className="bg-gradient-to-r from-primary via-cyan-500 to-primary bg-clip-text text-transparent">
                Find Investments
              </span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              AI-powered insights for smarter investing
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
                  placeholder="Enter ticker..."
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
            <div className="max-w-2xl mx-auto">
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 space-y-8">
        {/* Market Overview Dashboard */}
        <section>
          <MarketOverviewDashboard />
        </section>

        {/* Trending Tickers Carousel */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Trending Now</h2>
              {tickersLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <span className="text-xs text-muted-foreground">
              Swipe to explore →
            </span>
          </div>
          {tickersWithQuotes.length > 0 ? (
            <TickerCarousel 
              tickers={tickersWithQuotes} 
              onTickerClick={handleSearch} 
            />
          ) : tickersLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-[220px] h-[200px] bg-muted/50 rounded-xl animate-pulse shrink-0" />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No trending tickers available
            </div>
          )}
        </section>

        {/* Market Intelligence Section - Trending/Most Active, Screener, News */}
        <MarketIntelligenceSection />

        {/* Discovery Feed - Mobile-First Social Style News */}
        <DiscoveryFeed />

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
                stockCount={category.id === 'etfs' ? etfCount : categoryCounts[category.id]}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
