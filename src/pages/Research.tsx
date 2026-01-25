import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, Clock, X, ArrowRight } from 'lucide-react';
import { TickerSearchAutocomplete } from '@/components/shared/TickerSearchAutocomplete';
import { MarketPulseStrip } from '@/components/research/MarketPulseStrip';
import { SignalStream } from '@/components/research/SignalStream';
import { cn } from '@/lib/utils';

export default function ResearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentAssetSearches');
    return saved ? JSON.parse(saved) : [];
  });

  const handleSearch = (ticker: string) => {
    const normalized = ticker.toUpperCase().trim();
    if (!normalized) return;
    
    const updated = [normalized, ...recentSearches.filter(t => t !== normalized)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentAssetSearches', JSON.stringify(updated));
    navigate(`/stock/${normalized}`);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentAssetSearches');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Market Pulse Strip - Top Header */}
      <MarketPulseStrip />
      
      {/* Main Content Container */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Search Section - Compact Hero */}
        <div className="space-y-3">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold">
              <span className="bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent">
                Discovery Engine
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              AI-powered market intelligence
            </p>
          </div>

          {/* Search Bar - Glassmorphism */}
          <div className={cn(
            "relative rounded-xl overflow-hidden",
            "bg-slate-950/40 backdrop-blur-md border border-slate-800/60",
            "focus-within:border-primary/50 focus-within:shadow-[0_0_20px_hsl(var(--primary)/0.15)] transition-all"
          )}>
            <div className="flex items-center gap-2 p-1">
              <Search className="h-4 w-4 text-muted-foreground ml-3" />
              <TickerSearchAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                onSelect={(result) => handleSearch(result.symbol)}
                placeholder="Search stocks, ETFs..."
                className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent text-sm font-mono"
                autoFocus
              />
              <Button 
                size="sm" 
                className="mr-1 bg-primary hover:bg-primary/90 h-8"
                onClick={() => searchQuery && handleSearch(searchQuery)}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Recent Searches - Compact Pills */}
          {recentSearches.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Recent:
              </span>
              {recentSearches.slice(0, 5).map(ticker => (
                <button
                  key={ticker}
                  onClick={() => handleSearch(ticker)}
                  className={cn(
                    "h-6 px-2.5 rounded-full text-[11px] font-mono font-medium",
                    "bg-slate-950/40 backdrop-blur-md border border-slate-800/50",
                    "text-muted-foreground hover:text-foreground hover:border-primary/30",
                    "transition-all duration-200"
                  )}
                >
                  {ticker}
                </button>
              ))}
              <button
                onClick={clearRecentSearches}
                className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-slate-800/50 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Signal Stream - Main Feed */}
        <SignalStream />
      </div>
    </div>
  );
}
