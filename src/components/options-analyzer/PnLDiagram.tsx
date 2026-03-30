import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

interface Props {
  ticker: string;
}

type StrategyType = 'long-call' | 'long-put' | 'bull-call-spread' | 'bear-put-spread' | 'iron-condor' | 'covered-call' | 'straddle' | 'strangle';

const STRATEGIES: Record<StrategyType, string> = {
  'long-call': 'Long Call',
  'long-put': 'Long Put',
  'bull-call-spread': 'Bull Call Spread',
  'bear-put-spread': 'Bear Put Spread',
  'iron-condor': 'Iron Condor',
  'covered-call': 'Covered Call',
  'straddle': 'Long Straddle',
  'strangle': 'Long Strangle',
};

export function PnLDiagram({ ticker }: Props) {
  const [strategy, setStrategy] = useState<StrategyType>('long-call');
  const [spotPrice, setSpotPrice] = useState('150');
  const [strike1, setStrike1] = useState('155');
  const [strike2, setStrike2] = useState('165');
  const [strike3, setStrike3] = useState('145');
  const [strike4, setStrike4] = useState('170');
  const [premium1, setPremium1] = useState('3.50');
  const [premium2, setPremium2] = useState('1.50');
  const [contracts, setContracts] = useState('1');

  const pnlData = useMemo(() => {
    const spot = parseFloat(spotPrice) || 150;
    const k1 = parseFloat(strike1) || 155;
    const k2 = parseFloat(strike2) || 165;
    const k3 = parseFloat(strike3) || 145;
    const k4 = parseFloat(strike4) || 170;
    const p1 = parseFloat(premium1) || 3.5;
    const p2 = parseFloat(premium2) || 1.5;
    const mult = (parseInt(contracts) || 1) * 100;

    const range = spot * 0.3;
    const lo = spot - range;
    const hi = spot + range;
    const step = (hi - lo) / 200;
    const data: { price: number; pnl: number; breakeven?: boolean }[] = [];

    for (let price = lo; price <= hi; price += step) {
      let pnl = 0;

      switch (strategy) {
        case 'long-call':
          pnl = (Math.max(0, price - k1) - p1) * mult;
          break;
        case 'long-put':
          pnl = (Math.max(0, k1 - price) - p1) * mult;
          break;
        case 'bull-call-spread':
          pnl = (Math.max(0, price - k1) - Math.max(0, price - k2) - (p1 - p2)) * mult;
          break;
        case 'bear-put-spread':
          pnl = (Math.max(0, k2 - price) - Math.max(0, k1 - price) - (p1 - p2)) * mult;
          break;
        case 'iron-condor':
          // Sell k1 put, buy k3 put, sell k2 call, buy k4 call
          pnl = (p1 + p2 
            - Math.max(0, k3 - price) + Math.max(0, k1 - price)
            - Math.max(0, price - k2) + Math.max(0, price - k4)
          ) * mult * 0.5; // approximate net credit
          break;
        case 'covered-call':
          pnl = ((price - spot) - Math.max(0, price - k1) + p1) * mult;
          break;
        case 'straddle':
          pnl = (Math.max(0, price - k1) + Math.max(0, k1 - price) - p1 * 2) * mult;
          break;
        case 'strangle':
          pnl = (Math.max(0, price - k2) + Math.max(0, k1 - price) - p1 - p2) * mult;
          break;
      }

      data.push({ price: Math.round(price * 100) / 100, pnl: Math.round(pnl * 100) / 100 });
    }
    return data;
  }, [strategy, spotPrice, strike1, strike2, strike3, strike4, premium1, premium2, contracts]);

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Config Panel */}
        <Card className="p-4 space-y-3 lg:col-span-1">
          <h3 className="text-sm font-semibold">Strategy Builder</h3>
          <div>
            <Label className="text-xs">Strategy</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as StrategyType)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STRATEGIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Current Price</Label>
            <Input value={spotPrice} onChange={(e) => setSpotPrice(e.target.value)} className="h-8 text-xs font-mono" type="number" />
          </div>
          <div>
            <Label className="text-xs">Strike 1</Label>
            <Input value={strike1} onChange={(e) => setStrike1(e.target.value)} className="h-8 text-xs font-mono" type="number" />
          </div>
          {showSecondStrike && (
            <div>
              <Label className="text-xs">Strike 2</Label>
              <Input value={strike2} onChange={(e) => setStrike2(e.target.value)} className="h-8 text-xs font-mono" type="number" />
            </div>
          )}
          {showThirdFourthStrike && (
            <>
              <div>
                <Label className="text-xs">Strike 3 (lower put)</Label>
                <Input value={strike3} onChange={(e) => setStrike3(e.target.value)} className="h-8 text-xs font-mono" type="number" />
              </div>
              <div>
                <Label className="text-xs">Strike 4 (upper call)</Label>
                <Input value={strike4} onChange={(e) => setStrike4(e.target.value)} className="h-8 text-xs font-mono" type="number" />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">Premium (per share)</Label>
            <Input value={premium1} onChange={(e) => setPremium1(e.target.value)} className="h-8 text-xs font-mono" type="number" step="0.01" />
          </div>
          {showSecondStrike && (
            <div>
              <Label className="text-xs">Premium 2 (per share)</Label>
              <Input value={premium2} onChange={(e) => setPremium2(e.target.value)} className="h-8 text-xs font-mono" type="number" step="0.01" />
            </div>
          )}
          <div>
            <Label className="text-xs">Contracts</Label>
            <Input value={contracts} onChange={(e) => setContracts(e.target.value)} className="h-8 text-xs font-mono" type="number" min="1" />
          </div>
        </Card>

        {/* P&L Chart */}
        <Card className="p-4 lg:col-span-3">
          {/* Metrics Bar */}
          {metrics && (
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">Max Profit</div>
                <div className={`text-sm font-bold font-mono ${metrics.maxProfit > 10000000 ? 'text-green-400' : 'text-green-400'}`}>
                  {metrics.maxProfit > 10000000 ? '∞' : `$${metrics.maxProfit.toLocaleString()}`}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">Max Loss</div>
                <div className="text-sm font-bold font-mono text-red-400">
                  ${metrics.maxLoss.toLocaleString()}
                </div>
              </div>
              {metrics.breakevens.length > 0 && (
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Breakeven(s)</div>
                  <div className="text-sm font-mono">
                    {metrics.breakevens.map(b => `$${b.toFixed(2)}`).join(', ')}
                  </div>
                </div>
              )}
              <Badge variant="outline" className="ml-auto font-mono text-xs">{STRATEGIES[strategy]}</Badge>
            </div>
          )}

          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={pnlData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="price" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'P&L']}
                labelFormatter={(v) => `Price: $${v}`}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <ReferenceLine x={parseFloat(spotPrice)} stroke="hsl(var(--foreground) / 0.5)" strokeDasharray="4 4" label={{ value: 'Current', position: 'top', fontSize: 10 }} />
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="transparent" stopOpacity={0} />
                  <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="hsl(var(--primary))"
                fill="url(#pnlGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
