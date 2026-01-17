import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, Newspaper, TrendingUp, Globe, LineChart, Fuel, BarChart3, 
  Wallet, DollarSign, Bitcoin, Landmark, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type MarketCategory = 
  | 'calendar' | 'news' | 'indicators' | 'countries' | 'forecasts' 
  | 'commodities' | 'indexes' | 'shares' | 'currencies' | 'crypto' 
  | 'bonds' | 'earnings';

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
];

export function MarketIntelNavigation({ activeCategory, onCategoryChange }: MarketIntelNavigationProps) {
  return (
    <Card className="bg-gradient-to-r from-card via-secondary/20 to-card border-border/50 overflow-hidden">
      <CardContent className="p-2 sm:p-3">
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {categories.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onCategoryChange(id)}
              className={cn(
                "group flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md font-medium transition-all duration-200",
                "border text-[10px] sm:text-xs whitespace-nowrap",
                activeCategory === id 
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25" 
                  : "bg-card hover:bg-secondary/80 text-muted-foreground border-border/50 hover:border-primary/50 hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-3 w-3 transition-transform group-hover:scale-110 shrink-0",
                activeCategory === id ? "text-primary-foreground" : "text-primary"
              )} />
              <span className="truncate max-w-[60px] sm:max-w-none">{label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
