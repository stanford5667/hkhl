import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, Activity, Zap, ChevronRight, 
  Flame, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { screenStocksFromPolygon, QUICK_SCREENS, type ScreenerResult } from '@/services/polygonScreenerService';

const SCREENER_TABS = [
  { id: 'topGainers', label: 'Top Gainers', icon: TrendingUp },
  { id: 'mostActive', label: 'Most Active', icon: Activity },
  { id: 'momentum', label: 'Momentum', icon: Flame },
  { id: 'unusualVolume', label: 'Unusual Vol', icon: Zap },
] as const;

type TabId = typeof SCREENER_TABS[number]['id'];

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toString();
}

function StockRow({ stock, onClick }: { stock: ScreenerResult; onClick: () => void }) {
  const isPositive = stock.changePercent >= 0;
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 py-2.5 px-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
    >
      <div className="w-16">
        <span className="text-sm font-semibold text-primary">{stock.symbol}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground truncate block">{stock.name}</span>
      </div>
      <div className="w-16 text-right">
        <span className="text-xs font-medium text-foreground tabular-nums">
          ${stock.price.toFixed(2)}
        </span>
      </div>
      <div className="w-14 text-right">
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {formatVolume(stock.volume)}
        </span>
      </div>
      <div className={cn(
        'w-16 text-right text-xs font-semibold tabular-nums',
        isPositive ? 'text-emerald-500' : 'text-destructive'
      )}>
        {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
      </div>
    </button>
  );
}

function StockList({ 
  stocks, 
  isLoading, 
  onStockClick 
}: { 
  stocks: ScreenerResult[] | undefined; 
  isLoading: boolean;
  onStockClick: (symbol: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stocks || stocks.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No stocks found
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border sticky top-0">
        <span className="w-16 text-[10px] font-medium text-muted-foreground">Symbol</span>
        <span className="flex-1 text-[10px] font-medium text-muted-foreground">Name</span>
        <span className="w-16 text-right text-[10px] font-medium text-muted-foreground">Price</span>
        <span className="w-14 text-right text-[10px] font-medium text-muted-foreground">Volume</span>
        <span className="w-16 text-right text-[10px] font-medium text-muted-foreground">Change</span>
      </div>
      {stocks.map(stock => (
        <StockRow 
          key={stock.symbol} 
          stock={stock} 
          onClick={() => onStockClick(stock.symbol)} 
        />
      ))}
    </div>
  );
}


export function UnifiedDiscoveryScreener() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('topGainers');

  // Top Gainers query
  const { data: gainers, isLoading: loadingGainers } = useQuery({
    queryKey: ['screener', 'topGainers-quality'],
    queryFn: async () => {
      const result = await screenStocksFromPolygon({
        minChange1D: 2,
        minPrice: 2,
        minVolume: 500000,
        sortBy: 'change',
        sortDirection: 'desc',
        limit: 25,
      });
      return result.results.slice(0, 12);
    },
    staleTime: 60000,
    enabled: activeTab === 'topGainers',
  });

  // Most Active query
  const { data: mostActive, isLoading: loadingActive } = useQuery({
    queryKey: ['screener', 'mostActive-quality'],
    queryFn: async () => {
      const result = await screenStocksFromPolygon({
        minPrice: 1,
        minVolume: 1000000,
        sortBy: 'volume',
        sortDirection: 'desc',
        limit: 25,
      });
      return result.results.slice(0, 12);
    },
    staleTime: 60000,
    enabled: activeTab === 'mostActive',
  });

  // Momentum query
  const { data: momentum, isLoading: loadingMomentum } = useQuery({
    queryKey: ['screener', 'smallCapMomentum'],
    queryFn: async () => {
      const screenConfig = QUICK_SCREENS['smallCapMomentum'];
      if (!screenConfig) return [];
      const result = await screenStocksFromPolygon(screenConfig.filters);
      return result.results.slice(0, 12);
    },
    staleTime: 60000,
    enabled: activeTab === 'momentum',
  });

  // Unusual Volume query
  const { data: unusualVol, isLoading: loadingUnusual } = useQuery({
    queryKey: ['screener', 'unusualVolume'],
    queryFn: async () => {
      const screenConfig = QUICK_SCREENS['unusualVolume'];
      if (!screenConfig) return [];
      const result = await screenStocksFromPolygon(screenConfig.filters);
      return result.results.slice(0, 12);
    },
    staleTime: 60000,
    enabled: activeTab === 'unusualVolume',
  });

  const handleStockClick = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'topGainers':
        return { stocks: gainers, isLoading: loadingGainers };
      case 'mostActive':
        return { stocks: mostActive, isLoading: loadingActive };
      case 'momentum':
        return { stocks: momentum, isLoading: loadingMomentum };
      case 'unusualVolume':
        return { stocks: unusualVol, isLoading: loadingUnusual };
      default:
        return { stocks: undefined, isLoading: false };
    }
  };

  const currentTab = SCREENER_TABS.find(t => t.id === activeTab);
  const { stocks, isLoading } = getTabData();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Market Discovery
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7"
            onClick={() => navigate('/screener')}
          >
            Full Screener
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-1 pt-2 flex-wrap">
          {SCREENER_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 text-xs gap-1.5 transition-all',
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </CardHeader>
      
      <CardContent className="p-0 pt-0">
        <StockList 
          stocks={stocks} 
          isLoading={isLoading} 
          onStockClick={handleStockClick} 
        />
      </CardContent>
    </Card>
  );
}
