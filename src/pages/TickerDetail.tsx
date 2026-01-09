import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MarketIntelTab } from '@/components/companies/MarketIntelTab';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import { MetricInfoIcon } from '@/components/shared/MetricInfoIcon';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Building2,
  Globe,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Newspaper,
  LayoutDashboard,
  RefreshCw,
  Star,
  Plus,
  LineChart,
  BarChart3,
} from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';

interface StockQuote {
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: string;
  marketCap: string;
  companyName: string;
  pe?: number;
  eps?: number;
  week52High?: number;
  week52Low?: number;
  avgVolume?: string;
  dividendYield?: number;
  industry?: string;
  sector?: string;
  exchange?: string;
  description?: string;
  website?: string;
}

export default function TickerDetail() {
  const { ticker: paramTicker } = useParams<{ ticker: string }>();
  const [searchParams] = useSearchParams();
  const queryTicker = searchParams.get('ticker');
  const ticker = (paramTicker || queryTicker || '').toUpperCase();
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const { addToWatchlist, isInWatchlist } = useWatchlist('stock');
  const inWatchlist = isInWatchlist('stock', ticker);

  const handleAddToWatchlist = () => {
    addToWatchlist({
      itemType: 'stock',
      itemId: ticker,
      itemName: quote?.companyName || ticker,
    });
  };

  const fetchQuote = useCallback(async () => {
    if (!ticker) return;
    
    setIsLoading(true);
    try {
      // Get quote data from Finnhub via cache service
      const { getCachedFullQuote } = await import('@/services/quoteCacheService');
      const data = await getCachedFullQuote(ticker);
      
      // Also try to get ticker details from Polygon for additional info
      let details: any = null;
      try {
        const { data: detailsData } = await supabase.functions.invoke('polygon-ticker-details', {
          body: { ticker }
        });
        if (detailsData?.success) {
          details = detailsData.data;
        }
      } catch (e) {
        console.log('Could not fetch ticker details:', e);
      }
      
      if (data) {
        setQuote({
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          open: data.open,
          high: data.high,
          low: data.low,
          volume: '-',
          marketCap: data.marketCap || (details?.market_cap ? `$${(details.market_cap / 1e9).toFixed(2)}B` : '-'),
          companyName: data.companyName || details?.name || ticker,
          industry: details?.sic_description || undefined,
          sector: details?.type || undefined,
          exchange: details?.primary_exchange || undefined,
          description: details?.description || undefined,
          website: details?.homepage_url || undefined,
          week52High: details?.week52High,
          week52Low: details?.week52Low,
        });
      } else {
        // Fallback to just ticker details if quote fails
        if (details) {
          setQuote({
            price: 0,
            change: 0,
            changePercent: 0,
            open: 0,
            high: 0,
            low: 0,
            volume: '-',
            marketCap: details.market_cap ? `$${(details.market_cap / 1e9).toFixed(2)}B` : '-',
            companyName: details.name || ticker,
            industry: details.sic_description,
            sector: details.type,
            exchange: details.primary_exchange,
            description: details.description,
            website: details.homepage_url,
          });
        }
      }
    } catch (e) {
      console.error('Quote error:', e);
      toast.error('Failed to load stock data');
    } finally {
      setIsLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    if (ticker) {
      fetchQuote();
    }
  }, [ticker, fetchQuote]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQuote();
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleAddToPortfolio = async () => {
    if (!user) {
      toast.error('Please sign in to add to portfolio');
      return;
    }

    try {
      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({
          user_id: user.id,
          name: quote?.companyName || ticker,
          ticker_symbol: ticker,
          industry: quote?.industry || null,
          company_type: 'portfolio',
          asset_class: 'public_equity',
          current_price: quote?.price || null,
          price_updated_at: new Date().toISOString(),
          exchange: quote?.exchange || null,
          website: quote?.website || null,
          description: quote?.description || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success(`Added ${ticker} to your portfolio`);
      navigate(`/portfolio/${newCompany.id}`);
    } catch (e) {
      console.error('Error adding to portfolio:', e);
      toast.error('Failed to add to portfolio');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (!ticker) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No ticker specified</p>
        <Button variant="link" onClick={() => navigate('/screener')}>
          Go to Screener
        </Button>
      </div>
    );
  }

  const isPositive = (quote?.change || 0) >= 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <LineChart className="h-6 w-6 text-emerald-400" />
                  <h1 className="text-2xl font-bold">{quote?.companyName || ticker}</h1>
                  <Badge variant="secondary" className="text-base font-mono">
                    {ticker}
                  </Badge>
                  {quote?.exchange && (
                    <Badge variant="outline">{quote.exchange}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                  {quote?.industry && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {quote.industry}
                    </span>
                  )}
                  {quote?.website && (
                    <a
                      href={quote.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      {quote.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddToWatchlist}
            disabled={inWatchlist}
          >
            <Star className={cn('h-4 w-4 mr-2', inWatchlist && 'fill-amber-500 text-amber-500')} />
            {inWatchlist ? 'Watching' : 'Watch'}
          </Button>
          <Button size="sm" onClick={handleAddToPortfolio}>
            <Plus className="h-4 w-4 mr-2" />
            Add to Portfolio
          </Button>
        </div>
      </div>

      {/* Price Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          ) : quote && quote.price > 0 ? (
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl font-bold tabular-nums">
                    {formatCurrency(quote.price)}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1 text-lg font-medium",
                    isPositive ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {isPositive ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                    <span className="tabular-nums">
                      {isPositive ? '+' : ''}{formatCurrency(quote.change)}
                    </span>
                    <span className="tabular-nums">
                      ({formatPercent(quote.changePercent)})
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground mt-1">Market value as of today</p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Price data unavailable</p>
          )}
          
          {/* Key Stats Row */}
          {quote && quote.price > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Open</p>
                <p className="text-lg font-medium tabular-nums">{formatCurrency(quote.open)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">High</p>
                <p className="text-lg font-medium tabular-nums">{formatCurrency(quote.high)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Low</p>
                <p className="text-lg font-medium tabular-nums">{formatCurrency(quote.low)}</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground uppercase">Market Cap</p>
                  <MetricInfoIcon termKey="marketCap" iconSize={10} />
                </div>
                <p className="text-lg font-medium">{quote.marketCap}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Price Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CandlestickChart symbol={ticker} height={400} />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary h-12">
          <TabsTrigger value="overview" className="gap-2 text-base px-5 py-3">
            <LayoutDashboard className="h-5 w-5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2 text-base px-5 py-3">
            <Newspaper className="h-5 w-5" />
            News & Intel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* About Section */}
          {quote?.description && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  About {quote.companyName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed">{quote.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Company Info */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Ticker</p>
                  <p className="text-foreground font-medium mt-1">{ticker}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Exchange</p>
                  <p className="text-foreground font-medium mt-1">{quote?.exchange || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Industry</p>
                  <p className="text-foreground font-medium mt-1">{quote?.industry || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Website</p>
                  {quote?.website ? (
                    <a 
                      href={quote.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium mt-1 flex items-center gap-1"
                    >
                      Visit
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-foreground font-medium mt-1">—</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news">
          <MarketIntelTab 
            companyId="" 
            companyName={quote?.companyName || ticker} 
            industry={quote?.industry || null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
