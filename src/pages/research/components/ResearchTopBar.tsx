import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResearchTopBarProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function ResearchTopBar({ onRefresh, isRefreshing }: ResearchTopBarProps) {
  return (
    <div className="sticky top-0 z-30 -mx-3 sm:-mx-6 px-3 sm:px-6 py-1.5 sm:py-2.5 bg-background/85 backdrop-blur-md border-b border-border/60">
      <div className="flex items-center gap-1.5 sm:gap-2 max-w-[1600px] mx-auto">
        <div className="flex-1 min-w-0" />

        <Button
          variant="outline"
          size="sm"
          className="h-8 sm:h-9 gap-1.5 font-mono text-xs px-2.5 sm:px-3"
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
