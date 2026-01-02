import { useState, useEffect } from 'react';
import { getFullQuote } from '@/services/finnhubService';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface StockQuote {
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: string;
  marketCap: string;
  companyName: string;
  chartData: { time: string; price: number }[];
}

interface StockQuoteHeaderProps {
  ticker: string;
}

export function StockQuoteHeader({ ticker }: StockQuoteHeaderProps) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFullQuote(ticker);

      if (data) {
        setQuote({
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          open: data.open,
          high: data.high,
          low: data.low,
          volume: '-', // Finnhub free tier doesn't include volume in quote
          marketCap: data.marketCap || '-',
          companyName: data.companyName || ticker,
          chartData: [], // Finnhub free tier doesn't include intraday chart
        });
      } else {
        setError('Unable to fetch quote');
      }
    } catch (e) {
      console.error('Quote error:', e);
      setError('Failed to load stock data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [ticker]);

  if (isLoading) {
    return (
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32 bg-slate-800" />
            <Skeleton className="h-4 w-48 bg-slate-800" />
          </div>
          <Skeleton className="h-20 w-40 bg-slate-800" />
          <div className="flex-1">
            <Skeleton className="h-16 w-full bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm">{error || 'Quote unavailable'}</p>
          <Button variant="ghost" size="sm" onClick={fetchQuote}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isPositive = quote.change >= 0;

  return (
    <div className="p-4 border-b border-slate-800">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        {/* Price & Change */}
        <div className="flex items-center gap-6">
          <div>
            <p className="text-3xl font-bold text-white">${quote.price.toFixed(2)}</p>
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              isPositive ? "text-emerald-400" : "text-rose-400"
            )}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{isPositive ? '+' : ''}{quote.change.toFixed(2)}</span>
              <span>({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{quote.companyName}</p>
          </div>

          {/* Key Stats */}
          <div className="hidden sm:grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Open</span>
              <span className="text-slate-300">${quote.open.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Volume</span>
              <span className="text-slate-300">{quote.volume}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">High</span>
              <span className="text-slate-300">${quote.high.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Mkt Cap</span>
              <span className="text-slate-300">{quote.marketCap}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Low</span>
              <span className="text-slate-300">${quote.low.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Mini Chart */}
        {quote.chartData && quote.chartData.length > 0 && (
          <div className="flex-1 h-16 min-w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={quote.chartData}>
                <defs>
                  <linearGradient id={`gradient-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="0%" 
                      stopColor={isPositive ? '#10b981' : '#f43f5e'} 
                      stopOpacity={0.3} 
                    />
                    <stop 
                      offset="100%" 
                      stopColor={isPositive ? '#10b981' : '#f43f5e'} 
                      stopOpacity={0} 
                    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isPositive ? '#10b981' : '#f43f5e'}
                  strokeWidth={2}
                  fill={`url(#gradient-${ticker})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
