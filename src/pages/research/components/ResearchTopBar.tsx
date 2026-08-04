import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Search, RefreshCw, CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ResearchTopBarProps {
  date: Date;
  onDateChange: (d: Date) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function ResearchTopBar({ date, onDateChange, onRefresh, isRefreshing }: ResearchTopBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = query.trim().toUpperCase();
    if (!t) return;
    navigate(`/stock/${t}`);
  };

  return (
    <div className="sticky top-0 z-30 -mx-3 sm:-mx-6 px-3 sm:px-6 py-2.5 bg-background/85 backdrop-blur-md border-b border-border/60">
      <div className="flex items-center gap-2 max-w-[1600px] mx-auto">
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0 max-w-2xl">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbol (e.g. AAPL, NVDA, SPY)…"
              className="h-9 pl-8 pr-3 text-sm font-mono bg-card/60 border-border/60"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-9 hidden sm:inline-flex">
            Go
          </Button>
        </form>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 font-mono text-xs"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{format(date, "MMM d, yyyy")}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && onDateChange(d)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 font-mono text-xs"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>
    </div>
  );
}
