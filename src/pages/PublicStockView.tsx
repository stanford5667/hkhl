import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, TrendingUp, TrendingDown, Plus, Building2, Globe, BarChart3, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmbeddedQuantLab } from '@/components/equity/EmbeddedQuantLab';
import { StrategyBacktester } from '@/components/backtester/StrategyBacktester';
import { SECFilingsPanel } from '@/components/research/SECFilingsPanel';
import { AnalystSocialPanel } from '@/components/research/AnalystSocialPanel';
import { IntegratedResearchView, ALAOverviewTab } from '@/components/research';
import { StockDetailLayout, DEFAULT_STOCK_TABS } from '@/components/research/StockDetailLayout';
import { useCompanyNews } from '@/hooks/useCompanyResearch';
import { KeyCatalystsSection } from '@/components/research/KeyCatalystsSection';
import { FinancialsSection } from '@/components/financials/FinancialsSection';

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

// Simple news section that uses useCompanyNews hook
function StockNewsSection({ ticker, companyName }: { ticker: string; companyName: string }) {
  const { data: newsData, isLoading, error } = useCompanyNews(ticker, companyName, 10, true);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Latest News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !newsData?.success) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Latest News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load news at this time.</p>
        </CardContent>
      </Card>
    );
  }

  const articles = newsData.data?.articles || [];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5" />
          Latest News for {companyName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {articles.length === 0 ? (
          <p className="text-muted-foreground">No recent news available.</p>
        ) : (
          <div className="space-y-4">
            {articles.map((article, idx) => (
              <div key={idx} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-primary transition-colors line-clamp-2"
                >
                  {article.title}
                </a>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{article.source}</span>
                  <span>•</span>
                  <span>{article.date}</span>
                </div>
                {article.summary && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{article.summary}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
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
  const [apiError, setApiError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch ticker details from Polygon with retry logic
  const fetchDetails = useCallback(async (isRetry = false) => {
    if (!ticker) return;
    
    setIsLoadingDetails(true);
    setNotFound(false);
    setApiError(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('polygon-ticker-details', {
        body: { ticker }
      });

      // Network/timeout errors - NOT invalid ticker
      if (error) {
        console.error('Polygon details error:', error);
        // Check if it's a network error vs actual 404
        const errorMsg = error.message?.toLowerCase() || '';
        if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('timeout') || errorMsg.includes('load failed')) {
          setApiError(true);
          // Use fallback details with just ticker
          setDetails({
            ticker,
            name: ticker,
            description: undefined,
            sector: undefined,
            industry: undefined,
            primaryExchange: undefined,
            homepageUrl: undefined,
            marketCap: undefined,
          });
          return;
        }
        setNotFound(true);
        return;
      }

      // API returned but ticker not found (actual 404 from Polygon)
      if (data?.ok === false && (data?.notFound || data?.error === "No data found for ticker")) {
        // Use fallback details with just ticker name so page still renders
        setDetails({
          ticker,
          name: ticker,
          description: undefined,
          sector: undefined,
          industry: undefined,
          primaryExchange: undefined,
          homepageUrl: undefined,
          marketCap: undefined,
        });
        return;
      }

      // API success but no details - might be network issue, use fallback
      if (!data?.ok || !data?.details) {
        setApiError(true);
        setDetails({
          ticker,
          name: ticker,
          description: undefined,
          sector: undefined,
          industry: undefined,
          primaryExchange: undefined,
          homepageUrl: undefined,
          marketCap: undefined,
        });
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
      // Network errors should NOT show "not found"
      setApiError(true);
      setDetails({
        ticker,
        name: ticker,
        description: undefined,
        sector: undefined,
        industry: undefined,
        primaryExchange: undefined,
        homepageUrl: undefined,
        marketCap: undefined,
      });
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

  // Only show "not found" for actual 404s from Polygon, not network errors
  if (!isLoadingDetails && notFound && !apiError) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <LineChart className="h-4 w-4" />
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

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-3 md:p-4 space-y-4">
            <ALAOverviewTab
              ticker={ticker}
              companyName={details?.name}
              exchange={details?.primaryExchange}
              sector={details?.sector}
              industry={details?.industry}
              description={details?.description}
              homepageUrl={details?.homepageUrl}
              quote={quote}
              isLoadingQuote={isLoadingQuote}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />

            {/* Sign In CTA */}
            {!user && (
              <Card className="bg-gradient-to-r from-primary/10 to-secondary/30 border-primary/20">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-sm">Track this stock in your portfolio</h3>
                      <p className="text-xs text-muted-foreground">
                        Sign in to add stocks, track performance, and access educational insights
                      </p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/auth', { state: { returnTo: `/stock/${ticker}` } })}>
                      Sign In
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      
      case 'financials':
        return (
          <div className="p-3 md:p-4">
            <FinancialsSection ticker={ticker} companyName={details?.name || ticker} />
          </div>
        );
      
      case 'quant-lab':
        return (
          <div className="relative h-full min-h-[600px]">
            <EmbeddedQuantLab ticker={ticker} companyName={details?.name || ticker} />
          </div>
        );
      
      case 'backtest':
        return (
          <div className="p-3 md:p-4">
            <StrategyBacktester ticker={ticker} companyName={details?.name || ticker} />
          </div>
        );
      
      case 'news':
        return (
          <div className="p-3 md:p-4 space-y-4">
            <KeyCatalystsSection ticker={ticker} />
            <StockNewsSection ticker={ticker} companyName={details?.name || ticker} />
          </div>
        );
      
      case 'sec':
        return (
          <div className="p-3 md:p-4">
            <SECFilingsPanel ticker={ticker} />
          </div>
        );
      
      case 'analyst-social':
        return (
          <div className="p-3 md:p-4">
            <AnalystSocialPanel ticker={ticker} />
          </div>
        );
      
      case 'research-v2':
        return (
          <div className="p-3 md:p-4 min-h-[600px]">
            <IntegratedResearchView ticker={ticker} currentPrice={quote?.price || 0} />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <StockDetailLayout
      ticker={ticker}
      companyName={details?.name}
      exchange={details?.primaryExchange}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={DEFAULT_STOCK_TABS}
      onBack={() => navigate(-1)}
      price={quote?.price}
      change={quote?.change}
      changePercent={quote?.changePercent}
      onSaveToWatchlist={handleAddToPortfolio}
    >
      {renderTabContent()}
    </StockDetailLayout>
  );
}
