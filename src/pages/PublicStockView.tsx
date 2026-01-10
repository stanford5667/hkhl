import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, LineChart, TrendingUp, TrendingDown, RefreshCw, Plus, Building2, Globe, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CandlestickChart } from '@/components/charts/CandlestickChart';

interface TickerDetails {
  ticker: string;
  name: string;
  description?: string;
  sector?: string;
  industry?: string;
  primaryExchange?: string;
  homepageUrl?: string;
  marketCap?: number;
}

interface StockQuote {
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose?: number;
  marketCap?: number;
  companyName?: string;
}

/**
 * PublicStockView - View stock details without signing in
 * Shows quote, chart, and company info. Sign-in required only for portfolio features.
 */
export default function PublicStockView() {
  const { ticker: paramTicker } = useParams<{ ticker: string }>();
  const ticker = (paramTicker || '').toUpperCase();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [details, setDetails] = useState<TickerDetails | null>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Fetch ticker details from Polygon
  const fetchDetails = useCallback(async () => {
    if (!ticker) return;
    
    setIsLoadingDetails(true);
    setNotFound(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('polygon-ticker-details', {
        body: { ticker }
      });

      if (error) {
        console.error('Polygon details error:', error);
        setNotFound(true);
        return;
      }

      if (!data?.ok || !data?.details) {
        setNotFound(true);
        return;
      }

      setDetails({
        ticker,
        name: data.details.name,
        description: data.details.description,
        sector: data.details.sector,
        industry: data.details.industry,
        primaryExchange: data.details.primaryExchange,
        homepageUrl: data.details.homepageUrl,
        marketCap: data.details.marketCap,
      });
    } catch (e) {
      console.error('Details error:', e);
      setNotFound(true);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [ticker]);

  // Fetch stock quote
  const fetchQuote = useCallback(async () => {
    if (!ticker) return;
    
    setIsLoadingQuote(true);
    try {
      const { getCachedFullQuote } = await import('@/services/quoteCacheService');
      const data = await getCachedFullQuote(ticker);
      
      if (data) {
        setQuote({
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          open: data.open,
          high: data.high,
          low: data.low,
          previousClose: data.previousClose,
          marketCap: details?.marketCap,
          companyName: data.companyName || details?.name,
        });
      }
    } catch (e) {
      console.error('Quote error:', e);
    } finally {
      setIsLoadingQuote(false);
    }
  }, [ticker, details?.marketCap, details?.name]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (details) {
      fetchQuote();
    }
  }, [details, fetchQuote]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQuote();
    setIsRefreshing(false);
    toast.success('Quote refreshed');
  };

  const handleAddToPortfolio = async () => {
    if (!user) {
      toast.error('Please sign in to add stocks to your portfolio');
      navigate('/auth', { state: { returnTo: `/stock/${ticker}` } });
      return;
    }

    // Check if already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('ticker_symbol', ticker)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCompany) {
      navigate(`/portfolio/${existingCompany.id}`);
      return;
    }

    // Create new company entry
    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({
        user_id: user.id,
        name: details?.name || ticker,
        ticker_symbol: ticker,
        industry: details?.industry || null,
        company_type: 'portfolio',
        asset_class: 'public_equity',
        exchange: details?.primaryExchange || null,
        website: details?.homepageUrl || null,
        description: details?.description || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating company:', error);
      toast.error('Failed to add to portfolio');
      return;
    }

    toast.success('Added to portfolio');
    navigate(`/portfolio/${newCompany.id}`);
  };

  // Format helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatMarketCap = (value: number | undefined) => {
    if (!value) return '—';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  if (!ticker) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No ticker specified</p>
        <Button variant="link" onClick={() => navigate('/asset-research')}>
          Go to Asset Research
        </Button>
      </div>
    );
  }

  if (!isLoadingDetails && notFound) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <LineChart className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Ticker Not Found</h2>
              <p className="text-muted-foreground mt-1">
                "{ticker}" is not a valid ticker symbol
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/asset-research')}>
                Go to Asset Research
              </Button>
              <Button onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPositive = (quote?.change || 0) >= 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            {isLoadingDetails ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <LineChart className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 shrink-0" />
                  <h1 className="text-xl sm:text-3xl font-bold truncate">{details?.name || ticker}</h1>
                  <Badge variant="secondary" className="text-sm sm:text-lg font-mono px-2 py-0.5">
                    {ticker}
                  </Badge>
                  {details?.primaryExchange && (
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {details.primaryExchange}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {details?.sector && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {details.sector}
                    </span>
                  )}
                  {details?.industry && (
                    <span className="hidden sm:flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {details.industry}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleAddToPortfolio} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add to Portfolio</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Quote Card */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base sm:text-lg">Market Data</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingQuote ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : quote ? (
            <div className="space-y-4">
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Price</p>
                  <p className="text-3xl sm:text-4xl font-bold tabular-nums">{formatCurrency(quote.price)}</p>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-lg sm:text-xl font-semibold pb-1",
                  isPositive ? "text-emerald-500" : "text-rose-500"
                )}>
                  {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  <span className="tabular-nums">
                    {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Open</p>
                  <p className="text-lg font-semibold tabular-nums">{formatCurrency(quote.open)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">High</p>
                  <p className="text-lg font-semibold tabular-nums">{formatCurrency(quote.high)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Low</p>
                  <p className="text-lg font-semibold tabular-nums">{formatCurrency(quote.low)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Market Cap</p>
                  <p className="text-lg font-semibold tabular-nums">{formatMarketCap(details?.marketCap)}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load quote data</p>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      {ticker && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Price Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] sm:h-[400px]">
              <CandlestickChart symbol={ticker} height={400} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Info */}
      {details?.description && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              About {details.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">{details.description}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Sector</p>
                <p className="font-medium">{details.sector || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Industry</p>
                <p className="font-medium">{details.industry || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Exchange</p>
                <p className="font-medium">{details.primaryExchange || '—'}</p>
              </div>
              {details.homepageUrl && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Website</p>
                  <a 
                    href={details.homepageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium flex items-center gap-1"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Visit
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sign In CTA */}
      {!user && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/30 border-primary/20">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg">Track this stock in your portfolio</h3>
                <p className="text-sm text-muted-foreground">
                  Sign in to add stocks, track performance, and get personalized insights
                </p>
              </div>
              <Button onClick={() => navigate('/auth', { state: { returnTo: `/stock/${ticker}` } })}>
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
