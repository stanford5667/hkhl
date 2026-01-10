import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Briefcase, 
  PieChart, 
  BarChart3, 
  Search, 
  Menu,
  ClipboardList
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

const mobileNavItems = [
  { label: "Portfolio", href: "/", icon: Briefcase },
  { label: "Builder", href: "/portfolio-visualizer", icon: PieChart },
  { label: "Plan", href: "/investment-plan", icon: ClipboardList },
  { label: "Intel", href: "/market-intel", icon: BarChart3 },
  { label: "More", href: "#menu", icon: Menu, isMenu: true },
];

export function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => {
            const isActive = item.href !== "#menu" && (
              location.pathname === item.href || 
              (item.href !== "/" && location.pathname.startsWith(item.href))
            );
            const Icon = item.icon;

            if (item.isMenu) {
              return (
                <Sheet key={item.label} open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <button
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                        "text-slate-400 hover:text-white active:bg-slate-800/50"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-[280px] bg-slate-950 border-slate-800">
                    <div className="h-full overflow-y-auto">
                      <MobileSidebarContent onNavigate={() => setOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                  isActive
                    ? "text-emerald-400"
                    : "text-slate-400 hover:text-white active:bg-slate-800/50"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5",
                  isActive && "text-emerald-400"
                )} />
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive && "text-emerald-400"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Safe area spacer for content */}
      <div className="h-16 md:hidden" />
    </>
  );
}

// Simplified sidebar content for mobile menu
function MobileSidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const location = useLocation();
  
  const navItems = [
    { label: "Portfolio Tracker", href: "/", icon: Briefcase },
    { label: "Portfolio Builder", href: "/portfolio-visualizer", icon: PieChart },
    { label: "Investment Plan", href: "/investment-plan", icon: ClipboardList },
    { label: "Market Intel", href: "/market-intel", icon: BarChart3 },
    { label: "Asset Research", href: "/asset-research", icon: Search },
  ];

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center gap-2 mb-6 px-2">
        <img src="/favicon.png" alt="Asset Labs AI" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-white">Asset Labs AI</span>
      </div>
      
      {navItems.map((item) => {
        const isActive = location.pathname === item.href || 
          (item.href !== "/" && location.pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
            )}
          >
            <Icon className={cn(
              "h-5 w-5",
              isActive ? "text-emerald-400" : "text-slate-500"
            )} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
