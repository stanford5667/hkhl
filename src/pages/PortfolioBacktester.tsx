import { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  ChevronDown,
  Sparkles,
  Settings,
  Play,
  RefreshCw,
  Loader2,
  AlertTriangle,
  BarChart3,
  Percent,
  DollarSign,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PortfolioSetup, PortfolioAsset } from '@/components/backtester/PortfolioSetup';
import { MetricsSelector } from '@/components/backtester/MetricsSelector';
import { BenchmarkSelector } from '@/components/backtester/BenchmarkSelector';
import { AdvancedMetricsPanel } from '@/components/backtester/AdvancedMetricsPanel';
import { MacroMetricsModule } from '@/components/backtester/MacroMetricsModule';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useBacktester, BacktestAsset } from '@/hooks/useBacktester';
import { BacktestResult } from '@/services/backtesterService';

const TIMELINE_OPTIONS = ['1 Year', '2 Years', '5 Years', 'Custom Range'];

// Hedge fund static comparison data
const HEDGE_FUND_DATA = [
  { name: 'Bridgewater', aum: '$124B', cagr: '12.1%', sharpe: '0.95', maxDD: '-21.5%', alpha: '2.3%', beta: '0.78', percentile: 72 },
  { name: 'Renaissance', aum: '$130B', cagr: '39.1%', sharpe: '2.15', maxDD: '-8.2%', alpha: '28.5%', beta: '0.12', percentile: 99 },
  { name: 'Citadel', aum: '$62B', cagr: '15.8%', sharpe: '1.42', maxDD: '-12.8%', alpha: '5.2%', beta: '0.65', percentile: 91 },
  { name: 'Two Sigma', aum: '$60B', cagr: '14.2%', sharpe: '1.28', maxDD: '-14.1%', alpha: '4.8%', beta: '0.58', percentile: 88 },
  { name: 'Millennium', aum: '$58B', cagr: '13.5%', sharpe: '1.15', maxDD: '-16.2%', alpha: '3.9%', beta: '0.72', percentile: 78 },
];

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

function DashboardTab({ 
  result, 
  selectedMetrics,
  initialCapital,
}: { 
  result: BacktestResult | null;
  selectedMetrics: string[];
  initialCapital: number;
}) {
  // Build metrics from real results
  const allMetrics = useMemo(() => {
    if (!result) return [];
    return [
      { id: 'cagr', label: 'CAGR', value: `${result.annualizedReturn >= 0 ? '+' : ''}${result.annualizedReturn.toFixed(1)}%`, change: '' },
      { id: 'totalReturn', label: 'Total Return', value: `${result.totalReturnPercent >= 0 ? '+' : ''}${result.totalReturnPercent.toFixed(1)}%`, change: '' },
      { id: 'sharpeRatio', label: 'Sharpe Ratio', value: result.sharpeRatio.toFixed(2), change: result.sharpeRatio > 1 ? 'Good' : '' },
      { id: 'sortinoRatio', label: 'Sortino Ratio', value: result.sortinoRatio.toFixed(2), change: result.sortinoRatio > 1.5 ? 'Good' : '' },
      { id: 'maxDrawdown', label: 'Max Drawdown', value: `-${result.maxDrawdownPercent.toFixed(1)}%`, change: '' },
      { id: 'calmarRatio', label: 'Calmar Ratio', value: result.maxDrawdownPercent > 0 ? (result.annualizedReturn / result.maxDrawdownPercent).toFixed(2) : 'N/A', change: '' },
      { id: 'alpha', label: 'Alpha', value: result.alpha ? `${result.alpha >= 0 ? '+' : ''}${result.alpha.toFixed(1)}%` : 'N/A', change: '' },
      { id: 'beta', label: 'Beta', value: result.beta?.toFixed(2) || 'N/A', change: '' },
      { id: 'volatility', label: 'Volatility', value: `${result.volatility.toFixed(1)}%`, change: '' },
      { id: 'trackingError', label: 'vs Benchmark', value: result.benchmarkReturn !== undefined ? `${(result.totalReturnPercent - result.benchmarkReturn).toFixed(1)}%` : 'N/A', change: '' },
    ];
  }, [result]);

  const filteredMetrics = allMetrics.filter(m => selectedMetrics.includes(m.id));

  // Build chart data from real portfolio history
  const performanceData = useMemo(() => {
    if (!result || result.portfolioHistory.length === 0) return [];
    
    const startValue = result.portfolioHistory[0]?.totalValue || initialCapital;
    
    // Sample to max 50 points for chart
    const step = Math.max(1, Math.floor(result.portfolioHistory.length / 50));
    
    return result.portfolioHistory
      .filter((_, i) => i % step === 0 || i === result.portfolioHistory.length - 1)
      .map((h) => ({
        date: h.date,
        portfolio: ((h.totalValue / startValue) * 100).toFixed(1),
      }));
  }, [result, initialCapital]);

  // Build drawdown data from portfolio history
  const drawdownData = useMemo(() => {
    if (!result || result.portfolioHistory.length === 0) return [];
    
    let peak = result.portfolioHistory[0]?.totalValue || 0;
    const step = Math.max(1, Math.floor(result.portfolioHistory.length / 50));
    
    return result.portfolioHistory
      .filter((_, i) => i % step === 0 || i === result.portfolioHistory.length - 1)
      .map((h) => {
        if (h.totalValue > peak) peak = h.totalValue;
        const drawdown = peak > 0 ? -((peak - h.totalValue) / peak) * 100 : 0;
        return {
          date: h.date,
          drawdown: parseFloat(drawdown.toFixed(2)),
        };
      });
  }, [result]);

  // Build hedge fund comparison including user's portfolio
  const hedgeFundComparison = useMemo(() => {
    if (!result) return HEDGE_FUND_DATA;
    
    const userPercentile = Math.min(99, Math.max(1, Math.round(
      50 + (result.sharpeRatio - 1) * 20 + (result.annualizedReturn - 10) * 2
    )));
    
    const userRow = {
      name: 'Your Portfolio',
      aum: `$${(initialCapital / 1000).toFixed(0)}K`,
      cagr: `${result.annualizedReturn.toFixed(1)}%`,
      sharpe: result.sharpeRatio.toFixed(2),
      maxDD: `-${result.maxDrawdownPercent.toFixed(1)}%`,
      alpha: result.alpha ? `${result.alpha.toFixed(1)}%` : 'N/A',
      beta: result.beta?.toFixed(2) || 'N/A',
      percentile: userPercentile,
      isUser: true,
    };
    
    return [userRow, ...HEDGE_FUND_DATA];
  }, [result, initialCapital]);

  if (!result) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No backtest results yet</p>
          <p className="text-sm mt-1">Configure your portfolio and click "Run Backtest" to see real performance data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Performance Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Portfolio Performance</CardTitle>
          <Badge variant="outline" className="text-xs">
            Using Real Finnhub Data
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  className="text-muted-foreground"
                  tickFormatter={(v) => v.slice(5)} // Show MM-DD
                />
                <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: string) => [`${value}%`, 'Value (indexed)']}
                />
                <Legend />
                <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  name="Your Portfolio"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics Panel */}
      {filteredMetrics.length > 0 && (
        <AdvancedMetricsPanel visibleMetrics={filteredMetrics} />
      )}

      {/* Drawdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Drawdown Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  className="text-muted-foreground"
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 12 }} domain={['auto', 0]} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive) / 0.3)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Asset Performance */}
      {result.assetPerformance && result.assetPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Asset Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.assetPerformance.map((asset) => (
                <div key={asset.symbol} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{asset.symbol}</Badge>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Return</p>
                      <p className={cn(
                        "font-medium",
                        asset.return >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {asset.return >= 0 ? '+' : ''}{asset.return.toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Contribution</p>
                      <p className={cn(
                        "font-medium",
                        asset.contribution >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {asset.contribution >= 0 ? '+' : ''}{asset.contribution.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hedge Fund Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hedge Fund Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Fund / Portfolio</th>
                  <th className="pb-3 font-medium">AUM</th>
                  <th className="pb-3 font-medium">CAGR</th>
                  <th className="pb-3 font-medium">Sharpe</th>
                  <th className="pb-3 font-medium">Max DD</th>
                  <th className="pb-3 font-medium">Alpha</th>
                  <th className="pb-3 font-medium">Beta</th>
                  <th className="pb-3 font-medium text-right">Percentile</th>
                </tr>
              </thead>
              <tbody>
                {hedgeFundComparison.map((fund, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-b last:border-0',
                      'isUser' in fund && fund.isUser && 'bg-primary/5'
                    )}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fund.name}</span>
                        {'isUser' in fund && fund.isUser && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">{fund.aum}</td>
                    <td className="py-3 pr-4 text-sm font-medium">{fund.cagr}</td>
                    <td className="py-3 pr-4 text-sm">{fund.sharpe}</td>
                    <td className="py-3 pr-4 text-sm text-destructive">{fund.maxDD}</td>
                    <td className="py-3 pr-4 text-sm text-emerald-500">{fund.alpha}</td>
                    <td className="py-3 pr-4 text-sm">{fund.beta}</td>
                    <td className="py-3 text-right">
                      <span
                        className={cn(
                          'text-xs font-medium px-2 py-1 rounded-full',
                          fund.percentile >= 90
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : fund.percentile >= 75
                            ? 'bg-muted text-muted-foreground'
                            : 'border text-muted-foreground'
                        )}
                      >
                        {fund.percentile}th
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PortfolioTab({ assets, onAssetsChange }: { assets: PortfolioAsset[]; onAssetsChange: (assets: PortfolioAsset[]) => void }) {
  const totalAllocation = assets.reduce((sum, a) => sum + a.allocation, 0);
  
  return (
    <div className="space-y-6">
      <PortfolioSetup assets={assets} onAssetsChange={onAssetsChange} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Allocation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">{asset.symbol}</Badge>
                  <span className="text-sm text-muted-foreground capitalize">{asset.strategy.replace('-', ' ')}</span>
                </div>
                <span className="font-medium">{asset.allocation}%</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="font-medium">Total Allocation</span>
              <span className={cn(
                "font-bold",
                totalAllocation === 100 ? "text-emerald-500" : "text-rose-500"
              )}>
                {totalAllocation}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MacroTab() {
  return <MacroMetricsModule />;
}

function StressTestTab({ stressTestResults, isLoading }: { stressTestResults: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scenario Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {stressTestResults.length > 0 ? (
            <div className="space-y-4">
              {stressTestResults.map((test, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <span className="font-medium">{test.scenario}</span>
                    <p className="text-xs text-muted-foreground mt-1">{test.description}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Portfolio Impact</p>
                      <p className={cn(
                        "font-medium",
                        test.portfolioReturn >= 0 ? "text-emerald-500" : "text-destructive"
                      )}>
                        {test.portfolioReturn >= 0 ? '+' : ''}{test.portfolioReturn.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Run a backtest first to see stress test results</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Generated Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Q4 2025 Performance Report', date: 'Dec 31, 2025', type: 'PDF' },
              { name: 'Annual Risk Assessment', date: 'Dec 28, 2025', type: 'PDF' },
              { name: 'Strategy Attribution Analysis', date: 'Dec 15, 2025', type: 'Excel' },
              { name: 'Tax Lot Report', date: 'Dec 1, 2025', type: 'PDF' },
            ].map((report) => (
              <div key={report.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-muted-foreground">{report.date}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-muted rounded">{report.type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Generate New Report
        </Button>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Report Settings
        </Button>
      </div>
    </div>
  );
}

const DEFAULT_ASSETS: PortfolioAsset[] = [
  {
    id: '1',
    symbol: 'AAPL',
    strategy: 'long-term-hold',
    allocation: 40,
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    advancedSettings: { stopLoss: 10, takeProfit: 25, rebalanceFrequency: 'monthly', useTrailingStop: false },
  },
  {
    id: '2',
    symbol: 'MSFT',
    strategy: 'long-term-hold',
    allocation: 30,
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    advancedSettings: { stopLoss: 10, takeProfit: 25, rebalanceFrequency: 'monthly', useTrailingStop: false },
  },
  {
    id: '3',
    symbol: 'SPY',
    strategy: 'long-term-hold',
    allocation: 30,
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    advancedSettings: { stopLoss: 15, takeProfit: 50, rebalanceFrequency: 'quarterly', useTrailingStop: false },
  },
];

export default function PortfolioBacktester() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeline, setTimeline] = useState('1 Year');
  const [selectedMetrics, setSelectedMetrics] = useState(['totalReturn', 'sharpeRatio', 'maxDrawdown', 'alpha', 'beta']);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState(['spy']);
  const [assets, setAssets] = useState<PortfolioAsset[]>(DEFAULT_ASSETS);
  const [initialCapital] = useState(100000);
  
  // Use the real backtest hook
  const { 
    isRunning, 
    result, 
    monteCarloResult,
    stressTestResults,
    correlationMatrix,
    error, 
    progress, 
    runTest, 
    reset 
  } = useBacktester();

  // Calculate date range from timeline selection
  const getDateRange = () => {
    const endDate = new Date().toISOString().split('T')[0];
    let startDate: string;
    
    switch (timeline) {
      case '2 Years':
        startDate = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '5 Years':
        startDate = new Date(Date.now() - 1825 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default: // 1 Year
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
    
    return { startDate, endDate };
  };

  const handleRunBacktest = async () => {
    const totalAllocation = assets.reduce((sum, a) => sum + a.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.1) {
      alert('Total allocation must equal 100%');
      return;
    }
    
    const { startDate, endDate } = getDateRange();
    
    // Convert PortfolioAsset to BacktestAsset
    const backtestAssets: BacktestAsset[] = assets.map(a => ({
      symbol: a.symbol,
      allocation: a.allocation,
    }));
    
    console.log('[PortfolioBacktester] Running backtest with:', backtestAssets);
    
    // Run full backtest (includes Monte Carlo, stress tests, and correlations)
    const backtestResult = await runTest(backtestAssets, startDate, endDate, initialCapital, 'buy-hold', true);
    
    // Auto-switch to Dashboard tab to show results
    if (backtestResult) {
      setActiveTab('dashboard');
    }
  };

  const totalAllocation = assets.reduce((sum, a) => sum + a.allocation, 0);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab result={result} selectedMetrics={selectedMetrics} initialCapital={initialCapital} />;
      case 'portfolio':
        return <PortfolioTab assets={assets} onAssetsChange={setAssets} />;
      case 'macro':
        return <MacroTab />;
      case 'stress':
        return <StressTestTab stressTestResults={stressTestResults} isLoading={isRunning} />;
      case 'reports':
        return <ReportsTab />;
      default:
        return <DashboardTab result={result} selectedMetrics={selectedMetrics} initialCapital={initialCapital} />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Portfolio Backtester</h1>
            <p className="text-sm text-muted-foreground">
              Test your portfolio with real historical data from Finnhub
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Timeline Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {timeline}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {TIMELINE_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt} onClick={() => setTimeline(opt)}>
                  {opt}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Metrics Selector */}
          <MetricsSelector selected={selectedMetrics} onChange={setSelectedMetrics} />

          {/* Benchmark Selector */}
          <BenchmarkSelector selected={selectedBenchmarks} onChange={setSelectedBenchmarks} />
          
          {/* Reset Button */}
          <Button variant="outline" size="sm" onClick={reset} disabled={isRunning}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>

          {/* Run Backtest Button */}
          <Button 
            onClick={handleRunBacktest} 
            disabled={isRunning || totalAllocation !== 100}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress || 'Running...'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Backtest
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Allocation Warning */}
      {totalAllocation !== 100 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Total allocation is {totalAllocation}%. It must equal 100% to run a backtest.
          </AlertDescription>
        </Alert>
      )}

      {/* Tab Navigation */}
      <nav className="flex gap-1 border-b">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'portfolio', label: 'Portfolio', icon: DollarSign },
          { id: 'macro', label: 'Macro', icon: TrendingUp },
          { id: 'stress', label: 'Stress Tests', icon: AlertTriangle },
          { id: 'reports', label: 'Reports', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
