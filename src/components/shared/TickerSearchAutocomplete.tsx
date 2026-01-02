import { useState, useRef, useEffect } from 'react';
import { Search, Loader2, TrendingUp, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTickerSearchHook } from '@/hooks/useMarketData';
import { motion, AnimatePresence } from 'framer-motion';

interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
}

interface TickerSearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: TickerSearchResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function TickerSearchAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search ticker or company...",
  className,
  disabled = false,
  autoFocus = false,
}: TickerSearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  
  const { results, isSearching, hasResults, error } = useTickerSearchHook(value, {
    enabled: value.length >= 1,
    debounceMs: 300,
  });

  // Open dropdown when we have results
  useEffect(() => {
    if (hasResults && value.length >= 1) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  }, [hasResults, value]);

  // Close dropdown when input is cleared
  useEffect(() => {
    if (!value) {
      setIsOpen(false);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSelect = (result: TickerSearchResult) => {
    onSelect(result);
    onChange(result.symbol);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !hasResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    // Delay close to allow click on option
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => hasResults && setIsOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="pl-9 pr-8 bg-background border-border"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isSearching && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
          >
            {hasResults ? (
              <ul ref={listRef} className="py-1 max-h-64 overflow-y-auto">
                {results.map((result, index) => (
                  <li
                    key={`${result.symbol}-${result.exchange}`}
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                      highlightedIndex === index 
                        ? "bg-accent" 
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {result.symbol}
                        </span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {result.exchange}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.name}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : isSearching ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </div>
            ) : error ? (
              <div className="py-4 px-3 text-center text-sm text-muted-foreground">
                Search unavailable. Try again later.
              </div>
            ) : value.length >= 1 ? (
              <div className="py-4 px-3 text-center text-sm text-muted-foreground">
                No results found for "{value}"
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
