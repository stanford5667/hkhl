import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getRandomizedThemes, MARKET_THEMES, type MarketTheme, type ThemeTicker } from '@/data/marketThemes';
import { useMarketThemes } from '@/hooks/useMarketThemes';

function TickerPill({ ticker, onClick }: { ticker: ThemeTicker; onClick: () => void }) {
  const sentimentColor = {
    bullish: 'bg-emerald-500',
    bearish: 'bg-red-500',
    neutral: 'bg-amber-500',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 shrink-0 hover:bg-white/10 hover:border-primary/30 transition-all group"
    >
      <div className={cn('w-1.5 h-1.5 rounded-full', sentimentColor[ticker.sentiment])} />
      <span className="text-xs font-mono font-medium text-foreground group-hover:text-primary transition-colors">
        {ticker.symbol}
      </span>
      <span className={cn(
        'text-[10px] font-mono',
        ticker.change >= 0 ? 'text-emerald-400' : 'text-red-400'
      )}>
        {ticker.change >= 0 ? '+' : ''}{ticker.change.toFixed(1)}%
      </span>
    </button>
  );
}

function ThemeCard({ 
  theme, 
  onClick,
  onTickerClick
}: { 
  theme: MarketTheme; 
  onClick: () => void;
  onTickerClick: (symbol: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = theme.icon;
  const isPositive = theme.impactPercent >= 0;

  const handleSeeMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group w-[240px] sm:w-[300px] md:w-[340px] shrink-0 p-3 sm:p-4 rounded-xl text-left transition-all duration-300",
        "bg-white/5 backdrop-blur-md border border-white/10",
        "hover:bg-white/10 hover:border-white/20 md:hover:scale-[1.02]",
        "active:scale-[0.98] md:active:scale-100",
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
      <div className="flex items-start gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 pr-14">
          <h3 className="font-semibold text-foreground text-sm leading-tight">
            {theme.title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border/50">
              {theme.category}
            </Badge>
            <span className={cn(
              "text-[10px] font-medium",
              theme.sentimentScore >= 0.6 ? "text-emerald-400" : 
              theme.sentimentScore >= 0.4 ? "text-amber-400" : "text-red-400"
            )}>
              {(theme.sentimentScore * 100).toFixed(0)}% bullish
            </span>
          </div>
        </div>
      </div>

      {/* Summary with See More */}
      <div className="mb-3">
        <p className={cn(
          "text-xs text-muted-foreground leading-relaxed transition-all duration-200",
          !expanded && "line-clamp-2"
        )}>
          {expanded ? theme.detailedSummary : theme.summary}
        </p>
        <span
          onClick={handleSeeMoreClick}
          className={cn(
            "inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-primary",
            "hover:text-primary/80 cursor-pointer transition-colors",
            "focus:outline-none focus:underline"
          )}
        >
          {expanded ? 'See less' : 'See more'}
          <ArrowRight className={cn(
            "h-3 w-3 transition-transform duration-200",
            expanded && "rotate-90"
          )} />
        </span>
      </div>

      {/* Ticker Ribbon */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {theme.tickers.slice(0, 3).map((ticker) => (
          <TickerPill 
            key={ticker.symbol} 
            ticker={ticker} 
            onClick={() => onTickerClick(ticker.symbol)}
          />
        ))}
        {theme.tickers.length > 3 && (
          <div className="flex items-center px-2 text-[10px] text-muted-foreground">
            +{theme.tickers.length - 3}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-2 pt-2 border-t border-white/5">
        <span className="inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-wide rounded-lg text-[10px] px-3 py-1.5 bg-[hsl(175_80%_45%)] text-background shadow-[0_0_12px_hsl(175_80%_45%/0.3)] group-hover:shadow-[0_0_20px_hsl(175_80%_45%/0.5)] transition-all">
          Explore theme <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </button>
  );
}

export function MarketThemesSection() {
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState<MarketTheme | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Fetch AI-generated themes from database
  const { data: dbThemes, isLoading: themesLoading } = useMarketThemes();

  // Combine AI-generated themes with static ones (AI first, then static)
  const sourceThemes = useMemo(() => {
    const aiThemes = dbThemes && dbThemes.length > 0 ? dbThemes : [];
    const aiIds = new Set(aiThemes.map(t => t.id));
    const staticOnly = MARKET_THEMES.filter(t => !aiIds.has(t.id));
    return [...aiThemes, ...staticOnly];
  }, [dbThemes]);
  const isAiGenerated = !!(dbThemes && dbThemes.length > 0);

  // Reset expansion when theme changes
  const handleThemeSelect = (theme: MarketTheme) => {
    setSheetExpanded(false);
    setSelectedTheme(theme);
  };

  const handleAnalyzeTheme = () => {
    if (!selectedTheme) return;
    const themeData = selectedTheme;
    setSelectedTheme(null);
    navigate('/theme-analysis', { state: { theme: themeData } });
  };

  const handleTickerClick = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  // Shuffled pool of themes
  const allShuffled = useMemo(() => [...sourceThemes].sort(() => Math.random() - 0.5), [sourceThemes]);
  const [visibleCount, setVisibleCount] = useState(8);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-add a new theme every 8 seconds
  useEffect(() => {
    if (showAll) return;
    const interval = setInterval(() => {
      setVisibleCount(prev => {
        if (prev >= allShuffled.length) return 8; // loop back
        return prev + 1;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [showAll, allShuffled.length]);

  // Auto-scroll to show the newest card
  useEffect(() => {
    if (showAll || !scrollRef.current) return;
    scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
  }, [visibleCount, showAll]);

  const displayedThemes = showAll ? sourceThemes : allShuffled.slice(0, visibleCount);

  return (
    <section className="space-y-2 sm:space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">Major Market Themes</h2>
              {isAiGenerated && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                  AI · Today
                </Badge>
              )}
              {themesLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:block">
              {isAiGenerated ? 'Fresh themes generated daily by AI' : `${MARKET_THEMES.length} active themes tracked`}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] sm:text-xs h-6 sm:h-7 px-2"
        >
          {showAll ? 'Less' : `All ${sourceThemes.length}`}
        </Button>
      </div>

      {/* Theme Cards - Horizontal Scroll or Grid */}
      <div className={cn(
        showAll 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3" 
          : "relative -mx-3 sm:-mx-6 px-3 sm:px-6"
      )}>
        {showAll ? (
          displayedThemes.map((theme) => (
            <div key={theme.id} className="w-full">
              <ThemeCard 
                theme={theme} 
                onClick={() => handleThemeSelect(theme)}
                onTickerClick={handleTickerClick}
              />
            </div>
          ))
        ) : (
          <div ref={scrollRef} className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory sm:snap-none">
            {displayedThemes.map((theme) => (
              <div key={theme.id} className="snap-start animate-in fade-in slide-in-from-right-4 duration-500">
                <ThemeCard 
                  theme={theme} 
                  onClick={() => handleThemeSelect(theme)}
                  onTickerClick={handleTickerClick}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      <Sheet open={!!selectedTheme} onOpenChange={() => setSelectedTheme(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-background/95 backdrop-blur-xl border-border">
          {selectedTheme && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <selectedTheme.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-lg">{selectedTheme.title}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {selectedTheme.category}
                      </Badge>
                      <span className={cn(
                        "text-sm font-bold",
                        selectedTheme.impactPercent >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {selectedTheme.impactPercent >= 0 ? '+' : ''}{selectedTheme.impactPercent.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {(selectedTheme.sentimentScore * 100).toFixed(0)}% bullish
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-240px)] mt-4 pr-4">
                {/* Detailed Summary - Collapsible */}
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Theme Analysis
                  </h4>
                  <div className="relative">
                    <p className={cn(
                      "text-sm text-foreground leading-relaxed transition-all duration-200",
                      !sheetExpanded && "line-clamp-3"
                    )}>
                      {selectedTheme.detailedSummary}
                    </p>
                    <button
                      onClick={() => setSheetExpanded(!sheetExpanded)}
                      className={cn(
                        "mt-2 text-xs font-medium text-primary hover:text-primary/80",
                        "flex items-center gap-1 transition-colors"
                      )}
                    >
                      {sheetExpanded ? 'See less' : 'See more'}
                      <ArrowRight className={cn(
                        "h-3 w-3 transition-transform duration-200",
                        sheetExpanded && "rotate-90"
                      )} />
                    </button>
                  </div>
                </div>

                {/* Related Tickers */}
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Related Companies ({selectedTheme.tickers.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTheme.tickers.map((ticker) => (
                      <button 
                        key={ticker.symbol}
                        onClick={() => handleTickerClick(ticker.symbol)}
                        className="flex flex-col w-full p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all group text-left"
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              ticker.sentiment === 'bullish' ? 'bg-emerald-500' :
                              ticker.sentiment === 'bearish' ? 'bg-red-500' : 'bg-amber-500'
                            )} />
                            <div>
                              <span className="font-mono font-medium text-sm group-hover:text-primary transition-colors">
                                {ticker.symbol}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">{ticker.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-mono text-sm font-medium",
                              ticker.change >= 0 ? "text-emerald-400" : "text-red-400"
                            )}>
                              {ticker.change >= 0 ? '+' : ''}{ticker.change.toFixed(1)}%
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                        {ticker.themeRelevance && (
                          <p className="text-xs text-muted-foreground leading-relaxed pl-5 border-l-2 border-primary/20 ml-1">
                            {ticker.themeRelevance}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Headlines */}
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Related News ({selectedTheme.headlines.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTheme.headlines.map((headline, idx) => (
                      <a 
                        key={idx}
                        href={headline.url || `https://www.google.com/search?q=${encodeURIComponent(headline.title)}&tbm=nws`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 hover:border-primary/30 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">
                            {headline.title}
                          </p>
                          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-medium">{headline.source}</span>
                          <span>•</span>
                          <span>{headline.time}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </ScrollArea>

              {/* Action Button */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
                <Button 
                  onClick={handleAnalyzeTheme}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze the Theme ({selectedTheme.tickers.length} tickers)
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
