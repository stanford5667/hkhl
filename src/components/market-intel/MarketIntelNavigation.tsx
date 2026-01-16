import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Calendar, Newspaper, TrendingUp, Globe, LineChart, Fuel, BarChart3, 
  Wallet, DollarSign, Bitcoin, Landmark, FileText, CalendarDays, ChevronRight
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

const categories: { id: MarketCategory; label: string; icon: React.ElementType; description?: string }[] = [
  { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'Economic events' },
  { id: 'news', label: 'News', icon: Newspaper, description: 'Market headlines' },
  { id: 'indicators', label: 'Indicators', icon: TrendingUp, description: 'Live macro data' },
  { id: 'countries', label: 'Countries', icon: Globe, description: 'Global economies' },
  { id: 'forecasts', label: 'Forecasts', icon: LineChart, description: '2026 outlook' },
  { id: 'commodities', label: 'Commodities', icon: Fuel, description: 'Oil, gas & metals' },
  { id: 'indexes', label: 'Indexes', icon: BarChart3, description: 'Stock indices' },
  { id: 'shares', label: 'Shares', icon: Wallet, description: 'Top stocks' },
  { id: 'currencies', label: 'Currencies', icon: DollarSign, description: 'Forex rates' },
  { id: 'crypto', label: 'Crypto', icon: Bitcoin, description: 'Digital assets' },
  { id: 'bonds', label: 'Bonds', icon: Landmark, description: 'Global yields' },
  { id: 'earnings', label: 'Earnings', icon: FileText, description: 'Reports & calls' },
  { id: 'holidays', label: 'Holidays', icon: CalendarDays, description: 'Market closures' },
];

export function MarketIntelNavigation({ activeCategory, onCategoryChange }: MarketIntelNavigationProps) {
  return (
    <Card className="bg-gradient-to-r from-card via-secondary/20 to-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold text-xs">
              Data Categories
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Select a category to explore
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {categories.length} categories
          </Badge>
        </div>
        
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {categories.map(({ id, label, icon: Icon, description }) => (
              <button
                key={id}
                onClick={() => onCategoryChange(id)}
                className={cn(
                  "group flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200",
                  "border-2 min-w-fit",
                  activeCategory === id 
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25" 
                    : "bg-card hover:bg-secondary/80 text-muted-foreground border-border/50 hover:border-primary/50 hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-transform group-hover:scale-110",
                  activeCategory === id ? "text-primary-foreground" : "text-primary"
                )} />
                <span className="text-sm">{label}</span>
                {activeCategory === id && (
                  <ChevronRight className="h-3.5 w-3.5 ml-1 animate-pulse" />
                )}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="bg-secondary/50" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
