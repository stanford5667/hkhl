import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MarketTheme } from '@/data/marketThemes';
import type { ThemeTicker } from '@/hooks/useInvestmentHeatmap';

export interface SavedReport {
  id: string;
  user_id: string;
  theme_id: string;
  theme_title: string;
  theme_category: string | null;
  theme_data: any;
  tickers_data: any;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSavedReports() {
  return useQuery({
    queryKey: ['saved-theme-reports'],
    queryFn: async (): Promise<SavedReport[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('saved_theme_reports' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved reports:', error);
        return [];
      }
      return (data || []) as unknown as SavedReport[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useSaveReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ theme, tickers }: { theme: MarketTheme; tickers: ThemeTicker[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to save reports');

      const { icon, ...themeData } = theme as any;

      const { data, error } = await supabase
        .from('saved_theme_reports' as any)
        .insert({
          user_id: user.id,
          theme_id: theme.id,
          theme_title: theme.title,
          theme_category: theme.category,
          theme_data: themeData,
          tickers_data: tickers,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-theme-reports'] });
      toast({ title: 'Report saved', description: 'You can access it from your saved reports.' });
    },
    onError: (err) => {
      toast({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSavedReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('saved_theme_reports' as any)
        .delete()
        .eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-theme-reports'] });
      toast({ title: 'Report removed' });
    },
  });
}

export function useIsReportSaved(themeId: string | undefined) {
  const { data: reports } = useSavedReports();
  if (!themeId || !reports) return false;
  return reports.some(r => r.theme_id === themeId);
}
