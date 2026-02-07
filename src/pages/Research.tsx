import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Search, Clock, X, TrendingUp, Sparkles, Building2, 
  Cpu, Heart, ShoppingCart, Zap, Factory, Landmark, BarChart3,
  ArrowRight, Loader2, FileText
} from 'lucide-react';
import { TickerSearchAutocomplete } from '@/components/shared/TickerSearchAutocomplete';
import { useTrendingTickers } from '@/hooks/useTrendingTickers';
import { useCategoryCounts, useETFCount } from '@/hooks/useCategoryCounts';
import { TickerCarousel } from '@/components/research/TickerCarousel';
import { CategoryCard } from '@/components/research/CategoryCard';
import { MarketOverviewDashboard } from '@/components/research/MarketOverviewDashboard';
import { MarketIntelligenceSection } from '@/components/research/MarketIntelligenceSection';
import { MarketThemesSection } from '@/components/research/MarketThemesSection';
import { EarningsCalendar } from '@/components/earnings';


import { AnimatedBackground } from '@/components/research/AnimatedBackground';
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 overflow-x-hidden">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Hero Section - More compact on mobile */}
      <div className="relative">
        <div className="relative max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          {/* Hero Text - More compact */}
          <div className="text-center mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-0.5 sm:mb-1">
              <span className="bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent">
                Find Investments
              </span>
            </h1>
            <p className="text-muted-foreground text-[10px] sm:text-xs lg:text-sm">
              AI-powered insights for smarter investing
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-xl mx-auto mb-3 sm:mb-4">
            <div className={cn(
              "relative rounded-xl overflow-hidden",
              "bg-card/80 backdrop-blur-sm border border-border/60",
              "shadow-lg shadow-primary/5",
              "focus-within:border-primary/50 focus-within:shadow-primary/10 transition-all"
            )}>
              <div className="flex items-center gap-1.5 sm:gap-2 p-1">
                <Search className="h-4 w-4 text-muted-foreground ml-2 sm:ml-3 shrink-0" />
                <TickerSearchAutocomplete
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelect={(result) => handleSearch(result.symbol)}
                  placeholder="Search stocks, ETFs..."
                  className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm"
                  autoFocus
                />
                <Button 
                  size="sm" 
                  className="mr-1 bg-primary hover:bg-primary/90 h-8 px-2 sm:px-3"
                  onClick={() => searchQuery && handleSearch(searchQuery)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Searches - Inline, scrollable on mobile */}
          {recentSearches.length > 0 && (
            <div className="max-w-xl mx-auto overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-1.5 min-w-max px-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="h-3 w-3" /> Recent:
                </span>
                {recentSearches.slice(0, 4).map(ticker => (
                  <Button
                    key={ticker}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(ticker)}
                    className="h-6 px-2 text-[10px] border-border/60 shrink-0"
                  >
                    {ticker}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearRecentSearches}
                  className="h-6 w-6 text-muted-foreground shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pb-8 sm:pb-12 space-y-4 sm:space-y-6">

        {/* Trending Tickers */}
        <section className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-foreground">Trending Now</h2>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block">Click any card to view full analysis</p>
              </div>
              {tickersLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
          </div>
          {tickersWithQuotes.length > 0 ? (
            <TickerCarousel 
              tickers={tickersWithQuotes} 
              onTickerClick={handleSearch} 
            />
          ) : tickersLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[120px] sm:h-[200px] bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-sm text-muted-foreground bg-card rounded-xl border border-border/60">
              No trending tickers available
            </div>
          )}
        </section>

        {/* Market Overview Dashboard - Hidden */}
        {/* <MarketOverviewDashboard /> */}

        {/* Major Market Themes */}
        <MarketThemesSection />

        {/* Market Intelligence - Top Gainers, Most Active */}
        <MarketIntelligenceSection />

        {/* Earnings Calendar Section */}
        <section className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">Earnings Calendar</h2>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block">Upcoming earnings with AI predictions</p>
            </div>
          </div>
          <EarningsCalendar />
        </section>

      </div>
    </div>
  );
}
