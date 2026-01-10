import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Building2, 
  TrendingUp, 
  Globe, 
  BarChart3, 
  DollarSign,
  ArrowRight,
  Sparkles,
  LineChart
} from 'lucide-react';

interface TickerDetails {
  ticker: string;
  name: string;
  description?: string;
  sector?: string;
  industry?: string;
  primaryExchange?: string;
  homepageUrl?: string;
  marketCap?: number;
  listDate?: string;
}

export default function AssetResearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tickerDetails, setTickerDetails] = useState<TickerDetails | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const searchTicker = useCallback(async (ticker: string) => {
    if (!ticker.trim()) return;
    
    const normalizedTicker = ticker.toUpperCase().trim();
    setIsSearching(true);
    setNotFound(false);
    setTickerDetails(null);

    try {
      const { data, error } = await supabase.functions.invoke('polygon-ticker-details', {
        body: { ticker: normalizedTicker }
      });

      if (error) {
        console.error('Search error:', error);
        toast.error('Failed to search for ticker');
        setIsSearching(false);
        return;
      }

      if (!data?.ok || !data?.details) {
        setNotFound(true);
        setIsSearching(false);
        return;
      }

      setTickerDetails({
        ticker: normalizedTicker,
        name: data.details.name,
        description: data.details.description,
        sector: data.details.sector,
        industry: data.details.industry,
        primaryExchange: data.details.primaryExchange,
        homepageUrl: data.details.homepageUrl,
        marketCap: data.details.marketCap,
        listDate: data.details.listDate,
      });

      // Add to recent searches
      setRecentSearches(prev => {
        const updated = [normalizedTicker, ...prev.filter(t => t !== normalizedTicker)].slice(0, 5);
        return updated;
      });

    } catch (e) {
      console.error('Search error:', e);
      toast.error('Failed to search for ticker');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchTicker(searchQuery);
  };

  const viewFullDetails = async () => {
    if (!tickerDetails || !user) {
      toast.error('Please sign in to view full details');
      return;
    }

    // Check if company exists, otherwise navigate to create
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('ticker_symbol', tickerDetails.ticker)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCompany) {
      navigate(`/portfolio/${existingCompany.id}`);
    } else {
      navigate(`/stock/${tickerDetails.ticker}`);
    }
  };

  const formatMarketCap = (value: number | undefined) => {
    if (!value) return 'N/A';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B'];

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Search className="h-8 w-8 text-primary" />
          Asset Research
        </h1>
        <p className="text-muted-foreground">
          Search for any public company to view detailed financial information and analysis
        </p>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Search by Ticker Symbol
          </CardTitle>
          <CardDescription>
            Enter a stock ticker to get company details, financials, and market data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Enter ticker (e.g., AAPL, MSFT, GOOGL)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              className="flex-1 text-lg"
            />
            <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </form>

          {/* Popular Tickers */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Popular:</span>
            {popularTickers.map(ticker => (
              <Badge 
                key={ticker} 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => {
                  setSearchQuery(ticker);
                  searchTicker(ticker);
                }}
              >
                {ticker}
              </Badge>
            ))}
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Recent:</span>
              {recentSearches.map(ticker => (
                <Badge 
                  key={ticker} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => {
                    setSearchQuery(ticker);
                    searchTicker(ticker);
                  }}
                >
                  {ticker}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isSearching && (
        <Card>
          <CardContent className="py-8 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="grid grid-cols-3 gap-4 mt-6">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Found State */}
      {notFound && !isSearching && (
        <Card className="border-destructive/50">
          <CardContent className="py-8 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Ticker Not Found</h3>
            <p className="text-muted-foreground">
              We couldn't find any company with the ticker "{searchQuery}". Please check the symbol and try again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {tickerDetails && !isSearching && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="text-lg px-3 py-1">
                    {tickerDetails.ticker}
                  </Badge>
                  <CardTitle className="text-2xl">{tickerDetails.name}</CardTitle>
                </div>
                {tickerDetails.primaryExchange && (
                  <p className="text-sm text-muted-foreground">
                    Listed on {tickerDetails.primaryExchange}
                  </p>
                )}
              </div>
              <Button onClick={viewFullDetails} className="gap-2">
                View Full Profile
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Market Cap</span>
                </div>
                <p className="text-xl font-semibold">{formatMarketCap(tickerDetails.marketCap)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">Sector</span>
                </div>
                <p className="text-xl font-semibold">{tickerDetails.sector || 'N/A'}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm">Industry</span>
                </div>
                <p className="text-xl font-semibold truncate">{tickerDetails.industry || 'N/A'}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <LineChart className="h-4 w-4" />
                  <span className="text-sm">Exchange</span>
                </div>
                <p className="text-xl font-semibold">{tickerDetails.primaryExchange || 'N/A'}</p>
              </div>
            </div>

            {/* Description */}
            {tickerDetails.description && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  About
                </h4>
                <p className="text-muted-foreground leading-relaxed line-clamp-4">
                  {tickerDetails.description}
                </p>
              </div>
            )}

            {/* Website */}
            {tickerDetails.homepageUrl && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={tickerDetails.homepageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {tickerDetails.homepageUrl}
                </a>
              </div>
            )}

            {/* CTA */}
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/30 border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium">Want deeper analysis?</p>
                      <p className="text-sm text-muted-foreground">
                        View price charts, fundamentals, and AI-powered insights
                      </p>
                    </div>
                  </div>
                  <Button onClick={viewFullDetails} variant="default">
                    Open Full Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
