import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTickerSearchHook } from '@/hooks/useMarketData';
import { Loader2 } from 'lucide-react';

interface TickerInputWithAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (ticker: string, name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TickerInputWithAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "TICKER",
  disabled = false,
  className,
}: TickerInputWithAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { results, isSearching, hasResults } = useTickerSearchHook(value, {
    enabled: value.length >= 1,
    debounceMs: 200,
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
    onChange(e.target.value.toUpperCase());
  };

  const handleSelect = (ticker: string, name: string) => {
    onChange(ticker);
    onSelect?.(ticker, name);
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
          handleSelect(results[highlightedIndex].symbol, results[highlightedIndex].name);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleBlur = () => {
    // Delay close to allow click on option
    setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => hasResults && value.length >= 1 && setIsOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="h-9 text-sm font-mono uppercase text-center w-28"
          maxLength={6}
        />
        {isSearching && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && hasResults && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-64 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
        >
          <ul className="py-1 max-h-48 overflow-y-auto">
            {results.slice(0, 8).map((result, index) => (
              <li
                key={`${result.symbol}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(result.symbol, result.name);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                  highlightedIndex === index 
                    ? "bg-accent" 
                    : "hover:bg-accent/50"
                )}
              >
                <span className="font-mono font-semibold text-sm text-foreground w-14">
                  {result.symbol}
                </span>
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {result.name}
                </span>
                {result.exchange && (
                  <span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
                    {result.exchange}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
