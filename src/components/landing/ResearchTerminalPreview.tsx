import { useState } from 'react';
import { ArrowUpRight, Search, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LANDING_RANGES, type LandingRange, useLandingResearch } from './useLandingMarketData';

const number = (value: number | null | undefined, maximumFractionDigits = 2) => value != null && Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits }) : '—';
const dateLabel = (value: number) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function ResearchTerminalPreview({ onSearch }: { onSearch: () => void }) {
  const [ticker, setTicker] = useState('AAPL');
  const [range, setRange] = useState<LandingRange>('1Y');
  const { profile, history } = useLandingResearch(ticker, range);
  const bars = (history.data ?? []).filter(b => Number.isFinite(b.close));
  const last = bars[bars.length - 1];
  const previous = bars[bars.length - 2];
  const change = last && previous && previous.close > 0 ? (last.close / previous.close - 1) * 100 : null;
  const currency = profile.data?.currency || 'USD';
  const stats = [
    ['Period high', bars.length ? number(Math.max(...bars.map(b => b.high))) : '—'],
    ['Period low', bars.length ? number(Math.min(...bars.map(b => b.low))) : '—'],
    ['Last volume', last ? number(last.volume, 0) : '—'],
    ['Asset class', profile.data?.asset_type === 'CS' ? 'Equity' : profile.data?.asset_type || '—'],
    ['Sector', profile.data?.sector || '—'],
    ['Currency', currency],
  ];
  return <div className="terminal-frame overflow-hidden rounded border border-border bg-card">
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border bg-secondary/60 px-4 sm:px-6">
      <div className="flex items-center gap-2 text-xs"><span className="h-1.5 w-1.5 bg-primary" /><span className="font-medium">Asset Labs</span><span className="text-muted-foreground">/</span><span className="text-muted-foreground">Research workspace</span></div>
      <Button variant="ghost" size="icon-sm" onClick={onSearch} aria-label="Search research tickers"><Search /></Button>
    </div>
    <div className="grid md:grid-cols-[154px_minmax(0,1fr)]">
      <aside className="flex gap-1 border-b border-border bg-secondary/30 p-2 md:flex-col md:border-b-0 md:border-r md:p-4" aria-label="Preview assets">
        <p className="mb-3 hidden text-[10px] uppercase tracking-[0.12em] text-muted-foreground md:block">Market watch</p>
        {['AAPL', 'MSFT', 'GLD'].map(symbol => <Button key={symbol} variant="ghost" aria-pressed={ticker === symbol} onClick={() => setTicker(symbol)} className={cn('h-9 justify-start rounded-sm px-3 font-mono text-xs', ticker === symbol && 'bg-accent text-primary')}><span className="flex-1">{symbol}</span><ChevronRight className="hidden h-3 w-3 md:block" /></Button>)}
        <div className="mt-auto hidden pt-20 md:block"><p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">One workspace.</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Every angle on<br />your next idea.</p></div>
      </aside>
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-5 pt-6 sm:px-7">
          <div><div className="flex items-center gap-3"><h3 className="terminal-heading text-xl font-semibold">{profile.data?.name || ticker}</h3><span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{ticker}</span></div><p className="mt-1.5 text-xs text-muted-foreground">{profile.data?.primary_exchange || 'Public markets'} · {profile.data?.sector || profile.data?.asset_type || 'Asset research'}</p></div>
          <div className="text-right"><p className="font-mono text-2xl text-foreground">{last ? `${currency === 'USD' ? '$' : ''}${number(last.close)}` : '—'}</p>{change != null && <p className={cn('mt-1 font-mono text-[11px]', change >= 0 ? 'text-success' : 'text-destructive')}>{change >= 0 ? '+' : ''}{change.toFixed(2)}% <span className="text-muted-foreground">last session</span></p>}</div>
        </div>
        <nav aria-label="Research views" className="flex gap-5 border-b border-border px-5 text-xs sm:px-7"><span className="border-b-2 border-primary pb-3 font-medium text-primary">Overview</span>{[['Financials', 'financials'], ['News', 'news'], ['Backtest', 'backtest']].map(([label, tab]) => <Link key={tab} to={`/stock/${ticker}?tab=${tab}`} className="pb-3 text-muted-foreground hover:text-primary">{label}</Link>)}</nav>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_230px]">
          <div className="min-w-0 p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-2"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Price history · {currency}</p><div className="flex gap-0.5" aria-label="Chart period">{(Object.keys(LANDING_RANGES) as LandingRange[]).map(r => <Button key={r} variant="ghost" onClick={() => setRange(r)} aria-pressed={range === r} className={cn('h-7 rounded-sm px-2 font-mono text-[10px]', range === r && 'bg-accent text-primary')}>{r}</Button>)}</div></div>
            <div className="h-[210px] w-full sm:h-[240px]" aria-label={`${ticker} historical closing price chart`}>
              {bars.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={bars} margin={{ top: 10, right: 2, bottom: 0, left: -10 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={dateLabel} minTickGap={48} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'IBM Plex Mono' }} dy={8} />
                <YAxis domain={['auto', 'auto']} orientation="right" axisLine={false} tickLine={false} width={44} tickFormatter={v => number(v, 0)} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="rounded-sm border border-border bg-card p-3 font-mono text-xs"><p className="text-muted-foreground">{dateLabel(Number(label))}</p><p className="mt-1">{number(Number(payload[0].value))} {currency}</p></div> : null} />
                <Area dataKey="close" type="linear" stroke="hsl(var(--primary))" strokeWidth={1.5} fill="hsl(var(--primary))" fillOpacity={0.04} isAnimationActive={false} />
              </AreaChart></ResponsiveContainer> : <div role="status" className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">{history.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}{history.isLoading ? 'Loading market history…' : 'Price history currently unavailable'}</div>}
            </div>
            <p className="mt-4 text-[10px] text-muted-foreground">Historical daily closes · Polygon{last ? ` · As of ${dateLabel(last.date)}, ${new Date(last.date).getFullYear()}` : ''} · Not a real-time quote</p>
          </div>
          <div className="border-t border-border p-5 sm:p-7 lg:border-l lg:border-t-0"><p className="mb-4 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Key statistics</p><dl>{stats.map(([label, value]) => <div key={label} className="flex justify-between gap-3 border-b border-border py-2.5 text-[11px]"><dt className="text-muted-foreground">{label}</dt><dd className="max-w-[120px] text-right font-mono">{value}</dd></div>)}</dl><Button asChild variant="link" className="mt-3 h-auto p-0 text-xs"><Link to={`/stock/${ticker}?tab=financials`}>Explore fundamentals <ArrowUpRight /></Link></Button></div>
        </div>
        <div className="grid items-start gap-3 border-t border-border bg-secondary/35 px-5 py-4 sm:grid-cols-[125px_minmax(0,1fr)_auto] sm:px-7"><span className="flex items-center gap-2 text-xs font-medium"><Sparkles className="h-3.5 w-3.5 text-primary" />Research brief</span><p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{profile.data?.short_description || profile.data?.description || 'Connect company fundamentals, market news, and AI analysis in a single research view.'}</p><Button asChild variant="link" className="h-auto justify-start p-0 text-xs"><Link to={`/stock/${ticker}`}>Open AI research <ArrowUpRight /></Link></Button></div>
      </div>
    </div>
  </div>;
}