import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  TrendingUp, Users, DollarSign, Banknote, ArrowLeftRight, Building, 
  Briefcase, ShoppingCart, Home, Receipt, Zap, Heart, Cloud, Layers
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
    <Card className="bg-secondary/30 border-border/30">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Macro Indicator Categories</span>
          <Badge variant="outline" className="ml-auto text-xs bg-background/50">
            {macroCategories.length} filters
          </Badge>
        </div>
        
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-1.5 pb-2">
            <button
              onClick={() => onCategoryChange(null)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all border-2",
                activeCategory === null 
                  ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                  : "bg-card text-muted-foreground border-border/50 hover:bg-secondary/80 hover:border-primary/30 hover:text-foreground"
              )}
            >
              All Categories
            </button>
            {macroCategories.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onCategoryChange(id)}
                className={cn(
                  "group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border-2",
                  activeCategory === id 
                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                    : "bg-card text-muted-foreground border-border/50 hover:bg-secondary/80 hover:border-primary/30 hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "h-3 w-3 transition-transform group-hover:scale-110",
                  activeCategory === id ? "text-primary-foreground" : "text-primary"
                )} />
                {label}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="bg-secondary/50" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
