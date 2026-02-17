import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Briefcase, 
  PieChart, 
  BarChart3, 
  Search, 
  Menu,
  ClipboardList,
  Shield,
  FlaskConical,
  HelpCircle,
  Headphones,
  Mail,
  Book,
  BookOpen,
  LogOut,
  Settings,
  Users,
  Flame
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const mobileNavItems = [
  { label: "Research", href: "/research", icon: Search },
  { label: "Builder", href: "/portfolio-visualizer", icon: PieChart },
  { label: "Academy", href: "/academy", icon: BookOpen },
  { label: "More", href: "#menu", icon: Menu, isMenu: true },
];

export function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border md:hidden"
        style={{ zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
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
                        "text-muted-foreground hover:text-foreground active:bg-accent/50"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-[280px] bg-background border-border">
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
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground active:bg-accent/50"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-all duration-200",
                  isActive && "bg-primary/15"
                )}>
                  <Icon className={cn(
                    "h-5 w-5",
                    isActive && "text-primary"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive && "text-primary font-semibold"
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
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  
  const navItems = [
    { label: "Research", href: "/research", icon: Search },
    { label: "Swipe Stocks", href: "/stock-swipe", icon: Flame },
    { label: "Portfolio Builder", href: "/portfolio-visualizer", icon: PieChart },
    { label: "Community", href: "/community", icon: Users },
    { label: "Academy", href: "/academy", icon: BookOpen },
    { label: "Strategy Explorer", href: "/investment-plan", icon: ClipboardList },
    ...(isAdmin ? [{ label: "Admin Portal", href: "/admin", icon: Shield }] : []),
  ];

  const supportItems = [
    { 
      label: "Support Center", 
      icon: Headphones, 
      action: () => { navigate('/support'); onNavigate(); }
    },
    { 
      label: "Email Support", 
      icon: Mail, 
      action: () => { window.location.href = 'mailto:support@assetlabs.ai'; onNavigate(); }
    },
    { 
      label: "Documentation", 
      icon: Book, 
      action: () => { window.open('https://docs.assetlabs.ai', '_blank'); onNavigate(); }
    },
  ];

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center gap-2 mb-6 px-2">
        <img src="/favicon.png" alt="Asset Labs AI" className="w-8 h-8 rounded-lg" />
        <div className="flex items-center gap-1">
          <span className="font-bold text-foreground">Asset Labs</span>
          <span className="font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">AI</span>
        </div>
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
              "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
              isActive ? "bg-primary/20 text-primary" : "text-muted-foreground"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <span>{item.label}</span>
            {isActive && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}

      {/* Support Section */}
      <div className="pt-4 mt-4 border-t border-border">
        <div className="flex items-center gap-2 px-3 mb-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Support</span>
        </div>
        {supportItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Account Section */}
      <div className="pt-4 mt-4 border-t border-border">
        <Link
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground">
            <Settings className="h-4 w-4" />
          </div>
          <span>Settings</span>
        </Link>
        <button
          onClick={async () => {
            try {
              await supabase.auth.signOut();
              window.location.href = '/';
            } catch (error) {
              console.error('Sign out failed:', error);
            }
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-destructive hover:bg-destructive/10"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg">
            <LogOut className="h-4 w-4" />
          </div>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
