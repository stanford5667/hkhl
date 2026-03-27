import { useRef, useState, useEffect } from 'react';
import { useTickerSearch } from '@/hooks/useTickerSearch';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (ticker: string) => void;
  onSelect: (ticker: string, name: string) => void;
  placeholder?: string;
  className?: string;
}

export function TickerSearchInput({ value, onChange, onSelect, placeholder = 'Search ticker...', className }: Props) {
  const { query, setQuery, results, isSearching } = useTickerSearch(250);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value, setQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={e => {
            onChange(e.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-8 pr-8"
        />
        {isSearching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.symbol}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              onClick={() => {
                onSelect(r.symbol, r.description || r.symbol);
                onChange(r.symbol);
                setOpen(false);
              }}
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{r.symbol}</span>
                <span className="ml-2 text-muted-foreground truncate text-xs">{r.description}</span>
              </div>
              {r.quote && r.quote.price > 0 && (
                <span className="ml-2 font-mono text-xs text-foreground shrink-0">
                  ${r.quote.price.toFixed(2)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
