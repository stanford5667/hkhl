// Position Management Hook
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { SyncedPosition, BrokerageConnection, PositionFormData } from '@/types/positions';

export function usePositions(portfolioId?: string) {
  const { user } = useAuth();
  const [positions, setPositions] = useState<SyncedPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
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
      
      setPositions((data || []) as SyncedPosition[]);
    } catch (err) {
      console.error('Error fetching positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, portfolioId]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const addPosition = async (data: PositionFormData, source: 'manual' | 'csv' = 'manual') => {
    if (!user?.id) throw new Error('Not authenticated');
    
    const costBasis = data.cost_basis ?? (data.cost_per_share && data.quantity ? data.cost_per_share * data.quantity : null);
    
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
    
    setPositions(prev => [...prev, inserted as SyncedPosition]);
    return inserted as SyncedPosition;
  };

  const updatePosition = async (id: string, data: Partial<PositionFormData>) => {
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
    
    setPositions(prev => prev.map(p => p.id === id ? updated as SyncedPosition : p));
    return updated as SyncedPosition;
  };

  const deletePosition = async (id: string) => {
    if (!user?.id) throw new Error('Not authenticated');
    
    const { error } = await supabase
      .from('synced_positions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    setPositions(prev => prev.filter(p => p.id !== id));
  };

  const importPositions = async (positionsData: PositionFormData[]) => {
    if (!user?.id) throw new Error('Not authenticated');
    
    const toInsert = positionsData.map(data => ({
      user_id: user.id,
      portfolio_id: portfolioId || null,
      symbol: data.symbol.toUpperCase(),
      name: data.name || null,
      quantity: data.quantity,
      cost_basis: data.cost_basis ?? (data.cost_per_share && data.quantity ? data.cost_per_share * data.quantity : null),
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
    
    setPositions(prev => [...prev, ...(inserted as SyncedPosition[])]);
    return inserted as SyncedPosition[];
  };

  return {
    positions,
    isLoading,
    error,
    refetch: fetchPositions,
    addPosition,
    updatePosition,
    deletePosition,
    importPositions,
  };
}

export function useBrokerageConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<BrokerageConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;
    
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
