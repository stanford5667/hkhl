import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Brain, BarChart3, TrendingUp, Shield, Activity } from 'lucide-react';
import { ProbabilityCone } from './ProbabilityCone';
import { PnLDiagram } from './PnLDiagram';
import { GreeksDashboard } from './GreeksDashboard';
import { IVAnalysis } from './IVAnalysis';
import { OptionsAdvisorChat } from './OptionsAdvisorChat';

export type TradeIntent = 'hedge' | 'income' | 'growth' | 'event-driven';

const INTENT_CONFIG: Record<TradeIntent, { label: string; icon: typeof Shield; color: string; description: string }> = {
  hedge: { label: 'Hedge', icon: Shield, color: 'text-blue-400', description: 'Protect existing positions against downside' },
  income: { label: 'Income', icon: TrendingUp, color: 'text-green-400', description: 'Generate premium through selling strategies' },
  growth: { label: 'Growth', icon: BarChart3, color: 'text-amber-400', description: 'Directional bets with leveraged exposure' },
  'event-driven': { label: 'Event-Driven', icon: Activity, color: 'text-purple-400', description: 'Capitalize on catalysts like earnings, FDA, etc.' },
};

export function OptionsAnalyzer() {
  const [ticker, setTicker] = useState('');
  const [activeTicker, setActiveTicker] = useState('');
  const [intent, setIntent] = useState<TradeIntent>('growth');
  const [activeTab, setActiveTab] = useState('advisor');

  const handleSearch = useCallback(() => {
    if (ticker.trim()) {
      setActiveTicker(ticker.trim().toUpperCase());
    }
  }, [ticker]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Title */}
            <div className="flex items-center gap-2 mr-4">
              <Brain className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold tracking-tight">Options Analyzer</h1>
            </div>

            {/* Ticker Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter ticker..."
                  className="pl-9 w-36 h-9 bg-background/50 font-mono"
                />
              </div>
              <Button size="sm" onClick={handleSearch} className="h-9">
                Analyze
              </Button>
            </div>

            {/* Active Ticker */}
            {activeTicker && (
              <Badge variant="outline" className="font-mono text-sm px-3 py-1 border-primary/50 text-primary">
                {activeTicker}
              </Badge>
            )}

            {/* Intent Selector */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">Strategy Goal:</span>
              <Select value={intent} onValueChange={(v) => setIntent(v as TradeIntent)}>
                <SelectTrigger className="w-44 h-9 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INTENT_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        <span>{cfg.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Intent Description */}
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`text-xs ${INTENT_CONFIG[intent].color}`}>
              {INTENT_CONFIG[intent].description}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 py-4">
        {!activeTicker ? (
          <Card className="p-12 text-center">
            <Brain className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enter a ticker to begin analysis</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Get AI-powered options recommendations with probability analysis, P&L visualization, 
              Greeks sensitivity, and IV analysis — all backed by live market data.
            </p>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="advisor" className="gap-1.5">
                <Brain className="h-3.5 w-3.5" />
                AI Advisor
              </TabsTrigger>
              <TabsTrigger value="probability" className="gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Probability Cone
              </TabsTrigger>
              <TabsTrigger value="pnl" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                P&L Diagram
              </TabsTrigger>
              <TabsTrigger value="greeks" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Greeks
              </TabsTrigger>
              <TabsTrigger value="iv" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                IV Analysis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="advisor">
              <OptionsAdvisorChat ticker={activeTicker} intent={intent} />
            </TabsContent>

            <TabsContent value="probability">
              <ProbabilityCone ticker={activeTicker} />
            </TabsContent>

            <TabsContent value="pnl">
              <PnLDiagram ticker={activeTicker} />
            </TabsContent>

            <TabsContent value="greeks">
              <GreeksDashboard ticker={activeTicker} />
            </TabsContent>

            <TabsContent value="iv">
              <IVAnalysis ticker={activeTicker} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
