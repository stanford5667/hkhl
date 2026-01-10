import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { OrganizationSwitcher } from "@/components/organization/OrganizationSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Users,
  Folder,
  Settings,
  ChevronLeft,
  ChevronDown,
  LogOut,
  User,
  Sparkles,
  CheckSquare,
  TrendingUp,
  Briefcase,
  Target,
  Calculator,
  BarChart3,
  FlaskConical,
  Star,
  Sparkles as SparklesIcon,
  Activity,
  Brain,
  PieChart,
  Compass,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Newspaper,
  Building2,
  Search,
} from "lucide-react";

interface NavItem {
  label: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  requiresAssetType?: string;
  children?: NavItem[];
}

const STORAGE_KEY = "sidebar-hidden-tabs";
const ORG_EXPANDED_KEY = "sidebar-org-expanded";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [orgExpanded, setOrgExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(ORG_EXPANDED_KEY);
      return stored ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });
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

  // Persist hidden tabs to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenTabs));
  }, [hiddenTabs]);

  // Persist org expanded state
  useEffect(() => {
    localStorage.setItem(ORG_EXPANDED_KEY, JSON.stringify(orgExpanded));
  }, [orgExpanded]);

  const toggleTab = (href: string) => {
    setHiddenTabs(prev => 
      prev.includes(href) 
        ? prev.filter(h => h !== href)
        : [...prev, href]
    );
  };

  // Organization sub-items
  const organizationChildren: NavItem[] = useMemo(() => {
    const children: NavItem[] = [
      { 
        label: "Contacts", 
        subtitle: "Network",
        href: "/contacts", 
        icon: Users 
      },
      { 
        label: "Tasks", 
        subtitle: "To-Do",
        href: "/tasks", 
        icon: CheckSquare 
      },
    ];
    
    // Add Pipeline only if private_equity is enabled
    if (enabledAssetTypes.includes('private_equity')) {
      children.push({ 
        label: "Pipeline", 
        subtitle: "Deals in Progress",
        href: "/pipeline", 
        icon: Target,
        requiresAssetType: 'private_equity',
      });
    }
    
    return children;
  }, [enabledAssetTypes]);

  // Build navigation based on enabled asset types
  const allNavigation = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { 
        label: "Portfolio Builder", 
        subtitle: "Build & Analyze",
        href: "/portfolio-visualizer", 
        icon: PieChart 
      },
      { 
        label: "Portfolio Tracker", 
        subtitle: "Overview & Holdings",
        href: "/", 
        icon: Briefcase 
      },
      { 
        label: "News", 
        subtitle: "Intelligence Feed",
        href: "/news", 
        icon: Newspaper 
      },
      { 
        label: "Models", 
        subtitle: "Financial Models",
        href: "/models", 
        icon: Calculator 
      },
      { 
        label: "Market Intel", 
        subtitle: "Research & Insights",
        href: "/market-intel", 
        icon: BarChart3 
      },
      { 
        label: "Asset Research", 
        subtitle: "Company Details",
        href: "/asset-research", 
        icon: Search 
      },
      // Backtester hidden
      { 
        label: "Screener", 
        subtitle: "AI Stock Screener",
        href: "/screener", 
        icon: SparklesIcon 
      },
      // { 
      //   label: "Discovery", 
      //   subtitle: "Market Terminal",
      //   href: "/discovery", 
      //   icon: Compass 
      // },
    ];

    return items;
  }, [organizationChildren]);

  // Filter out hidden tabs for display
  const navigation = useMemo(() => 
    allNavigation.filter(item => !hiddenTabs.includes(item.href)),
    [allNavigation, hiddenTabs]
  );

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href || 
      (item.href !== "/" && location.pathname.startsWith(item.href));
    const Icon = item.icon;

    const linkContent = (
      <Link
        to={item.href}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-slate-800 text-white"
            : "text-slate-400 hover:bg-slate-800/50 hover:text-white",
          collapsed && "justify-center px-2"
        )}
      >
        {/* Active indicator - emerald left border */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full" />
        )}
        
        <Icon className={cn(
          "h-5 w-5 flex-shrink-0 transition-colors",
          isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
        )} />
        
        {!collapsed && (
          <span className="flex-1">{item.label}</span>
        )}
        
        {/* Notification badge */}
        {item.badge && item.badge > 0 && (
          <span className={cn(
            "flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-rose-500 text-white",
            collapsed && "absolute -top-1 -right-1"
          )}>
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col">
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
        "flex flex-col h-screen bg-slate-950 border-r border-slate-800 transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.png" alt="Asset Labs AI" className="w-8 h-8 rounded-lg" />
          {!collapsed && (
            <span className="font-bold text-white text-sm">Asset Labs AI</span>
          )}
        </Link>
        {!collapsed && (
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-7 w-7 text-slate-400">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Organization Switcher */}
      <div className="border-b border-slate-800 py-2 px-2">
        {!collapsed ? (
          <OrganizationSwitcher />
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex justify-center">
                <Avatar className="h-8 w-8 rounded-lg cursor-pointer">
                  <AvatarFallback className="rounded-lg bg-purple-600 text-white text-xs">
                    {currentOrganization?.name?.slice(0, 2).toUpperCase() || 'ORG'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{currentOrganization?.name || 'Organization'}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.href}>
              {item.children ? (
                // Collapsible group for Organization
                <Collapsible open={orgExpanded} onOpenChange={setOrgExpanded}>
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        "text-slate-400 hover:bg-slate-800/50 hover:text-white",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0 text-slate-500 group-hover:text-slate-300" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown className={cn(
                            "h-4 w-4 text-slate-500 transition-transform duration-200",
                            orgExpanded && "rotate-180"
                          )} />
                        </>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1">
                    <ul className={cn("space-y-1", !collapsed && "ml-4 border-l border-slate-800 pl-2")}>
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <NavLink item={child} />
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <NavLink item={item} />
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-800 p-2 space-y-1">
        {/* Tab Visibility Control */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                "text-slate-400 hover:bg-slate-800/50 hover:text-white",
                collapsed && "justify-center px-2"
              )}
            >
              <SlidersHorizontal className="h-5 w-5 flex-shrink-0 text-slate-500" />
              {!collapsed && <span>Customize Tabs</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent 
            side="right" 
            align="end" 
            className="w-64 p-0 bg-slate-900 border-slate-800"
          >
            <div className="p-3 border-b border-slate-800">
              <h4 className="font-medium text-white text-sm">Show/Hide Tabs</h4>
              <p className="text-xs text-slate-400 mt-1">Toggle visibility of navigation items</p>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="p-2 space-y-1">
                {allNavigation.map((item) => {
                  const Icon = item.icon;
                  const isVisible = !hiddenTabs.includes(item.href);
                  return (
                    <div
                      key={item.href}
                      className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-300">{item.label}</span>
                      </div>
                      <Switch
                        checked={isVisible}
                        onCheckedChange={() => toggleTab(item.href)}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            {hiddenTabs.length > 0 && (
              <div className="p-2 border-t border-slate-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHiddenTabs([])}
                  className="w-full text-xs text-slate-400 hover:text-white"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Show All ({hiddenTabs.length} hidden)
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Settings */}
        <NavLink 
          item={{ 
            label: "Settings", 
            subtitle: "Preferences",
            href: "/settings", 
            icon: Settings 
          }} 
        />

        {/* User section with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                "text-slate-400 hover:bg-slate-800/50 hover:text-white",
                collapsed && "justify-center px-2"
              )}
            >
              <Avatar className="h-8 w-8 border border-slate-700">
                <AvatarImage src={userProfile?.avatar_url || undefined} />
                <AvatarFallback className="bg-slate-800 text-emerald-400 text-xs font-medium">
                  {userProfile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-medium truncate">{userProfile?.full_name || 'User'}</p>
                    <p className="text-xs text-slate-500 truncate">{currentOrganization?.plan || 'Free'} Plan</p>
                  </div>
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side={collapsed ? "right" : "top"} 
            align={collapsed ? "start" : "center"}
            className="w-56 bg-slate-900 border-slate-800"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-white">{userProfile?.full_name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{userProfile?.job_title || 'Team Member'}</p>
            </div>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem 
              onClick={signOut}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Collapse toggle for collapsed state */}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="w-full h-8 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        )}
      </div>
    </aside>
  );
}
