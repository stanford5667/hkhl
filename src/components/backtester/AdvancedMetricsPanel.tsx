import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MetricData {
  id: string;
  label: string;
  value: string;
  change?: string;
}

interface AdvancedMetricsPanelProps {
  visibleMetrics: MetricData[];
}

const RISK_METRICS = [
  { label: 'Value at Risk (95%)', value: '-$12,450' },
  { label: 'Conditional VaR', value: '-$18,200' },
  { label: 'Maximum Drawdown', value: '-15.3%' },
  { label: 'Downside Deviation', value: '8.2%' },
  { label: 'Ulcer Index', value: '4.1' },
  { label: 'Pain Index', value: '2.8' },
];

const PERFORMANCE_METRICS = [
  { label: "Jensen's Alpha", value: '4.1%' },
  { label: 'Treynor Ratio', value: '0.18' },
  { label: 'Information Ratio', value: '1.25' },
  { label: 'Modigliani M²', value: '2.3%' },
  { label: 'Omega Ratio', value: '1.45' },
  { label: 'Kappa 3', value: '0.82' },
];

const FACTOR_EXPOSURE = [
  { factor: 'Market Beta', exposure: '0.92', tStat: 12.4 },
  { factor: 'Size (SMB)', exposure: '-0.15', tStat: -2.1 },
  { factor: 'Value (HML)', exposure: '0.08', tStat: 1.3 },
  { factor: 'Profitability (RMW)', exposure: '0.22', tStat: 3.8 },
  { factor: 'Investment (CMA)', exposure: '-0.05', tStat: -0.9 },
  { factor: 'Momentum (UMD)', exposure: '0.18', tStat: 2.9 },
  { factor: 'Quality', exposure: '0.31', tStat: 4.2 },
  { factor: 'Low Volatility', exposure: '-0.12', tStat: -1.8 },
];

const STYLE_ANALYSIS = [
  { style: 'Growth', percentage: 65, confidence: 'High' },
  { style: 'Value', percentage: 35, confidence: 'Medium' },
  { style: 'Large Cap', percentage: 78, confidence: 'High' },
  { style: 'Mid Cap', percentage: 18, confidence: 'Medium' },
  { style: 'Small Cap', percentage: 4, confidence: 'Low' },
];

function MetricCard({ label, value, change }: { label: string; value: string; change?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {change && (
          <p className={cn('text-xs mt-1', change.startsWith('+') ? 'text-emerald-500' : 'text-destructive')}>
            {change} vs benchmark
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AdvancedMetricsPanel({ visibleMetrics }: AdvancedMetricsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Advanced Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="portfolio" className="text-xs">Portfolio</TabsTrigger>
            <TabsTrigger value="risk" className="text-xs">Risk</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
            <TabsTrigger value="factor" className="text-xs">Factor Exposure</TabsTrigger>
            <TabsTrigger value="style" className="text-xs">Style Analysis</TabsTrigger>
          </TabsList>

          {/* Portfolio Metrics Tab */}
          <TabsContent value="portfolio">
            {visibleMetrics.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {visibleMetrics.map((metric) => (
                  <MetricCard
                    key={metric.id}
                    label={metric.label}
                    value={metric.value}
                    change={metric.change}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No metrics selected. Use the Metrics selector to add metrics.</p>
              </div>
            )}
          </TabsContent>

          {/* Risk Metrics Tab */}
          <TabsContent value="risk">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {RISK_METRICS.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          </TabsContent>

          {/* Performance Metrics Tab */}
          <TabsContent value="performance">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {PERFORMANCE_METRICS.map((metric) => (
                <MetricCard key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          </TabsContent>

          {/* Factor Exposure Tab */}
          <TabsContent value="factor">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Factor</th>
                    <th className="pb-3 font-medium text-right">Exposure</th>
                    <th className="pb-3 font-medium text-right">t-Stat</th>
                    <th className="pb-3 font-medium text-right">Significance</th>
                  </tr>
                </thead>
                <tbody>
                  {FACTOR_EXPOSURE.map((factor) => {
                    const isSignificant = Math.abs(factor.tStat) > 2;
                    return (
                      <tr key={factor.factor} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{factor.factor}</td>
                        <td className={cn(
                          'py-3 pr-4 text-right',
                          parseFloat(factor.exposure) >= 0 ? 'text-emerald-500' : 'text-destructive'
                        )}>
                          {factor.exposure}
                        </td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">
                          {factor.tStat.toFixed(1)}
                        </td>
                        <td className="py-3 text-right">
                          {isSignificant && (
                            <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                              significant
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Style Analysis Tab */}
          <TabsContent value="style">
            <div className="space-y-4">
              {STYLE_ANALYSIS.map((item) => (
                <div key={item.style} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.style}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                      <Badge
                        variant={item.confidence === 'High' ? 'default' : 'outline'}
                        className={cn(
                          'text-xs',
                          item.confidence === 'High' && 'bg-emerald-500/10 text-emerald-500',
                          item.confidence === 'Medium' && 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                          item.confidence === 'Low' && 'text-muted-foreground'
                        )}
                      >
                        {item.confidence}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        item.confidence === 'High' && 'bg-emerald-500',
                        item.confidence === 'Medium' && 'bg-amber-500',
                        item.confidence === 'Low' && 'bg-muted-foreground'
                      )}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
