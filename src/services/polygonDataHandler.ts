// Polygon.io Data Handler with Caching and Regime Detection

import { supabase } from "@/integrations/supabase/client";

const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY;
const BASE_URL = 'https://api.polygon.io';

// Types
export interface OHLCVBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
}

export interface AssetData {
  ticker: string;
  bars: OHLCVBar[];
  returns: number[];
  volatility: number;
}

export interface RegimeSignal {
  timestamp: number;
  turbulenceIndex: number;
  regime: 'low_vol' | 'normal' | 'high_vol' | 'crisis';
  fractalDimension: number;
}

export interface CorrelationMatrix {
  tickers: string[];
  matrix: number[][];
  timestamp: Date;
}

// Cache entry with expiry
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Memory cache with TTL
class DataCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Helper functions
function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    } else {
      returns.push(0);
    }
  }
  return returns;
}

function calculateVolatility(returns: number[]): number {
  if (returns.length === 0) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Annualize: multiply by sqrt(252 trading days)
  return stdDev * Math.sqrt(252);
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

function forwardFillGaps(bars: OHLCVBar[]): OHLCVBar[] {
  if (bars.length === 0) return bars;

  const filled: OHLCVBar[] = [bars[0]];
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (let i = 1; i < bars.length; i++) {
    const prevBar = bars[i - 1];
    const currBar = bars[i];

    // Check for gaps (more than 3 days between bars - accounts for weekends)
    const gapDays = Math.floor((currBar.timestamp - prevBar.timestamp) / oneDayMs);

    if (gapDays > 3) {
      // Fill gaps with previous close
      for (let d = 1; d < gapDays; d++) {
        const fillTimestamp = prevBar.timestamp + d * oneDayMs;
        // Skip weekends (rough check)
        const date = new Date(fillTimestamp);
        if (date.getDay() !== 0 && date.getDay() !== 6) {
          filled.push({
            timestamp: fillTimestamp,
            open: prevBar.close,
            high: prevBar.close,
            low: prevBar.close,
            close: prevBar.close,
            volume: 0,
            vwap: prevBar.close,
          });
        }
      }
    }

    filled.push(currBar);
  }

  return filled;
}

// Calculate fractal dimension using box-counting approximation
function calculateFractalDimension(returns: number[]): number {
  if (returns.length < 10) return 1.5;

  // Simplified Hurst exponent estimation
  const n = returns.length;
  const mean = returns.reduce((a, b) => a + b, 0) / n;

  // Calculate cumulative deviations
  let cumSum = 0;
  const cumDevs: number[] = [];
  for (const r of returns) {
    cumSum += r - mean;
    cumDevs.push(cumSum);
  }

  // Range
  const range = Math.max(...cumDevs) - Math.min(...cumDevs);

  // Standard deviation
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n);

  if (stdDev === 0) return 1.5;

  // R/S statistic
  const rs = range / stdDev;

  // Hurst exponent approximation
  const hurst = Math.log(rs) / Math.log(n);

  // Fractal dimension = 2 - Hurst
  return Math.max(1, Math.min(2, 2 - hurst));
}

type PolygonAggResult = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw?: number;
};

// Main handler class
class PolygonDataHandler {
  private cache = new DataCache();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  private async fetchAggsViaBackend(params: {
    ticker: string;
    startDate: string;
    endDate: string;
    timespan: string;
  }): Promise<PolygonAggResult[]> {
    const { ticker, startDate, endDate, timespan } = params;

    // Uses backend function so API keys never touch the browser and avoids CORS issues.
    const { data, error } = await supabase.functions.invoke("polygon-aggs", {
      body: { ticker, startDate, endDate, timespan },
    });

    if (error) {
      console.error("[Polygon] Backend function error:", error);
      throw new Error(error.message || "Polygon backend function failed");
    }

    if (!data?.ok) {
      console.error("[Polygon] Backend returned error:", data);

      let message = data?.error || "Polygon backend error";

      // If backend provided a Polygon JSON payload in `details`, surface the real message.
      if (typeof data?.details === "string" && data.details.trim().startsWith("{") ) {
        try {
          const parsed = JSON.parse(data.details);
          if (parsed?.message) message = String(parsed.message);
        } catch {
          // ignore parse errors
        }
      }

      // Make the common subscription limitation actionable.
      if (data?.status === 403 && /plan doesn't include this data timeframe/i.test(message)) {
        message = `${message} Try a more recent date range (e.g. last 6–12 months) or upgrade your Polygon plan.`;
      }

      throw new Error(message);
    }

    return Array.isArray(data.results) ? (data.results as PolygonAggResult[]) : [];
  }

  async fetchHistory(
    ticker: string,
    startDate: string,
    endDate: string,
    timespan: string = 'day'
  ): Promise<OHLCVBar[]> {
    const cacheKey = `history:${ticker}:${startDate}:${endDate}:${timespan}`;

    // Check cache first
    const cached = this.cache.get<OHLCVBar[]>(cacheKey);
    if (cached) {
      console.log('[Polygon] Cache hit for', ticker);
      return cached;
    }

    console.log('[Polygon] Fetching', ticker, 'from', startDate, 'to', endDate);

    try {
      // NOTE: We intentionally do NOT fetch Polygon directly from the browser.
      // Some environments block CORS and `VITE_` env values may not be available until rebuild.
      // We route through a backend function instead.
      const results = await this.fetchAggsViaBackend({ ticker, startDate, endDate, timespan });

      const allBars: OHLCVBar[] = results.map((r) => ({
        timestamp: r.t,
        open: r.o,
        high: r.h,
        low: r.l,
        close: r.c,
        volume: r.v,
        vwap: r.vw || r.c,
      }));

      console.log('[Polygon] Got', allBars.length, 'bars for', ticker);

      // Forward-fill gaps
      const filledBars = forwardFillGaps(allBars);

      // Cache results
      this.cache.set(cacheKey, filledBars, this.CACHE_TTL);

      return filledBars;
    } catch (error) {
      console.error('[Polygon] Error fetching', ticker, ':', error);

      // If the user configured VITE_POLYGON_API_KEY, log it for debugging (never print the key itself)
      if (!POLYGON_API_KEY) {
        console.warn('[Polygon] VITE_POLYGON_API_KEY is not present on the client; using backend proxy instead');
      }

      throw error;
    }
  }

  async fetchAndCleanHistory(
    tickers: string[],
    startDate: string,
    endDate: string,
    onProgress?: (msg: string, pct: number) => void
  ): Promise<Map<string, AssetData>> {
    const assetData = new Map<string, AssetData>();

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const pct = (i / tickers.length) * 100;

      onProgress?.(`Fetching ${ticker}...`, pct);
      console.log('[Polygon] Processing', ticker, `(${i + 1}/${tickers.length})`);

      try {
        const bars = await this.fetchHistory(ticker, startDate, endDate);

        if (bars.length === 0) {
          console.warn('[Polygon] No data for', ticker);
          continue;
        }

        // Calculate returns from close prices
        const prices = bars.map((b) => b.close);
        const returns = calculateReturns(prices);

        // Calculate annualized volatility
        const volatility = calculateVolatility(returns);

        assetData.set(ticker, {
          ticker,
          bars,
          returns,
          volatility,
        });

        console.log('[Polygon]', ticker, '- Vol:', (volatility * 100).toFixed(2) + '%');
      } catch (error) {
        console.error('[Polygon] Failed to fetch', ticker, ':', error);
        // Continue with other tickers
      }

      // Rate limiting between tickers
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    onProgress?.('Data fetching complete', 100);
    return assetData;
  }

  getRegimeProxy(assetData: Map<string, AssetData>, lookbackDays: number = 60): RegimeSignal[] {
    console.log('[Polygon] Calculating regime signals with lookback', lookbackDays);

    const signals: RegimeSignal[] = [];
    const tickers = Array.from(assetData.keys());

    if (tickers.length === 0) return signals;

    // Get the first asset to determine date range
    const firstAsset = assetData.get(tickers[0])!;
    const totalDays = firstAsset.bars.length;

    if (totalDays <= lookbackDays) {
      console.warn('[Polygon] Not enough data for regime detection');
      return signals;
    }

    // Align returns across all assets
    const alignedReturns: number[][] = [];
    for (const ticker of tickers) {
      const asset = assetData.get(ticker);
      if (asset) {
        alignedReturns.push(asset.returns);
      }
    }

    const numAssets = alignedReturns.length;
    if (numAssets === 0) return signals;

    // Calculate regime for each day after lookback period
    for (let day = lookbackDays; day < totalDays - 1; day++) {
      const timestamp = firstAsset.bars[day].timestamp;

      // Get lookback window returns for all assets
      const windowReturns: number[][] = [];
      for (let a = 0; a < numAssets; a++) {
        const window = alignedReturns[a].slice(day - lookbackDays, day);
        windowReturns.push(window);
      }

      // Calculate mean returns for each asset in window
      const means: number[] = windowReturns.map((w) =>
        w.length > 0 ? w.reduce((a, b) => a + b, 0) / w.length : 0
      );

      // Calculate covariance matrix
      const covMatrix: number[][] = [];
      for (let i = 0; i < numAssets; i++) {
        covMatrix[i] = [];
        for (let j = 0; j < numAssets; j++) {
          let cov = 0;
          const n = Math.min(windowReturns[i].length, windowReturns[j].length);
          for (let k = 0; k < n; k++) {
            cov += (windowReturns[i][k] - means[i]) * (windowReturns[j][k] - means[j]);
          }
          covMatrix[i][j] = n > 0 ? cov / n : 0;
        }
      }

      // Get current day returns
      const currentReturns: number[] = [];
      for (let a = 0; a < numAssets; a++) {
        currentReturns.push(alignedReturns[a][day] || 0);
      }

      // Calculate Mahalanobis distance (simplified - using diagonal)
      let turbulenceIndex = 0;
      for (let i = 0; i < numAssets; i++) {
        const deviation = currentReturns[i] - means[i];
        const variance = covMatrix[i][i];
        if (variance > 0) {
          turbulenceIndex += (deviation * deviation) / variance;
        }
      }
      turbulenceIndex = Math.sqrt(turbulenceIndex);

      // Classify regime based on turbulence
      let regime: RegimeSignal['regime'];
      if (turbulenceIndex > 25) {
        regime = 'crisis';
      } else if (turbulenceIndex > 15) {
        regime = 'high_vol';
      } else if (turbulenceIndex > 8) {
        regime = 'normal';
      } else {
        regime = 'low_vol';
      }

      // Calculate fractal dimension for the window
      const combinedReturns = windowReturns.flat();
      const fractalDimension = calculateFractalDimension(combinedReturns);

      signals.push({
        timestamp,
        turbulenceIndex,
        regime,
        fractalDimension,
      });

      if (day === totalDays - 2) {
        console.log('[Polygon] Regime:', regime, 'Turbulence:', turbulenceIndex);
      }
    }

    return signals;
  }

  buildCorrelationMatrix(assetData: Map<string, AssetData>): CorrelationMatrix {
    const tickers = Array.from(assetData.keys());
    const n = tickers.length;

    console.log('[Polygon] Building correlation matrix for', n, 'assets');

    const matrix: number[][] = [];

    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      const assetI = assetData.get(tickers[i])!;

      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else if (j < i) {
          // Use already calculated value (symmetric)
          matrix[i][j] = matrix[j][i];
        } else {
          const assetJ = assetData.get(tickers[j])!;
          matrix[i][j] = pearsonCorrelation(assetI.returns, assetJ.returns);
        }
      }
    }

    return {
      tickers,
      matrix,
      timestamp: new Date(),
    };
  }

  getRealAssetETFs(): string[] {
    return ['VNQ', 'XLRE', 'GLD', 'IAU', 'DBC', 'TIP', 'SCHP'];
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[Polygon] Cache cleared');
  }
}

// Export singleton instance
export const polygonData = new PolygonDataHandler();

