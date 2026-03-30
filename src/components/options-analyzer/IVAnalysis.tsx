import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ComposedChart, ReferenceLine } from 'recharts';
import { Explainer } from './Explainer';

interface Props {
  ticker: string;
}

export function IVAnalysis({ ticker }: Props) {
  const [loading, setLoading] = useState(true);
  const [stockPrice, setStockPrice] = useState(0);
  const [termStructure, setTermStructure] = useState<{ expiration: string; avgIV: number; daysToExpiry: number }[]>([]);
  const [ivSmile, setIvSmile] = useState<{ strike: number; callIV: number; putIV: number }[]>([]);
  const [historicalIVData, setHistoricalIVData] = useState<{ date: string; hv20: number; hv60: number }[]>([]);
  const [currentIV, setCurrentIV] = useState(0);
  const [hv30, setHv30] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: firstChain } = await supabase.functions.invoke('yahoo-options-chain', {
          body: { ticker },
        });
        if (!firstChain?.ok) return;
        setStockPrice(firstChain.stockPrice || 0);
        const expirations: string[] = firstChain.expirations || [];

        const contracts = firstChain.contracts || [];
        const smileData: { strike: number; callIV: number; putIV: number }[] = [];
        const strikes = [...new Set(contracts.map((c: any) => c.strike_price))].sort((a: number, b: number) => a - b);
        for (const strike of strikes) {
          const call = contracts.find((c: any) => c.strike_price === strike && c.contract_type === 'call');
          const put = contracts.find((c: any) => c.strike_price === strike && c.contract_type === 'put');
          if (call?.implied_volatility || put?.implied_volatility) {
            smileData.push({
              strike: strike as number,
              callIV: (call?.implied_volatility || 0) * 100,
              putIV: (put?.implied_volatility || 0) * 100,
            });
          }
        }
        setIvSmile(smileData);

        const atmContracts = contracts
          .filter((c: any) => Math.abs(c.strike_price - firstChain.stockPrice) / firstChain.stockPrice < 0.03)
          .filter((c: any) => c.implied_volatility > 0);
        if (atmContracts.length > 0) {
          setCurrentIV(atmContracts.reduce((s: number, c: any) => s + c.implied_volatility, 0) / atmContracts.length * 100);
        }

        const termData: { expiration: string; avgIV: number; daysToExpiry: number }[] = [];
        const expsToFetch = expirations.slice(0, 6);
        for (const exp of expsToFetch) {
          try {
            let chainContracts = contracts;
            if (exp !== firstChain.selectedExpiration) {
              const { data: chainData } = await supabase.functions.invoke('yahoo-options-chain', {
                body: { ticker, expirationDate: exp },
              });
              chainContracts = chainData?.contracts || [];
            }
            const ivValues = chainContracts
              .filter((c: any) => c.implied_volatility > 0 && Math.abs(c.strike_price - firstChain.stockPrice) / firstChain.stockPrice < 0.1)
              .map((c: any) => c.implied_volatility * 100);
            if (ivValues.length > 0) {
              termData.push({
                expiration: exp,
                avgIV: ivValues.reduce((s: number, v: number) => s + v, 0) / ivValues.length,
                daysToExpiry: Math.round((new Date(exp).getTime() - Date.now()) / 86400000),
              });
            }
          } catch { /* skip */ }
        }
        setTermStructure(termData);

        const end = new Date().toISOString().split('T')[0];
        const start = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];
        const { data: bars } = await supabase
          .from('market_daily_bars')
          .select('bar_date, close')
          .eq('ticker', ticker)
          .gte('bar_date', start)
          .lte('bar_date', end)
          .order('bar_date', { ascending: true })
          .limit(200);

        if (bars && bars.length > 30) {
          const hvData: { date: string; hv20: number; hv60: number }[] = [];
          for (let i = 60; i < bars.length; i++) {
            const returns20: number[] = [];
            for (let j = i - 19; j <= i; j++) {
              if (bars[j].close && bars[j - 1].close) returns20.push(Math.log(bars[j].close / bars[j - 1].close));
            }
            const mean20 = returns20.reduce((s, r) => s + r, 0) / returns20.length;
            const var20 = returns20.reduce((s, r) => s + (r - mean20) ** 2, 0) / (returns20.length - 1);
            const hv20 = Math.sqrt(var20) * Math.sqrt(252) * 100;

            const returns60: number[] = [];
            for (let j = i - 59; j <= i; j++) {
              if (bars[j].close && bars[j - 1].close) returns60.push(Math.log(bars[j].close / bars[j - 1].close));
            }
            const mean60 = returns60.reduce((s, r) => s + r, 0) / returns60.length;
            const var60 = returns60.reduce((s, r) => s + (r - mean60) ** 2, 0) / (returns60.length - 1);
            const hv60 = Math.sqrt(var60) * Math.sqrt(252) * 100;

            hvData.push({ date: bars[i].bar_date, hv20, hv60 });
          }
          setHistoricalIVData(hvData);

          if (bars.length > 30) {
            const recentReturns: number[] = [];
            for (let j = bars.length - 30; j < bars.length; j++) {
              if (bars[j].close && bars[j - 1].close) recentReturns.push(Math.log(bars[j].close / bars[j - 1].close));
            }
            const m = recentReturns.reduce((s, r) => s + r, 0) / recentReturns.length;
            const v = recentReturns.reduce((s, r) => s + (r - m) ** 2, 0) / (recentReturns.length - 1);
            setHv30(Math.sqrt(v) * Math.sqrt(252) * 100);
          }
        }
      } catch (e) {
        console.error('IV analysis error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [ticker]);

  const ivPremium = currentIV - hv30;
  const ivRank = useMemo(() => {
    if (historicalIVData.length < 10) return null;
    const ivValues = historicalIVData.map(d => d.hv20);
    const min = Math.min(...ivValues);
    const max = Math.max(...ivValues);
    if (max === min) return 50;
    return ((hv30 - min) / (max - min)) * 100;
  }, [historicalIVData, hv30]);

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Beginner Explainer */}
      <Explainer>
        <strong>What is IV (Implied Volatility)?</strong> It's the market's prediction of how much the stock will move in the future. 
        High IV = the market expects big swings (options are expensive). Low IV = calm market (options are cheap). 
        Compare IV to HV (historical volatility — how much the stock actually moved in the past) to see if options are overpriced or a bargain.
      </Explainer>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">Current IV (ATM)</div>
          <div className="text-lg font-bold font-mono">{currentIV.toFixed(1)}%</div>
          <div className="text-[10px] text-muted-foreground">Market's expected move</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">30-Day HV</div>
          <div className="text-lg font-bold font-mono">{hv30.toFixed(1)}%</div>
          <div className="text-[10px] text-muted-foreground">Actual past movement</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">IV Premium</div>
          <div className={`text-lg font-bold font-mono ${ivPremium > 0 ? 'text-amber-400' : 'text-green-400'}`}>
            {ivPremium > 0 ? '+' : ''}{ivPremium.toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">{ivPremium > 0 ? 'Options are expensive' : 'Options are cheap'}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">IV Rank (6mo)</div>
          <div className={`text-lg font-bold font-mono ${(ivRank ?? 0) > 50 ? 'text-amber-400' : 'text-green-400'}`}>
            {ivRank != null ? `${ivRank.toFixed(0)}%` : 'N/A'}
          </div>
          <div className="text-[10px] text-muted-foreground">{(ivRank ?? 0) > 50 ? 'Higher than usual' : 'Lower than usual'}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">What to do?</div>
          <div className="text-sm font-semibold mt-1">
            {ivPremium > 5 ? (
              <Badge variant="destructive">Sell options (collect premium)</Badge>
            ) : ivPremium < -5 ? (
              <Badge className="bg-green-600">Buy options (they're cheap)</Badge>
            ) : (
              <Badge variant="outline">No strong signal</Badge>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* IV Smile / Skew */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">Volatility Smile / Skew</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Shows how expensive options are at each strike price. The "smile" shape means far-from-current-price options cost more (higher IV). 
            If puts are more expensive than calls, it signals the market is more worried about a drop.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={ivSmile}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="strike" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="callIV" name="Call IV" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="putIV" name="Put IV" stroke="hsl(0 84% 60%)" dot={false} strokeWidth={2} />
              {stockPrice > 0 && <ReferenceLine x={stockPrice} stroke="hsl(var(--foreground) / 0.5)" strokeDasharray="4 4" />}
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* IV Term Structure */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">IV Term Structure</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Shows how IV changes across different expiration dates. Normally, further-out options have higher IV. 
            If near-term IV is higher, it often means an event (like earnings) is expected soon.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={termStructure}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="daysToExpiry" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Days to Expiry', position: 'insideBottom', offset: -5, fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Avg IV']}
                labelFormatter={(v) => `${v} days until expiration`}
              />
              <Bar dataKey="avgIV" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Historical Volatility */}
      {historicalIVData.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">Historical Volatility — 20 Day vs 60 Day</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Compares short-term (20-day) vs. longer-term (60-day) actual stock movement. When the 20-day spikes above the 60-day, 
            it means the stock has been moving more than usual recently. The red dashed line is today's IV for comparison.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalIVData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="hv20" name="HV 20-Day" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="hv60" name="HV 60-Day" stroke="hsl(var(--primary))" dot={false} strokeWidth={1.5} />
              {currentIV > 0 && <ReferenceLine y={currentIV} stroke="hsl(0 84% 60%)" strokeDasharray="4 4" label={{ value: `IV ${currentIV.toFixed(0)}%`, position: 'right', fontSize: 10 }} />}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
