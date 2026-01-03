import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, X, Play, Loader2, LineChart, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const POPULAR_TICKERS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA'];

interface BacktestResults {
  success: boolean;
  metrics: {
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    initialCapital: number;
    finalValue: number;
    tradingDays: number;
    totalTrades: number;
    volatility: number;
  };
  portfolioHistory: Array<{ date: string; value: number }>;
  finalHoldings: Record<string, number>;
  trades: Array<{
    date: string;
    ticker: string;
    action: 'BUY' | 'SELL';
    shares: number;
    price: number;
  }>;
}

export default function BacktestPage() {
  const [tickers, setTickers] = useState(['SPY']);
  const [tickerInput, setTickerInput] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 5);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [strategy, setStrategy] = useState('buy_hold');
  const [rebalance, setRebalance] = useState('monthly');
  const [capital, setCapital] = useState(100000);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [results, setResults] = useState<BacktestResults | null>(null);

  const addTicker = () => {
    const t = tickerInput.toUpperCase().trim();
    if (t && !tickers.includes(t) && t.length <= 5) {
      setTickers([...tickers, t]);
      setTickerInput('');
    }
  };

  const removeTicker = (t: string) => setTickers(tickers.filter(x => x !== t));

  const setQuickRange = (years: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    setStartDate(d.toISOString().split('T')[0]);
  };

  const runBacktest = async () => {
    if (tickers.length === 0) {
      toast.error('Add at least one ticker');
      return;
    }

    setIsLoading(true);
    setResults(null);

    try {
      // Step 1: Fetch data (uses cache if available)
      setIsFetching(true);
      const { data: fetchResult, error: fetchError } = await supabase.functions.invoke('fetch-stock-batch', {
        body: { tickers, startDate, endDate }
      });
      setIsFetching(false);

      if (fetchError) throw fetchError;
      if (!fetchResult?.success) throw new Error(fetchResult?.error || 'Failed to fetch data');

      const summary = fetchResult.summary;
      toast.success(`Data ready: ${summary.fromCache} cached, ${summary.fromApi} fetched`);

      // Step 2: Run backtest
      const { data: backtestResult, error: backtestError } = await supabase.functions.invoke('run-backtest', {
        body: {
          tickers,
          startDate,
          endDate,
          initialCapital: capital,
          strategy,
          rebalanceFrequency: rebalance
        }
      });

      if (backtestError) throw backtestError;
      if (!backtestResult?.success) throw new Error(backtestResult?.error || 'Backtest failed');

      setResults(backtestResult);
      toast.success('Backtest complete!');

    } catch (e) {
      console.error('Backtest error:', e);
      toast.error(e instanceof Error ? e.message : 'Backtest failed');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <LineChart className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Portfolio Backtester</h1>
            <p className="text-muted-foreground text-sm">Test investment strategies with historical data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <Card className="p-6 space-y-6 bg-card border-border">
            {/* Tickers */}
            <div className="space-y-3">
              <Label className="text-foreground">Tickers</Label>
              <div className="flex gap-2">
                <Input
                  value={tickerInput}
                  onChange={e => setTickerInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && addTicker()}
                  placeholder="Enter ticker..."
                  className="bg-muted border-border text-foreground"
                  maxLength={5}
                />
                <Button onClick={addTicker} size="icon" variant="outline" className="border-border">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {tickers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tickers.map(t => (
                    <Badge key={t} variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                      {t}
                      <button onClick={() => removeTicker(t)} className="ml-1 hover:text-rose-400">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Quick add:</span>
                {POPULAR_TICKERS.map(t => (
                  <Button
                    key={t}
                    variant="outline"
                    size="sm"
                    onClick={() => !tickers.includes(t) && setTickers([...tickers, t])}
                    disabled={tickers.includes(t)}
                    className="text-xs h-7 border-border"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-foreground">Date Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    className="bg-muted border-border text-foreground" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    className="bg-muted border-border text-foreground" 
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {[1, 3, 5, 10].map(y => (
                  <Button key={y} variant="outline" size="sm" onClick={() => setQuickRange(y)} className="text-xs border-border">
                    {y}Y
                  </Button>
                ))}
              </div>
            </div>

            {/* Strategy */}
            <div className="space-y-3">
              <Label className="text-foreground">Strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy_hold">Buy & Hold</SelectItem>
                  <SelectItem value="equal_weight">Equal Weight Rebalancing</SelectItem>
                </SelectContent>
              </Select>
              
              {strategy === 'equal_weight' && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Rebalance</Label>
                  <Select value={rebalance} onValueChange={setRebalance}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Capital */}
            <div className="space-y-3">
              <Label className="text-foreground">Initial Capital</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={capital}
                  onChange={e => setCapital(Number(e.target.value))}
                  className="bg-muted border-border text-foreground pl-7"
                />
              </div>
            </div>

            {/* Run Button */}
            <Button onClick={runBacktest} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isFetching ? 'Fetching Data...' : 'Running Backtest...'}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Backtest
                </>
              )}
            </Button>
          </Card>

          {/* Right Panel - Results */}
          <Card className="lg:col-span-2 p-6 bg-card border-border">
            {results ? (
              <div className="space-y-6">
                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 bg-muted/50 border-border">
                    <p className="text-xs text-muted-foreground">Total Return</p>
                    <p className={cn("text-2xl font-bold", results.metrics.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {results.metrics.totalReturn >= 0 ? '+' : ''}{results.metrics.totalReturn}%
                    </p>
                  </Card>
                  <Card className="p-4 bg-muted/50 border-border">
                    <p className="text-xs text-muted-foreground">Annualized</p>
                    <p className="text-2xl font-bold text-foreground">{results.metrics.annualizedReturn}%</p>
                  </Card>
                  <Card className="p-4 bg-muted/50 border-border">
                    <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                    <p className="text-2xl font-bold text-foreground">{results.metrics.sharpeRatio}</p>
                  </Card>
                  <Card className="p-4 bg-muted/50 border-border">
                    <p className="text-xs text-muted-foreground">Max Drawdown</p>
                    <p className="text-2xl font-bold text-rose-400">-{results.metrics.maxDrawdown}%</p>
                  </Card>
                </div>

                {/* Chart */}
                <Card className="p-4 bg-muted/50 border-border">
                  <p className="text-sm font-medium text-foreground mb-4">Portfolio Value</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={results.portfolioHistory}>
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                          tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                          labelFormatter={(d) => new Date(d).toLocaleDateString()}
                          formatter={(v: number) => [`$${v.toLocaleString()}`, 'Value']}
                        />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--emerald-500))" strokeWidth={2} dot={false} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-muted/50 border-border">
                    <p className="text-sm font-medium text-foreground mb-3">Final Holdings</p>
                    <div className="space-y-2">
                      {Object.entries(results.finalHoldings || {}).map(([ticker, shares]) => (
                        <div key={ticker} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{ticker}</span>
                          <span className="text-foreground">{shares} shares</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-4 bg-muted/50 border-border">
                    <p className="text-sm font-medium text-foreground mb-3">Statistics</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Initial Capital</span><span className="text-foreground">${results.metrics.initialCapital.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Final Value</span><span className="text-foreground">${results.metrics.finalValue.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Trading Days</span><span className="text-foreground">{results.metrics.tradingDays}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total Trades</span><span className="text-foreground">{results.metrics.totalTrades}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Volatility</span><span className="text-foreground">{results.metrics.volatility}%</span></div>
                    </div>
                  </Card>
                </div>

                {/* Trades */}
                {results.trades?.length > 0 && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="trades" className="border-border">
                      <AccordionTrigger className="text-foreground">Trade History ({results.trades.length} trades)</AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border">
                              <TableHead className="text-muted-foreground">Date</TableHead>
                              <TableHead className="text-muted-foreground">Ticker</TableHead>
                              <TableHead className="text-muted-foreground">Action</TableHead>
                              <TableHead className="text-muted-foreground">Shares</TableHead>
                              <TableHead className="text-muted-foreground">Price</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.trades.slice(0, 50).map((trade, i) => (
                              <TableRow key={i} className="border-border">
                                <TableCell className="text-foreground">{new Date(trade.date).toLocaleDateString()}</TableCell>
                                <TableCell className="text-foreground">{trade.ticker}</TableCell>
                                <TableCell>
                                  <Badge variant={trade.action === 'BUY' ? 'default' : 'destructive'} className={trade.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : ''}>
                                    {trade.action}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-foreground">{trade.shares}</TableCell>
                                <TableCell className="text-foreground">${trade.price.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <Activity className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-foreground">Configure & Run Backtest</p>
                <p className="text-sm text-muted-foreground max-w-md mt-2">
                  Add tickers, select a date range and strategy, then click Run to see historical performance
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
