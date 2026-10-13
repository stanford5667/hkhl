import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { useTickerSearch } from '@/hooks/useTickerSearch';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';

export function LandingSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { query, setQuery, results, isSearching, clear } = useTickerSearch(200);
  useEffect(() => { if (!open) clear(); }, [open, clear]);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="institutional-landing gap-0 rounded p-0 shadow-none">
      <DialogTitle className="sr-only">Search public markets</DialogTitle>
      <DialogDescription className="sr-only">Find a ticker or company and open its research page.</DialogDescription>
      <Command shouldFilter={false} className="rounded bg-background">
        <CommandInput value={query} onValueChange={setQuery} placeholder="Search a ticker or company…" className="h-14 pr-10" />
        <CommandList className="min-h-40 p-2">
          {isSearching ? <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Searching markets…</div> : query ? <>
            <CommandEmpty>No matching assets found.</CommandEmpty>
            <CommandGroup heading="Public assets">{results.map(result => <CommandItem key={result.symbol} value={result.symbol} onSelect={() => { onOpenChange(false); navigate(`/stock/${result.symbol}`); }} className="flex gap-4 py-3">
              <span className="w-16 shrink-0 font-mono text-primary">{result.symbol}</span><span className="min-w-0 truncate">{result.name}</span>
            </CommandItem>)}</CommandGroup>
          </> : <div className="py-10 text-center text-sm text-muted-foreground"><Search className="mx-auto mb-3 h-5 w-5" />Research a company, equity, or ETF.</div>}
        </CommandList>
      </Command>
    </DialogContent>
  </Dialog>;
}