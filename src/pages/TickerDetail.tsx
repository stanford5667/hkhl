import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, LineChart } from 'lucide-react';

/**
 * TickerDetail - Lightweight redirect page for /stock/:ticker
 * 
 * This page finds or creates a company record for the ticker and redirects
 * to the unified CompanyDetail page, ensuring a consistent UI across all assets.
 */
export default function TickerDetail() {
  const { ticker: paramTicker } = useParams<{ ticker: string }>();
  const [searchParams] = useSearchParams();
  const queryTicker = searchParams.get('ticker');
  const ticker = (paramTicker || queryTicker || '').toUpperCase();
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [tickerValid, setTickerValid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveAndRedirect = useCallback(async () => {
    if (!ticker) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setTickerValid(true);
    setError(null);

    try {
      // First check if we already have a company for this ticker
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('ticker_symbol', ticker)
        .eq('user_id', user?.id || '')
        .maybeSingle();

      if (existingCompany) {
        navigate(`/portfolio/${existingCompany.id}`, { replace: true });
        return;
      }

      // Validate ticker exists on Polygon
      let details: {
        name: string;
        description?: string;
        sector?: string;
        industry?: string;
        primaryExchange?: string;
        homepageUrl?: string;
        marketCap?: number;
      } | null = null;

      try {
        const { data: detailsData, error: detailsError } = await supabase.functions.invoke('polygon-ticker-details', {
          body: { ticker }
        });

        if (detailsError) {
          console.error('Polygon details error:', detailsError);
        } else if (detailsData?.ok && detailsData.details) {
          details = detailsData.details;
        } else if (detailsData?.error === 'No data found for ticker') {
          setTickerValid(false);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.log('Could not fetch ticker details:', e);
      }

      // If no user, we can't create a company - just show the data
      if (!user) {
        setError('Please sign in to view stock details');
        setIsLoading(false);
        return;
      }

      // Create a new company entry for this ticker
      const { data: newCompany, error: createError } = await supabase
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

      if (createError) {
        console.error('Error creating company:', createError);
        setError('Failed to load stock details');
        setIsLoading(false);
        return;
      }

      navigate(`/portfolio/${newCompany.id}`, { replace: true });
    } catch (e) {
      console.error('Error resolving ticker:', e);
      setError('Failed to load stock details');
      setIsLoading(false);
    }
  }, [ticker, user, navigate]);

  useEffect(() => {
    if (ticker && user !== undefined) {
      resolveAndRedirect();
    }
  }, [ticker, user, resolveAndRedirect]);

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

  if (!isLoading && !tickerValid) {
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
              <Button variant="outline" onClick={() => navigate('/screener')}>
                Go to Screener
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

  if (error) {
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
              <h2 className="text-xl font-semibold">Error</h2>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state while redirecting
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading {ticker}...</p>
        </div>
      </div>
    </div>
  );
}
