import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Trash2, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useOptionsAnalyzerStore } from '@/stores/optionsAnalyzerStore';
import ReactMarkdown from 'react-markdown';
import type { TradeIntent } from './OptionsAnalyzer';

interface SavedAnalysis {
  id: string;
  ticker: string;
  intent: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  title: string;
  created_at: string;
}

export function SavedAnalysesList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { setActiveTicker, setTicker, setIntent, setMessages, setHasStarted, setActiveTab } = useOptionsAnalyzerStore();

  const { data: analyses, isLoading } = useQuery({
    queryKey: ['saved-options-analyses', user?.id],
    queryFn: async (): Promise<SavedAnalysis[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('saved_options_analyses' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SavedAnalysis[];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_options_analyses' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-options-analyses'] });
      toast.success('Analysis deleted');
    },
  });

  const handleLoad = (analysis: SavedAnalysis) => {
    setTicker(analysis.ticker);
    setActiveTicker(analysis.ticker);
    setIntent(analysis.intent as TradeIntent);
    setMessages(analysis.ticker, analysis.messages);
    setHasStarted(analysis.ticker, true);
    setActiveTab('advisor');
  };

  if (!user) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <p className="text-sm">Sign in to save and view your analyses.</p>
      </Card>
    );
  }

  if (isLoading) {
    return <Card className="p-8 text-center text-muted-foreground text-sm">Loading saved analyses...</Card>;
  }

  if (!analyses?.length) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Brain className="h-8 w-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No saved analyses yet. Run an analysis and click Save to keep it here.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Saved Analyses</h3>
      <div className="grid gap-3">
        {analyses.map((a) => {
          const lastAssistant = [...a.messages].reverse().find(m => m.role === 'assistant');
          const preview = lastAssistant?.content?.slice(0, 200) || 'No analysis content';
          return (
            <Card key={a.id} className="overflow-hidden hover:border-primary/30 transition-colors">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">{a.ticker}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{a.intent}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{preview}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => handleLoad(a)}>
                      <ArrowRight className="h-3 w-3" /> Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(a.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
