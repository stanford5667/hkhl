import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, TrendingUp, TrendingDown, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTickerSearch } from '@/hooks/useTickerSearch';

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

export function ResearchUnauthHero() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, isSearching, clear } = useTickerSearch(200);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const hasResults = results.length > 0;
  const showDropdown = isFocused;

  useEffect(() => { setHighlightedIndex(-1); }, [results]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setQuery(val);
  };

  const handleSelect = (symbol: string) => {
    navigate(`/stock/${symbol.toUpperCase()}`);
    setIsFocused(false);
    clear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleSelect(results[highlightedIndex].symbol);
      } else if (query) {
        handleSelect(query);
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
    setSearchQuery('');
    clear();
    inputRef.current?.focus();
  };

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden bg-[#050911]">
      {/* ──── Animated background ──── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Central radial glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(185 80% 50% / 0.12) 0%, hsl(270 60% 50% / 0.06) 40%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Offset cyan orb */}
        <motion.div
          className="absolute top-[20%] right-[15%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(185 90% 55% / 0.07) 0%, transparent 60%)' }}
          animate={{ x: [0, 50, 0], y: [0, -40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Purple orb */}
        <motion.div
          className="absolute bottom-[10%] left-[10%] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(270 70% 50% / 0.06) 0%, transparent 55%)' }}
          animate={{ x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
        {/* Noise grain overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
        {/* Subtle grid lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(hsl(185 50% 60% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(185 50% 60% / 0.3) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      </div>

      {/* ──── Content ──── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center w-full">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 mb-6 sm:mb-8 px-4 py-1.5 rounded-full border border-[hsl(185_80%_50%/0.25)] bg-[hsl(185_80%_50%/0.05)] text-[hsl(185_80%_50%)] text-[11px] font-mono uppercase tracking-[0.2em]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(185_80%_50%)] animate-pulse" />
          Free for all investors
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-3xl sm:text-5xl md:text-[3.5rem] lg:text-6xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-5 font-mono"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <span className="text-white">Build </span>
          <span className="bg-gradient-to-r from-[hsl(175_80%_45%)] to-[hsl(190_90%_55%)] bg-clip-text text-transparent">
            AI Investment
          </span>
          <br />
          <span className="bg-gradient-to-r from-[hsl(190_90%_55%)] to-[hsl(175_80%_45%)] bg-clip-text text-transparent">
            Strategies
          </span>
          <span className="text-white"> in Minutes.</span>
          <br />
          <span className="text-white/30 text-[0.65em]">No Coding Required.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          className="text-white/40 text-xs sm:text-sm max-w-md mx-auto mb-8 sm:mb-10 font-mono tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          AI-powered analysis · backtesting · trade ideas · courses
        </motion.p>

        {/* ──── SEARCH BAR ──── */}
        <motion.div
          className="relative max-w-xl mx-auto mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className={cn(
            "relative rounded-2xl",
            "bg-white/[0.04] border-2 border-[hsl(185_80%_50%/0.35)]",
            "shadow-[0_0_40px_-5px_hsl(185_80%_50%/0.2),0_0_80px_-15px_hsl(185_80%_50%/0.08)]",
            "transition-all duration-300",
            "animate-[pulse-glow-cyan_3s_ease-in-out_infinite]",
            isFocused && "border-[hsl(185_80%_50%/0.7)] shadow-[0_0_60px_-5px_hsl(185_80%_50%/0.35),0_0_120px_-15px_hsl(185_80%_50%/0.12)] ring-2 ring-[hsl(185_80%_50%/0.2)] animate-none"
          )}>
            <div className="flex items-center gap-3 px-4 sm:px-5 h-12 sm:h-14">
              <Search className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-[hsl(185_80%_50%)] shrink-0" />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                placeholder="Search any ticker or company..."
                className="flex-1 bg-transparent text-base sm:text-lg text-white placeholder:text-white/20 outline-none font-mono"
              />
              {isSearching && <Loader2 className="h-4 w-4 animate-spin text-white/40 shrink-0" />}
              {!isSearching && searchQuery && (
                <button onClick={handleClear} className="h-4 w-4 text-white/30 hover:text-white/60 transition-colors shrink-0">
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-white/15 border-l border-white/[0.08] pl-3 ml-1">
                <kbd className="px-1.5 py-0.5 bg-white/[0.06] rounded font-mono">⌘K</kbd>
              </div>
            </div>
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-white/10 bg-[#0a0e18]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
              >
                {hasResults ? (
                  <div>
                    <div className="px-4 py-2 border-b border-white/[0.06]">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">Results</span>
                    </div>
                    <ul className="py-1 max-h-[300px] overflow-y-auto">
                      {results.map((result, index) => (
                        <li
                          key={result.symbol}
                          onClick={() => handleSelect(result.symbol)}
                          className={cn(
                            "flex items-center justify-between w-full px-4 py-2.5 cursor-pointer transition-colors",
                            highlightedIndex === index ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[hsl(185_80%_50%/0.1)] border border-[hsl(185_80%_50%/0.2)] shrink-0">
                              <span className="font-mono font-bold text-xs text-[hsl(185_80%_50%)]">{result.symbol.slice(0, 3)}</span>
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-sm text-white">{result.symbol}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40">
                                  {result.exchange || result.type || 'Stock'}
                                </span>
                              </div>
                              <p className="text-xs text-white/40 truncate max-w-[200px]">{result.name}</p>
                            </div>
                          </div>
                          {result.quote && (
                            <div className="flex items-center gap-2 text-right shrink-0 ml-2">
                              <span className="font-mono text-sm text-white">${result.quote.price?.toFixed(2) || '—'}</span>
                              {result.quote.changePercent !== undefined && (
                                <span className={cn(
                                  "flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded",
                                  result.quote.changePercent >= 0
                                    ? "text-emerald-400 bg-emerald-500/10"
                                    : "text-red-400 bg-red-500/10"
                                )}>
                                  {result.quote.changePercent >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
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
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-white/[0.06]">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">Searching...</span>
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="h-9 w-9 rounded-lg bg-white/[0.06] animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-16 bg-white/[0.06] animate-pulse rounded" />
                          <div className="h-3 w-28 bg-white/[0.04] animate-pulse rounded" />
                        </div>
                        <div className="h-4 w-14 bg-white/[0.06] animate-pulse rounded shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : query.length >= 1 ? (
                  <div className="py-8 text-center">
                    <Search className="h-6 w-6 text-white/20 mx-auto mb-2" />
                    <p className="text-sm text-white/30">No tickers found for "{query}"</p>
                  </div>
                ) : (
                  <div>
                    <div className="px-4 py-2 border-b border-white/[0.06]">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/30">Popular</span>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-white/[0.03]">
                      {POPULAR_TICKERS.map((t) => (
                        <button
                          key={t.symbol}
                          onClick={() => handleSelect(t.symbol)}
                          className="flex items-center gap-2.5 px-4 py-3 bg-[#0a0e18] hover:bg-white/[0.04] transition-colors text-left"
                        >
                          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-[hsl(185_80%_50%/0.1)] border border-[hsl(185_80%_50%/0.2)] shrink-0">
                            <span className="font-mono font-bold text-[10px] text-[hsl(185_80%_50%)]">{t.symbol.slice(0, 3)}</span>
                          </div>
                          <div>
                            <p className="font-mono font-semibold text-xs text-white">{t.symbol}</p>
                            <p className="text-[10px] text-white/30">{t.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/[0.06] bg-white/[0.02] text-[10px] text-white/20">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 bg-white/[0.06] rounded font-mono">↑</kbd>
                      <kbd className="px-1 py-0.5 bg-white/[0.06] rounded font-mono">↓</kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white/[0.06] rounded font-mono">Enter</kbd>
                      Open
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white/[0.06] rounded font-mono">Esc</kbd>
                    Close
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Helper text */}
        <motion.p
          className="text-[10px] sm:text-[11px] text-white/20 font-mono mb-12 sm:mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Try NVDA, AAPL, SPY — or any of 10,000+ tickers
        </motion.p>

        {/* Scroll chevron */}
        <motion.div
          className="flex flex-col items-center gap-1.5 cursor-pointer"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          onClick={() => {
            document.getElementById('research-features')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <span className="text-[9px] uppercase tracking-[0.25em] font-mono text-white/15">Explore</span>
          <ChevronDown className="h-4 w-4 text-white/15" />
        </motion.div>
      </div>
    </section>
  );
}
