import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, ReferenceLine 
} from 'recharts';
import { 
  Play, RefreshCw, TrendingUp, TrendingDown, BarChart3, 
  DollarSign, Percent, AlertTriangle, Activity, Zap, Plus, X, Loader2
} from 'lucide-react';
import { useBacktester, BacktestAsset } from '@/hooks/useBacktester';
import { StrategyType, STRATEGY_INFO, BacktestResult } from '@/services/backtesterService';

const STRATEGIES: StrategyType[] = ['buy-hold', 'dca', 'momentum', 'mean-reversion', 'rsi'];

const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'SPY', 'QQQ', 'TSLA', 'META', 'JPM'];

function MetricCard({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  trend 
}: { 
  label: string; 
  value: string; 
  subValue?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-muted-foreground';
  
  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${trendColor}`}>{value}</div>
      {subValue && <div className="text-sm text-muted-foreground mt-1">{subValue}</div>}
    </div>
  );
}

function TradesList({ trades }: { trades: BacktestResult['trades'] }) {
  if (trades.length === 0) {
    return <p className="text-muted-foreground text-sm">No trades executed</p>;
  }
  
  return (
    <div className="max-h-80 overflow-y-auto space-y-2">
      {trades.slice(-20).reverse().map((trade, i) => (
        <div 
          key={i} 
          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
        >
          <div className="flex items-center gap-3">
            <Badge variant={trade.type === 'buy' ? 'default' : 'destructive'} className="uppercase">
              {trade.type}
            </Badge>
            <div>
              <div className="font-medium">{trade.shares} shares @ ${trade.price.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">{trade.date}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium tabular-nums">${trade.value.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[150px]">{trade.reason}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Backtester() {
  const { isRunning, result, error, progress, runTest, reset } = useBacktester();
  
  // Assets configuration
  const [assets, setAssets] = useState<BacktestAsset[]>([
    { symbol: 'AAPL', allocation: 50 },
    { symbol: 'MSFT', allocation: 50 },
  ]);
  const [newSymbol, setNewSymbol] = useState('');
  
  // Date range
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [strategy, setStrategy] = useState<StrategyType>('buy-hold');
  const [initialCapital, setInitialCapital] = useState(100000);
  
  const totalAllocation = useMemo(() => 
    assets.reduce((sum, a) => sum + a.allocation, 0), 
    [assets]
  );
  
  const handleAddAsset = () => {
    const symbol = newSymbol.toUpperCase().trim();
    if (!symbol || assets.some(a => a.symbol === symbol)) return;
    
    setAssets([...assets, { symbol, allocation: 0 }]);
    setNewSymbol('');
  };
  
  const handleRemoveAsset = (symbol: string) => {
    setAssets(assets.filter(a => a.symbol !== symbol));
  };
  
  const handleUpdateAllocation = (symbol: string, allocation: number) => {
    setAssets(assets.map(a => 
      a.symbol === symbol ? { ...a, allocation: Math.max(0, Math.min(100, allocation)) } : a
    ));
  };
  
  const handleEqualWeight = () => {
    const weight = Math.floor(100 / assets.length);
    const remainder = 100 - (weight * assets.length);
    
    setAssets(assets.map((a, i) => ({
      ...a,
      allocation: weight + (i === 0 ? remainder : 0),
    })));
  };
  
  const handleRun = async () => {
    if (totalAllocation !== 100) {
      alert('Total allocation must equal 100%');
      return;
    }
    
    if (assets.length === 0) {
      alert('Add at least one asset');
      return;
    }
    
    await runTest(assets, startDate, endDate, initialCapital, strategy);
  };
  
  const chartData = useMemo(() => {
    if (!result) return [];
    return result.portfolioHistory.map(h => ({
      date: h.date,
      value: parseFloat(h.totalValue.toFixed(2)),
      cash: parseFloat(h.cash.toFixed(2)),
      holdings: parseFloat(h.holdings.toFixed(2)),
    }));
  }, [result]);
  
  const drawdownData = useMemo(() => {
    if (!result) return [];
    let peak = result.initialCapital;
    return result.portfolioHistory.map(h => {
      if (h.totalValue > peak) peak = h.totalValue;
      const drawdown = ((peak - h.totalValue) / peak) * 100;
      return {
        date: h.date,
        drawdown: parseFloat(drawdown.toFixed(2)),
      };
    });
  }, [result]);
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategy Backtester</h1>
          <p className="text-muted-foreground">Test trading strategies with real historical data from Finnhub</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} disabled={isRunning}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleRun} disabled={isRunning || totalAllocation !== 100}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {progress || 'Running...'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid lg:grid-cols-[380px,1fr] gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Portfolio Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Asset List */}
              <div className="space-y-2">
                {assets.map(asset => (
                  <div key={asset.symbol} className="flex items-center gap-2">
                    <Badge variant="outline" className="w-16 justify-center font-mono">
                      {asset.symbol}
                    </Badge>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={asset.allocation}
                      onChange={(e) => handleUpdateAllocation(asset.symbol, Number(e.target.value))}
                      className="w-20 text-center"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleRemoveAsset(asset.symbol)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* Add Asset */}
              <div className="flex gap-2">
                <Input
                  placeholder="Symbol (e.g., AAPL)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAsset()}
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={handleAddAsset}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Quick Add */}
              <div className="flex flex-wrap gap-1">
                {POPULAR_SYMBOLS.filter(s => !assets.some(a => a.symbol === s)).slice(0, 5).map(symbol => (
                  <Badge
                    key={symbol}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => setAssets([...assets, { symbol, allocation: 0 }])}
                  >
                    + {symbol}
                  </Badge>
                ))}
              </div>
              
              {/* Allocation Summary */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm">
                  Total: <span className={totalAllocation === 100 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                    {totalAllocation}%
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleEqualWeight}>
                  Equal Weight
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Initial Capital</Label>
                <Input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                />
              </div>
              
              <Separator />
              
              {/* Strategy Selection */}
              <div className="space-y-2">
                <Label>Strategy</Label>
                <Select value={strategy} onValueChange={(v) => setStrategy(v as StrategyType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGIES.map(s => (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <Zap className="h-3 w-3" />
                          {STRATEGY_INFO[s].name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{STRATEGY_INFO[strategy].description}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Results Panel */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Return"
                  value={`${result.totalReturnPercent >= 0 ? '+' : ''}${result.totalReturnPercent.toFixed(2)}%`}
                  subValue={`$${result.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  icon={result.totalReturnPercent >= 0 ? TrendingUp : TrendingDown}
                  trend={result.totalReturnPercent >= 0 ? 'up' : 'down'}
                />
                <MetricCard
                  label="CAGR"
                  value={`${result.annualizedReturn >= 0 ? '+' : ''}${result.annualizedReturn.toFixed(2)}%`}
                  subValue="Annualized"
                  icon={Percent}
                  trend={result.annualizedReturn >= 0 ? 'up' : 'down'}
                />
                <MetricCard
                  label="Sharpe Ratio"
                  value={result.sharpeRatio.toFixed(2)}
                  subValue={result.sharpeRatio > 1 ? 'Good' : result.sharpeRatio > 0 ? 'Moderate' : 'Poor'}
                  icon={BarChart3}
                  trend={result.sharpeRatio > 1 ? 'up' : result.sharpeRatio > 0 ? 'neutral' : 'down'}
                />
                <MetricCard
                  label="Max Drawdown"
                  value={`-${result.maxDrawdownPercent.toFixed(2)}%`}
                  subValue={`$${result.maxDrawdown.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  icon={AlertTriangle}
                  trend="down"
                />
              </div>
              
              {/* Secondary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Final Value</div>
                  <div className="text-lg font-bold tabular-nums">${result.finalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Sortino Ratio</div>
                  <div className={`text-lg font-bold tabular-nums ${(result.sortinoRatio || 0) > 1 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {result.sortinoRatio?.toFixed(2) || 'N/A'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Volatility</div>
                  <div className="text-lg font-bold tabular-nums">{result.volatility.toFixed(2)}%</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Beta</div>
                  <div className="text-lg font-bold tabular-nums">{result.beta?.toFixed(2) || 'N/A'}</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Alpha</div>
                  <div className={`text-lg font-bold tabular-nums ${(result.alpha || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {result.alpha ? `${result.alpha >= 0 ? '+' : ''}${result.alpha.toFixed(2)}%` : 'N/A'}
                  </div>
                </div>
                {result.benchmarkReturn !== undefined && (
                  <div className="p-3 rounded-lg bg-card border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">vs SPY</div>
                    <div className={`text-lg font-bold tabular-nums ${
                      result.totalReturnPercent > result.benchmarkReturn ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {result.totalReturnPercent > result.benchmarkReturn ? '+' : ''}
                      {(result.totalReturnPercent - result.benchmarkReturn).toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>
              
              {/* Charts */}
              <Tabs defaultValue="equity" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="equity">Equity Curve</TabsTrigger>
                  <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
                  <TabsTrigger value="trades">Trades</TabsTrigger>
                </TabsList>
                
                <TabsContent value="equity">
                  <Card>
                    <CardContent className="pt-6">
                      <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11 }} 
                            tickFormatter={(v) => v.slice(5)}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                            className="text-muted-foreground"
                          />
                          <Tooltip
                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                            labelFormatter={(label) => `Date: ${label}`}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <ReferenceLine 
                            y={result.initialCapital} 
                            stroke="hsl(var(--muted-foreground))" 
                            strokeDasharray="5 5"
                            label={{ value: 'Initial', position: 'right', fontSize: 10 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            fill="url(#colorValue)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="drawdown">
                  <Card>
                    <CardContent className="pt-6">
                      <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={drawdownData}>
                          <defs>
                            <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => v.slice(5)}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) => `-${v}%`}
                            domain={[0, 'auto']}
                            reversed
                            className="text-muted-foreground"
                          />
                          <Tooltip
                            formatter={(value: number) => [`-${value.toFixed(2)}%`, 'Drawdown']}
                            labelFormatter={(label) => `Date: ${label}`}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="drawdown"
                            stroke="hsl(var(--destructive))"
                            fill="url(#colorDrawdown)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="trades">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Trade History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TradesList trades={result.trades} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card className="h-[500px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/30" />
                <div>
                  <h3 className="text-lg font-medium">No Backtest Results</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Add assets, set date range, and click "Run Backtest" to see results
                  </p>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 max-w-md mx-auto">
                  <strong>Tip:</strong> Uses real historical data from Finnhub API. 
                  Free tier allows 1 year of daily data and 60 API calls per minute.
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
