/**
 * Mobile Market Intel Panel
 * 
 * Full-screen mobile-optimized panel for Market Intel with:
 * - Ticker + Study search in same section
 * - Mini stock chart
 * - Visual interactive data
 * - Consolidated tabs
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, TrendingUp, TrendingDown, BarChart3, Activity, 
  Globe, Zap, ChevronRight, LineChart, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useEconomicDataWithRefresh, calculateMarketHealthScore } from '@/hooks/useEconomicData';

// Simple sparkline chart data generator
const generateSparklineData = (baseValue: number, volatility: number = 0.02, points: number = 30) => {
  const data: { value: number; index: number }[] = [];
  let value = baseValue;
  for (let i = 0; i < points; i++) {
    value = value * (1 + (Math.random() - 0.5) * volatility);
    data.push({ value, index: i });
  }
  return data;
};

// Popular tickers for quick selection
const POPULAR_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY'];

// Available studies for mobile
const MOBILE_STUDIES = [
  { id: 'daily_win_rate', name: 'Daily Win Rate', icon: Activity, category: 'Basic' },
  { id: 'intraday_direction', name: 'Intraday Direction', icon: TrendingUp, category: 'Basic' },
  { id: 'volatility_regime', name: 'Volatility Regime', icon: BarChart3, category: 'Technical' },
  { id: 'momentum', name: 'Momentum Score', icon: Zap, category: 'Technical' },
];

interface MobileMarketIntelPanelProps {
  onTickerSelect?: (ticker: string) => void;
  onStudySelect?: (studyId: string) => void;
  className?: string;
}

export function MobileMarketIntelPanel({ 
  onTickerSelect, 
  onStudySelect,
  className 
}: MobileMarketIntelPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicker, setSelectedTicker] = useState('SPY');
  const [selectedStudy, setSelectedStudy] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chart');

  const { byCategory, isLoading } = useEconomicDataWithRefresh();
  
  // Calculate market health
  const healthScore = useMemo(() => {
    const allIndicators = [
      ...(byCategory?.rates || []),
      ...(byCategory?.economic || []),
      ...(byCategory?.markets || []),
    ];
    return allIndicators.length > 0 
      ? calculateMarketHealthScore(allIndicators) 
      : { score: 50, label: 'Loading...', factors: [] };
  }, [byCategory]);

  // Generate mock chart data for selected ticker
  const chartData = useMemo(() => {
    const baseValue = selectedTicker === 'SPY' ? 580 : 
                      selectedTicker === 'AAPL' ? 255 : 
                      selectedTicker === 'MSFT' ? 450 : 100;
    return generateSparklineData(baseValue, 0.015, 50);
  }, [selectedTicker]);

  const priceChange = chartData[chartData.length - 1].value - chartData[0].value;
  const priceChangePercent = (priceChange / chartData[0].value) * 100;
  const isPositive = priceChange >= 0;

  // Filter tickers based on search
  const filteredTickers = POPULAR_TICKERS.filter(t => 
    t.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTickerSelect = (ticker: string) => {
    setSelectedTicker(ticker);
    setSearchQuery('');
    onTickerSelect?.(ticker);
  };

  const handleStudySelect = (studyId: string) => {
    setSelectedStudy(studyId);
    onStudySelect?.(studyId);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Compact Header with Live Economic Data - Now at top */}
      <Card className="bg-gradient-to-r from-primary/10 via-card to-primary/10 border-primary/20">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <div>
                <h2 className="text-sm sm:text-base font-semibold">Live Economic Data</h2>
                <p className="text-[10px] sm:text-xs text-emerald-400">Live from FRED</p>
              </div>
            </div>
            {/* Large Market Health Score */}
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Market Health</p>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-2xl sm:text-4xl font-bold tabular-nums",
                  healthScore.score >= 60 ? "text-emerald-400" :
                  healthScore.score <= 40 ? "text-rose-400" : "text-amber-400"
                )}>
                  {healthScore.score}
                </span>
                <Badge variant="outline" className={cn(
                  "text-[10px] sm:text-xs",
                  healthScore.score >= 60 ? "border-emerald-500/30 text-emerald-400" :
                  healthScore.score <= 40 ? "border-rose-500/30 text-rose-400" : 
                  "border-amber-500/30 text-amber-400"
                )}>
                  {healthScore.label}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Interactive Panel - All Tabs in One Card */}
      <Card className="border-border/50">
        <CardHeader className="p-3 pb-0">
          {/* Unified Search - Ticker + Study */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search ticker or study..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm bg-secondary/50"
              />
            </div>
          </div>

          {/* Quick Ticker Pills */}
          {searchQuery === '' && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {POPULAR_TICKERS.slice(0, 6).map((ticker) => (
                <Button
                  key={ticker}
                  variant={selectedTicker === ticker ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => handleTickerSelect(ticker)}
                >
                  {ticker}
                </Button>
              ))}
            </div>
          )}

          {/* Search Results Dropdown */}
          {searchQuery !== '' && (
            <div className="pt-2 space-y-1">
              {filteredTickers.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tickers</p>
                  <div className="flex flex-wrap gap-1">
                    {filteredTickers.map((ticker) => (
                      <Button
                        key={ticker}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleTickerSelect(ticker)}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {ticker}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {MOBILE_STUDIES.filter(s => 
                s.name.toLowerCase().includes(searchQuery.toLowerCase())
              ).length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Studies</p>
                  <div className="flex flex-wrap gap-1">
                    {MOBILE_STUDIES.filter(s => 
                      s.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((study) => (
                      <Button
                        key={study.id}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          handleStudySelect(study.id);
                          setSearchQuery('');
                        }}
                      >
                        <study.icon className="h-3 w-3 mr-1" />
                        {study.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardHeader>

        {/* Tabs - All in same card */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-3 pt-2">
            <TabsList className="w-full h-8 bg-secondary/50 p-0.5">
              <TabsTrigger value="chart" className="flex-1 h-7 text-xs data-[state=active]:bg-card">
                <LineChart className="h-3 w-3 mr-1" />
                Chart
              </TabsTrigger>
              <TabsTrigger value="data" className="flex-1 h-7 text-xs data-[state=active]:bg-card">
                <BarChart3 className="h-3 w-3 mr-1" />
                Data
              </TabsTrigger>
              <TabsTrigger value="studies" className="flex-1 h-7 text-xs data-[state=active]:bg-card">
                <Activity className="h-3 w-3 mr-1" />
                Studies
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-3 pt-2">
            {/* Chart Tab */}
            <TabsContent value="chart" className="mt-0 space-y-3">
              {/* Ticker Header with Price */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">${selectedTicker}</span>
                    <Badge variant="outline" className="text-[10px]">1M</Badge>
                  </div>
                  <p className="text-xl font-mono font-semibold">
                    ${chartData[chartData.length - 1].value.toFixed(2)}
                  </p>
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md",
                  isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                )}>
                  {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  <span className="text-sm font-mono font-medium">
                    {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Mini Stock Chart */}
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={isPositive ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="index" hide />
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                      labelFormatter={() => ''}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={isPositive ? '#10b981' : '#f43f5e'}
                      strokeWidth={2}
                      fill="url(#chartGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-secondary/30 rounded-lg text-center">
                  <p className="text-[10px] text-muted-foreground">Open</p>
                  <p className="text-sm font-mono font-medium">${chartData[0].value.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg text-center">
                  <p className="text-[10px] text-muted-foreground">High</p>
                  <p className="text-sm font-mono font-medium text-emerald-400">
                    ${Math.max(...chartData.map(d => d.value)).toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg text-center">
                  <p className="text-[10px] text-muted-foreground">Low</p>
                  <p className="text-sm font-mono font-medium text-rose-400">
                    ${Math.min(...chartData.map(d => d.value)).toFixed(2)}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Data Tab - Visual Economic Indicators */}
            <TabsContent value="data" className="mt-0 space-y-3">
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {/* Rates */}
                  {byCategory?.rates?.slice(0, 4).map((indicator: any) => (
                    <div 
                      key={indicator.id}
                      className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{indicator.indicator_name}</p>
                        <p className="text-[10px] text-muted-foreground">{indicator.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold">{indicator.current_value}</p>
                        <div className={cn(
                          "flex items-center justify-end gap-0.5 text-[10px]",
                          (indicator.change_value || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {(indicator.change_value || 0) >= 0 ? 
                            <ArrowUpRight className="h-2.5 w-2.5" /> : 
                            <ArrowDownRight className="h-2.5 w-2.5" />
                          }
                          {indicator.change_value || '0'}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Economic */}
                  {byCategory?.economic?.slice(0, 4).map((indicator: any) => (
                    <div 
                      key={indicator.id}
                      className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{indicator.indicator_name}</p>
                        <p className="text-[10px] text-muted-foreground">{indicator.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold">{indicator.current_value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Studies Tab */}
            <TabsContent value="studies" className="mt-0 space-y-3">
              <div className="space-y-2">
                {MOBILE_STUDIES.map((study) => (
                  <div
                    key={study.id}
                    onClick={() => handleStudySelect(study.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
                      selectedStudy === study.id 
                        ? "bg-primary/10 border border-primary/30" 
                        : "bg-secondary/30 hover:bg-secondary/50 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg",
                      selectedStudy === study.id ? "bg-primary/20" : "bg-secondary/50"
                    )}>
                      <study.icon className={cn(
                        "h-4 w-4",
                        selectedStudy === study.id ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{study.name}</p>
                      <p className="text-[10px] text-muted-foreground">{study.category}</p>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform",
                      selectedStudy === study.id ? "text-primary rotate-90" : "text-muted-foreground"
                    )} />
                  </div>
                ))}
              </div>

              {/* Run Study Button */}
              {selectedStudy && (
                <Button className="w-full" size="sm">
                  <Activity className="h-4 w-4 mr-2" />
                  Run {MOBILE_STUDIES.find(s => s.id === selectedStudy)?.name} on ${selectedTicker}
                </Button>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
