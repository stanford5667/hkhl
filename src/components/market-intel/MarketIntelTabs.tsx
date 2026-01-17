import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, TrendingUp, Globe, Activity, Calendar, Newspaper, 
  PieChart, Wallet, Bitcoin, Landmark, DollarSign 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketIntelTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export function MarketIntelTabs({ activeTab, onTabChange, children }: MarketIntelTabsProps) {
  const mainTabs = [
    { id: 'overview', label: 'Overview', icon: PieChart },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'earnings', label: 'Earnings', icon: BarChart3 },
    { id: 'news', label: 'News & Analysis', icon: Newspaper },
  ];

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full justify-start bg-secondary/50 p-1 h-auto flex-wrap gap-1">
        {mainTabs.map(({ id, label, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all",
              "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              "data-[state=active]:shadow-md"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

// Subcomponent for nested tabs within sections
interface SubTabsProps {
  tabs: { id: string; label: string; icon?: React.ElementType }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export function SubTabs({ tabs, activeTab, onTabChange, className }: SubTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2 mb-4", className)}>
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
            "border border-border/50",
            activeTab === id
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
          )}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </button>
      ))}
    </div>
  );
}
