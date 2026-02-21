import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { preloadRoute } from "@/lib/routePreloader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useUsage } from "@/contexts/UsageContext";
import { useAdmin } from "@/hooks/useAdmin";
import { OrganizationSwitcher } from "@/components/organization/OrganizationSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthGateDialog } from "@/components/auth/AuthGateDialog";
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  CheckSquare,
  TrendingUp,
  Briefcase,
  Target,
  Calculator,
  BarChart3,
  FlaskConical,
  PieChart,
  SlidersHorizontal,
  Eye,
  Newspaper,
  Search,
  ClipboardList,
  Headphones,
  Shield,
  Sparkles,
  Zap,
  Activity,
  Lightbulb,
  BookOpen,
  Users,
  CreditCard,
  Flame,
} from "lucide-react";

interface NavItem {
  label: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  requiresAssetType?: string;
  isPremium?: boolean;
}

const STORAGE_KEY = "sidebar-hidden-tabs";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hiddenTabs, setHiddenTabs] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const location = useLocation();
  const { signOut } = useAuth();
  const { userProfile, currentOrganization, enabledAssetTypes } = useOrganization();
  const { isPro } = useUsage();
  const { isAdmin } = useAdmin();

  // Persist hidden tabs to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenTabs));
  }, [hiddenTabs]);

  const toggleTab = (href: string) => {
    setHiddenTabs(prev => 
      prev.includes(href) 
        ? prev.filter(h => h !== href)
        : [...prev, href]
    );
  };

  // Build navigation based on enabled asset types
  const allNavigation = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { 
        label: "Research", 
        subtitle: "Search & Analyze",
        href: "/research", 
        icon: Search,
        isPremium: false,
      },
      // { 
      //   label: "Swipe Stocks", 
      //   subtitle: "Discover & Like",
      //   href: "/stock-swipe", 
      //   icon: Flame,
      // },
      { 
        label: "Portfolio Builder", 
        subtitle: "Build & Analyze",
        href: "/portfolio-visualizer", 
        icon: PieChart,
        isPremium: true,
      },
      // AI Assistant hidden per user request
      // { 
      //   label: "AI Assistant", 
      //   subtitle: "Chat & Signals",
      //   href: "/prediction-ai", 
      //   icon: Sparkles,
      //   isPremium: true,
      // },
      { 
        label: "Community", 
        subtitle: "Chat & Ideas",
        href: "/community", 
        icon: Users 
      },
      // { 
      //   label: "Academy", 
      //   subtitle: "Learn & Grow",
      //   href: "/academy", 
      //   icon: BookOpen 
      // },
      { 
        label: "Strategy Explorer", 
        subtitle: "Educational Tools",
        href: "/investment-plan", 
        icon: ClipboardList 
      },
      { 
        label: "Glossary", 
        subtitle: "Terms & Definitions",
        href: "/glossary", 
        icon: BookOpen 
      },
      { 
        label: "Support", 
        subtitle: "Help & Tickets",
        href: "/support", 
        icon: Headphones 
      },
    ];

    return items;
  }, [isAdmin]);

  // Filter out hidden tabs for display
  const navigation = useMemo(() => 
    allNavigation.filter(item => !hiddenTabs.includes(item.href)),
    [allNavigation, hiddenTabs]
  );

  const NavLink = ({ item, index }: { item: NavItem; index: number }) => {
    const isActive = location.pathname === item.href || 
      (item.href !== "/" && location.pathname.startsWith(item.href));
    const Icon = item.icon;

    // Prefetch route on hover for faster navigation
    const handleMouseEnter = useCallback(() => {
      preloadRoute(item.href);
    }, [item.href]);

    const linkContent = (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
      >
        <Link
          to={item.href}
          onMouseEnter={handleMouseEnter}
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
            isActive
              ? "bg-gradient-to-r from-primary/20 to-primary/5 text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          {/* Active indicator - gradient left border */}
          <AnimatePresence>
            {isActive && (
              <motion.div 
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                exit={{ scaleY: 0, opacity: 0 }}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-primary to-primary/50 rounded-full"
              />
            )}
          </AnimatePresence>
          
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300",
            isActive 
              ? "bg-primary/20 text-primary" 
              : "bg-transparent text-muted-foreground group-hover:bg-accent group-hover:text-foreground"
          )}>
            <Icon className="h-4 w-4" />
          </div>
          
          {!collapsed && (
            <div className="flex-1 flex items-center justify-between">
              <span className={cn(
                "transition-colors",
                isActive && "font-semibold"
              )}>{item.label}</span>
              {item.isPremium && (
                <Sparkles className="h-3 w-3 text-amber-500/70" />
              )}
            </div>
          )}
          
          {/* Notification badge */}
          {item.badge && item.badge > 0 && (
            <span className={cn(
              "flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground",
              collapsed && "absolute -top-1 -right-1"
            )}>
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          )}
          
          {/* Hover glow effect */}
          <div className={cn(
            "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
            "bg-gradient-to-r from-primary/5 to-transparent",
            "group-hover:opacity-100"
          )} />
        </Link>
      </motion.div>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col bg-popover border-border">
            <span className="font-medium">{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.subtitle}</span>
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar-background border-r border-sidebar-border transition-all duration-300 relative",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />
      
      {/* Logo */}
      <div className="relative flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <img 
              src="/favicon.png" 
              alt="Asset Labs AI" 
              className="w-9 h-9 rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-105" 
            />
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              <div className="flex items-center gap-1">
                <span className="font-bold text-foreground text-sm tracking-tight">Asset Labs</span>
                <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">AI</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Intelligent Investing</span>
            </motion.div>
          )}
        </Link>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)} 
          className={cn(
            "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-all",
            collapsed && "absolute -right-3 top-1/2 -translate-y-1/2 bg-background border border-border shadow-sm z-10"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Organization Switcher */}
      <div className="relative border-b border-sidebar-border py-3 px-3">
        {!collapsed ? (
          <OrganizationSwitcher />
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex justify-center">
                <Avatar className="h-9 w-9 rounded-xl cursor-pointer ring-2 ring-primary/20">
                  <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-xs font-semibold">
                    {currentOrganization?.name?.slice(0, 2).toUpperCase() || 'ORG'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover border-border">
              {currentOrganization?.name || 'Organization'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="relative flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        <ul className="space-y-1">
          {navigation.map((item, index) => (
            <li key={item.href}>
              <NavLink item={item} index={index} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="relative border-t border-sidebar-border p-3 space-y-1">
        {/* Tab Visibility Control */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              {!collapsed && <span>Customize</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="right" 
            align="end" 
            className="w-64 p-0 bg-popover border-border"
          >
            <div className="p-3 border-b border-border">
              <h4 className="font-semibold text-foreground text-sm">Customize Navigation</h4>
              <p className="text-xs text-muted-foreground mt-1">Toggle visibility of menu items</p>
            </div>
            <ScrollArea className="h-[280px]">
              <div className="p-2 space-y-1">
                {allNavigation.map((item) => {
                  const Icon = item.icon;
                  const isVisible = !hiddenTabs.includes(item.href);
                  return (
                    <div
                      key={item.href}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{item.label}</span>
                      </div>
                      <Switch
                        checked={isVisible}
                        onCheckedChange={() => toggleTab(item.href)}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            {hiddenTabs.length > 0 && (
              <div className="p-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHiddenTabs([])}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  <Eye className="h-3 w-3 mr-1.5" />
                  Show All ({hiddenTabs.length} hidden)
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Admin Portal - only for admins */}
        {isAdmin && (
          <NavLink 
            item={{ 
              label: "Admin", 
              subtitle: "Admin Portal",
              href: "/admin", 
              icon: Shield 
            }}
            index={0}
          />
        )}

        {/* Settings */}
        <NavLink 
          item={{ 
            label: "Settings", 
            subtitle: "Preferences",
            href: "/settings", 
            icon: Settings 
          }}
          index={1}
        />

        {/* User section with dropdown - or Sign Up CTA if not authenticated */}
        {userProfile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  "text-muted-foreground hover:bg-accent/50 hover:text-foreground group",
                  collapsed && "justify-center px-2"
                )}
              >
                <div className="relative">
                  <Avatar className="h-9 w-9 ring-2 ring-border transition-all group-hover:ring-primary/30">
                    <AvatarImage src={userProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-semibold">
                      {userProfile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-sidebar-background" />
                </div>
                {!collapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{userProfile?.full_name || 'User'}</p>
                    <p className="text-xs truncate flex items-center gap-1">
                      {isPro ? (
                        <>
                          <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                          <span className="text-amber-400 font-medium">Pro Plan</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Free Plan</span>
                        </>
                      )}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              side={collapsed ? "right" : "top"} 
              align={collapsed ? "start" : "center"}
              className="w-64 bg-popover border-border"
            >
              {/* User header */}
              <div className="px-3 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={userProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-semibold">
                      {userProfile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{userProfile?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{userProfile?.job_title || 'Team Member'}</p>
                  </div>
                </div>
              </div>

              {/* Plan status */}
              <div className="px-3 py-2">
                <div className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg",
                  isPro 
                    ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20" 
                    : "bg-secondary/50 border border-border"
                )}>
                  <div className="flex items-center gap-2">
                    {isPro ? (
                      <Sparkles className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      isPro ? "text-amber-400" : "text-muted-foreground"
                    )}>
                      {isPro ? 'Pro Plan' : 'Free Plan'}
                    </span>
                  </div>
                  {!isPro && (
                    <Link 
                      to="/settings" 
                      className="text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
              </div>

              <DropdownMenuSeparator className="bg-border" />
              
              <DropdownMenuItem className="text-foreground hover:bg-accent cursor-pointer" asChild>
                <Link to="/settings">
                  <User className="mr-2 h-4 w-4" />
                  Profile & Settings
                </Link>
              </DropdownMenuItem>
              
              {isPro && (
                <DropdownMenuItem className="text-foreground hover:bg-accent cursor-pointer" asChild>
                  <Link to="/settings#billing">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Billing
                  </Link>
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                className="text-destructive hover:bg-destructive/10 cursor-pointer"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarAuthPrompt collapsed={collapsed} />
        )}
      </div>
    </aside>
  );
}

// Separate component for auth prompt in sidebar
function SidebarAuthPrompt({ collapsed }: { collapsed: boolean }) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  if (collapsed) {
    return (
      <>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowAuthDialog(true)}
              className="w-full flex justify-center px-2 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 transition-colors"
            >
              <User className="h-5 w-5 text-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover border-border">
            <span className="font-medium">Sign Up / Log In</span>
          </TooltipContent>
        </Tooltip>
        <AuthGateDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          title="Join Asset Labs AI"
          description="Create a free account to save your portfolios and access all features."
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowAuthDialog(true)}
        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 hover:from-primary/30 hover:to-primary/20 transition-all group"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/30 group-hover:bg-primary/40 transition-colors">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">Get Started Free</p>
          <p className="text-xs text-muted-foreground">Sign up to save progress</p>
        </div>
      </button>
      <AuthGateDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title="Join Asset Labs AI"
        description="Create a free account to save your portfolios and access all features."
      />
    </>
  );
}
