// Position Management Hook
// Re-exports cached version for backward compatibility
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCachedPositions } from './useCachedPositions';
import type { SyncedPosition, BrokerageConnection, PositionFormData } from '@/types/positions';

/**
 * @deprecated Use useCachedPositions for better performance
 * This wrapper maintains backward compatibility
 */
export function usePositions(portfolioId?: string) {
  // Delegate to cached version for automatic deduplication
  return useCachedPositions({ portfolioId });
}

export function useBrokerageConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<BrokerageConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!user?.id) {
      setConnections([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('brokerage_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setConnections((data || []) as BrokerageConnection[]);
    } catch (err) {
      console.error('Error fetching connections:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const addConnection = async (brokerageName: string, accountName?: string) => {
    if (!user?.id) throw new Error('Not authenticated');
    
    const connection = {
      user_id: user.id,
      brokerage_name: brokerageName,
      account_name: accountName || null,
      connection_status: 'pending' as const,
    };

    const { data, error } = await supabase
      .from('brokerage_connections')
      .insert(connection)
      .select()
      .single();
    
    if (error) throw error;
    
    setConnections(prev => [data as BrokerageConnection, ...prev]);
    return data as BrokerageConnection;
  };

  const updateConnection = async (id: string, updates: Partial<Omit<BrokerageConnection, 'metadata'>>) => {
    if (!user?.id) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('brokerage_connections')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    setConnections(prev => prev.map(c => c.id === id ? data as BrokerageConnection : c));
    return data as BrokerageConnection;
  };

  const deleteConnection = async (id: string) => {
    if (!user?.id) throw new Error('Not authenticated');
    
    const { error } = await supabase
      .from('brokerage_connections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  return {
    connections,
    isLoading,
    refetch: fetchConnections,
    addConnection,
    updateConnection,
    deleteConnection,
  };
}
