import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedQuotes } from '@/services/quoteCacheService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Plus, X, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

interface WatchlistItem {
  id: string;
  ticker: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

interface Props {
  onSelectTicker: (ticker: string) => void;
}

export function SimWatchlist({ onSelectTicker }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('sim_watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: true });

    if (!data || data.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const tickers = data.map(d => d.ticker.toUpperCase());
    let quotes = new Map<string, any>();
    try {
      quotes = await getCachedQuotes(tickers);
    } catch (_) {}

    setItems(data.map(d => {
      const q = quotes.get(d.ticker.toUpperCase());
      return {
        id: d.id,
        ticker: d.ticker,
        price: q?.price || undefined,
        change: q?.change || undefined,
        changePercent: q?.changePercent || undefined,
      };
    }));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const addTicker = async () => {
    const symbol = newTicker.trim().toUpperCase();
    if (!symbol || !user) return;
    if (items.some(i => i.ticker.toUpperCase() === symbol)) {
      toast.error('Already in watchlist');
      return;
    }

    const { error } = await supabase.from('sim_watchlist').insert({ user_id: user.id, ticker: symbol });
    if (error) {
      toast.error('Failed to add ticker');
    } else {
      setNewTicker('');
      fetchWatchlist();
    }
  };

  const removeTicker = async (id: string) => {
    await supabase.from('sim_watchlist').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="w-4 h-4" /> Watchlist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-1">
          <Input
            value={newTicker}
            onChange={e => setNewTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && addTicker()}
            placeholder="Add ticker"
            className="h-8 text-xs"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={addTicker} disabled={!newTicker.trim()}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Add tickers to watch</p>
        ) : (
          <div className="space-y-0.5">
            {items.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/50 cursor-pointer transition-colors group"
                onClick={() => onSelectTicker(item.ticker)}
              >
                <span className="font-medium text-sm text-foreground">{item.ticker}</span>
                <div className="flex items-center gap-2">
                  {item.price ? (
                    <div className="text-right">
                      <span className="text-xs font-mono text-foreground">${item.price.toFixed(2)}</span>
                      {item.changePercent != null && (
                        <span className={`ml-1 text-xs ${item.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={e => { e.stopPropagation(); removeTicker(item.id); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
