import { supabase } from '@/integrations/supabase/client';
import { CACHE_TTL } from '@/config/cacheConfig';

export interface CacheEntry<T> {
  data: T;
  fetchedAt: string;
  expiresAt: string;
  isStale: boolean;
}

interface CacheOptions {
  ttl?: number;
  forceRefresh?: boolean;
  entityType?: string;
  entityId?: string;
  userId?: string;
}

class CacheService {
  /**
   * Get data from cache or fetch if expired/missing
   */
  async getOrFetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<CacheEntry<T>> {
    const { ttl = CACHE_TTL.PERPLEXITY_COMPANY_NEWS, forceRefresh = false } = options;
    
    // Skip cache if force refresh
    if (!forceRefresh) {
      const cached = await this.get<T>(cacheKey);
      if (cached && !cached.isStale) {
        console.log(`[Cache] HIT: ${cacheKey}`);
        return cached;
      }
      console.log(`[Cache] ${cached ? 'STALE' : 'MISS'}: ${cacheKey}`);
    } else {
      console.log(`[Cache] FORCE REFRESH: ${cacheKey}`);
    }
    
    // Fetch fresh data
    const data = await fetchFn();
    
    // Store in cache
    await this.set(cacheKey, data, { ...options, ttl });
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);
    
    return {
      data,
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isStale: false
    };
  }
  
  /**
   * Get cached data
   */
  async get<T>(cacheKey: string): Promise<CacheEntry<T> | null> {
    const { data, error } = await supabase
      .from('cached_api_data')
      .select('data, fetched_at, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();
    
    if (error || !data) return null;
    
    const now = new Date();
    const expiresAt = new Date(data.expires_at as string);
    const isStale = now > expiresAt;
    
    return {
      data: data.data as T,
      fetchedAt: data.fetched_at as string,
      expiresAt: data.expires_at as string,
      isStale
    };
  }
  
  /**
   * Set cache data
   */
  async set<T>(
    cacheKey: string, 
    data: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    const { ttl = CACHE_TTL.PERPLEXITY_COMPANY_NEWS, entityType, entityId, userId } = options;
    
    if (!userId) {
      console.error('[Cache] Cannot set cache without userId');
      return;
    }
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);
    
    const { error } = await supabase
      .from('cached_api_data')
      .upsert({
        cache_key: cacheKey,
        cache_type: cacheKey.split(':')[0],
        entity_type: entityType,
        entity_id: entityId,
        data: data as any,
        fetched_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
        user_id: userId
      }, {
        onConflict: 'cache_key'
      });
    
    if (error) {
      console.error('[Cache] Failed to set:', error);
    }
  }
  
  /**
   * Invalidate cache entry
   */
  async invalidate(cacheKey: string): Promise<void> {
    await supabase
      .from('cached_api_data')
      .delete()
      .eq('cache_key', cacheKey);
  }
  
  /**
   * Invalidate all cache for an entity
   */
  async invalidateEntity(entityType: string, entityId: string): Promise<void> {
    await supabase
      .from('cached_api_data')
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);
  }
  
  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<number> {
    const { data, error } = await supabase
      .from('cached_api_data')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');
    
    if (error) {
      console.error('[Cache] Cleanup failed:', error);
      return 0;
    }
    
    return data?.length || 0;
  }
}

export const cacheService = new CacheService();
