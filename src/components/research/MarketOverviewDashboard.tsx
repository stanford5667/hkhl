import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketIndicesQuery } from '@/hooks/useMarketDataQuery';
import { useSparklineData } from '@/hooks/useChartData';
import { useLatestHeadlines } from '@/hooks/useMarketNews';
import { cn } from '@/lib/utils';
import { Loader2, ChevronRight } from 'lucide-react';
import { MiniSparkline } from './MiniSparkline';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

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

// Define our tracked indices (using ETF proxies)
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

// Fetch index data directly via Polygon screener as fallback
async function fetchIndexDataFromPolygon(symbols: string[]): Promise<Map<string, { price: number; change: number; changePercent: number }>> {
  const results = new Map<string, { price: number; change: number; changePercent: number }>();
  
  try {
    const { data, error } = await supabase.functions.invoke('polygon-screener', {
      body: { 
        action: 'snapshot',
        tickers: symbols 
      }
    });
    
    if (error) throw error;
    
    const snapshots = data?.results || [];
    for (const snap of snapshots) {
      if (snap.ticker) {
        results.set(snap.ticker, {
          price: snap.day?.c || snap.prevDay?.c || 0,
          change: snap.todaysChange || 0,
          changePercent: snap.todaysChangePerc || 0,
        });
      }
    }
  } catch (err) {
    console.error('[MarketOverview] Polygon fallback error:', err);
  }
  
  return results;
}

export function MarketOverviewDashboard() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('US');
  const [selectedIndex, setSelectedIndex] = useState<string>('SPY');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1D');
  const [polygonData, setPolygonData] = useState<Map<string, { price: number; change: number; changePercent: number }>>(new Map());
  const [polygonLoading, setPolygonLoading] = useState(false);
  
  const { indices, isLoading: indicesLoading } = useMarketIndicesQuery();
  const { data: sparklineData, isLoading: sparklineLoading } = useSparklineData(selectedIndex, selectedTimeRange);
  const { data: headlines, isLoading: headlinesLoading } = useLatestHeadlines(5);
  
  // Fetch from Polygon as fallback when primary data is empty
  useEffect(() => {
    const symbols = selectedCategory === 'Commodities' 
      ? ['USO', 'GLD'] 
      : selectedCategory === 'Crypto' 
        ? [] // Crypto not available via Polygon
        : ['DIA', 'SPY', 'QQQ'];
    
    // Check if indices have no data (all zeros)
    const hasNoData = indices.length === 0 || indices.every(i => i.value === 0);
    
    if (hasNoData && symbols.length > 0 && !polygonLoading) {
      setPolygonLoading(true);
      fetchIndexDataFromPolygon(symbols).then(data => {
        setPolygonData(data);
        setPolygonLoading(false);
      });
    }
  }, [indices, selectedCategory, polygonLoading]);

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

    // Merge with live data (try primary source first, then Polygon fallback)
    return baseIndices.map(item => {
      const liveData = indices.find(i => i.symbol === item.symbol);
      const polygonQuote = polygonData.get(item.symbol);
      
      if (liveData && liveData.value > 0) {
        return {
          ...item,
          value: liveData.value,
          change: liveData.change,
          changePercent: liveData.changePercent,
        };
      } else if (polygonQuote && polygonQuote.price > 0) {
        return {
          ...item,
          value: polygonQuote.price,
          change: polygonQuote.change,
          changePercent: polygonQuote.changePercent,
        };
      }
      return item;
    });
  }, [selectedCategory, indices, polygonData]);

  const selectedIndexData = currentIndices.find(i => i.symbol === selectedIndex) || currentIndices[0];
  const isLoadingData = indicesLoading || polygonLoading;

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

      {/* Main Content: Indexes + Chart side by side on desktop */}
      <div className="flex flex-col">
        {/* Top Row: Indexes list + Chart (side by side on desktop) */}
        <div className="flex flex-col lg:flex-row">
          {/* Left Panel - Index List (compact on desktop) */}
          <div className="lg:w-[220px] shrink-0 border-b lg:border-b-0 lg:border-r border-border/50 bg-muted/10">
            {currentIndices.map(item => (
              <button
                key={item.symbol}
                onClick={() => setSelectedIndex(item.symbol)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all',
                  selectedIndex === item.symbol 
                    ? 'bg-primary/10 border-l-2 border-l-primary' 
                    : 'border-l-2 border-l-transparent hover:bg-muted/30'
                )}
              >
                <div 
                  className={cn('w-1 h-8 rounded-full shrink-0', item.color)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {item.name}
                  </div>
                  {isLoadingData ? (
                    <Skeleton className="h-3 w-14 mt-0.5" />
                  ) : (
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      {formatValue(item.value)}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {isLoadingData ? (
                    <Skeleton className="h-4 w-12" />
                  ) : (
                    <>
                      <div className={cn(
                        'text-xs font-bold tabular-nums',
                        item.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {formatPercent(item.changePercent)}
                      </div>
                      <div className={cn(
                        'text-[9px] font-medium tabular-nums',
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

          {/* Center Panel - Chart with Price Scale (larger on desktop) */}
          <div className="flex-1 p-4 min-w-0 flex flex-col justify-center items-center bg-gradient-to-br from-transparent to-muted/10">
            {/* Selected Index Info */}
            {selectedIndexData && (
              <div className="text-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">{selectedIndexData.name}</span>
                <div className="flex items-center justify-center gap-2 mt-0.5">
                  <span className="text-xl font-bold tabular-nums">{formatValue(selectedIndexData.value)}</span>
                  <span className={cn(
                    'text-xs font-semibold px-1.5 py-0.5 rounded',
                    selectedIndexData.changePercent >= 0 
                      ? 'text-emerald-400 bg-emerald-500/10' 
                      : 'text-red-400 bg-red-500/10'
                  )}>
                    {formatPercent(selectedIndexData.changePercent)}
                  </span>
                </div>
              </div>
            )}
            
            <div className="h-[120px] w-full max-w-[500px]">
              {sparklineLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : sparklineData && sparklineData.length > 0 && selectedIndexData ? (
                <MiniSparkline 
                  data={sparklineData}
                  height={120} 
                  width={500}
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
        </div>

        {/* Bottom Row: Latest News (full width) */}
        <div className="border-t border-border/50 bg-muted/10">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            <span className="text-xs font-semibold text-foreground">Latest News</span>
            <button 
              onClick={() => navigate('/market-intel')}
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
            >
              See All <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 divide-y md:divide-y-0 divide-border/30">
            {headlinesLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="px-4 py-2 border-r border-border/30 last:border-r-0">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : headlines && headlines.length > 0 ? (
              headlines.map((news) => (
                <button
                  key={news.id}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors group border-r border-border/30 last:border-r-0"
                >
                  <span className="text-[9px] text-primary font-mono shrink-0 pt-0.5">
                    {news.time}
                  </span>
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">
                    {news.headline}
                  </span>
                </button>
              ))
            ) : (
              <div className="col-span-full py-4 text-center text-xs text-muted-foreground">
                No recent news
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
