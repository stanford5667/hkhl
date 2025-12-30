import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Search, Command, Plus, Building2, FileUp, Calculator, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CommandDialog } from "./CommandPalette";

// Page metadata for breadcrumbs and titles
const pageMetadata: Record<string, { title: string; subtitle: string; parent?: { label: string; href: string } }> = {
  "/": { title: "Dashboard", subtitle: "Your command center for deals and insights" },
  "/companies": { title: "Companies", subtitle: "Track every opportunity from first look to exit" },
  "/contacts": { title: "Network", subtitle: "Nurture relationships that drive deals" },
  "/models": { title: "Models", subtitle: "Stop guessing. Start projecting." },
  "/market-intel": { title: "Intelligence", subtitle: "Stay ahead with real-time market data" },
  "/documents": { title: "Data Room", subtitle: "All your deal documents in one place" },
  "/settings": { title: "Settings", subtitle: "Customize your workspace" },
  "/pipeline": { title: "Pipeline", subtitle: "Manage your active deals" },
  "/portfolio": { title: "Portfolio", subtitle: "Monitor your investments" },
};

// Mock notification count
const notificationCount = 3;

export function TopBar() {
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();
  
  // Get page metadata or default
  const getPageMeta = () => {
    // Check for exact match first
    if (pageMetadata[location.pathname]) {
      return pageMetadata[location.pathname];
    }
    // Check for parent path match (e.g., /companies/123 -> /companies)
    const parentPath = "/" + location.pathname.split("/")[1];
    if (pageMetadata[parentPath]) {
      return {
        ...pageMetadata[parentPath],
        parent: { label: pageMetadata[parentPath].title, href: parentPath }
      };
    }
    return { title: "Asset Labs AI", subtitle: "Private Equity Intelligence" };
  };

  const pageMeta = getPageMeta();
  const isDetailPage = location.pathname.split("/").length > 2;

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center h-14 px-4 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {pageMeta.parent ? (
            <nav className="flex items-center gap-1 text-sm">
              <Link 
                to={pageMeta.parent.href}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                {pageMeta.parent.label}
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className="text-white font-medium truncate">Detail</span>
            </nav>
          ) : (
            <div className="flex flex-col">
              <h1 className="text-white font-semibold text-sm">{pageMeta.title}</h1>
              <p className="text-slate-500 text-xs hidden sm:block">{pageMeta.subtitle}</p>
            </div>
          )}
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-500 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:border-slate-700 hover:text-slate-400 transition-all duration-200"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left hidden sm:block">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 bg-slate-800 rounded">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Add Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800">
              <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer">
                <Building2 className="mr-2 h-4 w-4 text-slate-500" />
                New Company
              </DropdownMenuItem>
              <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer">
                <FileUp className="mr-2 h-4 w-4 text-slate-500" />
                Upload Document
              </DropdownMenuItem>
              <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer">
                <Calculator className="mr-2 h-4 w-4 text-slate-500" />
                Create Model
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-slate-900 border-slate-800">
              <DropdownMenuLabel className="text-slate-300">
                Notifications
                <span className="ml-2 text-xs text-slate-500">({notificationCount} new)</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              
              {/* Critical notification */}
              <DropdownMenuItem className="flex flex-col items-start gap-1.5 py-3 px-3 hover:bg-slate-800 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px] px-1.5">
                    Critical
                  </Badge>
                  <span className="text-[10px] text-slate-500">2 hours ago</span>
                </div>
                <p className="text-sm text-slate-300">Acme Corp LOI expires in 3 days</p>
              </DropdownMenuItem>
              
              {/* Warning notification */}
              <DropdownMenuItem className="flex flex-col items-start gap-1.5 py-3 px-3 hover:bg-slate-800 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5">
                    Warning
                  </Badge>
                  <span className="text-[10px] text-slate-500">5 hours ago</span>
                </div>
                <p className="text-sm text-slate-300">TechCo covenant near breach threshold</p>
              </DropdownMenuItem>
              
              {/* Info notification */}
              <DropdownMenuItem className="flex flex-col items-start gap-1.5 py-3 px-3 hover:bg-slate-800 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5">
                    Update
                  </Badge>
                  <span className="text-[10px] text-slate-500">Yesterday</span>
                </div>
                <p className="text-sm text-slate-300">New model available for Midwest Corp</p>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem className="justify-center text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 cursor-pointer">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
