import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Calendar, Newspaper, TrendingUp, Globe, LineChart, Fuel, BarChart3, 
  Wallet, DollarSign, Bitcoin, Landmark, FileText, CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type MarketCategory = 
  | 'calendar' | 'news' | 'indicators' | 'countries' | 'forecasts' 
  | 'commodities' | 'indexes' | 'shares' | 'currencies' | 'crypto' 
  | 'bonds' | 'earnings' | 'holidays';

interface MarketIntelNavigationProps {
  activeCategory: MarketCategory;
  onCategoryChange: (category: MarketCategory) => void;
}

const categories: { id: MarketCategory; label: string; icon: React.ElementType }[] = [
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'indicators', label: 'Indicators', icon: TrendingUp },
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'forecasts', label: 'Forecasts', icon: LineChart },
  { id: 'commodities', label: 'Commodities', icon: Fuel },
  { id: 'indexes', label: 'Indexes', icon: BarChart3 },
  { id: 'shares', label: 'Shares', icon: Wallet },
  { id: 'currencies', label: 'Currencies', icon: DollarSign },
  { id: 'crypto', label: 'Crypto', icon: Bitcoin },
  { id: 'bonds', label: 'Bonds', icon: Landmark },
  { id: 'earnings', label: 'Earnings', icon: FileText },
  { id: 'holidays', label: 'Holidays', icon: CalendarDays },
];

export function MarketIntelNavigation({ activeCategory, onCategoryChange }: MarketIntelNavigationProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {categories.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onCategoryChange(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              "border hover:bg-secondary/80",
              activeCategory === id 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
