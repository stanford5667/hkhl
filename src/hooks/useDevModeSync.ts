import { useEffect } from 'react';
import { useDevMode } from '@/contexts/DevModeContext';
import { setDevModeState } from '@/services/MarketDataManager';

/**
 * Hook that syncs DevModeContext state with the market data services.
 * Must be used within DevModeProvider.
 */
export function useDevModeSync() {
  const { marketDataEnabled, logApiCall } = useDevMode();
  
  useEffect(() => {
    // Sync the context state to the services
    setDevModeState(marketDataEnabled, logApiCall);
  }, [marketDataEnabled, logApiCall]);
}
