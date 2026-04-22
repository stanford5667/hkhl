import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: ReactNode;
  className?: string;
}

export function WidgetCard({
  title,
  subtitle,
  icon,
  actions,
  collapsible = false,
  defaultCollapsed = false,
  children,
  className,
}: WidgetCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section
      className={cn(
        "rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 px-3 sm:px-4 h-11 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-mono font-semibold text-foreground uppercase tracking-wide truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[10px] font-mono text-muted-foreground truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          {collapsible && (
            <button
              type="button"
              aria-label={collapsed ? "Expand" : "Collapse"}
              onClick={() => setCollapsed((v) => !v)}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          )}
        </div>
      </header>
      {!collapsed && <div className="text-sm">{children}</div>}
    </section>
  );
}
