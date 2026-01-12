/**
 * useCachedPositions
 * 
 * Centralized positions hook using React Query for:
 * - Automatic deduplication of requests
 * - Cross-component cache sharing
 * - Optimistic updates
 * - Reduced API calls
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { SyncedPosition, PositionFormData } from '@/types/positions';

// Query key factory for consistent cache keys
export const positionKeys = {
  all: ['positions'] as const,
  byUser: (userId: string) => [...positionKeys.all, 'user', userId] as const,
  byPortfolio: (userId: string, portfolioId: string | null) => 
    [...positionKeys.byUser(userId), 'portfolio', portfolioId] as const,
};

interface UseCachedPositionsOptions {
  portfolioId?: string | null;
  enabled?: boolean;
}

/**
 * Hook for fetching and managing positions with React Query caching
 * This replaces the old usePositions hook and provides:
 * - Automatic deduplication (same query = same request)
 * - 5 minute stale time to reduce unnecessary refetches
 * - Cross-component cache sharing
 */
export function useCachedPositions(options: UseCachedPositionsOptions = {}) {
  const { portfolioId, enabled = true } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const queryKey = portfolioId 
    ? positionKeys.byPortfolio(user?.id || '', portfolioId)
    : positionKeys.byUser(user?.id || '');

  // Fetch positions with React Query - automatically deduplicated
  const { data: positions = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('synced_positions')
        .select('*')
        .eq('user_id', user.id)
        .order('symbol', { ascending: true });
      
      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      return (data || []) as SyncedPosition[];
    },
    enabled: enabled && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - positions don't change frequently
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 min
  });

  // Add position mutation
  const addMutation = useMutation({
    mutationFn: async ({ data, source = 'manual' }: { data: PositionFormData; source?: 'manual' | 'csv' }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const costBasis = data.cost_basis ?? 
        (data.cost_per_share && data.quantity ? data.cost_per_share * data.quantity : null);
      
      const position = {
        user_id: user.id,
        portfolio_id: portfolioId || null,
        symbol: data.symbol.toUpperCase(),
        name: data.name || null,
        quantity: data.quantity,
        cost_basis: costBasis,
        cost_per_share: data.cost_per_share || null,
        asset_type: data.asset_type || 'stock',
        purchase_date: data.purchase_date || new Date().toISOString().split('T')[0],
        source,
      };

      const { data: inserted, error } = await supabase
        .from('synced_positions')
        .insert(position)
        .select()
        .single();
      
      if (error) throw error;
      return inserted as SyncedPosition;
    },
    onSuccess: (newPosition) => {
      // Optimistic update - add to cache immediately
      queryClient.setQueryData<SyncedPosition[]>(queryKey, (old = []) => [...old, newPosition]);
    },
  });

  // Update position mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PositionFormData> }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data: updated, error } = await supabase
        .from('synced_positions')
        .update({
          ...data,
          symbol: data.symbol?.toUpperCase(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return updated as SyncedPosition;
    },
    onSuccess: (updatedPosition) => {
      queryClient.setQueryData<SyncedPosition[]>(queryKey, (old = []) => 
        old.map(p => p.id === updatedPosition.id ? updatedPosition : p)
      );
    },
  });

  // Delete position mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('synced_positions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<SyncedPosition[]>(queryKey, (old = []) => 
        old.filter(p => p.id !== deletedId)
      );
    },
  });

  // Bulk import mutation
  const importMutation = useMutation({
    mutationFn: async (positionsData: PositionFormData[]) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const toInsert = positionsData.map(data => ({
        user_id: user.id,
        portfolio_id: portfolioId || null,
        symbol: data.symbol.toUpperCase(),
        name: data.name || null,
        quantity: data.quantity,
        cost_basis: data.cost_basis ?? 
          (data.cost_per_share && data.quantity ? data.cost_per_share * data.quantity : null),
        cost_per_share: data.cost_per_share || null,
        asset_type: data.asset_type || 'stock',
        purchase_date: data.purchase_date || new Date().toISOString().split('T')[0],
        source: 'csv' as const,
      }));

      const { data: inserted, error } = await supabase
        .from('synced_positions')
        .insert(toInsert)
        .select();
      
      if (error) throw error;
      return inserted as SyncedPosition[];
    },
    onSuccess: (newPositions) => {
      queryClient.setQueryData<SyncedPosition[]>(queryKey, (old = []) => 
        [...old, ...newPositions]
      );
    },
  });

  // Convenience wrappers
  const addPosition = useCallback(
    (data: PositionFormData, source: 'manual' | 'csv' = 'manual') => 
      addMutation.mutateAsync({ data, source }),
    [addMutation]
  );

  const updatePosition = useCallback(
    (id: string, data: Partial<PositionFormData>) => 
      updateMutation.mutateAsync({ id, data }),
    [updateMutation]
  );

  const deletePosition = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation]
  );

  const importPositions = useCallback(
    (positionsData: PositionFormData[]) => importMutation.mutateAsync(positionsData),
    [importMutation]
  );

  // Invalidate all position caches
  const invalidatePositions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: positionKeys.all });
  }, [queryClient]);

  return {
    positions,
    isLoading,
    error: error?.message || null,
    refetch,
    addPosition,
    updatePosition,
    deletePosition,
    importPositions,
    invalidatePositions,
    // Expose mutation states for loading indicators
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isImporting: importMutation.isPending,
  };
}

/**
 * Prefetch positions for a portfolio - useful for route prefetching
 */
export function usePrefetchPositions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useCallback(
    async (portfolioId?: string) => {
      if (!user?.id) return;
      
      const queryKey = portfolioId 
        ? positionKeys.byPortfolio(user.id, portfolioId)
        : positionKeys.byUser(user.id);

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          let query = supabase
            .from('synced_positions')
            .select('*')
            .eq('user_id', user.id)
            .order('symbol', { ascending: true });
          
          if (portfolioId) {
            query = query.eq('portfolio_id', portfolioId);
          }
          
          const { data } = await query;
          return (data || []) as SyncedPosition[];
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient, user?.id]
  );
}
