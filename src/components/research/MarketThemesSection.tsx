import { useState } from 'react';
import { TrendingUp, Sparkles, Zap, Leaf, ArrowRight, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ThemeTicker {
  symbol: string;
  change: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface MarketTheme {
  id: string;
  title: string;
  summary: string;
  impactPercent: number;
  sentimentScore: number;
  icon: React.ElementType;
  tickers: ThemeTicker[];
  headlines: { title: string; source: string; time: string }[];
}

const MOCK_THEMES: MarketTheme[] = [
  {
    id: 'ai-scaling',
    title: 'AI Infrastructure Surge',
    summary: 'Data center buildout accelerating as hyperscalers race to meet compute demand. Power and cooling infrastructure seeing record investment.',
    impactPercent: 12.4,
    sentimentScore: 0.85,
    icon: Sparkles,
    tickers: [
      { symbol: 'NVDA', change: 4.2, sentiment: 'bullish' },
      { symbol: 'VRT', change: 8.1, sentiment: 'bullish' },
      { symbol: 'ETN', change: 3.5, sentiment: 'bullish' },
      { symbol: 'DELL', change: 2.1, sentiment: 'neutral' },
      { symbol: 'SMCI', change: -1.2, sentiment: 'bearish' },
    ],
    headlines: [
      { title: 'NVIDIA announces next-gen Blackwell architecture', source: 'Reuters', time: '2h ago' },
      { title: 'Microsoft to spend $80B on AI data centers', source: 'Bloomberg', time: '4h ago' },
      { title: 'Vertiv sees 30% YoY growth in cooling orders', source: 'WSJ', time: '6h ago' },
    ],
  },
  {
    id: 'energy-transition',
    title: 'Energy Transition',
    summary: 'Renewable infrastructure spending accelerating globally. Grid modernization and battery storage leading investment themes.',
    impactPercent: 7.8,
    sentimentScore: 0.72,
    icon: Leaf,
    tickers: [
      { symbol: 'ENPH', change: 5.3, sentiment: 'bullish' },
      { symbol: 'FSLR', change: 3.9, sentiment: 'bullish' },
      { symbol: 'NEE', change: 1.2, sentiment: 'neutral' },
      { symbol: 'PLUG', change: -2.4, sentiment: 'bearish' },
    ],
    headlines: [
      { title: 'US solar installations hit record in Q4', source: 'CNBC', time: '3h ago' },
      { title: 'EU approves €50B green energy package', source: 'FT', time: '5h ago' },
    ],
  },
  {
    id: 'rate-pivot',
    title: 'Rate Pivot Positioning',
    summary: 'Markets pricing in Fed rate cuts. Duration-sensitive assets and financials seeing rotational flows.',
    impactPercent: -3.2,
    sentimentScore: 0.45,
    icon: TrendingUp,
    tickers: [
      { symbol: 'TLT', change: 1.8, sentiment: 'bullish' },
      { symbol: 'XLF', change: 2.1, sentiment: 'bullish' },
      { symbol: 'KRE', change: 3.4, sentiment: 'bullish' },
      { symbol: 'JPM', change: 1.1, sentiment: 'neutral' },
    ],
    headlines: [
      { title: 'Fed signals potential March rate cut', source: 'WSJ', time: '1h ago' },
      { title: 'Regional banks rally on improved NIM outlook', source: 'Bloomberg', time: '4h ago' },
    ],
  },
  {
    id: 'defense-spending',
    title: 'Defense Modernization',
    summary: 'Geopolitical tensions driving sustained defense budget increases. Aerospace and cyber security benefiting.',
    impactPercent: 5.6,
    sentimentScore: 0.68,
    icon: Zap,
    tickers: [
      { symbol: 'LMT', change: 2.8, sentiment: 'bullish' },
      { symbol: 'RTX', change: 1.9, sentiment: 'bullish' },
      { symbol: 'NOC', change: 2.2, sentiment: 'bullish' },
      { symbol: 'PLTR', change: 4.5, sentiment: 'bullish' },
    ],
    headlines: [
      { title: 'Pentagon awards $15B in new contracts', source: 'Defense News', time: '2h ago' },
      { title: 'NATO allies increase defense spending commitments', source: 'Reuters', time: '6h ago' },
    ],
  },
];

function TickerPill({ ticker }: { ticker: ThemeTicker }) {
  const sentimentColor = {
    bullish: 'bg-emerald-500',
    bearish: 'bg-red-500',
    neutral: 'bg-amber-500',
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 shrink-0">
      <div className={cn('w-1.5 h-1.5 rounded-full', sentimentColor[ticker.sentiment])} />
      <span className="text-xs font-mono font-medium text-foreground">{ticker.symbol}</span>
      <span className={cn(
        'text-[10px] font-mono',
        ticker.change >= 0 ? 'text-emerald-400' : 'text-red-400'
      )}>
        {ticker.change >= 0 ? '+' : ''}{ticker.change.toFixed(1)}%
      </span>
    </div>
  );
}

function ThemeCard({ 
  theme, 
  onClick 
}: { 
  theme: MarketTheme; 
  onClick: () => void;
}) {
  const Icon = theme.icon;
  const isPositive = theme.impactPercent >= 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group w-[280px] sm:w-[320px] shrink-0 p-4 rounded-xl text-left transition-all duration-300",
        "bg-white/5 backdrop-blur-md border border-white/10",
        "hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]",
        "focus:outline-none focus:ring-2 focus:ring-primary/50"
      )}
    >
      {/* Impact Badge with Glow */}
      <div className={cn(
        "absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold",
        "flex items-center gap-1",
        isPositive 
          ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]" 
          : "bg-red-500/20 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
      )}>
        {isPositive ? '+' : ''}{theme.impactPercent.toFixed(1)}%
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 pr-12">
          <h3 className="font-semibold text-foreground text-sm leading-tight truncate">
            {theme.title}
          </h3>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-muted-foreground">Sentiment:</span>
            <span className={cn(
              "text-[10px] font-medium",
              theme.sentimentScore >= 0.6 ? "text-emerald-400" : 
              theme.sentimentScore >= 0.4 ? "text-amber-400" : "text-red-400"
            )}>
              {(theme.sentimentScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
        {theme.summary}
      </p>

      {/* Ticker Ribbon */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {theme.tickers.slice(0, 4).map((ticker) => (
          <TickerPill key={ticker.symbol} ticker={ticker} />
        ))}
        {theme.tickers.length > 4 && (
          <div className="flex items-center px-2 text-[10px] text-muted-foreground">
            +{theme.tickers.length - 4}
          </div>
        )}
      </div>

      {/* Hover indicator */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="h-4 w-4 text-primary" />
      </div>
    </button>
  );
}

export function MarketThemesSection() {
  const [selectedTheme, setSelectedTheme] = useState<MarketTheme | null>(null);

  const handleAddToWatchlist = () => {
    if (!selectedTheme) return;
    // TODO: Implement watchlist integration
    console.log('Adding tickers to watchlist:', selectedTheme.tickers.map(t => t.symbol));
    setSelectedTheme(null);
  };

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Major Market Themes</h2>
        </div>
        <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50">
          AI-Powered
        </span>
      </div>

      {/* Theme Cards - Horizontal Scroll */}
      <div className="relative -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {MOCK_THEMES.map((theme) => (
            <ThemeCard 
              key={theme.id} 
              theme={theme} 
              onClick={() => setSelectedTheme(theme)}
            />
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <Sheet open={!!selectedTheme} onOpenChange={() => setSelectedTheme(null)}>
        <SheetContent className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl border-border">
          {selectedTheme && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <selectedTheme.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-lg">{selectedTheme.title}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "text-sm font-bold",
                        selectedTheme.impactPercent >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {selectedTheme.impactPercent >= 0 ? '+' : ''}{selectedTheme.impactPercent.toFixed(1)}% Impact
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • Sentiment: {(selectedTheme.sentimentScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-220px)] mt-4">
                {/* Summary */}
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Theme Summary
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedTheme.summary}
                  </p>
                </div>

                {/* Related Tickers */}
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Related Tickers
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTheme.tickers.map((ticker) => (
                      <div 
                        key={ticker.symbol}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            ticker.sentiment === 'bullish' ? 'bg-emerald-500' :
                            ticker.sentiment === 'bearish' ? 'bg-red-500' : 'bg-amber-500'
                          )} />
                          <span className="font-mono font-medium text-sm">{ticker.symbol}</span>
                        </div>
                        <span className={cn(
                          "font-mono text-sm font-medium",
                          ticker.change >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          {ticker.change >= 0 ? '+' : ''}{ticker.change.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Headlines */}
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Triggering Headlines
                  </h4>
                  <div className="space-y-3">
                    {selectedTheme.headlines.map((headline, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <p className="text-sm text-foreground leading-snug mb-1">
                          {headline.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{headline.source}</span>
                          <span>•</span>
                          <span>{headline.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>

              {/* Action Button */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
                <Button 
                  onClick={handleAddToWatchlist}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Trade the Theme ({selectedTheme.tickers.length} tickers)
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}