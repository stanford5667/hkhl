import { Card, CardContent } from '@/components/ui/card';
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
    <Card className="bg-gradient-to-r from-card via-secondary/20 to-card border-border/50">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {categories.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onCategoryChange(id)}
              className={cn(
                "group flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md font-medium transition-all duration-200",
                "border text-xs sm:text-sm",
                activeCategory === id 
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25" 
                  : "bg-card hover:bg-secondary/80 text-muted-foreground border-border/50 hover:border-primary/50 hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:scale-110",
                activeCategory === id ? "text-primary-foreground" : "text-primary"
              )} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
