import { useState } from 'react';
import {
  TrendingUp,
  FileText,
  ChevronDown,
  Sparkles,
  Settings,
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
import { PortfolioSetup, PortfolioAsset } from '@/components/backtester/PortfolioSetup';
import { MetricsSelector, METRICS } from '@/components/backtester/MetricsSelector';
import { BenchmarkSelector } from '@/components/backtester/BenchmarkSelector';
import { AdvancedMetricsPanel } from '@/components/backtester/AdvancedMetricsPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const TIMELINE_OPTIONS = ['1 Year', '2 Years', '5 Years', 'Custom Range'];

// Performance data for charts
const PERFORMANCE_DATA = Array.from({ length: 24 }, (_, i) => {
  const month = new Date(2022, i, 1);
  const monthLabel = month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return {
    month: monthLabel,
    portfolio: 100 + Math.random() * 40 + i * 1.5,
    spy: 100 + Math.random() * 30 + i * 1.2,
    bridgewater: 100 + Math.random() * 25 + i * 0.8,
    renaissance: 100 + Math.random() * 50 + i * 2,
    citadel: 100 + Math.random() * 35 + i * 1.3,
  };
});

const DRAWDOWN_DATA = Array.from({ length: 24 }, (_, i) => {
  const month = new Date(2022, i, 1);
  const monthLabel = month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  const drawdown = Math.random() > 0.7 ? -Math.random() * 15 : -Math.random() * 5;
  return {
    month: monthLabel,
    drawdown: drawdown,
  };
});

const ALL_METRICS = [
  { id: 'cagr', label: 'CAGR', value: '18.5%', change: '+3.2%' },
  { id: 'totalReturn', label: 'Total Return', value: '38.2%', change: '+5.1%' },
  { id: 'sharpeRatio', label: 'Sharpe Ratio', value: '1.25', change: '+0.15' },
  { id: 'sortinoRatio', label: 'Sortino Ratio', value: '1.98', change: '+0.22' },
  { id: 'maxDrawdown', label: 'Max Drawdown', value: '-15.3%', change: '-2.1%' },
  { id: 'calmarRatio', label: 'Calmar Ratio', value: '1.21', change: '+0.08' },
  { id: 'alpha', label: 'Alpha', value: '4.1%', change: '+0.9%' },
  { id: 'beta', label: 'Beta', value: '0.92', change: '-0.03' },
  { id: 'volatility', label: 'Std Dev', value: '14.8%', change: '-1.2%' },
  { id: 'trackingError', label: 'Tracking Error', value: '3.2%', change: '+0.4%' },
];

const HEDGE_FUND_DATA = [
  { name: 'Your Portfolio', aum: '$2.5M', cagr: '18.5%', sharpe: '1.25', maxDD: '-15.3%', alpha: '4.1%', beta: '0.92', percentile: 85, isUser: true },
  { name: 'Bridgewater', aum: '$124B', cagr: '12.1%', sharpe: '0.95', maxDD: '-21.5%', alpha: '2.3%', beta: '0.78', percentile: 72 },
  { name: 'Renaissance', aum: '$130B', cagr: '39.1%', sharpe: '2.15', maxDD: '-8.2%', alpha: '28.5%', beta: '0.12', percentile: 99 },
  { name: 'Citadel', aum: '$62B', cagr: '15.8%', sharpe: '1.42', maxDD: '-12.8%', alpha: '5.2%', beta: '0.65', percentile: 91 },
  { name: 'Two Sigma', aum: '$60B', cagr: '14.2%', sharpe: '1.28', maxDD: '-14.1%', alpha: '4.8%', beta: '0.58', percentile: 88 },
  { name: 'Millennium', aum: '$58B', cagr: '13.5%', sharpe: '1.15', maxDD: '-16.2%', alpha: '3.9%', beta: '0.72', percentile: 78 },
];

function DashboardTab({ selectedMetrics }: { selectedMetrics: string[] }) {
  const filteredMetrics = ALL_METRICS.filter(m => selectedMetrics.includes(m.id));

  return (
    <div className="space-y-6">
      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Portfolio Performance vs Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={PERFORMANCE_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} domain={[90, 'auto']} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  name="Your Portfolio"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="spy"
                  name="S&P 500"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="bridgewater"
                  name="Bridgewater"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="renaissance"
                  name="Renaissance"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="citadel"
                  name="Citadel"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Metrics Panel */}
      <AdvancedMetricsPanel visibleMetrics={filteredMetrics} />

      {/* Drawdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Drawdown Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DRAWDOWN_DATA}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
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
                {HEDGE_FUND_DATA.map((fund, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-b last:border-0',
                      fund.isUser && 'bg-primary/5'
                    )}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fund.name}</span>
                        {fund.isUser && (
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
  return (
    <div className="space-y-6">
      <PortfolioSetup assets={assets} onAssetsChange={onAssetsChange} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Strategy Parameters Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Rebalance Frequency', value: 'Monthly' },
              { label: 'Position Limit', value: '5%' },
              { label: 'Stop Loss', value: '10%' },
              { label: 'Take Profit', value: '25%' },
              { label: 'Max Holdings', value: '20' },
              { label: 'Cash Buffer', value: '5%' },
            ].map((param) => (
              <div key={param.label} className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">{param.label}</p>
                <p className="font-medium mt-1">{param.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MacroTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Fed Funds Rate', value: '5.25%', trend: 'stable' },
          { label: '10Y Treasury', value: '4.52%', trend: 'up' },
          { label: 'Inflation (CPI)', value: '3.1%', trend: 'down' },
          { label: 'Unemployment', value: '3.7%', trend: 'stable' },
          { label: 'GDP Growth', value: '2.4%', trend: 'up' },
          { label: 'VIX', value: '14.2', trend: 'down' },
        ].map((indicator) => (
          <Card key={indicator.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{indicator.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xl font-bold">{indicator.value}</p>
                <span className={cn('text-xs', indicator.trend === 'up' ? 'text-emerald-500' : indicator.trend === 'down' ? 'text-destructive' : 'text-muted-foreground')}>
                  {indicator.trend === 'up' ? '↑' : indicator.trend === 'down' ? '↓' : '→'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Macro Correlation Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Correlation heatmap</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StressTestTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scenario Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { scenario: '2008 Financial Crisis', impact: '-42%', recovery: '18 months' },
              { scenario: 'COVID-19 Crash (2020)', impact: '-34%', recovery: '5 months' },
              { scenario: 'Dot-Com Bubble (2000)', impact: '-38%', recovery: '24 months' },
              { scenario: 'Rate Shock (+200bps)', impact: '-15%', recovery: '8 months' },
              { scenario: 'Inflation Spike (+3%)', impact: '-12%', recovery: '6 months' },
            ].map((test) => (
              <div key={test.scenario} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">{test.scenario}</span>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Portfolio Impact</p>
                    <p className="font-medium text-destructive">{test.impact}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Est. Recovery</p>
                    <p className="font-medium">{test.recovery}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monte Carlo Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Monte Carlo distribution chart</p>
          </div>
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
    strategy: 'covered-call',
    allocation: 40,
    startDate: new Date('2022-01-01'),
    endDate: new Date('2023-12-31'),
    advancedSettings: { stopLoss: 10, takeProfit: 25, rebalanceFrequency: 'monthly', useTrailingStop: false },
  },
  {
    id: '2',
    symbol: 'TSLA',
    strategy: 'day-trading',
    allocation: 30,
    startDate: new Date('2023-03-15'),
    endDate: new Date('2023-04-15'),
    advancedSettings: { stopLoss: 5, takeProfit: 15, rebalanceFrequency: 'daily', useTrailingStop: true },
  },
  {
    id: '3',
    symbol: 'SPY',
    strategy: 'long-term-hold',
    allocation: 30,
    startDate: new Date('2022-06-01'),
    endDate: new Date('2023-12-01'),
    advancedSettings: { stopLoss: 15, takeProfit: 50, rebalanceFrequency: 'quarterly', useTrailingStop: false },
  },
];

export default function PortfolioBacktester() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeline, setTimeline] = useState('1 Year');
  const [selectedMetrics, setSelectedMetrics] = useState(['totalReturn', 'sharpeRatio', 'maxDrawdown']);
  const [selectedBenchmarks, setSelectedBenchmarks] = useState(['spy']);
  const [isRunning, setIsRunning] = useState(false);
  const [assets, setAssets] = useState<PortfolioAsset[]>(DEFAULT_ASSETS);

  const handleRunBacktest = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 2000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab selectedMetrics={selectedMetrics} />;
      case 'portfolio':
        return <PortfolioTab assets={assets} onAssetsChange={setAssets} />;
      case 'macro':
        return <MacroTab />;
      case 'stress':
        return <StressTestTab />;
      case 'reports':
        return <ReportsTab />;
      default:
        return <DashboardTab selectedMetrics={selectedMetrics} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Asset Labs AI Backtester</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeline Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {timeline}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {TIMELINE_OPTIONS.map((option) => (
                <DropdownMenuItem key={option} onClick={() => setTimeline(option)}>
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <MetricsSelector selected={selectedMetrics} onChange={setSelectedMetrics} />
          <BenchmarkSelector selected={selectedBenchmarks} onChange={setSelectedBenchmarks} />

          <Button onClick={handleRunBacktest} disabled={isRunning}>
            {isRunning ? 'Running...' : 'Run Backtest'}
          </Button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="border-b">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'portfolio', label: 'Portfolio & Strategy' },
            { id: 'macro', label: 'Macro Metrics' },
            { id: 'stress', label: 'Analysis & Stress Testing' },
            { id: 'reports', label: 'Reports' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-2">
        {renderContent()}
      </div>
    </div>
  );
}