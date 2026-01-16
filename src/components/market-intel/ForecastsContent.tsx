import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface ForecastItem {
  indicator: string;
  current: number;
  q1_2026: number;
  q2_2026: number;
  q3_2026: number;
  q4_2026: number;
  unit: string;
}

const economicForecasts: ForecastItem[] = [
  { indicator: 'US GDP Growth', current: 2.8, q1_2026: 2.4, q2_2026: 2.2, q3_2026: 2.0, q4_2026: 2.1, unit: '%' },
  { indicator: 'US Inflation (CPI)', current: 3.2, q1_2026: 2.9, q2_2026: 2.6, q3_2026: 2.4, q4_2026: 2.2, unit: '%' },
  { indicator: 'Fed Funds Rate', current: 4.50, q1_2026: 4.25, q2_2026: 4.00, q3_2026: 3.75, q4_2026: 3.50, unit: '%' },
  { indicator: 'Unemployment', current: 4.2, q1_2026: 4.3, q2_2026: 4.4, q3_2026: 4.5, q4_2026: 4.4, unit: '%' },
  { indicator: 'S&P 500', current: 6050, q1_2026: 6200, q2_2026: 6350, q3_2026: 6400, q4_2026: 6600, unit: '' },
  { indicator: '10Y Treasury', current: 4.17, q1_2026: 4.00, q2_2026: 3.85, q3_2026: 3.70, q4_2026: 3.60, unit: '%' },
  { indicator: 'EUR/USD', current: 1.03, q1_2026: 1.05, q2_2026: 1.07, q3_2026: 1.08, q4_2026: 1.10, unit: '' },
  { indicator: 'Crude Oil (WTI)', current: 72, q1_2026: 70, q2_2026: 68, q3_2026: 72, q4_2026: 75, unit: '$' },
  { indicator: 'Gold', current: 2650, q1_2026: 2700, q2_2026: 2750, q3_2026: 2800, q4_2026: 2850, unit: '$' },
];

const marketForecasts = [
  { asset: 'S&P 500', analysts: 42, bullish: 68, neutral: 24, bearish: 8, targetHigh: 7200, targetLow: 5800, targetMedian: 6400 },
  { asset: 'NASDAQ', analysts: 38, bullish: 72, neutral: 20, bearish: 8, targetHigh: 22000, targetLow: 17500, targetMedian: 19500 },
  { asset: 'Bitcoin', analysts: 25, bullish: 56, neutral: 28, bearish: 16, targetHigh: 150000, targetLow: 60000, targetMedian: 95000 },
  { asset: 'Gold', analysts: 30, bullish: 64, neutral: 28, bearish: 8, targetHigh: 3200, targetLow: 2400, targetMedian: 2850 },
];

export function ForecastsContent() {
  const getTrend = (current: number, future: number) => {
    const change = ((future - current) / current) * 100;
    return change;
  };

  return (
    <div className="space-y-6">
      {/* Economic Forecasts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary" />
            Economic Forecasts 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Indicator</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Current</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Q1 2026</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Q2 2026</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Q3 2026</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Q4 2026</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">YE Change</th>
                </tr>
              </thead>
              <tbody>
                {economicForecasts.map((item) => {
                  const yeChange = getTrend(item.current, item.q4_2026);
                  return (
                    <tr key={item.indicator} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-3 px-2 font-medium">{item.indicator}</td>
                      <td className="text-right py-3 px-2">{item.unit}{item.current.toLocaleString()}{item.unit === '%' ? '%' : ''}</td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{item.unit}{item.q1_2026.toLocaleString()}{item.unit === '%' ? '%' : ''}</td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{item.unit}{item.q2_2026.toLocaleString()}{item.unit === '%' ? '%' : ''}</td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{item.unit}{item.q3_2026.toLocaleString()}{item.unit === '%' ? '%' : ''}</td>
                      <td className="text-right py-3 px-2">{item.unit}{item.q4_2026.toLocaleString()}{item.unit === '%' ? '%' : ''}</td>
                      <td className={`text-right py-3 px-2 font-medium ${yeChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {yeChange >= 0 ? '+' : ''}{yeChange.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Analyst Price Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Analyst Price Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketForecasts.map((item) => (
              <Card key={item.asset} className="bg-secondary/30">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3">{item.asset}</h4>
                  
                  {/* Sentiment Bar */}
                  <div className="flex h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-emerald-500" style={{ width: `${item.bullish}%` }} />
                    <div className="bg-yellow-500" style={{ width: `${item.neutral}%` }} />
                    <div className="bg-rose-500" style={{ width: `${item.bearish}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-3">
                    <span className="text-emerald-500">{item.bullish}% Bull</span>
                    <span className="text-yellow-500">{item.neutral}% Neutral</span>
                    <span className="text-rose-500">{item.bearish}% Bear</span>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target High</span>
                      <span className="text-emerald-500">${item.targetHigh.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Median</span>
                      <span className="font-medium">${item.targetMedian.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Low</span>
                      <span className="text-rose-500">${item.targetLow.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on {item.analysts} analysts
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
