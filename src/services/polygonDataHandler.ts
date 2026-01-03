// Polygon.io Data Handler with Caching, Validation, and Regime Detection

import { supabase } from "@/integrations/supabase/client";
import {
  validateTickerData,
  validateCorrelationMatrix,
  generateDataAuditReport,
  type DataValidationResult,
  type DataAuditReport,
  type OHLCVBar as ValidationOHLCVBar,
} from "./dataValidationService";

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
  validation?: DataValidationResult;
}

export interface TickerFetchResult {
  ticker: string;
  success: boolean;
  bars?: number;
  error?: string;
  dataQuality?: 'high' | 'medium' | 'low';
  validationIssues?: string[];
  source?: 'cache' | 'api';
}

export interface FetchHistoryResult {
  assetData: Map<string, AssetData>;
  diagnostics: TickerFetchResult[];
  dataAudit?: DataAuditReport;
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
  validation?: {
    isValid: boolean;
    issues: string[];
  };
}

export interface DataIntegrityReport {
  overallStatus: 'valid' | 'warnings' | 'errors';
  tickerStatuses: Map<string, DataValidationResult>;
  correlationValid: boolean;
  warnings: string[];
  errors: string[];
  timestamp: Date;
}

// Cache entry with expiry and validation metadata
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  validation?: DataValidationResult;
  fetchedAt: number;
  source: 'api';
}

// Memory cache with TTL
class DataCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  get<T>(key: string): { data: T; validation?: DataValidationResult; fetchedAt: number } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return {
      data: entry.data as T,
      validation: entry.validation,
      fetchedAt: entry.fetchedAt,
    };
  }

  set<T>(key: string, data: T, ttlMs: number, validation?: DataValidationResult): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      validation,
      fetchedAt: Date.now(),
      source: 'api',
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

// Convert internal bars to validation format
function toValidationBars(bars: OHLCVBar[]): ValidationOHLCVBar[] {
  return bars.map(b => ({
    t: b.timestamp,
    o: b.open,
    h: b.high,
    l: b.low,
    c: b.close,
    v: b.volume,
  }));
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
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [300, 600, 1200]; // Exponential backoff

  /**
   * Fetch with retry - attempts up to 3 times with exponential backoff
   */
  private async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.RETRY_DELAYS[attempt - 1];
          console.log(`[Polygon] Retry attempt ${attempt + 1}/${this.MAX_RETRIES} for ${context} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        return await fetchFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[Polygon] Attempt ${attempt + 1}/${this.MAX_RETRIES} failed for ${context}:`, lastError.message);

        // Don't retry on certain errors
        if (lastError.message.includes('403') || lastError.message.includes('401')) {
          console.error(`[Polygon] Non-retryable error for ${context}, aborting retries`);
          throw lastError;
        }
      }
    }

    console.error(`[Polygon] All ${this.MAX_RETRIES} retry attempts failed for ${context}`);
    throw lastError || new Error(`Failed to fetch ${context} after ${this.MAX_RETRIES} attempts`);
  }

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
  ): Promise<{ bars: OHLCVBar[]; source: 'cache' | 'api'; validation?: DataValidationResult }> {
    const cacheKey = `history:${ticker}:${startDate}:${endDate}:${timespan}`;

    // Check cache first
    const cached = this.cache.get<OHLCVBar[]>(cacheKey);
    if (cached) {
      console.log(`[Polygon] Cache hit for ${ticker} (fetched ${new Date(cached.fetchedAt).toLocaleTimeString()})`);
      return { bars: cached.data, source: 'cache', validation: cached.validation };
    }

    console.log(`[Polygon] API fetch for ${ticker} from ${startDate} to ${endDate}`);

    // Fetch with retry
    const results = await this.fetchWithRetry(
      () => this.fetchAggsViaBackend({ ticker, startDate, endDate, timespan }),
      ticker
    );

    const allBars: OHLCVBar[] = results.map((r) => ({
      timestamp: r.t,
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
      vwap: r.vw || r.c,
    }));

    console.log(`[Polygon] Got ${allBars.length} bars for ${ticker} from API`);

    // Forward-fill gaps
    const filledBars = forwardFillGaps(allBars);

    // Validate the data
    const validationBars = toValidationBars(filledBars);
    const validation = validateTickerData(ticker, validationBars, {
      start: new Date(startDate),
      end: new Date(endDate),
    });

    // Log validation status
    if (validation.isValid) {
      console.log(`[Polygon] ✓ ${ticker} validation passed (quality: ${validation.dataQuality})`);
    } else {
      console.warn(`[Polygon] ⚠ ${ticker} validation issues:`, validation.issues);
    }

    // Cache results with validation metadata
    this.cache.set(cacheKey, filledBars, this.CACHE_TTL, validation);

    return { bars: filledBars, source: 'api', validation };
  }

  async fetchAndCleanHistory(
    tickers: string[],
    startDate: string,
    endDate: string,
    onProgress?: (msg: string, pct: number) => void
  ): Promise<FetchHistoryResult> {
    const assetData = new Map<string, AssetData>();
    const diagnostics: TickerFetchResult[] = [];
    const tickerDataForAudit: Record<string, ValidationOHLCVBar[]> = {};

    console.log(`[Polygon] Starting fetch for ${tickers.length} tickers (${startDate} to ${endDate})`);

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const pct = (i / tickers.length) * 100;

      onProgress?.(`Fetching ${ticker}...`, pct);
      console.log(`[Polygon] Processing ${ticker} (${i + 1}/${tickers.length})`);

      try {
        const { bars, source, validation } = await this.fetchHistory(ticker, startDate, endDate);

        if (bars.length === 0) {
          console.warn(`[Polygon] No data for ${ticker}`);
          diagnostics.push({ 
            ticker, 
            success: false, 
            error: 'No data returned',
            source,
          });
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
          validation,
        });

        // Store for audit
        tickerDataForAudit[ticker] = toValidationBars(bars);

        diagnostics.push({ 
          ticker, 
          success: true, 
          bars: bars.length,
          dataQuality: validation?.dataQuality || 'high',
          validationIssues: validation?.issues || [],
          source,
        });

        const qualityIcon = validation?.dataQuality === 'high' ? '✓' : validation?.dataQuality === 'medium' ? '~' : '⚠';
        console.log(`[Polygon] ${qualityIcon} ${ticker} - ${bars.length} bars, Vol: ${(volatility * 100).toFixed(2)}%, Source: ${source}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Polygon] ✗ Failed to fetch ${ticker}:`, error);
        diagnostics.push({ ticker, success: false, error: errorMsg });
        // Continue with other tickers
      }

      // Rate limiting between tickers
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Generate data audit report
    const metrics = this.calculateAggregateMetrics(assetData);
    const dataAudit = generateDataAuditReport(tickerDataForAudit, metrics);

    // Log summary
    const successCount = diagnostics.filter(d => d.success).length;
    const cacheHits = diagnostics.filter(d => d.source === 'cache').length;
    console.log(`[Polygon] Fetch complete: ${successCount}/${tickers.length} successful, ${cacheHits} from cache`);
    console.log(`[Polygon] Data quality: ${dataAudit.overallDataQuality}, Total issues: ${dataAudit.totalIssues}`);

    onProgress?.('Data fetching complete', 100);
    return { assetData, diagnostics, dataAudit };
  }

  /**
   * Calculate aggregate metrics for audit report
   */
  private calculateAggregateMetrics(assetData: Map<string, AssetData>): {
    volatility?: number;
  } {
    if (assetData.size === 0) return {};

    // Calculate average volatility across all assets
    const volatilities = Array.from(assetData.values()).map(a => a.volatility);
    const avgVolatility = volatilities.reduce((a, b) => a + b, 0) / volatilities.length;

    return {
      volatility: avgVolatility,
    };
  }

  /**
   * Verify data integrity - runs all validation checks on fetched data
   */
  verifyDataIntegrity(assetData: Map<string, AssetData>): DataIntegrityReport {
    console.log(`[Polygon] Verifying data integrity for ${assetData.size} assets`);

    const tickerStatuses = new Map<string, DataValidationResult>();
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate each ticker's data
    for (const [ticker, data] of assetData.entries()) {
      const validationBars = toValidationBars(data.bars);
      const validation = validateTickerData(ticker, validationBars);
      tickerStatuses.set(ticker, validation);

      if (!validation.isValid) {
        if (validation.dataQuality === 'low') {
          errors.push(`${ticker}: ${validation.issues.join(', ')}`);
        } else {
          warnings.push(`${ticker}: ${validation.issues.join(', ')}`);
        }
      }

      console.log(`[Polygon] ${ticker} integrity: ${validation.isValid ? '✓' : '⚠'} (${validation.dataQuality})`);
    }

    // Validate correlation matrix if we have multiple assets
    let correlationValid = true;
    if (assetData.size > 1) {
      const corrMatrix = this.buildCorrelationMatrix(assetData);
      const corrValidation = validateCorrelationMatrix(corrMatrix.matrix, corrMatrix.tickers);
      correlationValid = corrValidation.isValid;

      if (!correlationValid) {
        warnings.push(`Correlation matrix: ${corrValidation.issues.join(', ')}`);
      }
      console.log(`[Polygon] Correlation matrix integrity: ${correlationValid ? '✓' : '⚠'}`);
    }

    // Determine overall status
    let overallStatus: 'valid' | 'warnings' | 'errors' = 'valid';
    if (errors.length > 0) {
      overallStatus = 'errors';
    } else if (warnings.length > 0) {
      overallStatus = 'warnings';
    }

    console.log(`[Polygon] Overall integrity: ${overallStatus} (${errors.length} errors, ${warnings.length} warnings)`);

    return {
      overallStatus,
      tickerStatuses,
      correlationValid,
      warnings,
      errors,
      timestamp: new Date(),
    };
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

    // Validate the correlation matrix
    const corrValidation = validateCorrelationMatrix(matrix, tickers);
    if (!corrValidation.isValid) {
      console.warn('[Polygon] Correlation matrix validation issues:', corrValidation.issues);
    } else {
      console.log('[Polygon] ✓ Correlation matrix validated');
    }

    return {
      tickers,
      matrix,
      timestamp: new Date(),
      validation: {
        isValid: corrValidation.isValid,
        issues: corrValidation.issues,
      },
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
