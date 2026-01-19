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
  Settings
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const mobileNavItems = [
  { label: "Studies", href: "/quant-lab", icon: FlaskConical },
  { label: "Builder", href: "/portfolio-visualizer", icon: PieChart },
  { label: "Academy", href: "/academy", icon: BookOpen },
  { label: "Intel", href: "/market-intel", icon: BarChart3 },
  { label: "More", href: "#menu", icon: Menu, isMenu: true },
];

export function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 md:hidden"
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
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  
  const navItems = [
    { label: "Quant Lab", href: "/quant-lab", icon: FlaskConical },
    { label: "Portfolio Builder", href: "/portfolio-visualizer", icon: PieChart },
    { label: "Academy", href: "/academy", icon: BookOpen },
    { label: "Strategy Explorer", href: "/investment-plan", icon: ClipboardList },
    { label: "Market Intel", href: "/market-intel", icon: BarChart3 },
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
          <span className="font-bold text-white">Asset Labs</span>
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

      {/* Support Section */}
      <div className="pt-4 mt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 px-3 mb-2">
          <HelpCircle className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Support</span>
        </div>
        {supportItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:bg-slate-800/50 hover:text-white"
            >
              <Icon className="h-5 w-5 text-slate-500" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Account Section */}
      <div className="pt-4 mt-4 border-t border-slate-800">
        <Link
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:bg-slate-800/50 hover:text-white"
        >
          <Settings className="h-5 w-5 text-slate-500" />
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
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
