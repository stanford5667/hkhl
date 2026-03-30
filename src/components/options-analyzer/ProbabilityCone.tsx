import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Explainer } from './Explainer';

interface Props {
  ticker: string;
}

export function ProbabilityCone({ ticker }: Props) {
  const [loading, setLoading] = useState(true);
  const [stockPrice, setStockPrice] = useState(0);
  const [historicalVol, setHistoricalVol] = useState(0);
  const [impliedVol, setImpliedVol] = useState(0);
  const [projectionDays, setProjectionDays] = useState('30');
  const [expirations, setExpirations] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke('yahoo-options-chain', {
          body: { ticker },
        });
        if (data?.ok) {
          setStockPrice(data.stockPrice || 0);
          setExpirations(data.expirations || []);
          const contracts = data.contracts || [];
          const atmContracts = contracts
            .filter((c: any) => Math.abs(c.strike_price - data.stockPrice) / data.stockPrice < 0.05)
            .filter((c: any) => c.implied_volatility > 0);
          if (atmContracts.length > 0) {
            const avgIV = atmContracts.reduce((s: number, c: any) => s + c.implied_volatility, 0) / atmContracts.length;
            setImpliedVol(avgIV);
          }
        }

        const end = new Date().toISOString().split('T')[0];
        const start = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
        const { data: bars } = await supabase
          .from('market_daily_bars')
          .select('close')
          .eq('ticker', ticker)
          .gte('bar_date', start)
          .lte('bar_date', end)
          .order('bar_date', { ascending: true })
          .limit(100);

        if (bars && bars.length > 20) {
          const returns: number[] = [];
          for (let i = 1; i < bars.length; i++) {
            if (bars[i].close && bars[i - 1].close) {
              returns.push(Math.log(bars[i].close / bars[i - 1].close));
            }
          }
          const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
          const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
          setHistoricalVol(Math.sqrt(variance) * Math.sqrt(252));
        }
      } catch (e) {
        console.error('Probability cone data error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [ticker]);

  const coneData = useMemo(() => {
    if (!stockPrice || !impliedVol) return [];
    const days = parseInt(projectionDays);
    const vol = impliedVol;
    const data: any[] = [];
    for (let d = 0; d <= days; d++) {
      const t = d / 252;
      const sigma = vol * Math.sqrt(t);
      data.push({
        day: d,
        price: stockPrice,
        upper1: stockPrice * Math.exp(sigma),
        lower1: stockPrice * Math.exp(-sigma),
        upper2: stockPrice * Math.exp(2 * sigma),
        lower2: stockPrice * Math.exp(-2 * sigma),
        upper3: stockPrice * Math.exp(3 * sigma),
        lower3: stockPrice * Math.exp(-3 * sigma),
      });
    }
    return data;
  }, [stockPrice, impliedVol, projectionDays]);

  const expectedMove = useMemo(() => {
    if (!stockPrice || !impliedVol) return null;
    const days = parseInt(projectionDays);
    const t = days / 252;
    const sigma = impliedVol * Math.sqrt(t);
    return {
      oneSD: stockPrice * (Math.exp(sigma) - 1),
      twoSD: stockPrice * (Math.exp(2 * sigma) - 1),
      upper1: stockPrice * Math.exp(sigma),
      lower1: stockPrice * Math.exp(-sigma),
      upper2: stockPrice * Math.exp(2 * sigma),
      lower2: stockPrice * Math.exp(-2 * sigma),
      pctMove: sigma * 100,
    };
  }, [stockPrice, impliedVol, projectionDays]);

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
        <strong>What is a Probability Cone?</strong> It shows the range of prices the stock is likely to stay within over time. 
        The inner shaded area (±1σ) covers where the stock will land ~68% of the time. The wider area (±2σ) covers ~95%. 
        Think of it like a weather forecast — the cone shows "most likely" vs. "unlikely but possible" price ranges. 
        If options are priced with high volatility, the cone is wider (bigger expected swings).
      </Explainer>

      {/* Controls */}
      <div className="flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Time frame:</span>
          <Select value={projectionDays} onValueChange={setProjectionDays}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="14">14 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="45">45 Days</SelectItem>
              <SelectItem value="60">60 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Badge variant="outline" className="font-mono">{ticker} ${stockPrice.toFixed(2)}</Badge>
          <span className="text-muted-foreground">
            IV (implied): <span className="text-foreground font-mono">{(impliedVol * 100).toFixed(1)}%</span>
          </span>
          <span className="text-muted-foreground">
            HV (actual): <span className="text-foreground font-mono">{(historicalVol * 100).toFixed(1)}%</span>
          </span>
          {impliedVol > historicalVol && (
            <Badge variant="destructive" className="text-[10px]">Options are expensive (IV {'>'} HV)</Badge>
          )}
          {impliedVol < historicalVol && (
            <Badge className="text-[10px] bg-green-600">Options are cheap (IV {'<'} HV)</Badge>
          )}
        </div>
      </div>

      {/* Expected Move Summary */}
      {expectedMove && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">Expected Move Summary</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Based on current option prices, here's how far the stock is expected to move in {projectionDays} days.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-center">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Expected Move (±1σ)</div>
              <div className="text-lg font-bold font-mono">±${expectedMove.oneSD.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">±{expectedMove.pctMove.toFixed(1)}% of current price</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Most Likely Range (68%)</div>
              <div className="text-sm font-mono">${expectedMove.lower1.toFixed(2)} — ${expectedMove.upper1.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Stock ends here 2 out of 3 times</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Wide Range (95%)</div>
              <div className="text-sm font-mono">${expectedMove.lower2.toFixed(2)} — ${expectedMove.upper2.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Almost certain to stay within this</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Chance in Range</div>
              <div className="text-lg font-bold text-green-400">68.2%</div>
              <div className="text-xs text-muted-foreground">within the ±1σ band</div>
            </div>
          </div>
        </Card>
      )}

      {/* Probability Cone Chart */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-1">Probability Cone — {projectionDays} Day Projection</h3>
        <p className="text-xs text-muted-foreground mb-4">
          The darker inner band is the "most likely" zone. The lighter outer band is the "almost certain" zone.
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={coneData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Days from now', position: 'insideBottom', offset: -5 }} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
            />
            <Area dataKey="upper3" stroke="none" fill="hsl(var(--primary) / 0.05)" stackId="bg3" />
            <Area dataKey="lower3" stroke="none" fill="transparent" stackId="bg3" />
            <Area dataKey="upper2" stroke="hsl(var(--primary) / 0.3)" strokeDasharray="3 3" fill="hsl(var(--primary) / 0.1)" name="±2σ (95%)" />
            <Area dataKey="lower2" stroke="hsl(var(--primary) / 0.3)" strokeDasharray="3 3" fill="transparent" name="±2σ" />
            <Area dataKey="upper1" stroke="hsl(var(--primary) / 0.7)" fill="hsl(var(--primary) / 0.15)" name="±1σ (68%)" />
            <Area dataKey="lower1" stroke="hsl(var(--primary) / 0.7)" fill="transparent" name="±1σ" />
            <ReferenceLine y={stockPrice} stroke="hsl(var(--foreground))" strokeDasharray="4 4" label={{ value: `$${stockPrice.toFixed(2)}`, position: 'right', fontSize: 11 }} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground justify-center">
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary/15 border border-primary/70" /> ±1σ — 68% chance
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary/10 border border-primary/30 border-dashed" /> ±2σ — 95% chance
          </span>
        </div>
      </Card>
    </div>
  );
}
