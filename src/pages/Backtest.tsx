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
import { Plus, X, Play, Loader2, LineChart, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    years?: number;
  };
  dataQuality?: {
    totalRows: number;
    tradingDays: number;
    expectedDays: number;
    completeness: number;
    dateRange: {
      requested: { start: string; end: string };
      actual: { start: string; end: string };
    };
    rowsPerTicker: Record<string, number>;
  };
  warnings?: string[];
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

  // Regime and optimization state
  const [regime, setRegime] = useState<{
    currentRegime: { 
      regime: string; 
      turbulenceIndex: number; 
      volatility: number;
      date: string;
    } | null;
    signals: Array<{ date: string; regime: string; turbulenceIndex: number }>;
    summary: { assetsAnalyzed: number; assets: string[] };
  } | null>(null);
  const [optimalWeights, setOptimalWeights] = useState<{
    weights: Record<string, number>;
    regime: string;
    expectedVolatility: number;
    correlationMatrix: Record<string, Record<string, number>>;
    volatilities: Record<string, number>;
    methodology?: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const runAnalysis = async () => {
    if (tickers.length < 3) {
      toast.error('Need at least 3 tickers for regime analysis');
      return;
    }

    setIsAnalyzing(true);
    setRegime(null);
    setOptimalWeights(null);

    try {
      // Step 1: Detect regime
      const { data: regimeData, error: regimeError } = await supabase.functions.invoke('detect-regime', {
        body: { tickers, lookbackDays: 60 }
      });

      if (regimeError) throw regimeError;
      
      if (!regimeData?.success) {
        throw new Error(regimeData?.error || 'Regime detection failed');
      }
      
      setRegime(regimeData);
      const currentRegimeType = regimeData.currentRegime?.regime || 'normal';

      // Step 2: Get optimal weights using detected regime
      const { data: optData, error: optError } = await supabase.functions.invoke('optimize-portfolio', {
        body: { tickers, regime: currentRegimeType }
      });

      if (optError) throw optError;
      
      if (!optData?.success) {
        throw new Error(optData?.error || 'Optimization failed');
      }
      
      setOptimalWeights(optData);
      toast.success('Analysis complete!');
    } catch (e) {
      console.error('Analysis error:', e);
      toast.error(e instanceof Error ? e.message : 'Analysis failed. Make sure you have run a backtest first to populate the cache.');
    } finally {
      setIsAnalyzing(false);
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

            {/* Run Buttons */}
            <div className="space-y-2">
              <Button onClick={runBacktest} disabled={isLoading || isAnalyzing} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
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

              <Button
                onClick={runAnalysis}
                disabled={isLoading || isAnalyzing || tickers.length < 3}
                variant="outline"
                className="w-full border-border"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    Analyze Regime
                  </>
                )}
              </Button>
              {tickers.length < 3 && (
                <p className="text-xs text-muted-foreground text-center">Add 3+ tickers for regime analysis</p>
              )}
            </div>
          </Card>

          {/* Right Panel - Results */}
          <Card className="lg:col-span-2 p-6 bg-card border-border">
            {results ? (
              <div className="space-y-6">
                {/* Data Quality Warnings */}
                {results.warnings && results.warnings.length > 0 && (
                  <Alert className="border-amber-500/50 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-200">
                      <p className="font-medium mb-1">Data Quality Warnings</p>
                      <ul className="text-sm space-y-1">
                        {results.warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

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
                    <p className={cn("text-2xl font-bold", results.metrics.annualizedReturn >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {results.metrics.annualizedReturn >= 0 ? '+' : ''}{results.metrics.annualizedReturn}%
                    </p>
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

                {/* Data Quality Info */}
                {results.dataQuality && (
                  <Card className="p-4 bg-muted/50 border-border">
                    <p className="text-sm font-medium text-foreground mb-3">Data Quality</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Trading Days</span>
                        <p className="text-foreground font-medium">{results.dataQuality.tradingDays}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expected</span>
                        <p className="text-foreground font-medium">~{results.dataQuality.expectedDays}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completeness</span>
                        <p className={cn("font-medium", results.dataQuality.completeness >= 90 ? "text-emerald-400" : "text-amber-400")}>
                          {results.dataQuality.completeness}%
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Years</span>
                        <p className="text-foreground font-medium">{results.metrics.years || (results.dataQuality.tradingDays / 252).toFixed(2)}</p>
                      </div>
                    </div>
                  </Card>
                )}

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

                {/* Regime Analysis Section */}
                {(regime || optimalWeights) && (
                  <Card className="p-6 bg-card border-border mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="h-5 w-5 text-emerald-500" />
                      <h2 className="text-lg font-semibold text-foreground">Regime Analysis & Optimization</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Current Regime */}
                      {regime?.currentRegime && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-muted-foreground">Current Market Regime</h3>
                          
                          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                            <Badge 
                              className={cn(
                                "text-lg px-4 py-2 font-bold",
                                regime.currentRegime.regime === 'low_vol' && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                                regime.currentRegime.regime === 'normal' && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                                regime.currentRegime.regime === 'high_vol' && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                                regime.currentRegime.regime === 'crisis' && "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                              )}
                            >
                              {regime.currentRegime.regime.replace('_', ' ').toUpperCase()}
                            </Badge>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Turbulence</p>
                                <p className="text-xl font-bold text-foreground">{regime.currentRegime.turbulenceIndex}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Volatility</p>
                                <p className="text-xl font-bold text-foreground">{regime.currentRegime.volatility}%</p>
                              </div>
                            </div>
                          </div>
                          
                          {(regime.currentRegime.regime === 'high_vol' || regime.currentRegime.regime === 'crisis') && (
                            <Alert className="bg-amber-500/10 border-amber-500/30">
                              <AlertTriangle className="h-4 w-4 text-amber-400" />
                              <AlertDescription className="text-amber-400">
                                Elevated volatility detected. Consider increasing allocation to defensive assets (GLD, TLT, TIP, BND).
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {regime.currentRegime.regime === 'low_vol' && (
                            <Alert className="bg-emerald-500/10 border-emerald-500/30">
                              <TrendingUp className="h-4 w-4 text-emerald-400" />
                              <AlertDescription className="text-emerald-400">
                                Low volatility regime. Favorable conditions for growth-oriented allocations.
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          <p className="text-xs text-muted-foreground">
                            Based on {regime.summary.assetsAnalyzed} assets: {regime.summary.assets.join(', ')}
                          </p>
                        </div>
                      )}

                      {/* Optimal Weights */}
                      {optimalWeights && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-muted-foreground">HRP Optimal Weights</h3>
                            <span className="text-xs text-muted-foreground">
                              Expected Vol: {optimalWeights.expectedVolatility}%
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            {Object.entries(optimalWeights.weights)
                              .sort((a, b) => b[1] - a[1])
                              .map(([ticker, weight]) => (
                                <div key={ticker} className="flex items-center justify-between p-2 rounded bg-muted/30">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground w-12">{ticker}</span>
                                    <span className="text-xs text-muted-foreground">
                                      (Vol: {optimalWeights.volatilities[ticker]}%)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 bg-muted rounded-full h-2">
                                      <div
                                        className={cn(
                                          "rounded-full h-2 transition-all",
                                          weight > 20 ? "bg-emerald-500" : weight > 10 ? "bg-blue-500" : "bg-muted-foreground"
                                        )}
                                        style={{ width: `${Math.min(weight, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-mono text-foreground w-14 text-right">
                                      {weight.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                          
                          <p className="text-xs text-muted-foreground">
                            {optimalWeights.methodology}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
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
