import { useDevModeSync } from '@/hooks/useDevModeSync';

/**
 * Wrapper component that syncs DevMode state with market data services.
 * Renders nothing, just runs the sync effect.
 */
export function DevModeSyncWrapper() {
  useDevModeSync();
  return null;
}
