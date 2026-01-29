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
import { Bell, Search, Command, Plus, Building2, FileUp, Calculator, ChevronRight, User, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { TaskQuickAccess } from "@/components/tasks/TaskQuickAccess";
import { useAuth } from "@/contexts/AuthContext";
import { AuthGateDialog } from "@/components/auth/AuthGateDialog";

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

interface TopBarProps {
  onOpenSearch?: () => void;
}

export function TopBar({ onOpenSearch }: TopBarProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  
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
    return { title: "Asset Labs AI", subtitle: "Portfolio Intelligence" };
  };

  const pageMeta = getPageMeta();
  const isDetailPage = location.pathname.split("/").length > 2;

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center h-12 sm:h-14 px-3 sm:px-4 bg-background/95 backdrop-blur-xl border-b border-border">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {pageMeta.parent ? (
            <nav className="flex items-center gap-1 text-sm">
              <Link 
                to={pageMeta.parent.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {pageMeta.parent.label}
              </Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-foreground font-medium truncate">Detail</span>
            </nav>
          ) : (
            <div className="flex flex-col">
              <h1 className="text-foreground font-semibold text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{pageMeta.title}</h1>
              <p className="text-muted-foreground text-xs hidden sm:block">{pageMeta.subtitle}</p>
            </div>
          )}
        </div>

        {/* Center: Search - compact on mobile */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 w-full px-2 sm:px-3 py-1.5 text-sm text-muted-foreground bg-secondary border border-border rounded-lg hover:bg-accent hover:border-primary/30 hover:text-foreground transition-all duration-200"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left hidden sm:block">Search...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-background rounded border border-border">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Sign Up / Log In for unauthenticated users */}
          {!user && (
            <>
              <Button 
                size="sm" 
                variant="ghost"
                className="h-7 sm:h-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAuthDialog(true)}
              >
                <LogIn className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Log In</span>
              </Button>
              <Button 
                size="sm" 
                className="h-7 sm:h-8 bg-primary hover:bg-primary/90 text-primary-foreground px-2 sm:px-3"
                onClick={() => setShowAuthDialog(true)}
              >
                <User className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Sign Up</span>
              </Button>
            </>
          )}

          {/* Quick Add Dropdown - only for authenticated users */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  className="h-7 sm:h-8 gap-1 bg-success hover:bg-success/90 text-success-foreground px-2 sm:px-3"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                <DropdownMenuItem className="text-popover-foreground hover:bg-accent cursor-pointer">
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  New Company
                </DropdownMenuItem>
                <DropdownMenuItem className="text-popover-foreground hover:bg-accent cursor-pointer">
                  <FileUp className="mr-2 h-4 w-4 text-muted-foreground" />
                  Upload Document
                </DropdownMenuItem>
                <DropdownMenuItem className="text-popover-foreground hover:bg-accent cursor-pointer">
                  <Calculator className="mr-2 h-4 w-4 text-muted-foreground" />
                  Create Model
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Task Quick Access - only for authenticated users */}
          {user && <TaskQuickAccess />}

          {/* Notifications - only for authenticated users */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] sm:min-w-[16px] h-3.5 sm:h-4 px-1 text-[9px] sm:text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-popover border-border">
                <DropdownMenuLabel className="text-popover-foreground">
                  Notifications
                  <span className="ml-2 text-xs text-muted-foreground">({notificationCount} new)</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                
                {/* Critical notification */}
                <DropdownMenuItem className="flex flex-col items-start gap-1.5 py-3 px-3 hover:bg-accent cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] px-1.5">
                      Critical
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">2 hours ago</span>
                  </div>
                  <p className="text-sm text-popover-foreground">Acme Corp LOI expires in 3 days</p>
                </DropdownMenuItem>
                
                {/* Warning notification */}
                <DropdownMenuItem className="flex flex-col items-start gap-1.5 py-3 px-3 hover:bg-accent cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] px-1.5">
                      Warning
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">5 hours ago</span>
                  </div>
                  <p className="text-sm text-popover-foreground">TechCo covenant near breach threshold</p>
                </DropdownMenuItem>
                
                {/* Info notification */}
                <DropdownMenuItem className="flex flex-col items-start gap-1.5 py-3 px-3 hover:bg-accent cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5">
                      Update
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">Yesterday</span>
                  </div>
                  <p className="text-sm text-popover-foreground">New model available for Midwest Corp</p>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="justify-center text-primary hover:text-primary/80 hover:bg-accent cursor-pointer">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      
      
      {/* Auth Dialog */}
      <AuthGateDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title="Join Asset Labs AI"
        description="Create a free account to save your work and access all features."
      />
    </>
  );
}
