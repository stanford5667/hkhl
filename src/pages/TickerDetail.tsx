import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * TickerDetail - Auth-gated wrapper for stock detail pages.
 * Unauthenticated users are redirected to Research with the ticker
 * stored in sessionStorage for post-login redirect.
 */
export default function TickerDetail() {
  const { user, loading } = useAuth();
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Store where the user wanted to go
      if (ticker) {
        sessionStorage.setItem('pending-stock-navigation', ticker.toUpperCase());
      }
      navigate('/asset-research', { replace: true });
    }
  }, [user, loading, ticker, navigate]);

  // While checking auth or redirecting, show nothing
  if (loading || !user) {
    return null;
  }

  // Lazy-import the actual view only for authenticated users
  const PublicStockView = require('./PublicStockView').default;
  return <PublicStockView />;
}
