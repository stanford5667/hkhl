import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface SavedPortfolio {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  allocations: Json;
  investor_profile: Json;
  portfolio_mode: string | null;
  created_at: string;
  updated_at: string;
}

interface UseActivePortfolioReturn {
  // All saved portfolios
  portfolios: SavedPortfolio[];
  portfoliosLoading: boolean;
  
  // Active portfolio
  activePortfolioId: string | null;
  activePortfolio: SavedPortfolio | null;
  
  // Actions
  setActivePortfolio: (id: string | null) => void;
  savePortfolio: (data: { name: string; description?: string; allocations: Json; investor_profile?: Json; portfolio_mode?: string }) => Promise<SavedPortfolio>;
  updatePortfolio: (id: string, data: { name?: string; description?: string; allocations?: Json }) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  duplicatePortfolio: (id: string, newName: string) => Promise<SavedPortfolio>;
  refetch: () => void;
  
  // Mutation states
  isSaving: boolean;
  isDeleting: boolean;
}

const ACTIVE_PORTFOLIO_KEY = 'active-portfolio-id';

export function useActivePortfolio(): UseActivePortfolioReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Local state for active portfolio ID
  const [activePortfolioId, setActivePortfolioIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACTIVE_PORTFOLIO_KEY);
    }
    return null;
  });

  // Fetch all portfolios
  const { data: portfolios = [], isLoading: portfoliosLoading, refetch } = useQuery({
    queryKey: ['user-portfolios', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('saved_portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SavedPortfolio[];
    },
    enabled: !!user?.id,
  });

  // Get active portfolio from list
  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || null;

  // Set active portfolio and persist to localStorage
  const setActivePortfolio = useCallback((id: string | null) => {
    setActivePortfolioIdState(id);
    if (id) {
      localStorage.setItem(ACTIVE_PORTFOLIO_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PORTFOLIO_KEY);
    }
  }, []);

  // Clear invalid active portfolio ID when portfolios load
  useEffect(() => {
    if (!portfoliosLoading && activePortfolioId && !portfolios.find(p => p.id === activePortfolioId)) {
      // Active portfolio no longer exists, clear it
      setActivePortfolio(null);
    }
  }, [portfolios, portfoliosLoading, activePortfolioId, setActivePortfolio]);

  // Save new portfolio mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      description?: string; 
      allocations: Json; 
      investor_profile?: Json;
      portfolio_mode?: string;
    }) => {
      if (!user?.id) throw new Error('Must be logged in');
      const { data: result, error } = await supabase
        .from('saved_portfolios')
        .insert([{
          user_id: user.id,
          name: data.name,
          description: data.description || null,
          allocations: data.allocations,
          investor_profile: data.investor_profile || {},
          portfolio_mode: data.portfolio_mode || 'manual',
        }])
        .select()
        .single();
      if (error) throw error;
      return result as SavedPortfolio;
    },
    onSuccess: (newPortfolio) => {
      queryClient.invalidateQueries({ queryKey: ['user-portfolios'] });
      toast.success('Portfolio saved');
      // Automatically set as active
      setActivePortfolio(newPortfolio.id);
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Update portfolio mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; allocations?: Json }) => {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.allocations !== undefined) updateData.allocations = data.allocations;
      
      const { error } = await supabase
        .from('saved_portfolios')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-portfolios'] });
      toast.success('Portfolio updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Delete portfolio mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_portfolios')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_result, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['user-portfolios'] });
      toast.success('Portfolio deleted');
      // Clear active if deleted
      if (activePortfolioId === deletedId) {
        setActivePortfolio(null);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Duplicate portfolio
  const duplicatePortfolio = useCallback(async (id: string, newName: string) => {
    const source = portfolios.find(p => p.id === id);
    if (!source) throw new Error('Portfolio not found');
    return saveMutation.mutateAsync({
      name: newName,
      description: source.description || undefined,
      allocations: source.allocations,
      investor_profile: source.investor_profile,
      portfolio_mode: source.portfolio_mode || undefined,
    });
  }, [portfolios, saveMutation]);

  return {
    portfolios,
    portfoliosLoading,
    activePortfolioId,
    activePortfolio,
    setActivePortfolio,
    savePortfolio: saveMutation.mutateAsync,
    updatePortfolio: (id, data) => updateMutation.mutateAsync({ id, ...data }),
    deletePortfolio: async (id) => { await deleteMutation.mutateAsync(id); },
    duplicatePortfolio,
    refetch,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
