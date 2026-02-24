import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, ArrowRight, Clock, X, TrendingUp, Beaker, BarChart3 } from 'lucide-react';
import { TickerSearchAutocomplete } from '@/components/shared/TickerSearchAutocomplete';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
  return (
    <div className="relative">
      <div className="relative max-w-6xl mx-auto px-3 sm:px-6 pt-6 sm:pt-10 pb-4 sm:pb-6">
        {/* Hero Text */}
        <div className="text-center mb-4 sm:mb-6">
          <motion.h1
            className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-1.5 sm:mb-2 tracking-tight"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="bg-gradient-to-r from-primary via-primary to-cyan-400 bg-clip-text text-transparent">
              Research Smarter.
            </span>
            <br className="sm:hidden" />
            <span className="text-foreground"> Invest Better.</span>
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-xs sm:text-sm lg:text-base max-w-lg mx-auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            AI-powered analysis, backtesting, and screening across the entire market
          </motion.p>
        </div>

        {/* Search Section */}
        <motion.div
          className="max-w-xl mx-auto mb-4 sm:mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className={cn(
            "relative rounded-xl overflow-hidden",
            "bg-card/80 backdrop-blur-sm border border-border/60",
            "shadow-lg shadow-primary/5",
            "focus-within:border-primary/50 focus-within:shadow-primary/10 transition-all"
          )}>
            <div className="flex items-center gap-1.5 sm:gap-2 p-1">
              <Search className="h-4 w-4 text-muted-foreground ml-2 sm:ml-3 shrink-0" />
              <TickerSearchAutocomplete
                value={searchQuery}
                onChange={onSearchQueryChange}
                onSelect={(result) => onSearch(result.symbol)}
                placeholder="Search any stock or ETF..."
                className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm"
                autoFocus
              />
              <Button
                size="sm"
                className="mr-1 bg-primary hover:bg-primary/90 h-8 px-2 sm:px-3"
                onClick={() => searchQuery && onSearch(searchQuery)}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="max-w-xl mx-auto overflow-x-auto scrollbar-hide mb-4 sm:mb-5">
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

        {/* Stats Bar */}
        <motion.div
          className="flex items-center justify-center gap-4 sm:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5">
              <span className="text-sm sm:text-lg font-bold text-foreground">{stat.value}</span>
              <span className="text-[9px] sm:text-[11px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
