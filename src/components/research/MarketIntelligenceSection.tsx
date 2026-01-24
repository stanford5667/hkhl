import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, TrendingDown, Activity, Newspaper, Filter, 
  ChevronRight, Zap, ExternalLink, Flame, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { screenStocksFromPolygon, QUICK_SCREENS, type ScreenerResult } from '@/services/polygonScreenerService';
import { supabase } from '@/integrations/supabase/client';

// Quick screen types for the tabbed interface
const SCREEN_TABS = [
  { id: 'trending', label: 'Trending', icon: Flame, screen: 'topGainers' },
  { id: 'mostActive', label: 'Most Active', icon: Activity, screen: 'mostActive' },
  { id: 'momentum', label: 'Momentum', icon: TrendingUp, screen: 'smallCapMomentum' },
  { id: 'unusual', label: 'Unusual Vol', icon: Zap, screen: 'unusualVolume' },
];

interface NewsEvent {
  id: string;
  title: string;
  summary: string | null;
  published_at: string;
  source_id: string | null;
  url: string | null;
}

function formatMarketCap(value: number | null): string {
  if (!value) return '-';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toString();
}

function StockRow({ stock, onClick }: { stock: ScreenerResult; onClick: () => void }) {
  const isPositive = stock.changePercent >= 0;
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 py-2 px-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
    >
      <div className="w-14">
        <span className="text-sm font-semibold text-primary">{stock.symbol}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground truncate block">{stock.name}</span>
      </div>
      <div className="w-16 text-right">
        <span className="text-xs font-medium text-foreground tabular-nums">
          ${stock.price.toFixed(2)}
        </span>
      </div>
      <div className={cn(
        'w-16 text-right text-xs font-semibold tabular-nums',
        isPositive ? 'text-emerald-500' : 'text-destructive'
      )}>
        {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
      </div>
    </button>
  );
}

function TrendingMostActivePanel() {
  const navigate = useNavigate();
  
  // Top Gainers: Real daily performance sorted by % change, filtered for quality
  const { data: gainers, isLoading: loadingGainers } = useQuery({
    queryKey: ['screener', 'topGainers-quality'],
    queryFn: async () => {
      // Fetch top gainers with quality filters to exclude penny stocks
      const result = await screenStocksFromPolygon({
        minChange1D: 2,        // Stocks up at least 2% today
        minPrice: 2,           // Minimum $2 price (excludes penny stocks)
        minVolume: 500000,     // Minimum 500K volume (ensures liquidity)
        sortBy: 'change',
        sortDirection: 'desc',
        limit: 25,
      });
      return result.results.slice(0, 10);
    },
    staleTime: 60000,
  });

  // Most Active: Highest volume stocks today
  const { data: mostActive, isLoading: loadingActive } = useQuery({
    queryKey: ['screener', 'mostActive-quality'],
    queryFn: async () => {
      const result = await screenStocksFromPolygon({
        minPrice: 1,           // Minimum $1 price
        minVolume: 1000000,    // Minimum 1M volume
        sortBy: 'volume',
        sortDirection: 'desc',
        limit: 25,
      });
      return result.results.slice(0, 10);
    },
    staleTime: 60000,
  });

  const handleStockClick = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Today's Market Movers
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7"
            onClick={() => navigate('/screener')}
          >
            Full Screener <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Stocks sorted by actual daily performance (min $2 price, 500K+ volume)
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Top Gainers - Sorted by actual daily % change */}
          <div>
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
                Top Gainers Today
              </span>
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span className="w-16 text-right">Price</span>
                <span className="w-16 text-right">Change</span>
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {loadingGainers ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Loading...</div>
              ) : (
                gainers?.map(stock => (
                  <StockRow 
                    key={stock.symbol} 
                    stock={stock} 
                    onClick={() => handleStockClick(stock.symbol)} 
                  />
                ))
              )}
            </div>
          </div>

          {/* Most Active */}
          <div>
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Most Active
              </span>
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span className="w-16 text-right">Price</span>
                <span className="w-16 text-right">1D Chg</span>
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {loadingActive ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Loading...</div>
              ) : (
                mostActive?.map(stock => (
                  <StockRow 
                    key={stock.symbol} 
                    stock={stock} 
                    onClick={() => handleStockClick(stock.symbol)} 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickScreenerPanel() {
  const navigate = useNavigate();
  const [activeScreen, setActiveScreen] = useState('topGainers');

  const { data: results, isLoading } = useQuery({
    queryKey: ['screener', activeScreen],
    queryFn: async () => {
      const screenConfig = QUICK_SCREENS[activeScreen as keyof typeof QUICK_SCREENS];
      if (!screenConfig) return [];
      const result = await screenStocksFromPolygon(screenConfig.filters);
      return result.results.slice(0, 8);
    },
    staleTime: 60000,
  });

  const handleStockClick = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Quick Screener
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7"
            onClick={() => navigate('/screener')}
          >
            Advanced <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Screen Tabs */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {SCREEN_TABS.map(tab => (
            <Button
              key={tab.id}
              variant={activeScreen === tab.screen ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setActiveScreen(tab.screen)}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
            ))
          ) : (
            results?.map(stock => {
              const isPositive = stock.changePercent >= 0;
              return (
                <button
                  key={stock.symbol}
                  onClick={() => handleStockClick(stock.symbol)}
                  className={cn(
                    'p-2 rounded-lg border text-left transition-all hover:scale-[1.02]',
                    'bg-card hover:bg-muted/50 border-border'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-primary">{stock.symbol}</span>
                    <span className={cn(
                      'text-[10px] font-semibold',
                      isPositive ? 'text-emerald-500' : 'text-destructive'
                    )}>
                      {isPositive ? '+' : ''}{stock.changePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mb-1">
                    {stock.name}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">${stock.price.toFixed(2)}</span>
                    <span className="text-[9px] text-muted-foreground">
                      Vol: {formatVolume(stock.volume)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MarketNewsPanel() {
  const navigate = useNavigate();
  
  const { data: newsItems, isLoading } = useQuery({
    queryKey: ['market-news-research'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_events')
        .select('id, title, summary, source_id, published_at, url')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(12);
      
      if (error) throw error;
      return data as NewsEvent[];
    },
    staleTime: 60000,
  });

  const formatTime = (date: string) => {
    const now = new Date();
    const published = new Date(date);
    const diffMs = now.getTime() - published.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" />
            Market Moving News
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7"
            onClick={() => navigate('/market-intel')}
          >
            All News <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Key events impacting the markets today
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading news...</div>
          ) : newsItems && newsItems.length > 0 ? (
            newsItems.map(item => (
              <a
                key={item.id}
                href={item.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors group"
              >
                <Badge variant="outline" className="shrink-0 text-[10px] mt-0.5">
                  {formatTime(item.published_at)}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {item.summary}
                    </p>
                  )}
                </div>
              </a>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No recent news available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketIntelligenceSection() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Market Intelligence</h2>
      </div>
      
      <div className="grid gap-4">
        {/* Trending & Most Active - Full Width */}
        <TrendingMostActivePanel />
        
        {/* Quick Screener & News - Side by Side on Desktop */}
        <div className="grid lg:grid-cols-2 gap-4">
          <QuickScreenerPanel />
          <MarketNewsPanel />
        </div>
      </div>
    </section>
  );
}
