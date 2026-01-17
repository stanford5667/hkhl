import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, Globe, Map, Star, Activity } from 'lucide-react';
import { type MarketDataItem } from './MarketDataDetail';

interface IndexData {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  region: string;
  ytd: number;
}

interface IndexesContentProps {
  onItemClick?: (item: MarketDataItem) => void;
}

const globalIndexes: IndexData[] = [
  // US
  { name: 'S&P 500', symbol: 'SPX', value: 6049.24, change: 22.13, changePercent: 0.37, region: 'US', ytd: 27.8 },
  { name: 'Dow Jones', symbol: 'DJI', value: 43823.12, change: -234.56, changePercent: -0.53, region: 'US', ytd: 18.2 },
  { name: 'NASDAQ', symbol: 'IXIC', value: 19926.72, change: 115.94, changePercent: 0.59, region: 'US', ytd: 33.4 },
  { name: 'Russell 2000', symbol: 'RUT', value: 2268.45, change: 18.32, changePercent: 0.81, region: 'US', ytd: 12.6 },
  
  // Europe
  { name: 'FTSE 100', symbol: 'UKX', value: 8246.38, change: -12.45, changePercent: -0.15, region: 'Europe', ytd: 8.4 },
  { name: 'DAX', symbol: 'DAX', value: 20317.10, change: 156.23, changePercent: 0.78, region: 'Europe', ytd: 22.1 },
  { name: 'CAC 40', symbol: 'CAC', value: 7445.89, change: 45.67, changePercent: 0.62, region: 'Europe', ytd: 5.8 },
  { name: 'Euro Stoxx 50', symbol: 'SX5E', value: 4892.34, change: 28.91, changePercent: 0.59, region: 'Europe', ytd: 11.2 },
  
  // Asia
  { name: 'Nikkei 225', symbol: 'NI225', value: 39894.54, change: 312.45, changePercent: 0.79, region: 'Asia', ytd: 19.8 },
  { name: 'Hang Seng', symbol: 'HSI', value: 19864.55, change: -156.78, changePercent: -0.78, region: 'Asia', ytd: 18.4 },
  { name: 'Shanghai Composite', symbol: 'SHCOMP', value: 3368.07, change: 22.34, changePercent: 0.67, region: 'Asia', ytd: 14.2 },
  { name: 'Nifty 50', symbol: 'NSEI', value: 23203.20, change: -89.45, changePercent: -0.38, region: 'Asia', ytd: 12.1 },
  
  // Others
  { name: 'ASX 200', symbol: 'AXJO', value: 8298.60, change: 34.56, changePercent: 0.42, region: 'Pacific', ytd: 9.8 },
  { name: 'Bovespa', symbol: 'BVSP', value: 118532.76, change: -1234.56, changePercent: -1.03, region: 'Americas', ytd: -8.2 },
  { name: 'TSX', symbol: 'GSPTSE', value: 25012.45, change: 78.23, changePercent: 0.31, region: 'Americas', ytd: 21.4 },
];

const IndexCard = ({ index, onClick }: { index: IndexData; onClick?: () => void }) => (
  <Card className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={onClick}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-semibold">{index.name}</h4>
          <span className="text-xs text-muted-foreground">{index.symbol}</span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {index.region}
        </Badge>
      </div>
      
      <div className="text-2xl font-bold mb-2">
        {index.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className={`flex items-center gap-1 ${index.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {index.changePercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          <span>{index.changePercent >= 0 ? '+' : ''}{index.change.toFixed(2)}</span>
          <span>({index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)</span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-border">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">YTD</span>
          <span className={`font-medium ${index.ytd >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {index.ytd >= 0 ? '+' : ''}{index.ytd}%
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
);

export function IndexesContent({ onItemClick }: IndexesContentProps) {
  const [activeTab, setActiveTab] = useState('all');
  
  const handleIndexClick = (index: IndexData) => {
    if (onItemClick) {
      onItemClick({
        symbol: index.symbol,
        name: index.name,
        price: index.value,
        change: index.change,
        changePercent: index.changePercent,
        type: 'index',
        category: index.region,
      });
    }
  };
  
  const regions = [
    { id: 'all', label: 'All Regions', icon: Globe },
    { id: 'US', label: 'United States', icon: Star },
    { id: 'Europe', label: 'Europe', icon: Map },
    { id: 'Asia', label: 'Asia Pacific', icon: Activity },
  ];
  
  const filteredIndexes = activeTab === 'all' 
    ? globalIndexes 
    : globalIndexes.filter(i => i.region === activeTab || (activeTab === 'Asia' && (i.region === 'Asia' || i.region === 'Pacific')));

  const topGainers = [...globalIndexes].sort((a, b) => b.changePercent - a.changePercent).slice(0, 4);
  const topLosers = [...globalIndexes].sort((a, b) => a.changePercent - b.changePercent).slice(0, 4);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 p-1 h-auto flex-wrap">
          {regions.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{id === 'all' ? 'All' : id}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-6">
          {/* Performance Summary */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-emerald-500/10 border-emerald-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                  Top Gainers
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {topGainers.map((index) => (
                    <div key={index.symbol} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{index.symbol}</span>
                      <span className="text-emerald-500">+{index.changePercent.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-rose-500/10 border-rose-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-rose-500">
                  <TrendingDown className="h-4 w-4" />
                  Top Losers
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {topLosers.map((index) => (
                    <div key={index.symbol} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{index.symbol}</span>
                      <span className="text-rose-500">{index.changePercent.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Indexes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredIndexes.map((index) => (
              <IndexCard key={index.symbol} index={index} onClick={() => handleIndexClick(index)} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
