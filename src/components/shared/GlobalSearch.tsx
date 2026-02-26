import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { prefetchTickerData } from '@/lib/tickerPrefetch';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Search, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { useTickerSearch } from '@/hooks/useTickerSearch';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { query, setQuery, results, isSearching, clear } = useTickerSearch(200);

  // Reset query when closing
  useEffect(() => {
    if (!open) {
      clear();
    }
  }, [open, clear]);

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  const hasResults = results.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-slate-900 border-slate-800 rounded-xl overflow-hidden">
        <CommandInput
          placeholder="Search tickers or company names... (e.g., AAPL, Microsoft)"
          value={query}
          onValueChange={setQuery}
          className="border-b border-slate-800"
        />
        <CommandList className="max-h-[400px]">
          {/* Loading state */}
          {isSearching && (
            <div className="py-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Searching tickers...</p>
            </div>
          )}

          {/* Empty state */}
          {!isSearching && query.length >= 1 && !hasResults && (
            <CommandEmpty className="py-6 text-center">
              <Search className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-muted-foreground">No tickers found for "{query}"</p>
              <p className="text-sm text-slate-500 mt-1">Try a different symbol</p>
            </CommandEmpty>
          )}

          {/* Ticker results */}
          {!isSearching && hasResults && (
            <CommandGroup heading="Tickers">
              {results.map((result) => (
                <CommandItem
                  key={result.symbol}
                  value={`${result.symbol} ${result.name}`}
                  onSelect={() => {
                    runCommand(() => navigate(`/stock/${result.symbol}`));
                  }}
                  onMouseEnter={() => prefetchTickerData(result.symbol)}
                  className="text-slate-300 hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-12 font-mono font-semibold text-primary">
                        {result.symbol}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm">{result.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.exchange || result.type || 'Stock'}
                        </p>
                      </div>
                    </div>
                    {result.quote && (
                      <div className="flex items-center gap-2 text-right">
                        <span className="font-mono text-sm">
                          ${result.quote.price?.toFixed(2) || '—'}
                        </span>
                        {result.quote.changePercent !== undefined && (
                          <span className={`flex items-center text-xs ${
                            result.quote.changePercent >= 0 ? 'text-emerald-500' : 'text-destructive'
                          }`}>
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
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Initial state - prompt to search */}
          {!query && (
            <div className="py-8 text-center">
              <Search className="h-8 w-8 text-slate-600 mx-auto mb-3" />
              <p className="text-muted-foreground">Start typing to search tickers</p>
              <p className="text-xs text-slate-500 mt-1">e.g., AAPL, MSFT, GOOGL</p>
            </div>
          )}
        </CommandList>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-800 rounded">↑</kbd>
              <kbd className="px-1 py-0.5 bg-slate-800 rounded">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Enter</kbd>
              Open
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">⌘K</kbd> to search
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}
