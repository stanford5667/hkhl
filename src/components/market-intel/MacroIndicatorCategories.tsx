import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  TrendingUp, Users, DollarSign, Banknote, ArrowLeftRight, Building, 
  Briefcase, ShoppingCart, Home, Receipt, Zap, Heart, Cloud
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type MacroCategory = 
  | 'gdp' | 'labour' | 'prices' | 'money' | 'trade' | 'government' 
  | 'business' | 'consumer' | 'housing' | 'taxes' | 'energy' | 'health' | 'climate';

interface MacroIndicatorCategoriesProps {
  activeCategory: MacroCategory | null;
  onCategoryChange: (category: MacroCategory | null) => void;
}

const macroCategories: { id: MacroCategory; label: string; icon: React.ElementType }[] = [
  { id: 'gdp', label: 'GDP', icon: TrendingUp },
  { id: 'labour', label: 'Labour', icon: Users },
  { id: 'prices', label: 'Prices', icon: DollarSign },
  { id: 'money', label: 'Money', icon: Banknote },
  { id: 'trade', label: 'Trade', icon: ArrowLeftRight },
  { id: 'government', label: 'Government', icon: Building },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'consumer', label: 'Consumer', icon: ShoppingCart },
  { id: 'housing', label: 'Housing', icon: Home },
  { id: 'taxes', label: 'Taxes', icon: Receipt },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'health', label: 'Health', icon: Heart },
  { id: 'climate', label: 'Climate', icon: Cloud },
];

export function MacroIndicatorCategories({ activeCategory, onCategoryChange }: MacroIndicatorCategoriesProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Macro Indicators</h4>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-1.5 pb-2">
          <button
            onClick={() => onCategoryChange(null)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
              activeCategory === null 
                ? "bg-primary/10 text-primary border-primary/30" 
                : "bg-secondary/30 text-muted-foreground border-transparent hover:bg-secondary/50"
            )}
          >
            All
          </button>
          {macroCategories.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onCategoryChange(id)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                activeCategory === id 
                  ? "bg-primary/10 text-primary border-primary/30" 
                  : "bg-secondary/30 text-muted-foreground border-transparent hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
