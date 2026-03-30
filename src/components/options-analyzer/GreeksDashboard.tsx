import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

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
        callDelta: call?.delta ?? null,
        putDelta: put?.delta ?? null,
        callGamma: call?.gamma ?? null,
        putGamma: put?.gamma ?? null,
        callTheta: call?.theta ?? null,
        putTheta: put?.theta ?? null,
        callVega: call?.vega ?? null,
        putVega: put?.vega ?? null,
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
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <div className="text-[10px] text-muted-foreground">Avg Call IV</div>
          <div className="text-lg font-bold font-mono">{summaryStats.avgCallIV.toFixed(1)}%</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[10px] text-muted-foreground">Avg Put IV</div>
          <div className="text-lg font-bold font-mono">{summaryStats.avgPutIV.toFixed(1)}%</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[10px] text-muted-foreground">IV Skew (Put - Call)</div>
          <div className={`text-lg font-bold font-mono ${summaryStats.ivSkew > 0 ? 'text-amber-400' : 'text-green-400'}`}>
            {summaryStats.ivSkew > 0 ? '+' : ''}{summaryStats.ivSkew.toFixed(1)}%
          </div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[10px] text-muted-foreground">Max Gamma Strike</div>
          <div className="text-lg font-bold font-mono">${summaryStats.maxGammaStrike}</div>
        </Card>
      </div>

      {/* Greeks Chart */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">{greekKey} by Strike — {selectedExp}</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="strike" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={`call${greekKey}`}
              name={`Call ${greekKey}`}
              stroke="hsl(var(--chart-2))"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey={`put${greekKey}`}
              name={`Put ${greekKey}`}
              stroke="hsl(0 84% 60%)"
              dot={false}
              strokeWidth={2}
            />
            {stockPrice > 0 && (
              <ReferenceLine x={stockPrice} stroke="hsl(var(--foreground) / 0.5)" strokeDasharray="4 4" label={{ value: 'ATM', position: 'top', fontSize: 10 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
