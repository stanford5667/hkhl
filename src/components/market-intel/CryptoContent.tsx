import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bitcoin, TrendingUp, TrendingDown, Sparkles, Activity } from 'lucide-react';

interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: string;
  volume24h: string;
  rank: number;
}

const cryptoData: CryptoData[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 99824.56, change24h: 2.34, change7d: 8.12, marketCap: '1.97T', volume24h: '48.2B', rank: 1 },
  { symbol: 'ETH', name: 'Ethereum', price: 3456.78, change24h: -1.23, change7d: 5.67, marketCap: '416B', volume24h: '18.9B', rank: 2 },
  { symbol: 'XRP', name: 'Ripple', price: 2.45, change24h: 5.67, change7d: 42.3, marketCap: '140B', volume24h: '12.4B', rank: 3 },
  { symbol: 'SOL', name: 'Solana', price: 198.34, change24h: 3.45, change7d: 12.8, marketCap: '94B', volume24h: '5.6B', rank: 4 },
  { symbol: 'BNB', name: 'BNB', price: 712.45, change24h: 0.89, change7d: 4.2, marketCap: '102B', volume24h: '1.8B', rank: 5 },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.3845, change24h: -2.34, change7d: 15.6, marketCap: '56B', volume24h: '4.2B', rank: 6 },
  { symbol: 'ADA', name: 'Cardano', price: 1.02, change24h: 1.23, change7d: 8.9, marketCap: '36B', volume24h: '1.1B', rank: 7 },
  { symbol: 'AVAX', name: 'Avalanche', price: 42.56, change24h: 4.56, change7d: 18.4, marketCap: '17B', volume24h: '892M', rank: 8 },
  { symbol: 'DOT', name: 'Polkadot', price: 8.12, change24h: -0.45, change7d: 6.7, marketCap: '12B', volume24h: '456M', rank: 9 },
  { symbol: 'LINK', name: 'Chainlink', price: 24.67, change24h: 2.12, change7d: 11.2, marketCap: '15B', volume24h: '678M', rank: 10 },
  { symbol: 'MATIC', name: 'Polygon', price: 0.5234, change24h: -1.89, change7d: 3.4, marketCap: '5.2B', volume24h: '312M', rank: 11 },
  { symbol: 'UNI', name: 'Uniswap', price: 14.23, change24h: 3.21, change7d: 9.8, marketCap: '8.5B', volume24h: '234M', rank: 12 },
];

export function CryptoContent() {
  const totalMarketCap = '3.42T';
  const btcDominance = 57.6;
  const ethDominance = 12.2;
  const fearGreedIndex = 72;

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-secondary/30">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Total Market Cap</span>
            <p className="text-2xl font-bold">${totalMarketCap}</p>
            <p className="text-xs text-emerald-500">+2.4% (24h)</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">BTC Dominance</span>
            <p className="text-2xl font-bold">{btcDominance}%</p>
            <p className="text-xs text-muted-foreground">+0.3% (24h)</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">ETH Dominance</span>
            <p className="text-2xl font-bold">{ethDominance}%</p>
            <p className="text-xs text-rose-500">-0.2% (24h)</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Fear & Greed</span>
            <p className="text-2xl font-bold text-emerald-500">{fearGreedIndex}</p>
            <p className="text-xs text-emerald-500">Greed</p>
          </CardContent>
        </Card>
      </div>

      {/* Crypto Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-orange-500" />
            Cryptocurrencies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">#</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Price</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">24h %</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">7d %</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Market Cap</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Volume (24h)</th>
                </tr>
              </thead>
              <tbody>
                {cryptoData.map((crypto) => (
                  <tr key={crypto.symbol} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer">
                    <td className="py-3 px-2 text-muted-foreground">{crypto.rank}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{crypto.symbol}</span>
                        <span className="text-muted-foreground text-xs">{crypto.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 font-medium">
                      ${crypto.price < 1 ? crypto.price.toFixed(4) : crypto.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className={`text-right py-3 px-2 ${crypto.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {crypto.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                      </div>
                    </td>
                    <td className={`text-right py-3 px-2 ${crypto.change7d >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {crypto.change7d >= 0 ? '+' : ''}{crypto.change7d.toFixed(2)}%
                    </td>
                    <td className="text-right py-3 px-2">${crypto.marketCap}</td>
                    <td className="text-right py-3 px-2 text-muted-foreground">${crypto.volume24h}</td>
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
