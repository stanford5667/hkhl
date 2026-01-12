import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FlaskConical, Search, Play, Plus, X, Save,
  TrendingUp, TrendingDown, BarChart3, Activity,
  Calendar, Zap, Layers, Volume2, Crosshair, LineChart,
  Gauge, ArrowLeftRight, Mountain, ArrowUpDown, Sparkles, Crown, Lock
} from 'lucide-react';
import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { useUpgrade } from '@/hooks/useUpgrade';
import { QuantitativeStudiesPanel } from '@/components/equity/QuantitativeStudiesPanel';
import { cn } from '@/lib/utils';

const STUDY_CATEGORIES = [
  { id: 'basic', name: 'Basic Stats', icon: BarChart3, color: 'blue' },
  { id: 'seasonality', name: 'Seasonality', icon: Calendar, color: 'purple' },
  { id: 'technical', name: 'Technical', icon: LineChart, color: 'emerald' },
  { id: 'volatility', name: 'Volatility', icon: Zap, color: 'amber' },
  { id: 'patterns', name: 'Patterns', icon: Layers, color: 'rose' },
  { id: 'volume', name: 'Volume', icon: Volume2, color: 'cyan' },
  { id: 'projections', name: 'Projections', icon: Crosshair, color: 'indigo' },
];

const POPULAR_STUDIES = [
  { id: 'rsi_analysis', name: 'RSI Analysis', description: 'Overbought/oversold signals', icon: Gauge },
  { id: 'moving_average_analysis', name: 'Moving Averages', description: 'Trend direction & crosses', icon: LineChart },
  { id: 'day_of_week_returns', name: 'Day of Week', description: 'Best performing days', icon: Calendar },
  { id: 'drawdown_analysis', name: 'Drawdowns', description: 'Risk & recovery analysis', icon: TrendingDown },
  { id: 'trend_strength', name: 'Trend Strength', description: 'Multi-factor trend score', icon: TrendingUp },
  { id: 'price_targets', name: 'Price Targets', description: 'Statistical projections', icon: Crosshair },
];

const QUICK_ADD_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'SPY', 'QQQ'];

export default function QuantLab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTickers, setSelectedTickers] = useState<string[]>(() => {
    const tickerParam = searchParams.get('ticker');
    return tickerParam ? [tickerParam.toUpperCase()] : ['SPY'];
  });
  const [tickerInput, setTickerInput] = useState('');
  const [activeTicker, setActiveTicker] = useState<string>(() => {
    const tickerParam = searchParams.get('ticker');
    return tickerParam?.toUpperCase() || 'SPY';
  });
  const { promptUpgrade } = useUpgrade();

  // Update URL when ticker changes
  useEffect(() => {
    if (activeTicker) {
      setSearchParams({ ticker: activeTicker });
    }
  }, [activeTicker, setSearchParams]);

  const addTicker = () => {
    const ticker = tickerInput.toUpperCase().trim();
    if (ticker && !selectedTickers.includes(ticker)) {
      setSelectedTickers([...selectedTickers, ticker]);
      setActiveTicker(ticker);
      setTickerInput('');
    }
  };

  const removeTicker = (ticker: string) => {
    const newTickers = selectedTickers.filter(t => t !== ticker);
    setSelectedTickers(newTickers);
    if (activeTicker === ticker && newTickers.length > 0) {
      setActiveTicker(newTickers[0]);
    }
  };

  const quickAddTicker = (ticker: string) => {
    if (!selectedTickers.includes(ticker)) {
      setSelectedTickers([...selectedTickers, ticker]);
    }
    setActiveTicker(ticker);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
            <FlaskConical className="h-5 w-5 sm:h-6 sm:w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Quant Lab</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-0.5">
              Run quantitative studies on any stock or ETF
            </p>
          </div>
        </div>
      </div>

      {/* Ticker Selector */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            Select Tickers to Analyze
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input row */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter ticker symbol (e.g., AAPL)"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && addTicker()}
              className="max-w-xs bg-background"
            />
            <Button onClick={addTicker} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          
          {/* Selected tickers */}
          <div className="flex flex-wrap gap-2">
            {selectedTickers.map((ticker) => (
              <Badge 
                key={ticker} 
                variant={ticker === activeTicker ? "default" : "secondary"}
                className={cn(
                  "pl-3 pr-1.5 py-1.5 text-sm cursor-pointer transition-all",
                  ticker === activeTicker 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-secondary/80"
                )}
                onClick={() => setActiveTicker(ticker)}
              >
                {ticker}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTicker(ticker);
                  }}
                  className="ml-1.5 hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
          </div>

          {/* Quick add popular tickers */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Quick add:</span>
            {QUICK_ADD_TICKERS.map((ticker) => (
              <button
                key={ticker}
                onClick={() => quickAddTicker(ticker)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-colors",
                  selectedTickers.includes(ticker)
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {ticker}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Studies Panel for Selected Ticker - MOVED TO TOP (Primary usable feature) */}
      {selectedTickers.length > 0 && activeTicker && (
        <div className="space-y-4">
          {/* Ticker tabs if multiple selected */}
          {selectedTickers.length > 1 && (
            <Tabs value={activeTicker} onValueChange={setActiveTicker}>
              <TabsList className="bg-muted/50">
                {selectedTickers.map((ticker) => (
                  <TabsTrigger key={ticker} value={ticker} className="gap-1.5">
                    {ticker}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          
          {/* Studies Panel */}
          <QuantitativeStudiesPanel 
            ticker={activeTicker} 
            companyName={activeTicker} 
          />
        </div>
      )}

      {selectedTickers.length === 0 && (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FlaskConical className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Tickers Selected</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Add a ticker symbol above to start running quantitative studies. 
              You can analyze multiple stocks and compare results.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Study Categories Preview - Secondary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {STUDY_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card 
              key={cat.id} 
              className={cn(
                "p-3 cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5",
                "border-border/50 bg-card/50"
              )}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  `bg-${cat.color}-500/10`
                )}>
                  <Icon className={cn("h-5 w-5", `text-${cat.color}-500`)} />
                </div>
                <span className="text-xs font-medium text-foreground">{cat.name}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Popular Studies Quick Launch - Premium Feature */}
      <Card className="border-border/50 bg-card/50 relative overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Popular Studies
            </CardTitle>
            <PremiumBadge />
          </div>
          <CardDescription>Quick-launch preset study configurations</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-50 pointer-events-none">
            {POPULAR_STUDIES.map((study) => {
              const Icon = study.icon;
              return (
                <div
                  key={study.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50 text-left"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{study.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{study.description}</p>
                  </div>
                  <Lock className="h-4 w-4 text-amber-500" />
                </div>
              );
            })}
          </div>
          {/* Premium Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Crown className="h-5 w-5" />
              <span className="font-semibold">Premium Feature</span>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-[250px] mb-3">
              Quick-launch studies with preset configurations
            </p>
            <Button size="sm" onClick={() => promptUpgrade('Quick Study Presets')} className="gap-2">
              <Crown className="h-4 w-4" />
              Upgrade to Unlock
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
