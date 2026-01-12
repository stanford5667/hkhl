import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useSmartAlerts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasShownAlerts = useRef(false);

  useEffect(() => {
    if (!user || hasShownAlerts.current) return;
    
    // Only show alerts once per session
    hasShownAlerts.current = true;

    // Check for portfolio alerts after a delay
    const portfolioTimeout = setTimeout(() => {
      checkPortfolioAlerts();
    }, 5000);

    // Show market opportunities after 30 seconds
    const marketTimeout = setTimeout(() => {
      showMarketOpportunities();
    }, 30000);

    return () => {
      clearTimeout(portfolioTimeout);
      clearTimeout(marketTimeout);
    };
  }, [user]);

  const checkPortfolioAlerts = async () => {
    try {
      // Get user's synced positions
      const { data: positions } = await supabase
        .from('synced_positions')
        .select('symbol, quantity, current_price')
        .eq('user_id', user?.id)
        .limit(5);

      if (!positions?.length) return;

      // Check for significant moves (mock data for now)
      const significantMoves = [
        { symbol: 'NVDA', change: 5.2 },
        { symbol: 'AAPL', change: -3.1 },
      ];

      significantMoves.forEach((move, index) => {
        // Check if user holds this position
        const holding = positions.find(p => p.symbol === move.symbol);
        if (!holding) return;

        setTimeout(() => {
          const direction = move.change > 0 ? 'up' : 'down';
          const emoji = move.change > 0 ? '📈' : '📉';
          
          toast(`${emoji} ${move.symbol} is ${direction} ${Math.abs(move.change)}%`, {
            description: 'Tap to see AI analysis',
            action: {
              label: 'View',
              onClick: () => navigate(`/research/${move.symbol}`),
            },
            duration: 8000,
          });
        }, index * 3000);
      });
    } catch (error) {
      console.error('Error checking portfolio alerts:', error);
    }
  };

  const showMarketOpportunities = () => {
    // Show a "missed opportunity" alert to create urgency
    toast('3 stocks matched your screens today', {
      description: '👑 Pro users got alerts at market open',
      action: {
        label: 'See Stocks',
        onClick: () => navigate('/screener'),
      },
      duration: 10000,
    });
  };
}
