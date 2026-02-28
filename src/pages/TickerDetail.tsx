import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PublicStockView from './PublicStockView';

/**
 * TickerDetail - Renders PublicStockView immediately.
 * Checks for existing portfolio entry in background and redirects if found.
 */
export default function TickerDetail() {
  const { ticker: paramTicker } = useParams<{ ticker: string }>();
  const [searchParams] = useSearchParams();
  const queryTicker = searchParams.get('ticker');
  const ticker = (paramTicker || queryTicker || '').toUpperCase();
  
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Check for existing portfolio entry in background — does NOT block render
  useEffect(() => {
    if (authLoading || !user || !ticker) return;

    let cancelled = false;

    supabase
      .from('companies')
      .select('id')
      .eq('ticker_symbol', ticker)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) {
          navigate(`/portfolio/${data.id}`, { replace: true });
        }
      });

    return () => { cancelled = true; };
  }, [ticker, user, authLoading, navigate]);

  // Render immediately — no loading spinner for the DB check
  return <PublicStockView />;
}
