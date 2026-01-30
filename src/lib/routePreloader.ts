/**
 * Route Preloader
 * 
 * Preloads route chunks when the user hovers over navigation links
 * to make navigation feel instant.
 */

// Map of routes to their lazy imports
const routeImports: Record<string, () => Promise<any>> = {
  '/': () => import('../pages/Research'),
  '/research': () => import('../pages/Research'),
  '/watchlist': () => import('../pages/Watchlist'),
  '/portfolio-visualizer': () => import('../pages/PortfolioVisualizer'),
  '/news': () => import('../pages/NewsIntelligence'),
  '/discovery': () => import('../pages/DiscoveryHub'),
  '/asset-research': () => import('../pages/AssetResearch'),
  '/backtester': () => import('../pages/Backtester'),
  '/quant-lab': () => import('../pages/QuantLab'),
  '/market-intel': () => import('../pages/MarketIntel'),
  '/settings': () => import('../pages/Settings'),
};

// Track which routes have been preloaded
const preloadedRoutes = new Set<string>();

/**
 * Preload a route's code chunk
 */
export function preloadRoute(path: string): void {
  // Normalize path
  const normalizedPath = path.split('?')[0].split('#')[0];
  
  // Skip if already preloaded
  if (preloadedRoutes.has(normalizedPath)) {
    return;
  }
  
  const importer = routeImports[normalizedPath];
  if (importer) {
    preloadedRoutes.add(normalizedPath);
    // Fire and forget - don't await
    importer().catch(() => {
      // If preload fails, allow retry
      preloadedRoutes.delete(normalizedPath);
    });
  }
}

/**
 * Preload multiple routes
 */
export function preloadRoutes(paths: string[]): void {
  paths.forEach(preloadRoute);
}

/**
 * Preload common routes after initial page load
 * Called after the app is idle
 */
export function preloadCommonRoutes(): void {
  // Wait for the browser to be idle before preloading
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      // Preload the most common navigation targets
      preloadRoutes([
        '/watchlist',
        '/research',
        '/portfolio-visualizer',
      ]);
    }, { timeout: 3000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      preloadRoutes([
        '/watchlist',
        '/research',
        '/portfolio-visualizer',
      ]);
    }, 2000);
  }
}

/**
 * Get handler for link hover to preload route
 */
export function getPreloadHandler(path: string) {
  return () => preloadRoute(path);
}
