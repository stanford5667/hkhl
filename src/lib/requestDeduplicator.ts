/**
 * Request Deduplicator
 * 
 * Prevents duplicate in-flight requests for the same key.
 * If a request is already in progress for a given key,
 * subsequent callers get the same promise rather than
 * triggering a new API call.
 */

type InflightRequest<T> = Promise<T>;

class RequestDeduplicator {
  private inflight = new Map<string, InflightRequest<any>>();
  
  /**
   * Execute a request with deduplication.
   * If a request with the same key is already in flight,
   * return the existing promise instead of starting a new one.
   */
  async dedupe<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check if request is already in flight
    const existing = this.inflight.get(key);
    if (existing) {
      console.log(`[Dedup] Reusing in-flight request: ${key}`);
      return existing;
    }
    
    // Create new request and track it
    const promise = requestFn().finally(() => {
      // Clean up after request completes
      this.inflight.delete(key);
    });
    
    this.inflight.set(key, promise);
    return promise;
  }
  
  /**
   * Check if a request is currently in flight
   */
  isInFlight(key: string): boolean {
    return this.inflight.has(key);
  }
  
  /**
   * Get count of in-flight requests (for debugging)
   */
  getInflightCount(): number {
    return this.inflight.size;
  }
  
  /**
   * Clear all tracked requests (for testing)
   */
  clear(): void {
    this.inflight.clear();
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Helper to create a cache key from parameters
 */
export function createCacheKey(namespace: string, ...args: (string | number | boolean | undefined | null)[]): string {
  return `${namespace}:${args.filter(a => a != null).join(':')}`;
}
