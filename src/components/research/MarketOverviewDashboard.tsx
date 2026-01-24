import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketIndicesQuery } from '@/hooks/useMarketDataQuery';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import { MiniSparkline } from './MiniSparkline';
import { getCandlesForRange } from '@/services/candleService';

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
  { name: 'Nasdaq', symbol: 'QQQ', displaySymbol: 'NDX', value: 0, change: 0, changePercent: 0, color: 'bg-green-500' },
];

const COMMODITIES: IndexItem[] = [
  { name: 'Crude Oil', symbol: 'USO', displaySymbol: 'CL', value: 0, change: 0, changePercent: 0, color: 'bg-amber-600' },
  { name: 'Gold', symbol: 'GLD', displaySymbol: 'GC', value: 0, change: 0, changePercent: 0, color: 'bg-yellow-500' },
];

const CRYPTO: IndexItem[] = [
  { name: 'Bitcoin', symbol: 'BTC-USD', displaySymbol: 'BTC', value: 0, change: 0, changePercent: 0, color: 'bg-orange-400' },
];

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y'];

const MOCK_NEWS = [
  { time: '43m', headline: 'U.S. airlines cancel more than 12,000 flights amid wi...' },
  { time: '1h', headline: 'EV maker BYD aims for 1.3M overseas car sales in 2026' },
  { time: '2h', headline: 'Trending stocks as Wall Street ends week lower amid...' },
  { time: '2h', headline: 'Real estate stocks decline amid geopolitical develop...' },
  { time: '3h', headline: 'Energy markets heat up amid frigid temperatures' },
  { time: '3h', headline: 'Insider Trades: GameStop, Goldman Sachs and Morg...' },
];

function useSparklineData(symbol: string, timeRange: TimeRange) {
  const [data, setData] = useState<number[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const candles = await getCandlesForRange(symbol, timeRange);
        if (candles && candles.length > 0) {
          setData(candles.map(c => c.close));
        }
      } catch (err) {
        console.error('Error fetching sparkline data:', err);
      }
    };
    
    fetchData();
  }, [symbol, timeRange]);
  
  return data;
}

export function MarketOverviewDashboard() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('US');
  const [selectedIndex, setSelectedIndex] = useState<string>('DIA');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1D');
  
  const { indices, isLoading } = useMarketIndicesQuery();
  const sparklineData = useSparklineData(selectedIndex, selectedTimeRange);

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
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Category Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30">
        {(['US', 'Commodities', 'Crypto'] as MarketCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              if (cat === 'US') setSelectedIndex('DIA');
              else if (cat === 'Commodities') setSelectedIndex('USO');
              else setSelectedIndex('BTC-USD');
            }}
            className={cn(
              'text-xs font-medium px-2 py-1 rounded transition-colors',
              selectedCategory === cat 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {cat}
          </button>
        ))}
        
        {/* Time Range Selector */}
        <div className="ml-auto flex items-center bg-muted rounded-md">
          {TIME_RANGES.map(range => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={cn(
                'text-[10px] font-medium px-2 py-1 rounded transition-colors',
                selectedTimeRange === range 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Left Panel - Index List */}
        <div className="lg:w-[280px] border-b lg:border-b-0 lg:border-r border-border">
          {currentIndices.map(item => (
            <button
              key={item.symbol}
              onClick={() => setSelectedIndex(item.symbol)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors border-l-2',
                selectedIndex === item.symbol 
                  ? 'bg-muted/50 border-l-primary' 
                  : 'border-l-transparent hover:bg-muted/30'
              )}
            >
              <div 
                className={cn('w-1 h-8 rounded-sm', item.color)}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">
                  {item.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-foreground tabular-nums">
                  {formatValue(item.value)}
                </div>
                <div className={cn(
                  'text-[10px] font-medium tabular-nums',
                  item.change >= 0 ? 'text-emerald-500' : 'text-destructive'
                )}>
                  {formatChange(item.change)}
                </div>
              </div>
              <div className={cn(
                'text-[10px] font-semibold tabular-nums w-14 text-right',
                item.changePercent >= 0 ? 'text-emerald-500' : 'text-destructive'
              )}>
                {formatPercent(item.changePercent)}
              </div>
            </button>
          ))}
        </div>

        {/* Center Panel - Chart */}
        <div className="flex-1 p-3 min-w-[200px] flex items-center justify-center">
          <div className="h-[120px] w-full max-w-[300px]">
            {sparklineData.length > 0 && selectedIndexData && (
              <MiniSparkline 
                data={sparklineData}
                height={120} 
                width={300}
                isPositive={selectedIndexData.changePercent >= 0}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Latest News */}
        <div className="lg:w-[320px] border-t lg:border-t-0 lg:border-l border-border">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
            <span className="text-xs font-semibold text-foreground">Latest News</span>
            <button className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
              See All News <ExternalLink className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {MOCK_NEWS.map((news, idx) => (
              <button
                key={idx}
                className="w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-muted/30 transition-colors"
              >
                <span className="text-[10px] text-muted-foreground w-6 shrink-0 pt-0.5">
                  {news.time}
                </span>
                <span className="text-[11px] text-foreground line-clamp-1 hover:text-primary transition-colors">
                  {news.headline}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Ticker Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border bg-muted/30 overflow-hidden">
        <span className="shrink-0 text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
          In Focus
        </span>
        <span className="shrink-0 text-[10px] font-semibold text-foreground">NEWS</span>
        <div className="text-[10px] text-muted-foreground truncate">
          Catalyst Watch: FOMC meeting, fintech IPOs • SA News Quiz
        </div>
        <span className="shrink-0 mx-2 text-muted-foreground">|</span>
        <span className="shrink-0 text-[10px] font-semibold text-foreground">ANALYSIS</span>
        <div className="text-[10px] text-muted-foreground truncate">
          Oil May Be Heading For A Breakout • AAPL Bear Case • AAPL Bull Case
        </div>
      </div>
    </div>
  );
}
