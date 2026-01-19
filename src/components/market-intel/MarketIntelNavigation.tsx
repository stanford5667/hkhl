import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, TrendingUp, Globe, BarChart3, 
  DollarSign, Bitcoin, Landmark, FileText, FlaskConical
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type MarketCategory = 
  | 'calendar' | 'indicators' | 'countries'
  | 'indexes' | 'currencies' | 'crypto' 
  | 'bonds' | 'earnings' | 'studies';

interface MarketIntelNavigationProps {
  activeCategory: MarketCategory;
  onCategoryChange: (category: MarketCategory) => void;
}

const categories: { id: MarketCategory; label: string; icon: React.ElementType }[] = [
  { id: 'indicators', label: 'Overview', icon: TrendingUp },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'studies', label: 'Studies', icon: FlaskConical },
  { id: 'countries', label: 'Countries', icon: Globe },
  { id: 'indexes', label: 'Indexes', icon: BarChart3 },
  { id: 'currencies', label: 'Currencies', icon: DollarSign },
  { id: 'crypto', label: 'Crypto', icon: Bitcoin },
  { id: 'bonds', label: 'Bonds', icon: Landmark },
  { id: 'earnings', label: 'Earnings', icon: FileText },
];

export function MarketIntelNavigation({ activeCategory, onCategoryChange }: MarketIntelNavigationProps) {
  return (
    <Card className="bg-gradient-to-r from-card via-secondary/30 to-card border-border/50 overflow-hidden shadow-lg">
      <CardContent className="p-2 sm:p-3">
        <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
          {categories.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onCategoryChange(id)}
              className={cn(
                "group flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-1.5",
                "px-2 sm:px-3 py-2 sm:py-2 rounded-lg font-medium transition-all duration-200",
                "border text-[10px] sm:text-xs",
                activeCategory === id 
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary shadow-lg shadow-primary/25" 
                  : "bg-secondary/50 hover:bg-secondary text-muted-foreground border-border/50 hover:border-primary/50 hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-md transition-all",
                activeCategory === id 
                  ? "bg-white/20" 
                  : "bg-primary/10 group-hover:bg-primary/20"
              )}>
                <Icon className={cn(
                  "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:scale-110",
                  activeCategory === id ? "text-primary-foreground" : "text-primary"
                )} />
              </div>
              <span className="truncate text-center sm:text-left">{label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
