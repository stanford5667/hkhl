import { format } from "date-fns";
import { Activity } from "lucide-react";

interface ResearchBottomBarProps {
  lastUpdated: Date;
}

export function ResearchBottomBar({ lastUpdated }: ResearchBottomBarProps) {
  return (
    <div className="sticky bottom-0 z-20 px-4 sm:px-6 lg:px-8 py-2.5 bg-background/90 backdrop-blur-md border-t border-border/40">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="inline-flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          <span>Live</span>
          <Activity className="h-3 w-3 ml-1" />
        </div>
        <div className="tabular-nums">Last update: {format(lastUpdated, "HH:mm:ss")}</div>
      </div>
    </div>
  );
}
