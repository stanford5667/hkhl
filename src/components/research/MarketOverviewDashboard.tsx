import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketIndicesQuery } from '@/hooks/useMarketDataQuery';
import { useSparklineData } from '@/hooks/useChartData';
import { useLatestHeadlines } from '@/hooks/useMarketNews';
import { cn } from '@/lib/utils';
import { ExternalLink, Loader2, ChevronRight } from 'lucide-react';
import { MiniSparkline } from './MiniSparkline';
import { Skeleton } from '@/components/ui/skeleton';

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';
type MarketCategory = 'US' | 'Commodities' | 'Crypto';

interface IndexItem {
  name: string;
  symbol: string;
  displaySymbol: string;
  value: number;
  change: number;
  changePercent: number;
  color?: string;
}

// Define our tracked indices
const US_INDICES: IndexItem[] = [
  { name: 'Dow Jones', symbol: 'DIA', displaySymbol: 'DJI', value: 0, change: 0, changePercent: 0, color: 'bg-orange-500' },
  { name: 'S&P 500', symbol: 'SPY', displaySymbol: 'SPX', value: 0, change: 0, changePercent: 0, color: 'bg-red-500' },
  { name: 'Nasdaq', symbol: 'QQQ', displaySymbol: 'NDX', value: 0, change: 0, changePercent: 0, color: 'bg-emerald-500' },
];

const COMMODITIES: IndexItem[] = [
  { name: 'Crude Oil', symbol: 'USO', displaySymbol: 'CL', value: 0, change: 0, changePercent: 0, color: 'bg-amber-600' },
  { name: 'Gold', symbol: 'GLD', displaySymbol: 'GC', value: 0, change: 0, changePercent: 0, color: 'bg-yellow-500' },
];

const CRYPTO: IndexItem[] = [
  { name: 'Bitcoin', symbol: 'BTC-USD', displaySymbol: 'BTC', value: 0, change: 0, changePercent: 0, color: 'bg-orange-400' },
];

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y'];

export function MarketOverviewDashboard() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('US');
  const [selectedIndex, setSelectedIndex] = useState<string>('SPY');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1D');
  
  const { indices, isLoading: indicesLoading } = useMarketIndicesQuery();
  const { data: sparklineData, isLoading: sparklineLoading } = useSparklineData(selectedIndex, selectedTimeRange);
  const { data: headlines, isLoading: headlinesLoading } = useLatestHeadlines(5);

  // Get current list of indices based on category
  const currentIndices = useMemo(() => {
    let baseIndices: IndexItem[];
    switch (selectedCategory) {
      case 'Commodities':
        baseIndices = COMMODITIES;
        break;
      case 'Crypto':
        baseIndices = CRYPTO;
        break;
      default:
        baseIndices = US_INDICES;
    }

    // Merge with live data
    return baseIndices.map(item => {
      const liveData = indices.find(i => i.symbol === item.symbol);
      if (liveData) {
        return {
          ...item,
          value: liveData.value,
          change: liveData.change,
          changePercent: liveData.changePercent,
        };
      }
      return item;
    });
  }, [selectedCategory, indices]);

  const selectedIndexData = currentIndices.find(i => i.symbol === selectedIndex) || currentIndices[0];

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toFixed(2);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <div className="bg-gradient-to-br from-card via-card to-card/80 border border-border/60 rounded-xl overflow-hidden shadow-lg">
      {/* Header: Category Tabs + Time Range */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
          {(['US', 'Commodities', 'Crypto'] as MarketCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                if (cat === 'US') setSelectedIndex('SPY');
                else if (cat === 'Commodities') setSelectedIndex('USO');
                else setSelectedIndex('BTC-USD');
              }}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-md transition-all',
                selectedCategory === cat 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
          {TIME_RANGES.map(range => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={cn(
                'text-[10px] font-medium px-2 py-1 rounded-md transition-all',
                selectedTimeRange === range 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Left Panel - Index List */}
        <div className="lg:w-[260px] border-b lg:border-b-0 lg:border-r border-border/50 bg-muted/10">
          {currentIndices.map(item => (
            <button
              key={item.symbol}
              onClick={() => setSelectedIndex(item.symbol)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-all',
                selectedIndex === item.symbol 
                  ? 'bg-primary/10 border-l-2 border-l-primary' 
                  : 'border-l-2 border-l-transparent hover:bg-muted/30'
              )}
            >
              <div 
                className={cn('w-1 h-10 rounded-full', item.color)}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {item.name}
                </div>
                {indicesLoading ? (
                  <Skeleton className="h-3 w-16 mt-1" />
                ) : (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatValue(item.value)}
                  </div>
                )}
              </div>
              <div className="text-right">
                {indicesLoading ? (
                  <Skeleton className="h-4 w-14" />
                ) : (
                  <>
                    <div className={cn(
                      'text-sm font-bold tabular-nums',
                      item.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {formatPercent(item.changePercent)}
                    </div>
                    <div className={cn(
                      'text-[10px] font-medium tabular-nums',
                      item.change >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'
                    )}>
                      {formatChange(item.change)}
                    </div>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Center Panel - Chart with Price Scale */}
        <div className="flex-1 p-4 min-w-0 flex flex-col justify-center items-center bg-gradient-to-br from-transparent to-muted/10">
          {/* Selected Index Info */}
          {selectedIndexData && (
            <div className="text-center mb-3">
              <span className="text-sm font-medium text-muted-foreground">{selectedIndexData.name}</span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-2xl font-bold tabular-nums">{formatValue(selectedIndexData.value)}</span>
                <span className={cn(
                  'text-sm font-semibold px-2 py-0.5 rounded-md',
                  selectedIndexData.changePercent >= 0 
                    ? 'text-emerald-400 bg-emerald-500/10' 
                    : 'text-red-400 bg-red-500/10'
                )}>
                  {formatPercent(selectedIndexData.changePercent)}
                </span>
              </div>
            </div>
          )}
          
          <div className="h-[100px] w-full max-w-[400px]">
            {sparklineLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sparklineData && sparklineData.length > 0 && selectedIndexData ? (
              <MiniSparkline 
                data={sparklineData}
                height={100} 
                width={400}
                isPositive={selectedIndexData.changePercent >= 0}
                showPriceScale={true}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/10 rounded-lg">
                No chart data available
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Latest News */}
        <div className="lg:w-[300px] border-t lg:border-t-0 lg:border-l border-border/50 bg-muted/10">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            <span className="text-xs font-semibold text-foreground">Latest News</span>
            <button 
              onClick={() => navigate('/market-intel')}
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
            >
              See All <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-border/30">
            {headlinesLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="px-4 py-2">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : headlines && headlines.length > 0 ? (
              headlines.map((news) => (
                <button
                  key={news.id}
                  className="w-full flex items-start gap-2 px-4 py-2 text-left hover:bg-muted/30 transition-colors group"
                >
                  <span className="text-[10px] text-primary font-mono shrink-0 pt-0.5">
                    {news.time}
                  </span>
                  <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">
                    {news.headline}
                  </span>
                </button>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No recent news
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
