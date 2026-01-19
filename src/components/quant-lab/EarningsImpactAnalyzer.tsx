import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell 
} from 'recharts';
import { Search, TrendingUp, TrendingDown, Target, AlertCircle } from 'lucide-react';

interface EarningsEvent {
  date: string;
  quarter: string;
  epsActual: number;
  epsEstimate: number;
  epsSurprise: number;
  revenueActual: number;
  revenueEstimate: number;
  revenueSurprise: number;
  priceReturn5Day: number;
  priceReturnIntraday: number;
  beatOrMiss: 'beat' | 'miss' | 'meet';
}

interface EarningsImpactAnalyzerProps {
  selectedTicker?: string;
}

export default function EarningsImpactAnalyzer({ selectedTicker }: EarningsImpactAnalyzerProps) {
  const [symbol, setSymbol] = useState(selectedTicker || 'AAPL');
  const [isLoading, setIsLoading] = useState(false);
  
  // Update symbol when selectedTicker changes from parent
  React.useEffect(() => {
    if (selectedTicker) {
      setSymbol(selectedTicker);
    }
  }, [selectedTicker]);

  // Mock data - replace with actual API call
  const earningsHistory: EarningsEvent[] = [
    {
      date: '2024-01-31',
      quarter: 'Q1 2024',
      epsActual: 2.18,
      epsEstimate: 2.10,
      epsSurprise: 3.81,
      revenueActual: 119.6,
      revenueEstimate: 118.0,
      revenueSurprise: 1.36,
      priceReturn5Day: 4.2,
      priceReturnIntraday: 1.8,
      beatOrMiss: 'beat',
    },
    {
      date: '2023-10-26',
      quarter: 'Q4 2023',
      epsActual: 1.46,
      epsEstimate: 1.39,
      epsSurprise: 5.04,
      revenueActual: 89.5,
      revenueEstimate: 89.3,
      revenueSurprise: 0.22,
      priceReturn5Day: -2.1,
      priceReturnIntraday: 0.5,
      beatOrMiss: 'beat',
    },
    {
      date: '2023-07-27',
      quarter: 'Q3 2023',
      epsActual: 1.26,
      epsEstimate: 1.19,
      epsSurprise: 5.88,
      revenueActual: 81.8,
      revenueEstimate: 81.5,
      revenueSurprise: 0.37,
      priceReturn5Day: 3.5,
      priceReturnIntraday: 2.1,
      beatOrMiss: 'beat',
    },
    {
      date: '2023-05-04',
      quarter: 'Q2 2023',
      epsActual: 1.52,
      epsEstimate: 1.43,
      epsSurprise: 6.29,
      revenueActual: 94.8,
      revenueEstimate: 92.9,
      revenueSurprise: 2.05,
      priceReturn5Day: 5.8,
      priceReturnIntraday: 3.2,
      beatOrMiss: 'beat',
    },
    {
      date: '2023-02-02',
      quarter: 'Q1 2023',
      epsActual: 1.88,
      epsEstimate: 1.94,
      epsSurprise: -3.09,
      revenueActual: 117.2,
      revenueEstimate: 121.0,
      revenueSurprise: -3.14,
      priceReturn5Day: -4.3,
      priceReturnIntraday: -2.5,
      beatOrMiss: 'miss',
    },
    {
      date: '2022-10-27',
      quarter: 'Q4 2022',
      epsActual: 1.29,
      epsEstimate: 1.27,
      epsSurprise: 1.57,
      revenueActual: 90.1,
      revenueEstimate: 88.9,
      revenueSurprise: 1.35,
      priceReturn5Day: 2.1,
      priceReturnIntraday: 0.8,
      beatOrMiss: 'beat',
    },
    {
      date: '2022-07-28',
      quarter: 'Q3 2022',
      epsActual: 1.20,
      epsEstimate: 1.16,
      epsSurprise: 3.45,
      revenueActual: 83.0,
      revenueEstimate: 82.8,
      revenueSurprise: 0.24,
      priceReturn5Day: 6.2,
      priceReturnIntraday: 3.5,
      beatOrMiss: 'beat',
    },
    {
      date: '2022-04-28',
      quarter: 'Q2 2022',
      epsActual: 1.52,
      epsEstimate: 1.43,
      epsSurprise: 6.29,
      revenueActual: 97.3,
      revenueEstimate: 94.0,
      revenueSurprise: 3.51,
      priceReturn5Day: 4.8,
      priceReturnIntraday: 2.8,
      beatOrMiss: 'beat',
    },
  ];

  // Calculate summary statistics
  const stats = {
    totalEarnings: earningsHistory.length,
    beatCount: earningsHistory.filter((e) => e.beatOrMiss === 'beat').length,
    missCount: earningsHistory.filter((e) => e.beatOrMiss === 'miss').length,
    avgEpsSurprise: (
      earningsHistory.reduce((sum, e) => sum + e.epsSurprise, 0) / earningsHistory.length
    ).toFixed(2),
    avgReturn5Day: (
      earningsHistory.reduce((sum, e) => sum + e.priceReturn5Day, 0) / earningsHistory.length
    ).toFixed(2),
    avgReturnOnBeat: (
      earningsHistory
        .filter((e) => e.beatOrMiss === 'beat')
        .reduce((sum, e) => sum + e.priceReturn5Day, 0) /
      earningsHistory.filter((e) => e.beatOrMiss === 'beat').length
    ).toFixed(2),
    avgReturnOnMiss: (
      earningsHistory
        .filter((e) => e.beatOrMiss === 'miss')
        .reduce((sum, e) => sum + e.priceReturn5Day, 0) /
      earningsHistory.filter((e) => e.beatOrMiss === 'miss').length || 1
    ).toFixed(2),
  };

  // Prepare chart data
  const surpriseVsReturnData = earningsHistory.map((e) => ({
    quarter: e.quarter,
    epsSurprise: parseFloat(e.epsSurprise.toFixed(2)),
    return5Day: parseFloat(e.priceReturn5Day.toFixed(2)),
    beatOrMiss: e.beatOrMiss,
  }));

  const beatMissData = [
    {
      category: 'Beat',
      count: stats.beatCount,
      avgReturn: parseFloat(stats.avgReturnOnBeat),
    },
    {
      category: 'Miss',
      count: stats.missCount,
      avgReturn: parseFloat(stats.avgReturnOnMiss),
    },
  ];

  const handleAnalyze = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Earnings Impact Analyzer</h2>
        <p className="text-muted-foreground text-sm">
          Study how stocks perform around earnings announcements
        </p>
      </div>

      {/* Search */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="symbol" className="text-sm">Stock Symbol</Label>
              <Input
                id="symbol"
                placeholder="Enter symbol (e.g., AAPL, MSFT)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="font-mono bg-background/50"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAnalyze} disabled={isLoading}>
                <Search className="w-4 h-4 mr-2" />
                {isLoading ? 'Analyzing...' : 'Analyze'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-3xl font-bold mb-1">{stats.totalEarnings}</div>
            <p className="text-xs text-muted-foreground">Total Reports</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-3xl font-bold text-success mb-1">
              {((stats.beatCount / stats.totalEarnings) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Beat Rate ({stats.beatCount} beats)
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-3xl font-bold text-primary mb-1">
              {Number(stats.avgEpsSurprise) > 0 ? '+' : ''}
              {stats.avgEpsSurprise}%
            </div>
            <p className="text-xs text-muted-foreground">Avg EPS Surprise</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <div
              className={`text-3xl font-bold mb-1 ${
                parseFloat(stats.avgReturn5Day) > 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {Number(stats.avgReturn5Day) > 0 ? '+' : ''}
              {stats.avgReturn5Day}%
            </div>
            <p className="text-xs text-muted-foreground">Avg 5-Day Return</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="bg-background/50">
          <TabsTrigger value="history">Earnings History</TabsTrigger>
          <TabsTrigger value="surprise">Surprise vs Return</TabsTrigger>
          <TabsTrigger value="beatmiss">Beat vs Miss</TabsTrigger>
        </TabsList>

        {/* Earnings History */}
        <TabsContent value="history" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Last 8 Quarters</CardTitle>
              <CardDescription>Historical earnings performance for {symbol}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {earningsHistory.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 border border-border/50 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    {/* Quarter */}
                    <div className="w-20">
                      <p className="font-semibold text-sm">{event.quarter}</p>
                      <p className="text-xs text-muted-foreground">{event.date}</p>
                    </div>

                    {/* Beat/Miss Badge */}
                    <div className="w-16">
                      <Badge
                        variant="outline"
                        className={
                          event.beatOrMiss === 'beat'
                            ? 'bg-success/20 text-success border-success/30'
                            : event.beatOrMiss === 'miss'
                            ? 'bg-destructive/20 text-destructive border-destructive/30'
                            : 'bg-muted'
                        }
                      >
                        {event.beatOrMiss.toUpperCase()}
                      </Badge>
                    </div>

                    {/* EPS */}
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">EPS</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">${event.epsActual}</span>
                        <span className="text-xs text-muted-foreground">
                          (Est: ${event.epsEstimate})
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            event.epsSurprise > 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {event.epsSurprise > 0 ? '+' : ''}
                          {event.epsSurprise.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Revenue */}
                    <div className="flex-1 hidden md:block">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">${event.revenueActual}B</span>
                        <span
                          className={`text-xs font-medium ${
                            event.revenueSurprise > 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {event.revenueSurprise > 0 ? '+' : ''}
                          {event.revenueSurprise.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* 5-Day Return */}
                    <div className="w-24 text-right">
                      <p className="text-xs text-muted-foreground">5-Day Return</p>
                      <div className="flex items-center justify-end gap-1">
                        {event.priceReturn5Day > 0 ? (
                          <TrendingUp className="w-4 h-4 text-success" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        )}
                        <span
                          className={`text-lg font-bold ${
                            event.priceReturn5Day > 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {event.priceReturn5Day > 0 ? '+' : ''}
                          {event.priceReturn5Day}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Surprise vs Return Chart */}
        <TabsContent value="surprise" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">EPS Surprise vs 5-Day Return</CardTitle>
              <CardDescription>
                Relationship between earnings surprise and subsequent price movement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={surpriseVsReturnData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="quarter" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <ReferenceLine yAxisId="right" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="epsSurprise"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="EPS Surprise %"
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="return5Day"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    name="5-Day Return %"
                    dot={{ fill: 'hsl(var(--success))' }}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-4 p-4 bg-secondary/30 rounded-lg border border-border/50">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1 text-sm">Key Insight</p>
                    <p className="text-sm text-muted-foreground">
                      {symbol} shows {parseFloat(stats.avgReturn5Day) > 0 ? 'positive' : 'negative'}{' '}
                      earnings drift. On average, the stock moves{' '}
                      <span className="font-semibold">{stats.avgReturn5Day}%</span> in the 5 days
                      following earnings. When the company beats estimates, the average 5-day return
                      is <span className="font-semibold">{stats.avgReturnOnBeat}%</span>.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Beat vs Miss Comparison */}
        <TabsContent value="beatmiss" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Beat vs Miss Performance</CardTitle>
              <CardDescription>Average 5-day returns when beating or missing estimates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={beatMissData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Bar dataKey="avgReturn" radius={[8, 8, 0, 0]} name="Avg 5-Day Return %">
                    {beatMissData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.avgReturn > 0
                            ? 'hsl(var(--success))'
                            : 'hsl(var(--destructive))'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <Card className="border-2 border-success/20 bg-success/5">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-success" />
                      <span className="font-semibold text-sm">On Beats</span>
                    </div>
                    <div className="text-2xl font-bold text-success mb-1">
                      {Number(stats.avgReturnOnBeat) > 0 ? '+' : ''}
                      {stats.avgReturnOnBeat}%
                    </div>
                    <p className="text-xs text-muted-foreground">Average 5-day return</p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-destructive/20 bg-destructive/5">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <TrendingDown className="w-5 h-5 text-destructive" />
                      <span className="font-semibold text-sm">On Misses</span>
                    </div>
                    <div className="text-2xl font-bold text-destructive mb-1">
                      {Number(stats.avgReturnOnMiss) > 0 ? '+' : ''}
                      {stats.avgReturnOnMiss}%
                    </div>
                    <p className="text-xs text-muted-foreground">Average 5-day return</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
