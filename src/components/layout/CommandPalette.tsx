import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog as CommandDialogPrimitive,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Plus,
  FileUp,
  Calculator,
  Building2,
  FileText,
  LayoutDashboard,
  Globe,
  Folder,
  Users,
  Clock,
  Search,
  TrendingUp,
  Sparkles,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface CommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PolygonTickerResult {
  ticker: string;
  name: string;
  market: string;
  type: string;
  primaryExchange?: string;
}

// Mock recent searches for recognition > recall
const recentSearches = [
  { query: "TechCo financials", type: "document" },
  { query: "Acme Corp", type: "company" },
];

// Mock recent companies
const recentCompanies = [
  { name: "TechCo Inc", industry: "SaaS", stage: "Due Diligence", id: "techco" },
  { name: "Acme Corp", industry: "Manufacturing", stage: "LOI", id: "acme" },
  { name: "Midwest Holdings", industry: "Distribution", stage: "Pipeline", id: "midwest" },
];

// Mock recent documents
const recentDocuments = [
  { name: "FY24 Financials - TechCo", date: "2 hours ago" },
  { name: "CIM - Acme Corp", date: "Yesterday" },
  { name: "LBO Model - Midwest", date: "2 days ago" },
];

export function CommandDialog({ open, onOpenChange }: CommandDialogProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tickerResults, setTickerResults] = useState<PolygonTickerResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearch("");
      setTickerResults([]);
    }
  }, [open]);

  // Debounced Polygon ticker search
  useEffect(() => {
    if (search.length < 1) {
      setTickerResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke('polygon-ticker-search', {
          body: { query: search, limit: 10 }
        });

        if (!error && data?.ok && data.results) {
          setTickerResults(data.results);
        } else {
          setTickerResults([]);
        }
      } catch (err) {
        console.error('Ticker search error:', err);
        setTickerResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  const runCommand = useCallback((command: () => void) => {
    onOpenChange(false);
    command();
  }, [onOpenChange]);

  const handleTickerSelect = useCallback((ticker: string) => {
    runCommand(() => navigate(`/stock/${ticker}`));
  }, [navigate, runCommand]);

  return (
    <CommandDialogPrimitive open={open} onOpenChange={onOpenChange}>
      <div className="bg-slate-900 border-slate-800 rounded-xl overflow-hidden">
        <CommandInput 
          placeholder="Search stocks, companies, documents..." 
          value={search}
          onValueChange={setSearch}
          className="border-b border-slate-800"
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty className="py-6 text-center">
            {isSearching ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 text-slate-600 mx-auto mb-3 animate-spin" />
                <p className="text-slate-400">Searching...</p>
              </div>
            ) : (
              <>
                <Search className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No results found.</p>
                <p className="text-sm text-slate-500 mt-1">Try searching for stocks, companies, or documents</p>
              </>
            )}
          </CommandEmpty>

          {/* Polygon Ticker Results */}
          {tickerResults.length > 0 && (
            <>
              <CommandGroup heading="Stocks & ETFs">
                {tickerResults.map((result) => (
                  <CommandItem 
                    key={result.ticker}
                    value={`${result.ticker} ${result.name}`}
                    onSelect={() => handleTickerSelect(result.ticker)}
                    className="text-slate-300 hover:bg-slate-800"
                  >
                    <TrendingUp className="mr-2 h-4 w-4 text-emerald-400" />
                    <span className="font-semibold mr-2">{result.ticker}</span>
                    <span className="text-slate-400 truncate flex-1">{result.name}</span>
                    {result.primaryExchange && (
                      <Badge variant="outline" className="ml-2 text-[10px] px-1.5">
                        {result.primaryExchange}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator className="bg-slate-800" />
            </>
          )}
          
          {/* Recent Searches - Recognition > Recall */}
          {!search && recentSearches.length > 0 && (
            <>
              <CommandGroup heading="Recent Searches">
                {recentSearches.map((item) => (
                  <CommandItem 
                    key={item.query}
                    onSelect={() => {
                      setSearch(item.query);
                    }}
                    className="text-slate-300 hover:bg-slate-800"
                  >
                    <Clock className="mr-2 h-4 w-4 text-slate-500" />
                    <span>{item.query}</span>
                    <span className="ml-auto text-xs text-slate-500 capitalize">{item.type}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator className="bg-slate-800" />
            </>
          )}
          
          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            <CommandItem 
              onSelect={() => runCommand(() => navigate("/portfolio?new=true"))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <Plus className="mr-2 h-4 w-4 text-emerald-400" />
              <span>Add Asset</span>
              <span className="ml-auto text-xs text-slate-500">Takes 2 min</span>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate("/screener"))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <Search className="mr-2 h-4 w-4 text-blue-400" />
              <span>Open Screener</span>
              <span className="ml-auto text-xs text-slate-500">Find stocks</span>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate("/documents?upload=true"))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <FileUp className="mr-2 h-4 w-4 text-blue-400" />
              <span>Upload Document</span>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate("/models/new"))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <Calculator className="mr-2 h-4 w-4 text-purple-400" />
              <span>Create Model</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator className="bg-slate-800" />

          {/* Navigation */}
          <CommandGroup heading="Navigation">
            <CommandItem 
              onSelect={() => runCommand(() => navigate("/"))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <LayoutDashboard className="mr-2 h-4 w-4 text-slate-500" />
              <span>Dashboard</span>
              <span className="ml-auto text-xs text-slate-500">Command Center</span>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate("/portfolio"))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <Building2 className="mr-2 h-4 w-4 text-slate-500" />
              <span>Portfolio</span>
              <span className="ml-auto text-xs text-slate-500">Your Assets</span>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate("/screener"))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <TrendingUp className="mr-2 h-4 w-4 text-slate-500" />
              <span>Screener</span>
              <span className="ml-auto text-xs text-slate-500">Find Stocks</span>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate("/contacts"))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <Users className="mr-2 h-4 w-4 text-slate-500" />
              <span>Contacts</span>
              <span className="ml-auto text-xs text-slate-500">Network</span>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate("/models"))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <Sparkles className="mr-2 h-4 w-4 text-slate-500" />
              <span>Models</span>
              <span className="ml-auto text-xs text-slate-500">Analyze</span>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate("/market-intel"))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <Globe className="mr-2 h-4 w-4 text-slate-500" />
              <span>Market Intel</span>
              <span className="ml-auto text-xs text-slate-500">Intelligence</span>
            </CommandItem>
            <CommandItem 
              onSelect={() => runCommand(() => navigate("/documents"))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <Folder className="mr-2 h-4 w-4 text-slate-500" />
              <span>Data Room</span>
              <span className="ml-auto text-xs text-slate-500">Documents</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator className="bg-slate-800" />

          {/* Recent Companies */}
          <CommandGroup heading="Recent Companies">
            {recentCompanies.map((company) => (
              <CommandItem 
                key={company.id}
                onSelect={() => runCommand(() => navigate(`/portfolio/${company.id}`))}
                className="text-slate-300 hover:bg-slate-800"
              >
                <Building2 className="mr-2 h-4 w-4 text-slate-500" />
                <span>{company.name}</span>
                <span className="ml-auto text-xs text-slate-500">
                  {company.industry} • {company.stage}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator className="bg-slate-800" />

          {/* Recent Documents */}
          <CommandGroup heading="Recent Documents">
            {recentDocuments.map((doc) => (
              <CommandItem 
                key={doc.name}
                className="text-slate-300 hover:bg-slate-800"
              >
                <FileText className="mr-2 h-4 w-4 text-slate-500" />
                <span>{doc.name}</span>
                <span className="ml-auto text-xs text-slate-500">{doc.date}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        
        {/* Footer with keyboard hints */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800 text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-800 rounded">↑</kbd>
              <kbd className="px-1 py-0.5 bg-slate-800 rounded">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Enter</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Esc</kbd>
              Close
            </span>
          </div>
          <TrendingUp className="h-3 w-3 text-emerald-500" />
        </div>
      </div>
    </CommandDialogPrimitive>
  );
}