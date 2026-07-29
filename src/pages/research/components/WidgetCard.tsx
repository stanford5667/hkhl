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

/**
 * Institutional card shell — single radius, hairline border, one header rhythm.
 * Used by every widget on the Research page so the page reads as one system.
 */
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
        "rounded-md border border-border/40 bg-card overflow-hidden",
        "shadow-[0_1px_2px_hsl(var(--foreground)/0.02)]",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 h-12 border-b border-border/40">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex items-baseline gap-2.5">
            <h2 className="text-[11px] sm:text-xs font-semibold text-foreground uppercase tracking-[0.08em] truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] font-normal text-muted-foreground truncate hidden md:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
          {collapsible && (
            <button
              type="button"
              aria-label={collapsed ? "Expand" : "Collapse"}
              onClick={() => setCollapsed((v) => !v)}
              className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
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
