import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Play, TrendingUp, TrendingDown, Network, BarChart3, PieChart, AlertTriangle, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { NeuroSymbolicOptimizer, AssetData, RegimeSignal as OptimizerRegimeSignal } from '@/services/portfolioOptimizer';
import { runBacktest, BacktestResult } from '@/services/backtestEngine';
import { polygonData, CorrelationMatrix, RegimeSignal as PolygonRegimeSignal } from '@/services/polygonDataHandler';

// Extended RegimeSignal for UI
interface RegimeSignal {
  regime: 'low_vol' | 'normal' | 'high_vol' | 'crisis';
  turbulenceIndex: number;
  volatility: number;
  date: string;
}

const NeuroSymbolicEngine = () => {
  // State
  const [tickers, setTickers] = useState(['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'GOOGL', 'GLD', 'TLT', 'VNQ']);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [initialCapital, setInitialCapital] = useState(100000);
  const [rebalanceFrequency, setRebalanceFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [assetData, setAssetData] = useState<Map<string, AssetData> | null>(null);
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrix | null>(null);
  const [regimeSignals, setRegimeSignals] = useState<RegimeSignal[]>([]);
  const [currentRegime, setCurrentRegime] = useState<RegimeSignal | null>(null);
  const [optimalWeights, setOptimalWeights] = useState<Map<string, number> | null>(null);
  const [expectedMetrics, setExpectedMetrics] = useState<{ return: number; vol: number; sharpe: number } | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);

  // Handlers
  const handleAnalyze = async () => {
    if (tickers.length < 3) {
      toast.error('Need at least 3 tickers for analysis');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setProgressMsg('Fetching historical data...');

    try {
      // Fetch data using Polygon API
      const assetDataMap = await polygonData.fetchAndCleanHistory(
        tickers,
        startDate,
        endDate,
        (msg, pct) => {
          setProgressMsg(msg);
          setProgress(pct * 0.5);
        }
      );

      const activeTickers = Array.from(assetDataMap.keys());
      if (activeTickers.length < 3) {
        throw new Error('Need at least 3 tickers with valid data');
      }

      // Build correlation matrix using Polygon data
      setProgressMsg('Building correlation matrix...');
      setProgress(60);
      
      const corrMatrix = polygonData.buildCorrelationMatrix(assetDataMap);
      setCorrelationMatrix(corrMatrix);

      // Calculate regime signal using Polygon data
      setProgressMsg('Detecting market regime...');
      setProgress(70);

      const signals = polygonData.getRegimeProxy(assetDataMap);
      const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null;

      if (latestSignal) {
        // Convert to the component's expected format
        const signal: RegimeSignal = {
          regime: latestSignal.regime,
          turbulenceIndex: parseFloat(latestSignal.turbulenceIndex.toFixed(2)),
          volatility: 0, // Will calculate below
          date: endDate
        };

        // Calculate average volatility across all assets
        let totalVol = 0;
        assetDataMap.forEach(asset => {
          totalVol += asset.volatility;
        });
        signal.volatility = parseFloat(((totalVol / assetDataMap.size) * 100).toFixed(2));

        setCurrentRegime(signal);
        setRegimeSignals([signal]);
      }

      // Convert Polygon AssetData to optimizer format
      const optimizerAssetData = new Map<string, AssetData>();
      assetDataMap.forEach((asset, ticker) => {
        const returns = asset.returns;
        const avgReturn = returns.length > 0 
          ? returns.reduce((a, b) => a + b, 0) / returns.length * 252
          : 0;
        
        // Calculate skewness and kurtosis
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length || 0;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        
        const skewness = stdDev > 0 
          ? returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length
          : 0;
        const kurtosis = stdDev > 0
          ? returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length
          : 3;

        optimizerAssetData.set(ticker, {
          ticker,
          volatility: asset.volatility,
          avgReturn,
          skewness,
          kurtosis,
          volume: asset.bars.reduce((sum, b) => sum + b.volume, 0) / asset.bars.length
        });
      });

      setAssetData(optimizerAssetData);

      // Compute optimal weights
      setProgressMsg('Computing optimal weights...');
      setProgress(85);

      const optimizer = new NeuroSymbolicOptimizer();
      
      // Build correlation matrix in optimizer format
      const optimizerCorr = {
        symbols: corrMatrix.tickers,
        matrix: corrMatrix.matrix
      };

      // Convert polygon signal to optimizer format
      const optimizerSignal: OptimizerRegimeSignal = latestSignal 
        ? {
            regime: latestSignal.regime,
            turbulenceIndex: latestSignal.turbulenceIndex,
            volatility: currentRegime?.volatility || 15,
            date: endDate
          }
        : { regime: 'normal', turbulenceIndex: 10, volatility: 15, date: endDate };

      const optimal = optimizer.computeOptimalWeights(
        optimizerAssetData,
        optimizerCorr,
        optimizerSignal,
        activeTickers
      );

      setOptimalWeights(optimal.weights);
      setExpectedMetrics({
        return: optimal.expectedReturn,
        vol: optimal.expectedVol,
        sharpe: optimal.sharpeRatio
      });

      setProgress(100);
      setProgressMsg('Analysis complete!');
      toast.success('Analysis complete!');

    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBacktest = async () => {
    if (tickers.length < 2) {
      toast.error('Need at least 2 tickers');
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const result = await runBacktest(
        tickers,
        startDate,
        endDate,
        initialCapital,
        (msg, pct) => {
          setProgressMsg(msg);
          setProgress(pct);
        }
      );
      setBacktestResult(result);
      toast.success('Backtest complete!');
    } catch (error) {
      console.error('Backtest error:', error);
      toast.error(error instanceof Error ? error.message : 'Backtest failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function
  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length);
    if (n < 5) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let cov = 0, varX = 0, varY = 0;
    for (let i = 0; i < n; i++) {
      cov += (x[i] - meanX) * (y[i] - meanY);
      varX += Math.pow(x[i] - meanX, 2);
      varY += Math.pow(y[i] - meanY, 2);
    }

    return varX > 0 && varY > 0 ? cov / Math.sqrt(varX * varY) : 0;
  };

  // Prepare chart data
  const weightsChartData = optimalWeights 
    ? Array.from(optimalWeights.entries())
        .map(([ticker, weight]) => ({ ticker, weight: weight * 100 }))
        .sort((a, b) => b.weight - a.weight)
    : [];

  const backtestChartData = backtestResult?.snapshots.map(s => ({
    date: s.date.toISOString().split('T')[0],
    value: s.portfolioValue,
    regime: s.regime
  })) || [];

  const regimeColors: Record<string, string> = {
    'low_vol': 'hsl(var(--chart-1))',
    'normal': 'hsl(var(--chart-2))',
    'high_vol': 'hsl(var(--chart-3))',
    'crisis': 'hsl(var(--chart-5))'
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Neuro-Symbolic Engine</h1>
            <p className="text-sm text-muted-foreground">GNN + HRP Portfolio Optimization</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="configuration" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="regime">Regime Analysis</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="backtest">Backtest Results</TabsTrigger>
        </TabsList>

        {/* TAB 1: CONFIGURATION */}
        <TabsContent value="configuration">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5 text-purple-500" />
                Asset Universe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tickers (comma separated)</Label>
                <Input
                  value={tickers.join(', ')}
                  onChange={e => setTickers(e.target.value.split(',').map(t => t.trim().toUpperCase()).filter(Boolean))}
                  placeholder="SPY, QQQ, AAPL, MSFT..."
                  className="bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              <div>
                <Label>Initial Capital</Label>
                <Input
                  type="number"
                  value={initialCapital}
                  onChange={e => setInitialCapital(Number(e.target.value))}
                  className="bg-background"
                />
              </div>

              <div>
                <Label>Rebalance Frequency</Label>
                <Select value={rebalanceFrequency} onValueChange={v => setRebalanceFrequency(v as 'weekly' | 'monthly')}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAnalyze} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Analyze Data
                    </>
                  )}
                </Button>
                <Button onClick={handleBacktest} disabled={isLoading || !assetData} variant="outline">
                  <Play className="h-4 w-4 mr-2" />
                  Run Backtest
                </Button>
              </div>

              {isLoading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground">{progressMsg}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: REGIME ANALYSIS */}
        <TabsContent value="regime">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Current Market Regime</CardTitle>
              </CardHeader>
              <CardContent>
                {currentRegime ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Badge
                        className={cn(
                          "text-lg px-4 py-2 font-bold",
                          currentRegime.regime === 'low_vol' && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                          currentRegime.regime === 'normal' && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                          currentRegime.regime === 'high_vol' && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                          currentRegime.regime === 'crisis' && "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                        )}
                      >
                        {currentRegime.regime.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Turbulence Index</p>
                        <p className={cn(
                          "text-2xl font-bold",
                          currentRegime.turbulenceIndex > 20 ? "text-rose-500" :
                          currentRegime.turbulenceIndex > 12 ? "text-amber-500" : "text-emerald-500"
                        )}>
                          {currentRegime.turbulenceIndex}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Annualized Volatility</p>
                        <p className="text-2xl font-bold text-foreground">{currentRegime.volatility}%</p>
                      </div>
                    </div>

                    {(currentRegime.regime === 'high_vol' || currentRegime.regime === 'crisis') && (
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-amber-400 font-medium">Elevated Volatility</p>
                          <p className="text-sm text-amber-400/80">
                            Consider increasing allocation to defensive assets (GLD, TLT, TIP).
                          </p>
                        </div>
                      </div>
                    )}

                    {currentRegime.regime === 'low_vol' && (
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-emerald-400 font-medium">Low Volatility Regime</p>
                          <p className="text-sm text-emerald-400/80">
                            Favorable conditions for growth-oriented allocations.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Run analysis to detect current regime</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Regime Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10">
                    <span className="text-sm font-medium text-emerald-400">Low Volatility</span>
                    <span className="text-xs text-muted-foreground">Turbulence &lt; 8</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
                    <span className="text-sm font-medium text-blue-400">Normal</span>
                    <span className="text-xs text-muted-foreground">8 - 15</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10">
                    <span className="text-sm font-medium text-amber-400">High Volatility</span>
                    <span className="text-xs text-muted-foreground">15 - 25</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10">
                    <span className="text-sm font-medium text-rose-400">Crisis</span>
                    <span className="text-xs text-muted-foreground">&gt; 25</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: OPTIMIZATION */}
        <TabsContent value="optimization">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-500" />
                  Optimal Weights (HRP)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weightsChartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weightsChartData} layout="vertical">
                        <XAxis type="number" domain={[0, 'auto']} tickFormatter={v => `${v.toFixed(0)}%`} />
                        <YAxis type="category" dataKey="ticker" width={60} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Weight']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                          {weightsChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.weight > 15 ? 'hsl(var(--chart-1))' : entry.weight > 8 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-4))'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-10">Run analysis to compute optimal weights</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Expected Return</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={cn(
                    "text-2xl font-bold",
                    expectedMetrics && expectedMetrics.return > 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {expectedMetrics ? `${expectedMetrics.return.toFixed(2)}%` : '—'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Expected Volatility</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">
                    {expectedMetrics ? `${expectedMetrics.vol.toFixed(2)}%` : '—'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Sharpe Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={cn(
                    "text-2xl font-bold",
                    expectedMetrics && expectedMetrics.sharpe > 0.5 ? "text-emerald-500" : "text-amber-500"
                  )}>
                    {expectedMetrics ? expectedMetrics.sharpe.toFixed(2) : '—'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: BACKTEST RESULTS */}
        <TabsContent value="backtest">
          {backtestResult ? (
            <div className="space-y-6">
              {/* Performance Chart */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-emerald-500" />
                    Portfolio Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={backtestChartData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={v => v.slice(5)}
                        />
                        <YAxis 
                          tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--chart-1))" 
                          fillOpacity={1} 
                          fill="url(#colorValue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border p-4">
                  <p className="text-xs text-muted-foreground">Total Return</p>
                  <p className={cn(
                    "text-xl font-bold",
                    backtestResult.metrics.totalReturn > 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {(backtestResult.metrics.totalReturn * 100).toFixed(2)}%
                  </p>
                </Card>
                <Card className="bg-card border-border p-4">
                  <p className="text-xs text-muted-foreground">CAGR</p>
                  <p className={cn(
                    "text-xl font-bold",
                    backtestResult.metrics.cagr > 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {(backtestResult.metrics.cagr * 100).toFixed(2)}%
                  </p>
                </Card>
                <Card className="bg-card border-border p-4">
                  <p className="text-xs text-muted-foreground">Volatility</p>
                  <p className="text-xl font-bold text-foreground">
                    {(backtestResult.metrics.volatility * 100).toFixed(2)}%
                  </p>
                </Card>
                <Card className="bg-card border-border p-4">
                  <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
                  <p className={cn(
                    "text-xl font-bold",
                    backtestResult.metrics.sharpeRatio > 0.5 ? "text-emerald-500" : "text-amber-500"
                  )}>
                    {backtestResult.metrics.sharpeRatio.toFixed(2)}
                  </p>
                </Card>
                <Card className="bg-card border-border p-4">
                  <p className="text-xs text-muted-foreground">Sortino Ratio</p>
                  <p className="text-xl font-bold text-foreground">
                    {backtestResult.metrics.sortinoRatio.toFixed(2)}
                  </p>
                </Card>
                <Card className="bg-card border-border p-4">
                  <p className="text-xs text-muted-foreground">Max Drawdown</p>
                  <p className="text-xl font-bold text-rose-500">
                    {(backtestResult.metrics.maxDrawdown * 100).toFixed(2)}%
                  </p>
                </Card>
                <Card className="bg-card border-border p-4">
                  <p className="text-xs text-muted-foreground">Calmar Ratio</p>
                  <p className="text-xl font-bold text-foreground">
                    {backtestResult.metrics.calmarRatio.toFixed(2)}
                  </p>
                </Card>
                <Card className="bg-card border-border p-4">
                  <p className="text-xs text-muted-foreground">After-Tax Return</p>
                  <p className={cn(
                    "text-xl font-bold",
                    backtestResult.metrics.afterTaxReturn > 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {(backtestResult.metrics.afterTaxReturn * 100).toFixed(2)}%
                  </p>
                </Card>
              </div>

              {/* Regime Breakdown */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Regime Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {backtestResult.regimeBreakdown.map(rb => (
                      <div key={rb.regime} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Badge
                            className={cn(
                              rb.regime === 'low_vol' && "bg-emerald-500/20 text-emerald-400",
                              rb.regime === 'normal' && "bg-blue-500/20 text-blue-400",
                              rb.regime === 'high_vol' && "bg-amber-500/20 text-amber-400",
                              rb.regime === 'crisis' && "bg-rose-500/20 text-rose-400",
                            )}
                          >
                            {rb.regime.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{rb.daysInRegime} days</span>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-sm font-medium",
                            rb.averageReturn > 0 ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {(rb.averageReturn * 100).toFixed(2)}% avg return
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(rb.volatility * 100).toFixed(1)}% vol
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-card border-border p-10 text-center">
              <p className="text-muted-foreground">Run a backtest to see results</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NeuroSymbolicEngine;
