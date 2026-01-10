import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PublicStockView from './PublicStockView';

/**
 * TickerDetail - Wrapper that shows PublicStockView for unauthenticated users
 * or redirects to CompanyDetail for authenticated users with existing holdings.
 */
export default function TickerDetail() {
  const { ticker: paramTicker } = useParams<{ ticker: string }>();
  const [searchParams] = useSearchParams();
  const queryTicker = searchParams.get('ticker');
  const ticker = (paramTicker || queryTicker || '').toUpperCase();
  
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checkingExisting, setCheckingExisting] = useState(true);

  useEffect(() => {
    const checkExistingCompany = async () => {
      if (authLoading) return;
      
      if (!user || !ticker) {
        setCheckingExisting(false);
        return;
      }

      // Check if user already has this stock in their portfolio
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('ticker_symbol', ticker)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingCompany) {
        // Redirect to existing portfolio entry
        navigate(`/portfolio/${existingCompany.id}`, { replace: true });
        return;
      }

      setCheckingExisting(false);
    };

    checkExistingCompany();
  }, [ticker, user, authLoading, navigate]);

  // Show loading while checking auth/existing company
  if (authLoading || checkingExisting) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Show public stock view - works for both authenticated and unauthenticated users
  return <PublicStockView />;
}
