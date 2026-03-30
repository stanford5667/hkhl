import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

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

function fmtPrice(v: number | undefined | null): string {
  if (v == null || v === 0) return '—';
  return v.toFixed(2);
}

function fmtVol(v: number | undefined | null): string {
  if (v == null || v === 0) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toString();
}

function fmtIV(v: number | undefined | null): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(0)}%`;
}

function fmtDelta(v: number | undefined | null): string {
  if (v == null) return '—';
  return v.toFixed(2);
}

export function OptionsChainSelector({ underlyingTicker, onSelect, selectedContract }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState('');
  const [contracts, setContracts] = useState<OptionContract[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [stockPrice, setStockPrice] = useState(0);
  const [nearMoney, setNearMoney] = useState(true);
  const atmRef = useRef<HTMLTableRowElement>(null);

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

  // Auto-scroll to ATM after data loads
  useEffect(() => {
    if (atmRef.current) {
      setTimeout(() => {
        atmRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 100);
    }
  }, [contracts, selectedExpiration]);

  const handleExpirationChange = (exp: string) => {
    setSelectedExpiration(exp);
    fetchChain(exp);
  };

  // Build strike-keyed chain
  const chainData = useMemo(() => {
    const map = new Map<number, { call?: OptionContract; put?: OptionContract }>();
    for (const c of contracts) {
      const entry = map.get(c.strike_price) || {};
      if (c.contract_type === 'call') entry.call = c;
      else entry.put = c;
      map.set(c.strike_price, entry);
    }

    let entries = Array.from(map.entries()).sort((a, b) => a[0] - b[0]);

    // Near-the-money filter: show ±15 strikes around ATM
    if (nearMoney && stockPrice > 0) {
      const atmIdx = entries.reduce((closest, [strike], idx) => {
        return Math.abs(strike - stockPrice) < Math.abs(entries[closest][0] - stockPrice) ? idx : closest;
      }, 0);
      const start = Math.max(0, atmIdx - 15);
      const end = Math.min(entries.length, atmIdx + 16);
      entries = entries.slice(start, end);
    }

    return entries;
  }, [contracts, nearMoney, stockPrice]);

  // Days to expiration for display
  const dte = useMemo(() => {
    if (!selectedExpiration) return null;
    const diff = (new Date(selectedExpiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diff));
  }, [selectedExpiration]);

  if (!underlyingTicker) return null;

  const showCalls = viewMode === 'all' || viewMode === 'calls';
  const showPuts = viewMode === 'all' || viewMode === 'puts';

  // Column definitions per side — TOS style: Last, Bid, Ask, Vol, OI, IV, Delta
  const callCols = ['Last', 'Bid', 'Ask', 'Vol', 'OI', 'IV', 'Δ'];
  const putCols = ['Δ', 'IV', 'OI', 'Vol', 'Bid', 'Ask', 'Last'];

  function renderCallCells(c: OptionContract | undefined, isITM: boolean, isSelected: boolean) {
    const bg = isSelected ? 'bg-primary/20' : isITM ? 'bg-success/[0.06]' : '';
    const cls = `px-1.5 py-1 text-right whitespace-nowrap cursor-pointer ${bg}`;
    return (
      <>
        <td className={`${cls} text-foreground`}>{fmtPrice(c?.last_price)}</td>
        <td className={`${cls} text-success`}>{fmtPrice(c?.bid)}</td>
        <td className={`${cls} text-destructive`}>{fmtPrice(c?.ask)}</td>
        <td className={`${cls} text-muted-foreground`}>{fmtVol(c?.volume)}</td>
        <td className={`${cls} text-muted-foreground`}>{fmtVol(c?.open_interest)}</td>
        <td className={`${cls} text-muted-foreground`}>{fmtIV(c?.implied_volatility)}</td>
        <td className={`${cls} text-muted-foreground`}>{fmtDelta(c?.delta)}</td>
      </>
    );
  }

  function renderPutCells(c: OptionContract | undefined, isITM: boolean, isSelected: boolean) {
    const bg = isSelected ? 'bg-primary/20' : isITM ? 'bg-destructive/[0.06]' : '';
    const cls = `px-1.5 py-1 text-right whitespace-nowrap cursor-pointer ${bg}`;
    return (
      <>
        <td className={`${cls} text-muted-foreground`}>{fmtDelta(c?.delta)}</td>
        <td className={`${cls} text-muted-foreground`}>{fmtIV(c?.implied_volatility)}</td>
        <td className={`${cls} text-muted-foreground`}>{fmtVol(c?.open_interest)}</td>
        <td className={`${cls} text-muted-foreground`}>{fmtVol(c?.volume)}</td>
        <td className={`${cls} text-success`}>{fmtPrice(c?.bid)}</td>
        <td className={`${cls} text-destructive`}>{fmtPrice(c?.ask)}</td>
        <td className={`${cls} text-foreground`}>{fmtPrice(c?.last_price)}</td>
      </>
    );
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-end gap-2 flex-wrap">
        {/* Expiration selector */}
        <div className="flex-1 min-w-[120px]">
          <Label className="text-[10px] text-muted-foreground mb-0.5 block">Expiration {dte != null && <span className="text-foreground">({dte} DTE)</span>}</Label>
          <Select value={selectedExpiration} onValueChange={handleExpirationChange} disabled={loading || expirations.length === 0}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder={loading ? 'Loading...' : 'Select'} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {expirations.map(exp => {
                const d = Math.max(0, Math.ceil((new Date(exp).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                return (
                  <SelectItem key={exp} value={exp} className="text-xs">
                    {exp} <span className="text-muted-foreground ml-1">({d}d)</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* View toggle */}
        <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
          <TabsList className="h-7">
            <TabsTrigger value="all" className="text-[10px] px-2 h-6">All</TabsTrigger>
            <TabsTrigger value="calls" className="text-[10px] px-2 h-6">Calls</TabsTrigger>
            <TabsTrigger value="puts" className="text-[10px] px-2 h-6">Puts</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Near money toggle */}
        <button
          onClick={() => setNearMoney(!nearMoney)}
          className={`h-7 px-2 text-[10px] rounded border transition-colors ${
            nearMoney 
              ? 'bg-primary/10 border-primary/30 text-primary' 
              : 'bg-muted border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {nearMoney ? 'Near $' : 'All Strikes'}
        </button>
      </div>

      {/* Price bar */}
      {stockPrice > 0 && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
          <Badge variant="outline" className="text-[10px] h-4 font-mono">
            {underlyingTicker} ${stockPrice.toFixed(2)}
          </Badge>
          <span>{chainData.length} strikes</span>
          <span className="ml-auto">Live · Tradier</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading chain...
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Options Chain Table */}
      {!loading && !error && chainData.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden">
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-[10px] font-mono border-collapse" style={{ minWidth: viewMode === 'all' ? 700 : 400 }}>
              <thead className="sticky top-0 z-10">
                {/* Section labels row */}
                {viewMode === 'all' && (
                  <tr className="bg-muted border-b border-border">
                    <th colSpan={7} className="py-0.5 text-center text-[10px] font-semibold text-success tracking-widest uppercase border-r border-border">
                      Calls
                    </th>
                    <th className="py-0.5 bg-muted/80 border-r border-border"></th>
                    <th colSpan={7} className="py-0.5 text-center text-[10px] font-semibold text-destructive tracking-widest uppercase">
                      Puts
                    </th>
                  </tr>
                )}
                {/* Column headers */}
                <tr className="bg-muted text-muted-foreground border-b border-border">
                  {showCalls && (
                    viewMode === 'all' ? (
                      <>
                        {callCols.map(col => (
                          <th key={`c-${col}`} className="px-1.5 py-1 text-right font-medium text-[9px] uppercase tracking-wider border-r border-border/30 last:border-r-0">
                            {col}
                          </th>
                        ))}
                      </>
                    ) : (
                      <>
                        <th className="px-1.5 py-1 text-left font-medium text-[9px] uppercase tracking-wider">Strike</th>
                        {callCols.map(col => (
                          <th key={`c-${col}`} className="px-1.5 py-1 text-right font-medium text-[9px] uppercase tracking-wider">
                            {col}
                          </th>
                        ))}
                      </>
                    )
                  )}
                  {viewMode === 'all' && (
                    <th className="px-2 py-1 text-center font-bold text-[10px] text-foreground bg-muted/80 border-x border-border uppercase tracking-wider">
                      Strike
                    </th>
                  )}
                  {showPuts && (
                    viewMode === 'all' ? (
                      <>
                        {putCols.map(col => (
                          <th key={`p-${col}`} className="px-1.5 py-1 text-right font-medium text-[9px] uppercase tracking-wider border-l border-border/30 first:border-l-0">
                            {col}
                          </th>
                        ))}
                      </>
                    ) : (
                      <>
                        <th className="px-1.5 py-1 text-left font-medium text-[9px] uppercase tracking-wider">Strike</th>
                        {['Last', 'Bid', 'Ask', 'Vol', 'OI', 'IV', 'Δ'].map(col => (
                          <th key={`p-${col}`} className="px-1.5 py-1 text-right font-medium text-[9px] uppercase tracking-wider">
                            {col}
                          </th>
                        ))}
                      </>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {chainData.map(([strike, { call, put }]) => {
                  const isATM = stockPrice > 0 && Math.abs(strike - stockPrice) / stockPrice < 0.005;
                  const isITMCall = strike < stockPrice;
                  const isITMPut = strike > stockPrice;
                  const callSelected = selectedContract?.ticker === call?.ticker;
                  const putSelected = selectedContract?.ticker === put?.ticker;

                  return (
                    <tr
                      key={strike}
                      ref={isATM ? atmRef : undefined}
                      className={`border-t border-border/20 hover:bg-muted/30 transition-colors ${
                        isATM ? 'border-t-2 border-b-2 border-primary/40' : ''
                      }`}
                    >
                      {showCalls && viewMode === 'all' && (
                        <>{renderCallCells(call, isITMCall, callSelected).props.children}</>
                      )}
                      {showCalls && viewMode === 'all' && (
                        // Wrap the call side to be clickable
                        null
                      )}

                      {/* For "all" mode: calls | strike | puts */}
                      {showCalls && viewMode !== 'all' && (
                        <>
                          <td className="px-1.5 py-1 text-left font-semibold text-foreground">${strike}</td>
                        </>
                      )}

                      {/* Render call cells with click handler */}
                      {showCalls && (() => {
                        const isITM = isITMCall;
                        const isSelected = callSelected;
                        const c = call;
                        const bg = isSelected ? 'bg-primary/20' : isITM ? 'bg-success/[0.06]' : '';
                        const cls = `px-1.5 py-1 text-right whitespace-nowrap cursor-pointer ${bg}`;
                        const onClick = () => c && onSelect(c);
                        
                        if (viewMode === 'all') {
                          return (
                            <>
                              <td onClick={onClick} className={`${cls} text-foreground`}>{fmtPrice(c?.last_price)}</td>
                              <td onClick={onClick} className={`${cls} text-success`}>{fmtPrice(c?.bid)}</td>
                              <td onClick={onClick} className={`${cls} text-destructive`}>{fmtPrice(c?.ask)}</td>
                              <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtVol(c?.volume)}</td>
                              <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtVol(c?.open_interest)}</td>
                              <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtIV(c?.implied_volatility)}</td>
                              <td onClick={onClick} className={`${cls} text-muted-foreground border-r border-border/30`}>{fmtDelta(c?.delta)}</td>
                            </>
                          );
                        }
                        return (
                          <>
                            <td onClick={onClick} className={`${cls} text-foreground`}>{fmtPrice(c?.last_price)}</td>
                            <td onClick={onClick} className={`${cls} text-success`}>{fmtPrice(c?.bid)}</td>
                            <td onClick={onClick} className={`${cls} text-destructive`}>{fmtPrice(c?.ask)}</td>
                            <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtVol(c?.volume)}</td>
                            <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtVol(c?.open_interest)}</td>
                            <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtIV(c?.implied_volatility)}</td>
                            <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtDelta(c?.delta)}</td>
                          </>
                        );
                      })()}

                      {viewMode === 'all' && (
                        <td className={`px-2 py-1 text-center font-bold text-[11px] bg-muted/40 border-x border-border ${
                          isATM ? 'text-primary bg-primary/10' : 'text-foreground'
                        }`}>
                          {strike.toFixed(strike % 1 === 0 ? 0 : 2)}
                        </td>
                      )}

                      {showPuts && viewMode !== 'all' && (
                        <td className="px-1.5 py-1 text-left font-semibold text-foreground">${strike}</td>
                      )}

                      {showPuts && (() => {
                        const isITM = isITMPut;
                        const isSelected = putSelected;
                        const c = put;
                        const bg = isSelected ? 'bg-primary/20' : isITM ? 'bg-destructive/[0.06]' : '';
                        const cls = `px-1.5 py-1 text-right whitespace-nowrap cursor-pointer ${bg}`;
                        const onClick = () => c && onSelect(c);

                        if (viewMode === 'all') {
                          return (
                            <>
                              <td onClick={onClick} className={`${cls} text-muted-foreground border-l border-border/30`}>{fmtDelta(c?.delta)}</td>
                              <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtIV(c?.implied_volatility)}</td>
                              <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtVol(c?.open_interest)}</td>
                              <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtVol(c?.volume)}</td>
                              <td onClick={onClick} className={`${cls} text-success`}>{fmtPrice(c?.bid)}</td>
                              <td onClick={onClick} className={`${cls} text-destructive`}>{fmtPrice(c?.ask)}</td>
                              <td onClick={onClick} className={`${cls} text-foreground`}>{fmtPrice(c?.last_price)}</td>
                            </>
                          );
                        }
                        return (
                          <>
                            <td onClick={onClick} className={`${cls} text-foreground`}>{fmtPrice(c?.last_price)}</td>
                            <td onClick={onClick} className={`${cls} text-success`}>{fmtPrice(c?.bid)}</td>
                            <td onClick={onClick} className={`${cls} text-destructive`}>{fmtPrice(c?.ask)}</td>
                            <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtVol(c?.volume)}</td>
                            <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtVol(c?.open_interest)}</td>
                            <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtIV(c?.implied_volatility)}</td>
                            <td onClick={onClick} className={`${cls} text-muted-foreground`}>{fmtDelta(c?.delta)}</td>
                          </>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && chainData.length === 0 && selectedExpiration && (
        <p className="text-xs text-muted-foreground text-center py-4">No contracts found.</p>
      )}

      {/* Selected contract summary */}
      {selectedContract && (
        <div className="p-2 rounded-md bg-muted/50 border border-border">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-semibold text-foreground">
              {underlyingTicker} ${selectedContract.strike_price} {selectedContract.contract_type.toUpperCase()}
            </span>
            <span className="text-muted-foreground">{selectedContract.expiration_date}</span>
          </div>
          <div className="grid grid-cols-4 gap-x-3 gap-y-0.5 text-[10px] font-mono">
            <div><span className="text-muted-foreground">Bid </span><span className="text-success">{fmtPrice(selectedContract.bid)}</span></div>
            <div><span className="text-muted-foreground">Ask </span><span className="text-destructive">{fmtPrice(selectedContract.ask)}</span></div>
            <div><span className="text-muted-foreground">Mid </span><span>{fmtPrice(selectedContract.mid)}</span></div>
            <div><span className="text-muted-foreground">Last </span><span>{fmtPrice(selectedContract.last_price)}</span></div>
            <div><span className="text-muted-foreground">IV </span><span>{fmtIV(selectedContract.implied_volatility)}</span></div>
            <div><span className="text-muted-foreground">Δ </span><span>{selectedContract.delta?.toFixed(3) ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Γ </span><span>{selectedContract.gamma?.toFixed(4) ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Θ </span><span>{selectedContract.theta?.toFixed(3) ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Vega </span><span>{selectedContract.vega?.toFixed(3) ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Vol </span><span>{selectedContract.volume.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">OI </span><span>{selectedContract.open_interest.toLocaleString()}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
