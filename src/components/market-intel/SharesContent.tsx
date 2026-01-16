import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, Search, Star, BarChart3, Building2, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  sector: string;
  pe: number | null;
}

const topStocks: StockData[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 242.84, change: 2.45, changePercent: 1.02, volume: '45.2M', marketCap: '3.69T', sector: 'Technology', pe: 32.4 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 438.12, change: -1.23, changePercent: -0.28, volume: '18.7M', marketCap: '3.25T', sector: 'Technology', pe: 35.8 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 134.29, change: 4.56, changePercent: 3.52, volume: '312.5M', marketCap: '3.31T', sector: 'Technology', pe: 52.1 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 192.45, change: 0.89, changePercent: 0.46, volume: '22.1M', marketCap: '2.36T', sector: 'Technology', pe: 24.2 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 224.92, change: 3.21, changePercent: 1.45, volume: '38.9M', marketCap: '2.36T', sector: 'Consumer', pe: 44.5 },
  { symbol: 'META', name: 'Meta Platforms', price: 612.77, change: -5.43, changePercent: -0.88, volume: '12.4M', marketCap: '1.55T', sector: 'Technology', pe: 27.8 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 421.06, change: 12.34, changePercent: 3.02, volume: '98.2M', marketCap: '1.35T', sector: 'Automotive', pe: 105.2 },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', price: 456.78, change: 1.23, changePercent: 0.27, volume: '3.2M', marketCap: '1.01T', sector: 'Financials', pe: 9.8 },
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 243.56, change: -0.98, changePercent: -0.40, volume: '8.9M', marketCap: '694B', sector: 'Financials', pe: 12.4 },
  { symbol: 'V', name: 'Visa Inc.', price: 312.45, change: 1.67, changePercent: 0.54, volume: '5.6M', marketCap: '628B', sector: 'Financials', pe: 31.2 },
  { symbol: 'UNH', name: 'UnitedHealth Group', price: 498.23, change: -8.45, changePercent: -1.67, volume: '4.1M', marketCap: '456B', sector: 'Healthcare', pe: 18.9 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', price: 148.92, change: 0.45, changePercent: 0.30, volume: '6.7M', marketCap: '358B', sector: 'Healthcare', pe: 15.2 },
];

const StockRow = ({ stock }: { stock: StockData }) => (
  <tr className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer">
    <td className="py-3 px-2">
      <div className="flex items-center gap-2">
        <Star className="h-3 w-3 text-muted-foreground hover:text-yellow-500 cursor-pointer" />
        <span className="font-semibold">{stock.symbol}</span>
      </div>
    </td>
    <td className="py-3 px-2 text-muted-foreground">{stock.name}</td>
    <td className="text-right py-3 px-2 font-medium">${stock.price.toFixed(2)}</td>
    <td className={`text-right py-3 px-2 ${stock.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
      <div className="flex items-center justify-end gap-1">
        {stock.changePercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
      </div>
    </td>
    <td className="text-right py-3 px-2 text-muted-foreground">{stock.volume}</td>
    <td className="text-right py-3 px-2">${stock.marketCap}</td>
    <td className="text-right py-3 px-2 text-muted-foreground">{stock.pe?.toFixed(1) || 'N/A'}</td>
    <td className="text-center py-3 px-2">
      <Badge variant="outline" className="text-[10px]">{stock.sector}</Badge>
    </td>
  </tr>
);

export function SharesContent() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const tabs = [
    { id: 'all', label: 'All Stocks', icon: Wallet },
    { id: 'Technology', label: 'Tech', icon: Activity },
    { id: 'Financials', label: 'Financials', icon: Building2 },
    { id: 'Healthcare', label: 'Healthcare', icon: BarChart3 },
  ];
  
  const filteredStocks = topStocks
    .filter(s => activeTab === 'all' || s.sector === activeTab)
    .filter(s => 
      searchQuery === '' || 
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const topGainers = [...topStocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
  const topLosers = [...topStocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList className="bg-secondary/30 p-1 h-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm"
              >
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="relative w-full sm:w-auto sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search stocks..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

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
                  {topGainers.map((stock) => (
                    <div key={stock.symbol} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{stock.symbol}</span>
                        <span className="text-muted-foreground text-xs ml-2">${stock.price}</span>
                      </div>
                      <span className="text-emerald-500">+{stock.changePercent.toFixed(2)}%</span>
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
                  {topLosers.map((stock) => (
                    <div key={stock.symbol} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{stock.symbol}</span>
                        <span className="text-muted-foreground text-xs ml-2">${stock.price}</span>
                      </div>
                      <span className="text-rose-500">{stock.changePercent.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stocks Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {activeTab === 'all' ? 'Top Stocks by Market Cap' : `${activeTab} Stocks`}
                <Badge variant="secondary" className="ml-2">{filteredStocks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Symbol</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Price</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Change</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Volume</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Mkt Cap</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">P/E</th>
                      <th className="text-center py-3 px-2 font-medium text-muted-foreground">Sector</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStocks.map((stock) => (
                      <StockRow key={stock.symbol} stock={stock} />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
