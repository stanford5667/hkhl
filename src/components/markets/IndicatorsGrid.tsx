import { useState } from 'react';
import { TrendingUp, TrendingDown, Star, Percent, Fuel, Gem, Wheat, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useIndicatorsByCategory, EconomicIndicator, IndicatorCategory, categoryLabels } from '@/hooks/useEconomicIndicators';
import { useWatchlist } from '@/hooks/useWatchlist';
import { cn } from '@/lib/utils';

const categoryIconComponents: Record<IndicatorCategory, React.ElementType> = {
  rates: Percent,
  inflation: TrendingUp,
  energy: Fuel,
  metals: Gem,
  agriculture: Wheat,
  currency: DollarSign,
  crypto: DollarSign,
  indices: BarChart3,
};

interface IndicatorCardProps {
  indicator: EconomicIndicator;
  isWatched: boolean;
  onToggleWatch: () => void;
}

function IndicatorCard({ indicator, isWatched, onToggleWatch }: IndicatorCardProps) {
  const changeValue = indicator.change_value ?? 0;
  const isPositive = changeValue >= 0;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{indicator.symbol}</p>
            <p className="font-medium text-sm truncate max-w-[140px]">{indicator.name}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 -mt-1 -mr-1"
            onClick={onToggleWatch}
          >
            <Star className={cn(
              "h-4 w-4 transition-colors",
              isWatched ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
            )} />
          </Button>
        </div>
        
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-bold">
              {indicator.unit === '$' && '$'}
              {indicator.current_value?.toLocaleString(undefined, {
                minimumFractionDigits: indicator.unit === '$' ? 2 : 0,
                maximumFractionDigits: 2,
              })}
              {indicator.unit === '%' && '%'}
              {indicator.unit === 'index' && ''}
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{isPositive ? '+' : ''}{changeValue.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IndicatorSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-7 w-7 rounded" />
        </div>
        <div className="flex items-end justify-between mt-3">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
      </CardContent>
    </Card>
  );
}

export function IndicatorsGrid() {
  const { groupedIndicators, isLoading } = useIndicatorsByCategory();
  const { isInWatchlist, toggleWatchlist, isToggling } = useWatchlist();

  const categories: IndicatorCategory[] = ['rates', 'inflation', 'indices', 'energy', 'metals', 'agriculture', 'currency', 'crypto'];

  const handleToggleWatch = (indicator: EconomicIndicator) => {
    const itemType = indicator.indicator_type === 'commodity' ? 'commodity' : 'indicator';
    toggleWatchlist({
      itemType,
      itemId: indicator.symbol,
      itemName: indicator.name,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {['Rates & Yields', 'Market Indices'].map((title) => (
          <div key={title}>
            <h3 className="font-semibold mb-3">{title}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <IndicatorSkeleton key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Tabs defaultValue="rates" className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-4 h-auto p-1">
        {categories.map((cat) => {
          const Icon = categoryIconComponents[cat];
          const count = groupedIndicators[cat]?.length ?? 0;
          return (
            <TabsTrigger 
              key={cat} 
              value={cat}
              className="flex items-center gap-1.5 text-xs whitespace-nowrap"
            >
              <Icon className="h-3.5 w-3.5" />
              {categoryLabels[cat]}
              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                {count}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {categories.map((cat) => (
        <TabsContent key={cat} value={cat} className="mt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {groupedIndicators[cat]?.map((indicator) => (
              <IndicatorCard
                key={indicator.id}
                indicator={indicator}
                isWatched={isInWatchlist(
                  indicator.indicator_type === 'commodity' ? 'commodity' : 'indicator',
                  indicator.symbol
                )}
                onToggleWatch={() => handleToggleWatch(indicator)}
              />
            ))}
          </div>
          {(!groupedIndicators[cat] || groupedIndicators[cat].length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              No indicators in this category
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
