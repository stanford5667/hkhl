import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { Explainer } from './Explainer';

interface Props {
  ticker: string;
}

interface GreeksRow {
  strike: number;
  type: 'call' | 'put';
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  bid: number;
  ask: number;
}

const GREEK_EXPLAINERS: Record<string, string> = {
  delta: 'Delta tells you how much the option price moves when the stock moves $1. A delta of 0.50 means the option gains ~$0.50 for every $1 the stock goes up. Higher delta = the option behaves more like owning the stock.',
  gamma: 'Gamma shows how fast delta changes. High gamma means the option becomes much more (or less) sensitive as the stock moves. It\'s highest for options near the current stock price (ATM).',
  theta: 'Theta is time decay — how much value the option loses each day just from time passing. It\'s always negative for buyers. The closer to expiration, the faster the option loses value.',
  vega: 'Vega measures how much the option price changes when volatility changes by 1%. High vega means the option is very sensitive to changes in market fear/uncertainty. Important around earnings.',
};

export function GreeksDashboard({ ticker }: Props) {
  const [loading, setLoading] = useState(true);
  const [greeksData, setGreeksData] = useState<GreeksRow[]>([]);
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExp, setSelectedExp] = useState('');
  const [stockPrice, setStockPrice] = useState(0);
  const [viewGreek, setViewGreek] = useState<'delta' | 'gamma' | 'theta' | 'vega'>('delta');

  const fetchGreeks = async (expDate?: string) => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('yahoo-options-chain', {
        body: { ticker, expirationDate: expDate || undefined },
      });
      if (data?.ok) {
        setStockPrice(data.stockPrice || 0);
        setExpirations(data.expirations || []);
        if (data.selectedExpiration && !expDate) setSelectedExp(data.selectedExpiration);
        const rows: GreeksRow[] = (data.contracts || [])
          .filter((c: any) => c.delta != null)
          .map((c: any) => ({
            strike: c.strike_price,
            type: c.contract_type,
            delta: c.delta || 0,
            gamma: c.gamma || 0,
            theta: c.theta || 0,
            vega: c.vega || 0,
            iv: (c.implied_volatility || 0) * 100,
            bid: c.bid || 0,
            ask: c.ask || 0,
          }));
        setGreeksData(rows);
      }
    } catch (e) {
      console.error('Greeks fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGreeks(); }, [ticker]);

  const handleExpChange = (exp: string) => {
    setSelectedExp(exp);
    fetchGreeks(exp);
  };

  const chartData = useMemo(() => {
    const strikes = [...new Set(greeksData.map(g => g.strike))].sort((a, b) => a - b);
    return strikes.map(strike => {
      const call = greeksData.find(g => g.strike === strike && g.type === 'call');
      const put = greeksData.find(g => g.strike === strike && g.type === 'put');
      return {
        strike,
        callDelta: call?.delta ?? null, putDelta: put?.delta ?? null,
        callGamma: call?.gamma ?? null, putGamma: put?.gamma ?? null,
        callTheta: call?.theta ?? null, putTheta: put?.theta ?? null,
        callVega: call?.vega ?? null, putVega: put?.vega ?? null,
      };
    });
  }, [greeksData]);

  const summaryStats = useMemo(() => {
    const calls = greeksData.filter(g => g.type === 'call');
    const puts = greeksData.filter(g => g.type === 'put');
    const avgCallIV = calls.length > 0 ? calls.reduce((s, c) => s + c.iv, 0) / calls.length : 0;
    const avgPutIV = puts.length > 0 ? puts.reduce((s, p) => s + p.iv, 0) / puts.length : 0;
    const ivSkew = avgPutIV - avgCallIV;
    const maxGamma = Math.max(...greeksData.map(g => Math.abs(g.gamma)), 0);
    const maxGammaStrike = greeksData.find(g => Math.abs(g.gamma) === maxGamma)?.strike || 0;
    return { avgCallIV, avgPutIV, ivSkew, maxGammaStrike };
  }, [greeksData]);

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const greekKey = viewGreek.charAt(0).toUpperCase() + viewGreek.slice(1);

  return (
    <div className="space-y-6">
      {/* Top-level explainer */}
      <Explainer>
        <strong>What are "The Greeks"?</strong> They're measurements that tell you how an option's price will change based on different factors — 
        stock price movement (Delta), speed of that change (Gamma), time passing (Theta), and volatility shifts (Vega). 
        Professional traders use these to understand and manage risk. Select a Greek below to learn more.
      </Explainer>

      {/* Controls */}
      <div className="flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Expiration:</span>
          <Select value={selectedExp} onValueChange={handleExpChange}>
            <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {expirations.slice(0, 12).map(exp => (
                <SelectItem key={exp} value={exp}>{exp}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Greek:</span>
          <Select value={viewGreek} onValueChange={(v) => setViewGreek(v as any)}>
            <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="delta">Delta (Δ)</SelectItem>
              <SelectItem value="gamma">Gamma (Γ)</SelectItem>
              <SelectItem value="theta">Theta (Θ)</SelectItem>
              <SelectItem value="vega">Vega (ν)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Greek-specific explainer */}
      <Explainer>{GREEK_EXPLAINERS[viewGreek]}</Explainer>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">Avg Call IV</div>
          <div className="text-lg font-bold font-mono">{summaryStats.avgCallIV.toFixed(1)}%</div>
          <div className="text-[10px] text-muted-foreground">Implied volatility of calls</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">Avg Put IV</div>
          <div className="text-lg font-bold font-mono">{summaryStats.avgPutIV.toFixed(1)}%</div>
          <div className="text-[10px] text-muted-foreground">Implied volatility of puts</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">IV Skew</div>
          <div className={`text-lg font-bold font-mono ${summaryStats.ivSkew > 0 ? 'text-amber-400' : 'text-green-400'}`}>
            {summaryStats.ivSkew > 0 ? '+' : ''}{summaryStats.ivSkew.toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">{summaryStats.ivSkew > 0 ? 'Puts cost more (bearish tilt)' : 'Calls cost more (bullish tilt)'}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">Max Gamma Strike</div>
          <div className="text-lg font-bold font-mono">${summaryStats.maxGammaStrike}</div>
          <div className="text-[10px] text-muted-foreground">Most price-sensitive strike</div>
        </Card>
      </div>

      {/* Greeks Chart */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-1">{greekKey} by Strike — {selectedExp}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Each line shows the {viewGreek} value for calls (green) and puts (red) at each strike price. The dashed line marks the current stock price (ATM).
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="strike" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
            <Legend />
            <Line type="monotone" dataKey={`call${greekKey}`} name={`Call ${greekKey}`} stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey={`put${greekKey}`} name={`Put ${greekKey}`} stroke="hsl(0 84% 60%)" dot={false} strokeWidth={2} />
            {stockPrice > 0 && (
              <ReferenceLine x={stockPrice} stroke="hsl(var(--foreground) / 0.5)" strokeDasharray="4 4" label={{ value: 'Current Price', position: 'top', fontSize: 10 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
