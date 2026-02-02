import { useCallback } from 'react';
import { preloadRoute } from '@/lib/routePreloader';

/**
 * Hook to prefetch route on hover/focus
 * Usage: <Link onMouseEnter={prefetch('/some-route')} to="/some-route">
 */
export function usePrefetchRoute() {
  const prefetch = useCallback((path: string) => {
    return () => preloadRoute(path);
  }, []);

  return { prefetch };
}

/**
 * Prefetch handler for direct use
 */
export function createPrefetchHandler(path: string) {
  let prefetched = false;
  return () => {
    if (!prefetched) {
      prefetched = true;
      preloadRoute(path);
    }
  };
}
