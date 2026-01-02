import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, ReferenceLine 
} from 'recharts';
import { 
  Play, RefreshCw, TrendingUp, TrendingDown, BarChart3, 
  DollarSign, Percent, AlertTriangle, Activity, Zap 
} from 'lucide-react';
import { useBacktester } from '@/hooks/useBacktester';
import { StrategyType, STRATEGY_INFO, BacktestResult } from '@/services/backtesterService';

const STRATEGIES: StrategyType[] = ['buy-hold', 'dca', 'momentum', 'mean-reversion', 'rsi'];

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
  const { isRunning, result, generateData, runTest, reset } = useBacktester();
  
  const [strategy, setStrategy] = useState<StrategyType>('buy-hold');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [days, setDays] = useState(252);
  const [startPrice, setStartPrice] = useState(100);
  const [volatility, setVolatility] = useState(0.02);
  
  // Strategy-specific params
  const [dcaAmount, setDcaAmount] = useState(5000);
  const [dcaFrequency, setDcaFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [momentumPeriod, setMomentumPeriod] = useState(20);
  const [momentumThreshold, setMomentumThreshold] = useState(0.02);
  const [maPeriod, setMaPeriod] = useState(20);
  const [deviationThreshold, setDeviationThreshold] = useState(0.05);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [rsiOversold, setRsiOversold] = useState(30);
  const [rsiOverbought, setRsiOverbought] = useState(70);
  
  const handleRun = async () => {
    const data = generateData(days, startPrice, volatility);
    await runTest(strategy, {
      initialCapital,
      dcaAmount,
      dcaFrequency,
      momentumPeriod,
      momentumThreshold,
      maPeriod,
      deviationThreshold,
      rsiPeriod,
      rsiOversold,
      rsiOverbought,
    }, data);
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
          <p className="text-muted-foreground">Test trading strategies with historical data simulation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleRun} disabled={isRunning}>
            {isRunning ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Running...
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
      
      <div className="grid lg:grid-cols-[320px,1fr] gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              
              <Separator />
              
              {/* Basic Params */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Initial Capital</Label>
                  <Input
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Days</Label>
                  <Input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Start Price</Label>
                  <Input
                    type="number"
                    value={startPrice}
                    onChange={(e) => setStartPrice(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Volatility</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={volatility}
                    onChange={(e) => setVolatility(Number(e.target.value))}
                  />
                </div>
              </div>
              
              {/* Strategy-specific params */}
              {strategy === 'dca' && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">DCA Settings</Label>
                    <div className="space-y-2">
                      <Label className="text-xs">Amount per Purchase</Label>
                      <Input
                        type="number"
                        value={dcaAmount}
                        onChange={(e) => setDcaAmount(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Frequency</Label>
                      <Select value={dcaFrequency} onValueChange={(v) => setDcaFrequency(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
              
              {strategy === 'momentum' && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Momentum Settings</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Lookback Period</Label>
                        <Input
                          type="number"
                          value={momentumPeriod}
                          onChange={(e) => setMomentumPeriod(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Threshold</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={momentumThreshold}
                          onChange={(e) => setMomentumThreshold(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {strategy === 'mean-reversion' && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Mean Reversion Settings</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">MA Period</Label>
                        <Input
                          type="number"
                          value={maPeriod}
                          onChange={(e) => setMaPeriod(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Deviation %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={deviationThreshold}
                          onChange={(e) => setDeviationThreshold(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {strategy === 'rsi' && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">RSI Settings</Label>
                    <div className="space-y-2">
                      <Label className="text-xs">RSI Period</Label>
                      <Input
                        type="number"
                        value={rsiPeriod}
                        onChange={(e) => setRsiPeriod(Number(e.target.value))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Oversold</Label>
                        <Input
                          type="number"
                          value={rsiOversold}
                          onChange={(e) => setRsiOversold(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Overbought</Label>
                        <Input
                          type="number"
                          value={rsiOverbought}
                          onChange={(e) => setRsiOverbought(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
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
                <MetricCard
                  label="Annualized Return"
                  value={`${result.annualizedReturn >= 0 ? '+' : ''}${result.annualizedReturn.toFixed(2)}%`}
                  subValue={`${result.totalTrades} trades`}
                  icon={Percent}
                  trend={result.annualizedReturn >= 0 ? 'up' : 'down'}
                />
              </div>
              
              {/* Secondary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Final Value</div>
                  <div className="text-lg font-bold tabular-nums">${result.finalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                  <div className="text-lg font-bold tabular-nums">{result.winRate.toFixed(1)}%</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Volatility</div>
                  <div className="text-lg font-bold tabular-nums">{result.volatility.toFixed(2)}%</div>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Total Trades</div>
                  <div className="text-lg font-bold tabular-nums">{result.totalTrades}</div>
                </div>
                {result.benchmarkReturn !== undefined && (
                  <div className="p-3 rounded-lg bg-card border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">vs Buy & Hold</div>
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
              <Tabs defaultValue="equity" className="w-full">
                <TabsList>
                  <TabsTrigger value="equity">Equity Curve</TabsTrigger>
                  <TabsTrigger value="drawdown">Drawdown</TabsTrigger>
                  <TabsTrigger value="trades">Trade Log</TabsTrigger>
                </TabsList>
                
                <TabsContent value="equity" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Portfolio Value Over Time</CardTitle>
                      <CardDescription>
                        {result.startDate} to {result.endDate}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(v) => v.slice(5)}
                              className="text-xs"
                            />
                            <YAxis 
                              tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                              className="text-xs"
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                            />
                            <ReferenceLine 
                              y={result.initialCapital} 
                              stroke="hsl(var(--muted-foreground))" 
                              strokeDasharray="3 3"
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
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="drawdown" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Drawdown Analysis</CardTitle>
                      <CardDescription>
                        Maximum drawdown: {result.maxDrawdownPercent.toFixed(2)}%
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={drawdownData}>
                            <defs>
                              <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(v) => v.slice(5)}
                              className="text-xs"
                            />
                            <YAxis 
                              tickFormatter={(v) => `-${v}%`}
                              domain={[0, 'dataMax']}
                              reversed
                              className="text-xs"
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                              formatter={(value: number) => [`-${value.toFixed(2)}%`, 'Drawdown']}
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
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="trades" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Trade History</CardTitle>
                      <CardDescription>
                        {result.totalTrades} trades | {result.profitableTrades} profitable ({result.winRate.toFixed(1)}% win rate)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <TradesList trades={result.trades} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ready to Backtest</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Configure your strategy parameters and click "Run Backtest" to simulate 
                trading performance with historical data.
              </p>
              <Button onClick={handleRun} disabled={isRunning}>
                <Play className="h-4 w-4 mr-2" />
                Run Backtest
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
