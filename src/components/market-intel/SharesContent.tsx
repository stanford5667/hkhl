import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, Search, Star } from 'lucide-react';
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

const sectors = ['All', 'Technology', 'Financials', 'Healthcare', 'Consumer', 'Automotive', 'Energy'];

export function SharesContent() {
  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search stocks..." 
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {sectors.map((sector) => (
            <Badge
              key={sector}
              variant={sector === 'All' ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/80"
            >
              {sector}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stocks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Top Stocks by Market Cap
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
                {topStocks.map((stock) => (
                  <tr key={stock.symbol} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer">
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
