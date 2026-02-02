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
  '/academy': () => import('../pages/Academy'),
  '/investment-plan': () => import('../pages/InvestmentPlan'),
  '/glossary': () => import('../pages/Glossary'),
  '/support': () => import('../pages/SupportCenter'),
};

// Preload critical components used across multiple pages
const criticalComponentImports: (() => Promise<any>)[] = [
  () => import('../components/research/TickerCarousel'),
  () => import('../components/earnings'),
];

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
 * Preload critical components
 */
export function preloadCriticalComponents(): void {
  criticalComponentImports.forEach(importer => {
    importer().catch(() => {});
  });
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
        '/research',
        '/portfolio-visualizer',
        '/academy',
      ]);
      // Preload critical shared components
      preloadCriticalComponents();
    }, { timeout: 2000 });
    
    // Second wave of preloads after more time
    (window as any).requestIdleCallback(() => {
      preloadRoutes([
        '/watchlist',
        '/investment-plan',
        '/glossary',
      ]);
    }, { timeout: 5000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      preloadRoutes([
        '/research',
        '/portfolio-visualizer',
        '/academy',
      ]);
      preloadCriticalComponents();
    }, 1500);
    
    setTimeout(() => {
      preloadRoutes([
        '/watchlist',
        '/investment-plan',
        '/glossary',
      ]);
    }, 4000);
  }
}

/**
 * Get handler for link hover to preload route
 */
export function getPreloadHandler(path: string) {
  return () => preloadRoute(path);
}
