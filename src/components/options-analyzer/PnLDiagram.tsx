import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Explainer } from './Explainer';

interface Props {
  ticker: string;
}

type StrategyType = 'long-call' | 'long-put' | 'bull-call-spread' | 'bear-put-spread' | 'iron-condor' | 'covered-call' | 'straddle' | 'strangle';

interface OptionContract {
  strike_price: number;
  contract_type: 'call' | 'put';
  bid: number;
  ask: number;
  mid: number;
  last_price: number;
  volume: number;
  open_interest: number;
  implied_volatility: number | null;
  delta: number | null;
}

const STRATEGIES: Record<StrategyType, { label: string; description: string; legs: string }> = {
  'long-call': { label: 'Long Call', description: 'You buy a call — you profit if the stock goes UP above the strike. Your max loss is the premium you paid.', legs: 'call' },
  'long-put': { label: 'Long Put', description: 'You buy a put — you profit if the stock goes DOWN below the strike. Great for protecting against drops.', legs: 'put' },
  'bull-call-spread': { label: 'Bull Call Spread', description: 'Buy a call and sell a higher call. Cheaper than a single call, but caps your upside.', legs: 'call' },
  'bear-put-spread': { label: 'Bear Put Spread', description: 'Buy a put and sell a lower put. Profits when stock drops, with limited risk.', legs: 'put' },
  'iron-condor': { label: 'Iron Condor', description: 'Sell both a call spread and a put spread. You profit when the stock stays in a range.', legs: 'both' },
  'covered-call': { label: 'Covered Call', description: 'Own the stock and sell a call against it. Collects premium income, but caps your upside.', legs: 'call' },
  'straddle': { label: 'Long Straddle', description: 'Buy both a call and put at the same strike. Profits from a BIG move in either direction.', legs: 'both' },
  'strangle': { label: 'Long Strangle', description: 'Buy a call and put at different strikes. Similar to straddle but cheaper.', legs: 'both' },
};

export function PnLDiagram({ ticker }: Props) {
  const [strategy, setStrategy] = useState<StrategyType>('long-call');
  const [spotPrice, setSpotPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [strike1, setStrike1] = useState('');
  const [strike2, setStrike2] = useState('');
  const [strike3, setStrike3] = useState('');
  const [strike4, setStrike4] = useState('');
  const [premium1, setPremium1] = useState('');
  const [premium2, setPremium2] = useState('');
  const [contracts, setContracts] = useState('1');
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState('');
  const [chainContracts, setChainContracts] = useState<OptionContract[]>([]);
  const [loadingChain, setLoadingChain] = useState(false);

  // Get available strikes from chain
  const callStrikes = useMemo(() => {
    return [...new Set(chainContracts.filter(c => c.contract_type === 'call').map(c => c.strike_price))].sort((a, b) => a - b);
  }, [chainContracts]);

  const putStrikes = useMemo(() => {
    return [...new Set(chainContracts.filter(c => c.contract_type === 'put').map(c => c.strike_price))].sort((a, b) => a - b);
  }, [chainContracts]);

  // Find premium for a given strike & type from chain
  const findPremium = useCallback((strike: number, type: 'call' | 'put'): number => {
    const contract = chainContracts.find(c => c.strike_price === strike && c.contract_type === type);
    if (!contract) return 0;
    return contract.mid > 0 ? contract.mid : contract.last_price;
  }, [chainContracts]);

  // Determine which contract type to use for each leg
  const getLegType = (strategy: StrategyType, legNum: number): 'call' | 'put' => {
    switch (strategy) {
      case 'long-call': case 'bull-call-spread': case 'covered-call': return 'call';
      case 'long-put': case 'bear-put-spread': return 'put';
      case 'straddle': return legNum === 1 ? 'call' : 'put';
      case 'strangle': return legNum === 1 ? 'put' : 'call';
      case 'iron-condor': return legNum <= 2 ? 'put' : 'call';
      default: return 'call';
    }
  };

  // Fetch options chain
  const fetchChain = useCallback(async (expDate: string) => {
    setLoadingChain(true);
    try {
      const { data } = await supabase.functions.invoke('yahoo-options-chain', {
        body: { ticker: ticker.toUpperCase(), expirationDate: expDate },
      });
      if (data?.ok && data.contracts) {
        setChainContracts(data.contracts);
        if (data.stockPrice > 0) setSpotPrice(data.stockPrice.toFixed(2));
      }
    } catch (e) {
      console.error('Failed to fetch options chain:', e);
    } finally {
      setLoadingChain(false);
    }
  }, [ticker]);

  // Initial load: get expirations & first chain
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke('yahoo-options-chain', {
          body: { ticker: ticker.toUpperCase() },
        });
        if (data?.ok) {
          if (data.stockPrice > 0) setSpotPrice(data.stockPrice.toFixed(2));
          if (data.expirations?.length) {
            setExpirations(data.expirations);
            setSelectedExpiration(data.selectedExpiration || data.expirations[0]);
          }
          if (data.contracts) setChainContracts(data.contracts);
        }
      } catch (e) {
        console.error('Failed to init options chain:', e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [ticker]);

  // When chain loads or strategy changes, set default strikes & premiums from real data
  useEffect(() => {
    if (chainContracts.length === 0) return;
    const spot = parseFloat(spotPrice) || 0;
    if (!spot) return;

    // Find ATM strike (closest to spot)
    const allStrikes = [...new Set(chainContracts.map(c => c.strike_price))].sort((a, b) => a - b);
    const atm = allStrikes.reduce((prev, curr) => Math.abs(curr - spot) < Math.abs(prev - spot) ? curr : prev, allStrikes[0]);
    const atmIdx = allStrikes.indexOf(atm);

    // Helper to get strike N steps OTM from ATM
    const strikeAt = (offset: number) => allStrikes[Math.min(Math.max(atmIdx + offset, 0), allStrikes.length - 1)];

    switch (strategy) {
      case 'long-call':
      case 'covered-call': {
        const k = strikeAt(1); // slightly OTM call
        setStrike1(k.toString());
        setPremium1(findPremium(k, 'call').toFixed(2));
        break;
      }
      case 'long-put': {
        const k = strikeAt(-1); // slightly OTM put
        setStrike1(k.toString());
        setPremium1(findPremium(k, 'put').toFixed(2));
        break;
      }
      case 'bull-call-spread': {
        const k1 = strikeAt(1);
        const k2 = strikeAt(3);
        setStrike1(k1.toString());
        setStrike2(k2.toString());
        setPremium1(findPremium(k1, 'call').toFixed(2));
        setPremium2(findPremium(k2, 'call').toFixed(2));
        break;
      }
      case 'bear-put-spread': {
        const k1 = strikeAt(-1); // lower strike (buy)
        const k2 = strikeAt(0);  // higher strike (sell)
        setStrike1(k1.toString());
        setStrike2(k2.toString());
        setPremium1(findPremium(k2, 'put').toFixed(2));
        setPremium2(findPremium(k1, 'put').toFixed(2));
        break;
      }
      case 'iron-condor': {
        setStrike1(strikeAt(-1).toString()); // put sell
        setStrike2(strikeAt(1).toString());  // call sell
        setStrike3(strikeAt(-3).toString()); // put buy (lower)
        setStrike4(strikeAt(3).toString());  // call buy (upper)
        const p1 = findPremium(strikeAt(-1), 'put');
        const p2 = findPremium(strikeAt(1), 'call');
        setPremium1(p1.toFixed(2));
        setPremium2(p2.toFixed(2));
        break;
      }
      case 'straddle': {
        setStrike1(atm.toString());
        setPremium1(findPremium(atm, 'call').toFixed(2));
        setPremium2(findPremium(atm, 'put').toFixed(2));
        break;
      }
      case 'strangle': {
        const kPut = strikeAt(-2);
        const kCall = strikeAt(2);
        setStrike1(kPut.toString());
        setStrike2(kCall.toString());
        setPremium1(findPremium(kPut, 'put').toFixed(2));
        setPremium2(findPremium(kCall, 'call').toFixed(2));
        break;
      }
    }
  }, [chainContracts, strategy, spotPrice, findPremium]);

  // When user changes a strike manually, look up real premium
  const handleStrikeChange = (strikeNum: number, value: string) => {
    const setters = [setStrike1, setStrike2, setStrike3, setStrike4];
    setters[strikeNum - 1](value);
    
    const strikeVal = parseFloat(value);
    if (!strikeVal || chainContracts.length === 0) return;

    const type = getLegType(strategy, strikeNum);
    const prem = findPremium(strikeVal, type);
    if (prem > 0) {
      if (strikeNum <= 2) {
        (strikeNum === 1 ? setPremium1 : setPremium2)(prem.toFixed(2));
      }
    }
  };

  // When expiration changes, refetch chain
  const handleExpirationChange = (exp: string) => {
    setSelectedExpiration(exp);
    fetchChain(exp);
  };

  const spot = parseFloat(spotPrice) || 0;

  const pnlData = useMemo(() => {
    if (!spot) return [];
    const k1 = parseFloat(strike1) || spot + 5;
    const k2 = parseFloat(strike2) || spot + 15;
    const k3 = parseFloat(strike3) || spot - 10;
    const k4 = parseFloat(strike4) || spot + 20;
    const p1 = parseFloat(premium1) || 0;
    const p2 = parseFloat(premium2) || 0;
    const mult = (parseInt(contracts) || 1) * 100;
    const range = spot * 0.3;
    const lo = spot - range;
    const hi = spot + range;
    const step = (hi - lo) / 200;
    const data: { price: number; pnl: number }[] = [];
    for (let price = lo; price <= hi; price += step) {
      let pnl = 0;
      switch (strategy) {
        case 'long-call': pnl = (Math.max(0, price - k1) - p1) * mult; break;
        case 'long-put': pnl = (Math.max(0, k1 - price) - p1) * mult; break;
        case 'bull-call-spread': pnl = (Math.max(0, price - k1) - Math.max(0, price - k2) - (p1 - p2)) * mult; break;
        case 'bear-put-spread': pnl = (Math.max(0, k2 - price) - Math.max(0, k1 - price) - (p1 - p2)) * mult; break;
        case 'iron-condor':
          pnl = (p1 + p2 - Math.max(0, k3 - price) + Math.max(0, k1 - price) - Math.max(0, price - k2) + Math.max(0, price - k4)) * mult * 0.5;
          break;
        case 'covered-call': pnl = ((price - spot) - Math.max(0, price - k1) + p1) * mult; break;
        case 'straddle': pnl = (Math.max(0, price - k1) + Math.max(0, k1 - price) - p1 - p2) * mult; break;
        case 'strangle': pnl = (Math.max(0, price - k2) + Math.max(0, k1 - price) - p1 - p2) * mult; break;
      }
      data.push({ price: Math.round(price * 100) / 100, pnl: Math.round(pnl * 100) / 100 });
    }
    return data;
  }, [strategy, spot, strike1, strike2, strike3, strike4, premium1, premium2, contracts]);

  const metrics = useMemo(() => {
    if (pnlData.length === 0) return null;
    const maxProfit = Math.max(...pnlData.map(d => d.pnl));
    const maxLoss = Math.min(...pnlData.map(d => d.pnl));
    const breakevens = pnlData.filter((d, i) => {
      if (i === 0) return false;
      return (pnlData[i - 1].pnl < 0 && d.pnl >= 0) || (pnlData[i - 1].pnl > 0 && d.pnl <= 0);
    });
    return { maxProfit, maxLoss, breakevens: breakevens.map(b => b.price) };
  }, [pnlData]);

  const showSecondStrike = ['bull-call-spread', 'bear-put-spread', 'iron-condor', 'strangle'].includes(strategy);
  const showThirdFourthStrike = strategy === 'iron-condor';

  // Available strikes for dropdowns based on strategy
  const strike1Options = (['long-put', 'bear-put-spread'].includes(strategy) ? putStrikes : 
    strategy === 'strangle' ? putStrikes : 
    strategy === 'iron-condor' ? putStrikes : callStrikes);
  const strike2Options = (['bear-put-spread'].includes(strategy) ? putStrikes :
    strategy === 'strangle' ? callStrikes :
    strategy === 'iron-condor' ? callStrikes : callStrikes);

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading {ticker} options chain...</span>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Explainer>
        <strong>What is a P&L Diagram?</strong> It shows how much money you'd make (or lose) at every possible stock price when your option expires. 
        The green zone is profit, the red zone is loss. Premiums are automatically pulled from live option quotes for each strike.
      </Explainer>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Config Panel */}
        <Card className="p-5 space-y-4 lg:col-span-1">
          <h3 className="text-sm font-semibold">Strategy Builder</h3>
          
          {/* Live price & expiration */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs">
              {ticker} ${spot.toFixed(2)}
            </Badge>
            {loadingChain && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>

          {expirations.length > 0 && (
            <div>
              <Label className="text-xs mb-1.5 block">Expiration Date</Label>
              <Select value={selectedExpiration} onValueChange={handleExpirationChange}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {expirations.slice(0, 12).map(exp => (
                    <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Premiums update automatically for selected expiration</p>
            </div>
          )}

          <div>
            <Label className="text-xs mb-1.5 block">Strategy</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as StrategyType)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STRATEGIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{STRATEGIES[strategy].description}</p>
          </div>

          {/* Strike 1 - dropdown from real chain */}
          <div>
            <Label className="text-xs mb-1.5 block">
              Strike Price {strike1Options.length > 0 && <span className="text-muted-foreground">({getLegType(strategy, 1)})</span>}
            </Label>
            {strike1Options.length > 0 ? (
              <Select value={strike1} onValueChange={(v) => handleStrikeChange(1, v)}>
                <SelectTrigger className="h-8 text-xs font-mono"><SelectValue placeholder="Select strike" /></SelectTrigger>
                <SelectContent>
                  {strike1Options.map(s => {
                    const prem = findPremium(s, getLegType(strategy, 1));
                    return (
                      <SelectItem key={s} value={s.toString()}>
                        ${s} {prem > 0 ? `— $${prem.toFixed(2)} premium` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Input value={strike1} onChange={(e) => handleStrikeChange(1, e.target.value)} className="h-8 text-xs font-mono" type="number" />
            )}
            {premium1 && <p className="text-[10px] text-green-400 mt-1 font-mono">Premium: ${premium1}</p>}
          </div>

          {showSecondStrike && (
            <div>
              <Label className="text-xs mb-1.5 block">
                Strike 2 {strike2Options.length > 0 && <span className="text-muted-foreground">({getLegType(strategy, 2)})</span>}
              </Label>
              {strike2Options.length > 0 ? (
                <Select value={strike2} onValueChange={(v) => handleStrikeChange(2, v)}>
                  <SelectTrigger className="h-8 text-xs font-mono"><SelectValue placeholder="Select strike" /></SelectTrigger>
                  <SelectContent>
                    {strike2Options.map(s => {
                      const prem = findPremium(s, getLegType(strategy, 2));
                      return (
                        <SelectItem key={s} value={s.toString()}>
                          ${s} {prem > 0 ? `— $${prem.toFixed(2)} premium` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={strike2} onChange={(e) => handleStrikeChange(2, e.target.value)} className="h-8 text-xs font-mono" type="number" />
              )}
              {premium2 && <p className="text-[10px] text-green-400 mt-1 font-mono">Premium: ${premium2}</p>}
            </div>
          )}

          {showThirdFourthStrike && (
            <>
              <div>
                <Label className="text-xs mb-1.5 block">Strike 3 — lower put</Label>
                {putStrikes.length > 0 ? (
                  <Select value={strike3} onValueChange={(v) => setStrike3(v)}>
                    <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {putStrikes.map(s => (
                        <SelectItem key={s} value={s.toString()}>${s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={strike3} onChange={(e) => setStrike3(e.target.value)} className="h-8 text-xs font-mono" type="number" />
                )}
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Strike 4 — upper call</Label>
                {callStrikes.length > 0 ? (
                  <Select value={strike4} onValueChange={(v) => setStrike4(v)}>
                    <SelectTrigger className="h-8 text-xs font-mono"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {callStrikes.map(s => (
                        <SelectItem key={s} value={s.toString()}>${s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={strike4} onChange={(e) => setStrike4(e.target.value)} className="h-8 text-xs font-mono" type="number" />
                )}
              </div>
            </>
          )}

          <div>
            <Label className="text-xs mb-1.5 block">Number of Contracts</Label>
            <Input value={contracts} onChange={(e) => setContracts(e.target.value)} className="h-8 text-xs font-mono" type="number" min="1" />
            <p className="text-[10px] text-muted-foreground mt-1">Each contract = 100 shares</p>
          </div>
        </Card>

        {/* P&L Chart */}
        <Card className="p-5 lg:col-span-3">
          {metrics && (
            <div className="flex items-center gap-6 mb-5 flex-wrap">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-0.5">Max Profit</div>
                <div className="text-sm font-bold font-mono text-green-400">
                  {metrics.maxProfit > 10000000 ? 'Unlimited' : `$${metrics.maxProfit.toLocaleString()}`}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-0.5">Max Loss</div>
                <div className="text-sm font-bold font-mono text-red-400">
                  ${metrics.maxLoss.toLocaleString()}
                </div>
              </div>
              {metrics.breakevens.length > 0 && (
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-0.5">Breakeven</div>
                  <div className="text-sm font-mono">
                    {metrics.breakevens.map(b => `$${b.toFixed(2)}`).join(', ')}
                  </div>
                </div>
              )}
              <Badge variant="outline" className="ml-auto font-mono text-xs">{STRATEGIES[strategy].label}</Badge>
            </div>
          )}

          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={pnlData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="price" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Profit / Loss']}
                labelFormatter={(v) => `If stock is at $${v}`}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <ReferenceLine x={spot} stroke="hsl(var(--foreground) / 0.5)" strokeDasharray="4 4" label={{ value: 'Current', position: 'top', fontSize: 10 }} />
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="transparent" stopOpacity={0} />
                  <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="pnl" stroke="hsl(var(--primary))" fill="url(#pnlGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
