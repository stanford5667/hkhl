import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Target,
  Briefcase,
  Brain,
  BarChart3,
  Search,
  FolderOpen,
  Building2,
  Users,
  Settings,
  HelpCircle,
  ChevronLeft,
  Landmark,
  LogOut,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Dashboard", href: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Deal Pipeline", href: "/pipeline", icon: <Target className="h-4 w-4" /> },
      { label: "Portfolio", href: "/portfolio", icon: <Briefcase className="h-4 w-4" /> },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { label: "AI Models", href: "/models", icon: <Brain className="h-4 w-4" /> },
      { label: "Market Intel", href: "/market-intel", icon: <BarChart3 className="h-4 w-4" /> },
      { label: "Deal Matching", href: "/deal-matching", icon: <Search className="h-4 w-4" /> },
    ],
  },
  {
    title: "DATA ROOM",
    items: [
      { label: "Documents", href: "/documents", icon: <FolderOpen className="h-4 w-4" /> },
      { label: "Companies", href: "/companies", icon: <Building2 className="h-4 w-4" /> },
      { label: "Contacts", href: "/contacts", icon: <Users className="h-4 w-4" /> },
    ],
  },
];

const bottomNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
  { label: "Help", href: "/help", icon: <HelpCircle className="h-4 w-4" /> },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow-sm">
            <Landmark className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-foreground">DealFlow AI</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && "ml-auto")}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        {navigation.map((section) => (
          <div key={section.title} className="mb-6">
            {!collapsed && (
              <h3 className="px-4 mb-2 text-xs font-medium text-muted-foreground/50 tracking-wider">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1 px-2">
              {section.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <span className={cn(isActive && "text-sidebar-primary")}>
                        {item.icon}
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-sidebar-border py-4">
        <ul className="space-y-1 px-2">
          {bottomNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={signOut}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive",
                collapsed && "justify-center px-2"
              )}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
