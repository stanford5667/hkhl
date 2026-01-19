import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, ZAxis, Cell
} from 'recharts';
import { Building2, TrendingUp, TrendingDown, Percent, DollarSign } from 'lucide-react';

interface FOMCEvent {
  date: string;
  rateChange: number;
  decision: 'raise' | 'cut' | 'hold';
  stance: 'hawkish' | 'dovish' | 'neutral';
  marketReaction: {
    spy: number;
    qqq: number;
    tlt: number;
    gold: number;
    dxy: number;
  };
  intraDayMoves: {
    spy: number;
    qqq: number;
    vix: number;
  };
}

interface SectorPerformance {
  sector: string;
  avgReturn: number;
  volatility: number;
  winRate: number;
}

export default function FOMCImpactStudy() {
  const [timeframe, setTimeframe] = useState<'1y' | '2y' | '5y'>('2y');

  // Mock FOMC data
  const fomcHistory: FOMCEvent[] = [
    {
      date: '2024-01-31',
      rateChange: 0,
      decision: 'hold',
      stance: 'neutral',
      marketReaction: { spy: 1.2, qqq: 2.1, tlt: -0.5, gold: 0.3, dxy: 0.2 },
      intraDayMoves: { spy: 0.8, qqq: 1.2, vix: -2.5 },
    },
    {
      date: '2023-12-13',
      rateChange: 0,
      decision: 'hold',
      stance: 'dovish',
      marketReaction: { spy: 2.8, qqq: 3.5, tlt: 1.2, gold: 1.5, dxy: -0.8 },
      intraDayMoves: { spy: 1.4, qqq: 1.9, vix: -4.2 },
    },
    {
      date: '2023-11-01',
      rateChange: 0,
      decision: 'hold',
      stance: 'hawkish',
      marketReaction: { spy: -1.5, qqq: -2.2, tlt: -1.8, gold: -0.8, dxy: 1.2 },
      intraDayMoves: { spy: -0.9, qqq: -1.3, vix: 3.5 },
    },
    {
      date: '2023-09-20',
      rateChange: 0,
      decision: 'hold',
      stance: 'hawkish',
      marketReaction: { spy: -0.8, qqq: -1.5, tlt: -1.2, gold: -1.1, dxy: 0.9 },
      intraDayMoves: { spy: -0.5, qqq: -0.8, vix: 2.8 },
    },
    {
      date: '2023-07-26',
      rateChange: 25,
      decision: 'raise',
      stance: 'hawkish',
      marketReaction: { spy: 1.8, qqq: 2.5, tlt: 0.2, gold: 0.5, dxy: -0.3 },
      intraDayMoves: { spy: 0.9, qqq: 1.3, vix: -1.8 },
    },
    {
      date: '2023-06-14',
      rateChange: 0,
      decision: 'hold',
      stance: 'neutral',
      marketReaction: { spy: 2.1, qqq: 3.2, tlt: 0.8, gold: 1.2, dxy: -0.5 },
      intraDayMoves: { spy: 1.1, qqq: 1.6, vix: -3.1 },
    },
    {
      date: '2023-05-03',
      rateChange: 25,
      decision: 'raise',
      stance: 'hawkish',
      marketReaction: { spy: -2.3, qqq: -3.1, tlt: -0.9, gold: -1.5, dxy: 1.1 },
      intraDayMoves: { spy: -1.2, qqq: -1.8, vix: 4.5 },
    },
    {
      date: '2023-03-22',
      rateChange: 25,
      decision: 'raise',
      stance: 'neutral',
      marketReaction: { spy: 3.2, qqq: 4.1, tlt: 1.5, gold: 2.1, dxy: -1.2 },
      intraDayMoves: { spy: 1.6, qqq: 2.1, vix: -5.2 },
    },
  ];

  // Mock sector performance
  const sectorPerformance: SectorPerformance[] = [
    { sector: 'Technology', avgReturn: 2.3, volatility: 3.5, winRate: 62.5 },
    { sector: 'Financials', avgReturn: 1.8, volatility: 2.8, winRate: 75.0 },
    { sector: 'Healthcare', avgReturn: 0.8, volatility: 1.5, winRate: 50.0 },
    { sector: 'Consumer', avgReturn: 1.2, volatility: 2.1, winRate: 62.5 },
    { sector: 'Energy', avgReturn: -0.5, volatility: 4.2, winRate: 37.5 },
    { sector: 'Utilities', avgReturn: 0.3, volatility: 1.2, winRate: 50.0 },
    { sector: 'Industrials', avgReturn: 1.5, volatility: 2.6, winRate: 62.5 },
    { sector: 'Materials', avgReturn: 0.9, volatility: 2.9, winRate: 50.0 },
  ];

  // Prepare chart data
  const assetReturnsData = [
    { asset: 'SPY', avgReturn: fomcHistory.reduce((sum, e) => sum + e.marketReaction.spy, 0) / fomcHistory.length },
    { asset: 'QQQ', avgReturn: fomcHistory.reduce((sum, e) => sum + e.marketReaction.qqq, 0) / fomcHistory.length },
    { asset: 'TLT', avgReturn: fomcHistory.reduce((sum, e) => sum + e.marketReaction.tlt, 0) / fomcHistory.length },
    { asset: 'Gold', avgReturn: fomcHistory.reduce((sum, e) => sum + e.marketReaction.gold, 0) / fomcHistory.length },
    { asset: 'DXY', avgReturn: fomcHistory.reduce((sum, e) => sum + e.marketReaction.dxy, 0) / fomcHistory.length },
  ];

  const stancePerformanceData = [
    {
      stance: 'Hawkish',
      avgSPY: fomcHistory.filter((e) => e.stance === 'hawkish').reduce((sum, e) => sum + e.marketReaction.spy, 0) / fomcHistory.filter((e) => e.stance === 'hawkish').length,
      avgQQQ: fomcHistory.filter((e) => e.stance === 'hawkish').reduce((sum, e) => sum + e.marketReaction.qqq, 0) / fomcHistory.filter((e) => e.stance === 'hawkish').length,
    },
    {
      stance: 'Neutral',
      avgSPY: fomcHistory.filter((e) => e.stance === 'neutral').reduce((sum, e) => sum + e.marketReaction.spy, 0) / fomcHistory.filter((e) => e.stance === 'neutral').length,
      avgQQQ: fomcHistory.filter((e) => e.stance === 'neutral').reduce((sum, e) => sum + e.marketReaction.qqq, 0) / fomcHistory.filter((e) => e.stance === 'neutral').length,
    },
    {
      stance: 'Dovish',
      avgSPY: fomcHistory.filter((e) => e.stance === 'dovish').reduce((sum, e) => sum + e.marketReaction.spy, 0) / fomcHistory.filter((e) => e.stance === 'dovish').length,
      avgQQQ: fomcHistory.filter((e) => e.stance === 'dovish').reduce((sum, e) => sum + e.marketReaction.qqq, 0) / fomcHistory.filter((e) => e.stance === 'dovish').length,
    },
  ];

  const rateChangeVsReturnData = fomcHistory.map((e) => ({
    rateChange: e.rateChange,
    return: e.marketReaction.spy,
    date: e.date,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">FOMC Impact Study</h2>
          <p className="text-muted-foreground text-sm">
            Analyze market reactions to Federal Reserve meetings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={timeframe === '1y' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('1y')}
          >
            1 Year
          </Button>
          <Button
            variant={timeframe === '2y' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('2y')}
          >
            2 Years
          </Button>
          <Button
            variant={timeframe === '5y' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeframe('5y')}
          >
            5 Years
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <Building2 className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold mb-1">{fomcHistory.length}</div>
            <p className="text-xs text-muted-foreground">FOMC Meetings</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <Percent className="w-8 h-8 text-warning mx-auto mb-2" />
            <div className="text-2xl font-bold mb-1">
              {fomcHistory.filter((e) => e.decision === 'raise').length}
            </div>
            <p className="text-xs text-muted-foreground">Rate Hikes</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <TrendingUp className="w-8 h-8 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold text-success mb-1">
              +{assetReturnsData[0].avgReturn.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Avg SPY Return (5d)</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-4 text-center">
            <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold text-primary mb-1">
              +{assetReturnsData[1].avgReturn.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Avg QQQ Return (5d)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="meetings" className="space-y-4">
        <TabsList className="bg-background/50">
          <TabsTrigger value="meetings">Meeting History</TabsTrigger>
          <TabsTrigger value="assets">Asset Performance</TabsTrigger>
          <TabsTrigger value="stance">Stance Analysis</TabsTrigger>
          <TabsTrigger value="sectors">Sector Impact</TabsTrigger>
        </TabsList>

        {/* Meeting History */}
        <TabsContent value="meetings" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent FOMC Meetings</CardTitle>
              <CardDescription>Historical Fed decisions and market reactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fomcHistory.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 border border-border/50 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    {/* Date */}
                    <div className="w-24">
                      <p className="font-semibold text-sm">{event.date}</p>
                    </div>

                    {/* Decision */}
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          event.decision === 'raise'
                            ? 'bg-destructive/20 text-destructive border-destructive/30'
                            : event.decision === 'cut'
                            ? 'bg-success/20 text-success border-success/30'
                            : 'bg-muted'
                        }
                      >
                        {event.rateChange > 0 ? `+${event.rateChange}bps` : event.rateChange < 0 ? `${event.rateChange}bps` : 'HOLD'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          event.stance === 'hawkish'
                            ? 'border-destructive/50 text-destructive'
                            : event.stance === 'dovish'
                            ? 'border-success/50 text-success'
                            : ''
                        }
                      >
                        {event.stance}
                      </Badge>
                    </div>

                    {/* Market Reactions */}
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">SPY (5d)</p>
                        <div className="flex items-center gap-1">
                          {event.marketReaction.spy > 0 ? (
                            <TrendingUp className="w-3 h-3 text-success" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-destructive" />
                          )}
                          <span className={`font-semibold text-sm ${event.marketReaction.spy > 0 ? 'text-success' : 'text-destructive'}`}>
                            {event.marketReaction.spy > 0 ? '+' : ''}{event.marketReaction.spy.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">QQQ (5d)</p>
                        <div className="flex items-center gap-1">
                          {event.marketReaction.qqq > 0 ? (
                            <TrendingUp className="w-3 h-3 text-success" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-destructive" />
                          )}
                          <span className={`font-semibold text-sm ${event.marketReaction.qqq > 0 ? 'text-success' : 'text-destructive'}`}>
                            {event.marketReaction.qqq > 0 ? '+' : ''}{event.marketReaction.qqq.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">TLT (5d)</p>
                        <div className="flex items-center gap-1">
                          {event.marketReaction.tlt > 0 ? (
                            <TrendingUp className="w-3 h-3 text-success" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-destructive" />
                          )}
                          <span className={`font-semibold text-sm ${event.marketReaction.tlt > 0 ? 'text-success' : 'text-destructive'}`}>
                            {event.marketReaction.tlt > 0 ? '+' : ''}{event.marketReaction.tlt.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset Performance */}
        <TabsContent value="assets" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Average 5-Day Returns by Asset</CardTitle>
              <CardDescription>How different assets react to FOMC meetings</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={assetReturnsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="asset" stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                    {assetReturnsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.avgReturn > 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rate Change vs SPY Return</CardTitle>
              <CardDescription>Relationship between Fed rate decisions and market moves</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="rateChange" stroke="hsl(var(--muted-foreground))" fontSize={12} name="Rate Change (bps)" />
                  <YAxis dataKey="return" stroke="hsl(var(--muted-foreground))" fontSize={12} name="SPY 5-Day Return %" />
                  <ZAxis range={[100, 400]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Scatter data={rateChangeVsReturnData} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stance Analysis */}
        <TabsContent value="stance" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance by Fed Stance</CardTitle>
              <CardDescription>How markets react based on hawkish/dovish tone</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stancePerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stance" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Bar dataKey="avgSPY" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="SPY Avg Return %" />
                  <Bar dataKey="avgQQQ" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="QQQ Avg Return %" />
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-3 gap-4 mt-4">
                {stancePerformanceData.map((data) => (
                  <Card key={data.stance} className={`border ${
                    data.stance === 'Hawkish' ? 'border-destructive/30 bg-destructive/5' :
                    data.stance === 'Dovish' ? 'border-success/30 bg-success/5' :
                    'border-border/50 bg-muted/20'
                  }`}>
                    <CardContent className="pt-4 pb-4 text-center">
                      <p className="font-semibold text-sm mb-2">{data.stance}</p>
                      <div className={`text-xl font-bold ${data.avgSPY > 0 ? 'text-success' : 'text-destructive'}`}>
                        {data.avgSPY > 0 ? '+' : ''}{data.avgSPY.toFixed(2)}%
                      </div>
                      <p className="text-xs text-muted-foreground">SPY 5-day avg</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sector Impact */}
        <TabsContent value="sectors" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sector Performance After FOMC</CardTitle>
              <CardDescription>Which sectors benefit most from Fed decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sectorPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="sector" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Bar dataKey="avgReturn" radius={[0, 4, 4, 0]} name="Avg Return %">
                    {sectorPerformance.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.avgReturn > 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {sectorPerformance.slice(0, 4).map((sector) => (
                  <Card key={sector.sector} className="bg-secondary/30 border-border/50">
                    <CardContent className="pt-3 pb-3">
                      <p className="font-semibold text-sm mb-1">{sector.sector}</p>
                      <div className={`text-lg font-bold ${sector.avgReturn > 0 ? 'text-success' : 'text-destructive'}`}>
                        {sector.avgReturn > 0 ? '+' : ''}{sector.avgReturn.toFixed(2)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Win Rate: {sector.winRate}%</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
