import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Explainer } from './Explainer';

interface Props {
  ticker: string;
}

type StrategyType = 'long-call' | 'long-put' | 'bull-call-spread' | 'bear-put-spread' | 'iron-condor' | 'covered-call' | 'straddle' | 'strangle';

const STRATEGIES: Record<StrategyType, { label: string; description: string }> = {
  'long-call': { label: 'Long Call', description: 'You buy a call — you profit if the stock goes UP above the strike. Your max loss is the premium you paid.' },
  'long-put': { label: 'Long Put', description: 'You buy a put — you profit if the stock goes DOWN below the strike. Great for protecting against drops.' },
  'bull-call-spread': { label: 'Bull Call Spread', description: 'Buy a call and sell a higher call. Cheaper than a single call, but caps your upside. Bullish strategy.' },
  'bear-put-spread': { label: 'Bear Put Spread', description: 'Buy a put and sell a lower put. Profits when stock drops, with limited risk.' },
  'iron-condor': { label: 'Iron Condor', description: 'Sell both a call spread and a put spread. You profit when the stock stays in a range. An income strategy.' },
  'covered-call': { label: 'Covered Call', description: 'Own the stock and sell a call against it. Collects premium income, but caps your upside.' },
  'straddle': { label: 'Long Straddle', description: 'Buy both a call and put at the same strike. Profits from a BIG move in either direction. Great before earnings.' },
  'strangle': { label: 'Long Strangle', description: 'Buy a call and put at different strikes. Similar to straddle but cheaper. Needs an even bigger move to profit.' },
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
        case 'straddle': pnl = (Math.max(0, price - k1) + Math.max(0, k1 - price) - p1 * 2) * mult; break;
        case 'strangle': pnl = (Math.max(0, price - k2) + Math.max(0, k1 - price) - p1 - p2) * mult; break;
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
    <div className="space-y-6">
      {/* Beginner Explainer */}
      <Explainer>
        <strong>What is a P&L Diagram?</strong> It shows how much money you'd make (or lose) at every possible stock price when your option expires. 
        The horizontal axis is the stock price; the vertical axis is your profit or loss. Where the line crosses zero is your "breakeven" — 
        you need the stock to be past that point to make money. The green zone is profit, the red zone is loss.
      </Explainer>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Config Panel */}
        <Card className="p-5 space-y-4 lg:col-span-1">
          <h3 className="text-sm font-semibold">Strategy Builder</h3>
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
          <div>
            <Label className="text-xs mb-1.5 block">Current Stock Price ($)</Label>
            <Input value={spotPrice} onChange={(e) => setSpotPrice(e.target.value)} className="h-8 text-xs font-mono" type="number" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Strike Price ($)</Label>
            <Input value={strike1} onChange={(e) => setStrike1(e.target.value)} className="h-8 text-xs font-mono" type="number" />
            <p className="text-[10px] text-muted-foreground mt-1">The price you can buy/sell the stock at</p>
          </div>
          {showSecondStrike && (
            <div>
              <Label className="text-xs mb-1.5 block">Strike 2 ($)</Label>
              <Input value={strike2} onChange={(e) => setStrike2(e.target.value)} className="h-8 text-xs font-mono" type="number" />
            </div>
          )}
          {showThirdFourthStrike && (
            <>
              <div>
                <Label className="text-xs mb-1.5 block">Strike 3 — lower put ($)</Label>
                <Input value={strike3} onChange={(e) => setStrike3(e.target.value)} className="h-8 text-xs font-mono" type="number" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Strike 4 — upper call ($)</Label>
                <Input value={strike4} onChange={(e) => setStrike4(e.target.value)} className="h-8 text-xs font-mono" type="number" />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs mb-1.5 block">Premium (cost per share, $)</Label>
            <Input value={premium1} onChange={(e) => setPremium1(e.target.value)} className="h-8 text-xs font-mono" type="number" step="0.01" />
            <p className="text-[10px] text-muted-foreground mt-1">What you pay (or receive) for the option</p>
          </div>
          {showSecondStrike && (
            <div>
              <Label className="text-xs mb-1.5 block">Premium 2 ($)</Label>
              <Input value={premium2} onChange={(e) => setPremium2(e.target.value)} className="h-8 text-xs font-mono" type="number" step="0.01" />
            </div>
          )}
          <div>
            <Label className="text-xs mb-1.5 block">Number of Contracts</Label>
            <Input value={contracts} onChange={(e) => setContracts(e.target.value)} className="h-8 text-xs font-mono" type="number" min="1" />
            <p className="text-[10px] text-muted-foreground mt-1">Each contract = 100 shares</p>
          </div>
        </Card>

        {/* P&L Chart */}
        <Card className="p-5 lg:col-span-3">
          {/* Metrics Bar */}
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
                  <div className="text-xs text-muted-foreground mb-0.5">Breakeven Price(s)</div>
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
              <ReferenceLine x={parseFloat(spotPrice)} stroke="hsl(var(--foreground) / 0.5)" strokeDasharray="4 4" label={{ value: 'Current Price', position: 'top', fontSize: 10 }} />
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
