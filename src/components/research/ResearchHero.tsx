import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, Clock, X, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTickerSearch } from '@/hooks/useTickerSearch';

const STATS = [
  { label: 'Stocks & ETFs', value: '10,000+' },
  { label: 'Financial Metrics', value: '18+' },
  { label: 'AI-Powered Insights', value: 'Real-time' },
];

interface ResearchHeroProps {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearch: (ticker: string) => void;
  recentSearches: string[];
  onClearRecent: () => void;
}

export function ResearchHero({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  recentSearches,
  onClearRecent,
}: ResearchHeroProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { query, setQuery, results, isSearching, clear } = useTickerSearch(200);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const POPULAR_TICKERS = [
    { symbol: 'AAPL', label: 'Apple' },
    { symbol: 'NVDA', label: 'NVIDIA' },
    { symbol: 'MSFT', label: 'Microsoft' },
    { symbol: 'GOOGL', label: 'Alphabet' },
    { symbol: 'AMZN', label: 'Amazon' },
    { symbol: 'TSLA', label: 'Tesla' },
    { symbol: 'META', label: 'Meta' },
    { symbol: 'SPY', label: 'S&P 500 ETF' },
  ];

  const hasResults = results.length > 0;
  const showDropdown = isFocused;

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [results]);

  // Sync external search query
  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery, setQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearchQueryChange(val);
    setQuery(val);
  };

  const handleSelect = (symbol: string) => {
    onSearch(symbol);
    setIsFocused(false);
    clear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleSelect(results[highlightedIndex].symbol);
      } else if (query) {
        onSearch(query);
      }
      return;
    }
    if (!hasResults) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setIsFocused(false), 200);
  };

  const handleClear = () => {
    onSearchQueryChange('');
    clear();
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
        {/* Hero Text — Terminal style */}
        <div className="text-center mb-3 sm:mb-4">
          <motion.div
            className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full border border-success/30 bg-success/5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
            </span>
            <span className="text-[10px] font-mono font-medium text-success uppercase tracking-widest">Market Open · Live Data</span>
          </motion.div>
          <motion.h1
            className="text-xl sm:text-2xl lg:text-4xl font-bold mb-1 sm:mb-1.5 tracking-tight font-mono"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-foreground">The All-in-One </span>
            <span className="text-primary">AI Quant</span>
            <br className="sm:hidden" />
            <span className="text-foreground"> Platform.</span>
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-[11px] sm:text-xs lg:text-sm max-w-lg mx-auto font-mono"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            AI-powered analysis · backtesting · screening — 10,000+ assets
          </motion.p>
        </div>

        {/* Search Section - Command palette style */}
        <motion.div
          ref={containerRef}
          className="max-w-xl mx-auto mb-3 sm:mb-4 relative"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className={cn(
            "relative rounded-xl",
            "bg-card border border-border/60",
            "shadow-lg shadow-primary/5",
            "transition-all",
            isFocused && "border-primary/50 shadow-primary/10 ring-1 ring-primary/20"
          )}>
            {/* Input row */}
            <div className="flex items-center gap-2 px-3 sm:px-4 h-11 sm:h-12">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                placeholder="Search tickers or company names... (e.g., AAPL, Microsoft)"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                autoFocus={false}
              />
              {isSearching && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              )}
              {!isSearching && searchQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground border-l border-border/60 pl-2 ml-1">
                <kbd className="px-1.5 py-0.5 bg-muted/60 rounded text-[10px] font-mono">⌘K</kbd>
              </div>
            </div>
          </div>

          {/* Floating dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-popover shadow-xl shadow-black/20 overflow-hidden"
              >
                {/* Search results */}
                {hasResults ? (
                  <div>
                    <div className="px-3 sm:px-4 py-1.5 border-b border-border/40">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Results</span>
                    </div>
                    <ul className="py-1 max-h-[280px] overflow-y-auto">
                      {results.map((result, index) => (
                        <li
                          key={result.symbol}
                          onClick={() => handleSelect(result.symbol)}
                          className={cn(
                            "flex items-center justify-between w-full px-3 sm:px-4 py-2 cursor-pointer transition-colors",
                            highlightedIndex === index
                              ? "bg-accent"
                              : "hover:bg-accent/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                              <span className="font-mono font-bold text-[11px] text-primary">
                                {result.symbol.slice(0, 3)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-sm text-foreground">{result.symbol}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {result.exchange || result.type || 'Stock'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{result.name}</p>
                            </div>
                          </div>
                          {result.quote && (
                            <div className="flex items-center gap-2 text-right shrink-0 ml-2">
                              <span className="font-mono text-sm text-foreground">
                                ${result.quote.price?.toFixed(2) || '—'}
                              </span>
                              {result.quote.changePercent !== undefined && (
                                <span className={cn(
                                  "flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded",
                                  result.quote.changePercent >= 0
                                    ? "text-success bg-success/10"
                                    : "text-destructive bg-destructive/10"
                                )}>
                                  {result.quote.changePercent >= 0 ? (
                                    <TrendingUp className="h-3 w-3 mr-0.5" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3 mr-0.5" />
                                  )}
                                  {result.quote.changePercent >= 0 ? '+' : ''}{result.quote.changePercent.toFixed(2)}%
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : isSearching ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Searching tickers...</span>
                  </div>
                ) : query.length >= 1 ? (
                  <div className="py-6 text-center">
                    <Search className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No tickers found for "{query}"</p>
                  </div>
                ) : (
                  /* Popular suggestions when empty */
                  <div>
                    <div className="px-3 sm:px-4 py-1.5 border-b border-border/40">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Popular</span>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-border/30">
                      {POPULAR_TICKERS.map((t) => (
                        <button
                          key={t.symbol}
                          onClick={() => handleSelect(t.symbol)}
                          className="flex items-center gap-2.5 px-3 py-2.5 bg-popover hover:bg-accent/50 transition-colors text-left"
                        >
                          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary/10 border border-primary/20 shrink-0">
                            <span className="font-mono font-bold text-[10px] text-primary">{t.symbol.slice(0, 3)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono font-semibold text-xs text-foreground">{t.symbol}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{t.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer hints */}
                <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 border-t border-border/40 bg-muted/30 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 bg-muted rounded font-mono">↑</kbd>
                      <kbd className="px-1 py-0.5 bg-muted rounded font-mono">↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Enter</kbd>
                      Open
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono">Esc</kbd>
                    Close
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="max-w-xl mx-auto overflow-x-auto scrollbar-hide mb-3 sm:mb-4">
            <div className="flex items-center gap-1.5 min-w-max px-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" /> Recent:
              </span>
              {recentSearches.slice(0, 4).map(ticker => (
                <Button
                  key={ticker}
                  variant="outline"
                  size="sm"
                  onClick={() => onSearch(ticker)}
                  className="h-6 px-2 text-[10px] border-border/60 shrink-0"
                >
                  {ticker}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearRecent}
                className="h-6 w-6 text-muted-foreground shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Stats Bar — Terminal readout */}
        <motion.div
          className="flex items-center justify-center gap-3 sm:gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-2">
              {i > 0 && <span className="text-border text-xs">│</span>}
              <div className="flex flex-col items-center gap-0">
                <span className="text-xs sm:text-sm font-mono font-bold text-primary tabular-nums">{stat.value}</span>
                <span className="text-[8px] sm:text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
