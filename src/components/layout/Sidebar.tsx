import { useState, useMemo } from "react";
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
  LayoutDashboard,
  Layers,
  Users,
  Calculator,
  Globe,
  Folder,
  Settings,
  ChevronLeft,
  LogOut,
  User,
  Sparkles,
  CheckSquare,
  TrendingUp,
  Briefcase,
  Wallet,
  LineChart,
} from "lucide-react";

interface NavItem {
  label: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  requiresAssetType?: string;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { userProfile, currentOrganization, enabledAssetTypes } = useOrganization();

  // Build navigation based on enabled asset types
  const navigation = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { 
        label: "Dashboard", 
        subtitle: "Command Center",
        href: "/", 
        icon: LayoutDashboard 
      },
      { 
        label: "Assets", 
        subtitle: "All Holdings",
        href: "/companies", 
        icon: Layers,
      },
    ];

    // Add Deals only if private_equity is enabled
    if (enabledAssetTypes.includes('private_equity')) {
      items.push({ 
        label: "Deals", 
        subtitle: "Pipeline",
        href: "/pipeline", 
        icon: Briefcase,
        requiresAssetType: 'private_equity',
      });
    }

    // Add Markets only if public_equity is enabled
    if (enabledAssetTypes.includes('public_equity')) {
      items.push({ 
        label: "Markets", 
        subtitle: "Equities",
        href: "/markets", 
        icon: LineChart,
        requiresAssetType: 'public_equity',
      });
    }

    // Add Holdings (unified view of owned assets)
    items.push({ 
      label: "Holdings", 
      subtitle: "Portfolio",
      href: "/portfolio", 
      icon: Wallet,
    });

    // Core items
    items.push(
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
    );

    // Secondary items
    items.push(
      { 
        label: "Models", 
        subtitle: "Analyze",
        href: "/models", 
        icon: Calculator 
      },
      { 
        label: "Market Intel", 
        subtitle: "Intelligence",
        href: "/market-intel", 
        icon: Globe,
      },
      { 
        label: "Data Room", 
        subtitle: "Documents",
        href: "/documents", 
        icon: Folder 
      },
    );

    return items;
  }, [enabledAssetTypes]);

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
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-white text-sm">Asset Labs</span>
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
              <NavLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-800 p-2 space-y-1">
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
