import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface OptionContract {
  ticker: string;
  strike_price: number;
  contract_type: 'call' | 'put';
  expiration_date: string;
  shares_per_contract: number;
  bid: number;
  ask: number;
  mid: number;
  last_price: number;
  volume: number;
  open_interest: number;
  implied_volatility: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  change: number;
  change_percent: number;
}

interface Props {
  underlyingTicker: string;
  onSelect: (contract: OptionContract) => void;
  selectedContract: OptionContract | null;
}

type ViewMode = 'all' | 'calls' | 'puts';

export function OptionsChainSelector({ underlyingTicker, onSelect, selectedContract }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState('');
  const [contracts, setContracts] = useState<OptionContract[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [deltaRange, setDeltaRange] = useState<[number, number]>([0, 100]);
  const [stockPrice, setStockPrice] = useState(0);

  const fetchChain = useCallback(async (expDate?: string) => {
    if (!underlyingTicker) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('yahoo-options-chain', {
        body: { ticker: underlyingTicker, expirationDate: expDate || undefined },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.ok) throw new Error(data?.error || 'Failed to fetch options chain');

      setExpirations(data.expirations || []);
      setContracts(data.contracts || []);
      setStockPrice(data.stockPrice || 0);
      if (data.selectedExpiration && !expDate) {
        setSelectedExpiration(data.selectedExpiration);
      }
    } catch (e: any) {
      console.error('Options chain fetch error:', e);
      setError(e.message || 'Failed to load options chain');
    } finally {
      setLoading(false);
    }
  }, [underlyingTicker]);

  useEffect(() => {
    if (underlyingTicker) {
      setContracts([]);
      setExpirations([]);
      setSelectedExpiration('');
      fetchChain();
    }
  }, [underlyingTicker, fetchChain]);

  const handleExpirationChange = (exp: string) => {
    setSelectedExpiration(exp);
    fetchChain(exp);
  };

  // Build strike-keyed chain: { strike -> { call, put } }
  const chainData = useMemo(() => {
    const map = new Map<number, { call?: OptionContract; put?: OptionContract }>();
    for (const c of contracts) {
      const entry = map.get(c.strike_price) || {};
      if (c.contract_type === 'call') entry.call = c;
      else entry.put = c;
      map.set(c.strike_price, entry);
    }

    // Filter by delta range
    const minDelta = deltaRange[0] / 100;
    const maxDelta = deltaRange[1] / 100;

    const filtered = new Map<number, { call?: OptionContract; put?: OptionContract }>();
    for (const [strike, entry] of map) {
      const callDelta = Math.abs(entry.call?.delta ?? 0);
      const putDelta = Math.abs(entry.put?.delta ?? 0);
      const matchesCall = callDelta >= minDelta && callDelta <= maxDelta;
      const matchesPut = putDelta >= minDelta && putDelta <= maxDelta;

      if (viewMode === 'calls' && matchesCall) {
        filtered.set(strike, entry);
      } else if (viewMode === 'puts' && matchesPut) {
        filtered.set(strike, entry);
      } else if (viewMode === 'all' && (matchesCall || matchesPut)) {
        filtered.set(strike, entry);
      }
    }

    return Array.from(filtered.entries()).sort((a, b) => a[0] - b[0]);
  }, [contracts, deltaRange, viewMode]);

  if (!underlyingTicker) return null;

  const showCalls = viewMode === 'all' || viewMode === 'calls';
  const showPuts = viewMode === 'all' || viewMode === 'puts';

  return (
    <div className="space-y-3">
      {/* Controls row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Expiration</Label>
          <Select value={selectedExpiration} onValueChange={handleExpirationChange} disabled={loading || expirations.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={loading ? 'Loading...' : 'Select expiry'} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {expirations.map(exp => (
                <SelectItem key={exp} value={exp} className="text-xs">{exp}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">View</Label>
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)} className="w-full">
            <TabsList className="h-8 w-full grid grid-cols-3">
              <TabsTrigger value="all" className="text-[10px] px-1">All</TabsTrigger>
              <TabsTrigger value="calls" className="text-[10px] px-1">
                <TrendingUp className="w-3 h-3 mr-0.5 text-success" />Calls
              </TabsTrigger>
              <TabsTrigger value="puts" className="text-[10px] px-1">
                <TrendingDown className="w-3 h-3 mr-0.5 text-destructive" />Puts
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Delta filter */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Delta range: |{(deltaRange[0] / 100).toFixed(2)}| – |{(deltaRange[1] / 100).toFixed(2)}|</span>
          <button 
            onClick={() => setDeltaRange([0, 100])} 
            className="text-primary hover:underline"
          >
            Reset
          </button>
        </div>
        <Slider
          min={0}
          max={100}
          step={5}
          value={deltaRange}
          onValueChange={(v) => setDeltaRange(v as [number, number])}
          className="w-full"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading options chain...
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && chainData.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="px-2 py-1 bg-muted/50 border-b border-border flex justify-between text-[10px] text-muted-foreground">
            <span>📊 Live via Tradier · {underlyingTicker} @ ${stockPrice.toFixed(2)}</span>
            <span>{chainData.length} strikes</span>
          </div>

          {/* Spread header */}
          <div className={`grid gap-0 px-0 py-1 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border ${
            viewMode === 'all' ? 'grid-cols-[1fr_auto_1fr]' : ''
          }`}>
            {showCalls && (
              <div className={`grid ${viewMode === 'all' ? 'grid-cols-5' : 'grid-cols-7'} gap-0.5 px-1.5`}>
                {viewMode !== 'all' && <span>Strike</span>}
                <span className="text-right">Δ</span>
                <span className="text-right">IV</span>
                <span className="text-right">Bid</span>
                <span className="text-right">Ask</span>
                <span className="text-right">Vol</span>
                {viewMode !== 'all' && <span className="text-right">OI</span>}
              </div>
            )}
            {viewMode === 'all' && (
              <div className="text-center font-bold text-foreground px-1">Strike</div>
            )}
            {showPuts && (
              <div className={`grid ${viewMode === 'all' ? 'grid-cols-5' : 'grid-cols-7'} gap-0.5 px-1.5`}>
                {viewMode !== 'all' && <span>Strike</span>}
                <span className="text-right">Bid</span>
                <span className="text-right">Ask</span>
                <span className="text-right">IV</span>
                <span className="text-right">Δ</span>
                <span className="text-right">Vol</span>
                {viewMode !== 'all' && <span className="text-right">OI</span>}
              </div>
            )}
          </div>

          {/* Rows */}
          <ScrollArea className="max-h-[400px]">
            {chainData.map(([strike, { call, put }]) => {
              const isATM = stockPrice > 0 && Math.abs(strike - stockPrice) / stockPrice < 0.01;
              const isITMCall = call && strike < stockPrice;
              const isITMPut = put && strike > stockPrice;

              return (
                <div
                  key={strike}
                  className={`grid gap-0 border-t border-border/30 text-xs font-mono ${
                    isATM ? 'bg-primary/5 border-primary/30' : ''
                  } ${viewMode === 'all' ? 'grid-cols-[1fr_auto_1fr]' : ''}`}
                >
                  {/* Calls side */}
                  {showCalls && (
                    <button
                      onClick={() => call && onSelect(call)}
                      disabled={!call}
                      className={`grid ${viewMode === 'all' ? 'grid-cols-5' : 'grid-cols-7'} gap-0.5 px-1.5 py-1 text-right hover:bg-success/10 transition-colors ${
                        selectedContract?.ticker === call?.ticker ? 'bg-success/15' : ''
                      } ${isITMCall ? 'bg-success/5' : ''}`}
                    >
                      {viewMode !== 'all' && (
                        <span className="text-left font-semibold text-foreground">${strike.toFixed(2)}</span>
                      )}
                      <span className="text-muted-foreground">{call?.delta != null ? call.delta.toFixed(2) : '—'}</span>
                      <span className="text-muted-foreground">{call?.implied_volatility != null ? `${(call.implied_volatility * 100).toFixed(0)}%` : '—'}</span>
                      <span className="text-success">{call?.bid ? `$${call.bid.toFixed(2)}` : '—'}</span>
                      <span className="text-destructive">{call?.ask ? `$${call.ask.toFixed(2)}` : '—'}</span>
                      <span className="text-muted-foreground">{call?.volume ? call.volume.toLocaleString() : '—'}</span>
                      {viewMode !== 'all' && (
                        <span className="text-muted-foreground">{call?.open_interest ? call.open_interest.toLocaleString() : '—'}</span>
                      )}
                    </button>
                  )}

                  {/* Strike column (center) */}
                  {viewMode === 'all' && (
                    <div className={`flex items-center justify-center px-1 text-[11px] font-bold min-w-[60px] ${
                      isATM ? 'text-primary' : 'text-foreground'
                    }`}>
                      ${strike.toFixed(0)}
                    </div>
                  )}

                  {/* Puts side */}
                  {showPuts && (
                    <button
                      onClick={() => put && onSelect(put)}
                      disabled={!put}
                      className={`grid ${viewMode === 'all' ? 'grid-cols-5' : 'grid-cols-7'} gap-0.5 px-1.5 py-1 text-right hover:bg-destructive/10 transition-colors ${
                        selectedContract?.ticker === put?.ticker ? 'bg-destructive/15' : ''
                      } ${isITMPut ? 'bg-destructive/5' : ''}`}
                    >
                      {viewMode !== 'all' && (
                        <span className="text-left font-semibold text-foreground">${strike.toFixed(2)}</span>
                      )}
                      <span className="text-success">{put?.bid ? `$${put.bid.toFixed(2)}` : '—'}</span>
                      <span className="text-destructive">{put?.ask ? `$${put.ask.toFixed(2)}` : '—'}</span>
                      <span className="text-muted-foreground">{put?.implied_volatility != null ? `${(put.implied_volatility * 100).toFixed(0)}%` : '—'}</span>
                      <span className="text-muted-foreground">{put?.delta != null ? put.delta.toFixed(2) : '—'}</span>
                      <span className="text-muted-foreground">{put?.volume ? put.volume.toLocaleString() : '—'}</span>
                      {viewMode !== 'all' && (
                        <span className="text-muted-foreground">{put?.open_interest ? put.open_interest.toLocaleString() : '—'}</span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </ScrollArea>
        </div>
      )}

      {!loading && !error && chainData.length === 0 && selectedExpiration && (
        <p className="text-xs text-muted-foreground text-center py-4">No contracts match current filters.</p>
      )}

      {/* Selected contract details */}
      {selectedContract && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Selected</span>
            <span className="font-semibold">
              {underlyingTicker} ${selectedContract.strike_price} {selectedContract.contract_type.toUpperCase()} {selectedContract.expiration_date}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <span className="text-muted-foreground">Bid: </span>
              <span className="font-mono text-success">${selectedContract.bid.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ask: </span>
              <span className="font-mono text-destructive">${selectedContract.ask.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Mid: </span>
              <span className="font-mono">${selectedContract.mid.toFixed(2)}</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div>
              <span className="text-muted-foreground">IV: </span>
              <span className="font-mono">{selectedContract.implied_volatility != null ? `${(selectedContract.implied_volatility * 100).toFixed(1)}%` : '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Δ: </span>
              <span className="font-mono">{selectedContract.delta?.toFixed(3) ?? '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Γ: </span>
              <span className="font-mono">{selectedContract.gamma?.toFixed(4) ?? '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Θ: </span>
              <span className="font-mono">{selectedContract.theta?.toFixed(3) ?? '—'}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <span className="text-muted-foreground">Vol: </span>
              <span className="font-mono">{selectedContract.volume.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">OI: </span>
              <span className="font-mono">{selectedContract.open_interest.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Vega: </span>
              <span className="font-mono">{selectedContract.vega?.toFixed(3) ?? '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
