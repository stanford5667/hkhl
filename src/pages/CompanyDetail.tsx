import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * CompanyDetail - Redirects to the unified /stock/:ticker view.
 * Looks up the company by ID, resolves its ticker, and navigates there.
 * For companies without a ticker, shows a minimal fallback.
 */
export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Handle synced position routes
    if (id.startsWith('synced-')) {
      const lookupId = id.replace(/^synced-/, '');
      supabase
        .from('synced_positions')
        .select('symbol')
        .eq('id', lookupId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.symbol) {
            navigate(`/stock/${data.symbol}`, { replace: true });
          } else {
            toast.error('Position not found');
            navigate('/');
          }
        });
      return;
    }

    // Validate UUID format
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isValidUUID) {
      toast.error('Company not found');
      navigate('/');
      return;
    }

    // Look up the company and redirect to /stock/:ticker
    supabase
      .from('companies')
      .select('ticker_symbol, name')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          // Fallback: check synced_positions
          supabase
            .from('synced_positions')
            .select('symbol')
            .eq('id', id)
            .maybeSingle()
            .then(({ data: posData }) => {
              if (posData?.symbol) {
                navigate(`/stock/${posData.symbol}`, { replace: true });
              } else {
                toast.error('Company not found');
                navigate('/');
              }
            });
          return;
        }

        if (data.ticker_symbol) {
          navigate(`/stock/${data.ticker_symbol}`, { replace: true });
        } else {
          // No ticker — rare case for private companies without tickers
          setFallback(true);
        }
      });
  }, [id, navigate]);

  if (fallback) {
    return (
      <div className="flex items-center justify-center h-full p-12 text-muted-foreground">
        <p>This company does not have a ticker symbol and cannot be viewed in the research view.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
