import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OptionContract {
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

export function OptionsChainSelector({ underlyingTicker, onSelect, selectedContract }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState('');
  const [contracts, setContracts] = useState<OptionContract[]>([]);
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');

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

  const filteredContracts = contracts
    .filter(c => c.contract_type === optionType)
    .sort((a, b) => a.strike_price - b.strike_price);

  if (!underlyingTicker) return null;

  return (
    <div className="space-y-3">
      {/* Expiration & Type selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Expiration</Label>
          <Select value={selectedExpiration} onValueChange={handleExpirationChange} disabled={loading || expirations.length === 0}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={loading ? 'Loading...' : 'Select expiry'} />
            </SelectTrigger>
            <SelectContent>
              {expirations.map(exp => (
                <SelectItem key={exp} value={exp} className="text-xs">{exp}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={optionType} onValueChange={v => setOptionType(v as 'call' | 'put')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call">
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-success" /> Call</span>
              </SelectItem>
              <SelectItem value="put">
                <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-destructive" /> Put</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
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

      {!loading && !error && filteredContracts.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          {/* Delayed data notice */}
          <div className="px-2 py-1 bg-muted/50 border-b border-border text-[10px] text-muted-foreground">
            📊 Live options data · 15-min delayed
          </div>
          {/* Header */}
          <div className="grid grid-cols-8 gap-1 px-2 py-1.5 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <span>Strike</span>
            <span className="text-right">Bid</span>
            <span className="text-right">Ask</span>
            <span className="text-right">Last</span>
            <span className="text-right">Vol</span>
            <span className="text-right">OI</span>
            <span className="text-right">IV</span>
            <span className="text-right">Δ</span>
          </div>

          {/* Rows */}
          <ScrollArea className="max-h-[200px]">
            {filteredContracts.map(contract => {
              const isSelected = selectedContract?.ticker === contract.ticker;
              return (
                <button
                  key={contract.ticker}
                  onClick={() => onSelect(contract)}
                  className={`w-full grid grid-cols-6 gap-1 px-2 py-1.5 text-xs font-mono hover:bg-accent/50 transition-colors border-t border-border/50 ${
                    isSelected ? 'bg-primary/10 border-primary/30' : ''
                  }`}
                >
                  <span className="font-semibold text-foreground">${contract.strike_price.toFixed(2)}</span>
                  <span className="text-right text-success">{contract.bid > 0 ? `$${contract.bid.toFixed(2)}` : '—'}</span>
                  <span className="text-right text-destructive">{contract.ask > 0 ? `$${contract.ask.toFixed(2)}` : '—'}</span>
                  <span className="text-right">{contract.last_price > 0 ? `$${contract.last_price.toFixed(2)}` : '—'}</span>
                  <span className="text-right text-muted-foreground">{contract.volume > 0 ? contract.volume.toLocaleString() : '—'}</span>
                  <span className="text-right text-muted-foreground">{contract.open_interest > 0 ? contract.open_interest.toLocaleString() : '—'}</span>
                </button>
              );
            })}
          </ScrollArea>
        </div>
      )}

      {!loading && !error && filteredContracts.length === 0 && selectedExpiration && (
        <p className="text-xs text-muted-foreground text-center py-4">No {optionType} contracts found for this expiration.</p>
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
          {selectedContract.implied_volatility != null && (
            <div className="text-[10px]">
              <span className="text-muted-foreground">IV: </span>
              <span className="font-mono">{(selectedContract.implied_volatility * 100).toFixed(1)}%</span>
              {selectedContract.delta != null && (
                <>
                  <span className="text-muted-foreground ml-2">Δ: </span>
                  <span className="font-mono">{selectedContract.delta.toFixed(3)}</span>
                </>
              )}
              {selectedContract.theta != null && (
                <>
                  <span className="text-muted-foreground ml-2">Θ: </span>
                  <span className="font-mono">{selectedContract.theta.toFixed(3)}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
