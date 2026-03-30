import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResearchNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  ticker: string | null;
  theme_id: string | null;
  category: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useResearchNotes() {
  return useQuery({
    queryKey: ['research-notes'],
    queryFn: async (): Promise<ResearchNote[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('research_notes' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) { console.error(error); return []; }
      return (data || []) as unknown as ResearchNote[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: { title: string; content?: string; ticker?: string; theme_id?: string; category?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('research_notes' as any)
        .insert({ user_id: user.id, ...note })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['research-notes'] }); toast.success('Note created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; content?: string; is_pinned?: boolean; category?: string }) => {
      const { error } = await supabase.from('research_notes' as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['research-notes'] }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('research_notes' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['research-notes'] }); toast.success('Note deleted'); },
  });
}
