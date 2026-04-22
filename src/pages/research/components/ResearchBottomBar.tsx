import { format } from "date-fns";
import { Activity } from "lucide-react";

interface ResearchBottomBarProps {
  lastUpdated: Date;
}

export function ResearchBottomBar({ lastUpdated }: ResearchBottomBarProps) {
  return (
    <div className="sticky bottom-0 z-20 -mx-3 sm:-mx-6 mt-6 px-3 sm:px-6 py-2 bg-background/85 backdrop-blur-md border-t border-border/60">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <div className="inline-flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          <span>Live</span>
          <Activity className="h-3 w-3 ml-1" />
        </div>
        <div>Last update: {format(lastUpdated, "HH:mm:ss")}</div>
      </div>
    </div>
  );
}
