import { 
  LayoutDashboard, Users, TrendingUp, ArrowLeftRight, 
  Building2, Bot, Trophy, Bell, ChevronLeft, ChevronRight, Fish
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSmartMoneyStore, SmartMoneyTab } from "@/stores/smartMoneyStore";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems: { id: SmartMoneyTab; label: string; icon: React.ElementType; }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'insiders', label: 'Insider Tracker', icon: Users },
  { id: 'options-flow', label: 'Options Flow', icon: TrendingUp },
  { id: 'block-trades', label: 'Block Trades', icon: ArrowLeftRight },
  { id: 'institutional', label: 'Institutional', icon: Building2 },
  { id: 'ai-chat', label: 'AI Chat', icon: Bot },
  { id: 'leaderboards', label: 'Leaderboards', icon: Trophy },
  { id: 'alerts', label: 'Alerts', icon: Bell },
];

export function SmartMoneySidebar() {
  const { activeTab, setActiveTab, sidebarCollapsed, setSidebarCollapsed } = useSmartMoneyStore();

  return (
    <div className={cn(
      "relative flex flex-col border-r border-border bg-card/50 transition-all duration-200 shrink-0",
      sidebarCollapsed ? "w-14" : "w-56"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Fish className="h-5 w-5 text-primary shrink-0" />
        {!sidebarCollapsed && (
          <span className="font-semibold text-sm truncate">Smart Money</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-6 w-6 shrink-0"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 space-y-0.5 px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const btn = (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );

          if (sidebarCollapsed) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }
          return btn;
        })}
      </nav>

      {/* Disclaimer */}
      {!sidebarCollapsed && (
        <div className="p-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-tight">
            For informational purposes only. Not financial advice.
          </p>
        </div>
      )}
    </div>
  );
}
