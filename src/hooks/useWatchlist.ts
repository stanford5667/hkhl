import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type WatchlistItemType = 'stock' | 'indicator' | 'commodity' | 'company';

export interface WatchlistItem {
  id: string;
  user_id: string;
  item_type: WatchlistItemType;
  item_id: string;
  item_name: string;
  added_at: string;
  notes: string | null;
}

export function useWatchlist(itemType?: WatchlistItemType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: watchlist = [], isLoading, error } = useQuery({
    queryKey: ['watchlist', user?.id, itemType],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('user_watchlist')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });
      
      if (itemType) {
        query = query.eq('item_type', itemType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as WatchlistItem[];
    },
    enabled: !!user?.id,
  });

  const addToWatchlist = useMutation({
    mutationFn: async ({ 
      itemType, 
      itemId, 
      itemName, 
      notes 
    }: { 
      itemType: WatchlistItemType; 
      itemId: string; 
      itemName: string; 
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('user_watchlist')
        .insert({
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
          item_name: itemName,
          notes: notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', user?.id] });
      
      const previousWatchlist = queryClient.getQueryData(['watchlist', user?.id, itemType]);
      
      const optimisticItem: WatchlistItem = {
        id: `temp-${Date.now()}`,
        user_id: user?.id || '',
        item_type: newItem.itemType,
        item_id: newItem.itemId,
        item_name: newItem.itemName,
        added_at: new Date().toISOString(),
        notes: newItem.notes || null,
      };
      
      queryClient.setQueryData(['watchlist', user?.id, itemType], (old: WatchlistItem[] = []) => [
        optimisticItem,
        ...old,
      ]);
      
      return { previousWatchlist };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['watchlist', user?.id, itemType], context?.previousWatchlist);
      toast.error('Failed to add to watchlist');
    },
    onSuccess: () => {
      toast.success('Added to watchlist');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] });
    },
  });

  const removeFromWatchlist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_watchlist')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist', user?.id] });
      
      const previousWatchlist = queryClient.getQueryData(['watchlist', user?.id, itemType]);
      
      queryClient.setQueryData(['watchlist', user?.id, itemType], (old: WatchlistItem[] = []) =>
        old.filter((item) => item.id !== id)
      );
      
      return { previousWatchlist };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['watchlist', user?.id, itemType], context?.previousWatchlist);
      toast.error('Failed to remove from watchlist');
    },
    onSuccess: () => {
      toast.success('Removed from watchlist');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] });
    },
  });

  const toggleWatchlist = useMutation({
    mutationFn: async ({ 
      itemType, 
      itemId, 
      itemName 
    }: { 
      itemType: WatchlistItemType; 
      itemId: string; 
      itemName: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Check if already in watchlist
      const existing = watchlist.find(
        (item) => item.item_type === itemType && item.item_id === itemId
      );
      
      if (existing) {
        await supabase.from('user_watchlist').delete().eq('id', existing.id);
        return { action: 'removed' as const, item: existing };
      } else {
        const { data, error } = await supabase
          .from('user_watchlist')
          .insert({
            user_id: user.id,
            item_type: itemType,
            item_id: itemId,
            item_name: itemName,
          })
          .select()
          .single();
        
        if (error) throw error;
        return { action: 'added' as const, item: data };
      }
    },
    onSuccess: (result) => {
      toast.success(result.action === 'added' ? 'Added to watchlist' : 'Removed from watchlist');
      queryClient.invalidateQueries({ queryKey: ['watchlist', user?.id] });
    },
    onError: () => {
      toast.error('Failed to update watchlist');
    },
  });

  const isInWatchlist = (itemType: WatchlistItemType, itemId: string): boolean => {
    return watchlist.some((item) => item.item_type === itemType && item.item_id === itemId);
  };

  const getWatchlistItem = (itemType: WatchlistItemType, itemId: string): WatchlistItem | undefined => {
    return watchlist.find((item) => item.item_type === itemType && item.item_id === itemId);
  };

  return {
    watchlist,
    isLoading,
    error,
    addToWatchlist: addToWatchlist.mutate,
    removeFromWatchlist: removeFromWatchlist.mutate,
    toggleWatchlist: toggleWatchlist.mutate,
    isInWatchlist,
    getWatchlistItem,
    isAdding: addToWatchlist.isPending,
    isRemoving: removeFromWatchlist.isPending,
    isToggling: toggleWatchlist.isPending,
  };
}
