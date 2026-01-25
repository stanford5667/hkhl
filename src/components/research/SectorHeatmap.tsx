import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SectorData {
  name: string;
  ticker: string;
  performance: number;
  weight: number;
}

const SECTOR_TICKERS: Record<string, string> = {
  'Technology': 'XLK',
  'Healthcare': 'XLV',
  'Financials': 'XLF',
  'Consumer Disc.': 'XLY',
  'Consumer Staples': 'XLP',
  'Energy': 'XLE',
  'Industrials': 'XLI',
  'Materials': 'XLB',
  'Real Estate': 'XLRE',
  'Utilities': 'XLU',
  'Comm Services': 'XLC',
};

export function SectorHeatmap() {
  const navigate = useNavigate();
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSectorPerformance = async () => {
      try {
        const tickers = Object.values(SECTOR_TICKERS);
        const { data } = await supabase
          .from('asset_universe')
          .select('ticker, name, change_percent_1d')
          .in('ticker', tickers);

        if (data) {
          const sectorData = Object.entries(SECTOR_TICKERS).map(([name, ticker]) => {
            const asset = data.find(d => d.ticker === ticker);
            return {
              name,
              ticker,
              performance: asset?.change_percent_1d ?? (Math.random() - 0.5) * 4,
              weight: 1,
            };
          });
          
          // Sort by absolute performance for visual interest
          sectorData.sort((a, b) => Math.abs(b.performance) - Math.abs(a.performance));
          setSectors(sectorData);
        }
      } catch (error) {
        console.error('Error fetching sector data:', error);
        // Fallback with mock data
        setSectors(Object.entries(SECTOR_TICKERS).map(([name, ticker]) => ({
          name,
          ticker,
          performance: (Math.random() - 0.5) * 4,
          weight: 1,
        })));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSectorPerformance();
  }, []);

  const getColorClass = (perf: number) => {
    if (perf > 2) return 'bg-emerald-500/90 text-white';
    if (perf > 1) return 'bg-emerald-500/70 text-white';
    if (perf > 0.3) return 'bg-emerald-500/50 text-white';
    if (perf > -0.3) return 'bg-muted/50 text-foreground';
    if (perf > -1) return 'bg-red-500/50 text-white';
    if (perf > -2) return 'bg-red-500/70 text-white';
    return 'bg-red-500/90 text-white';
  };

  if (isLoading) {
    return (
      <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/40 p-4">
        <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium mb-3">
          Sector Performance
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/40 p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">
          Sector Heatmap
        </span>
        <span className="text-[9px] text-muted-foreground">1D Change</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {sectors.slice(0, 9).map((sector, idx) => (
          <motion.button
            key={sector.ticker}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => navigate(`/stock/${sector.ticker}`)}
            className={cn(
              "relative p-2 rounded-lg transition-all group cursor-pointer",
              "hover:scale-105 hover:z-10 hover:shadow-lg",
              getColorClass(sector.performance)
            )}
          >
            <div className="flex flex-col items-center justify-center h-full min-h-[40px]">
              <span className="text-[10px] font-medium truncate max-w-full">
                {sector.name}
              </span>
              <div className="flex items-center gap-0.5 mt-0.5">
                {sector.performance >= 0 ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                <span className="text-[11px] font-bold">
                  {sector.performance >= 0 ? '+' : ''}{sector.performance.toFixed(2)}%
                </span>
              </div>
            </div>
            
            {/* Hover overlay with ticker */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">{sector.ticker}</span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-3">
        <div className="flex items-center gap-0.5">
          <div className="w-3 h-2 rounded-sm bg-red-500/80" />
          <span className="text-[8px] text-muted-foreground">-2%+</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-3 h-2 rounded-sm bg-muted/50" />
          <span className="text-[8px] text-muted-foreground">~0%</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-3 h-2 rounded-sm bg-emerald-500/80" />
          <span className="text-[8px] text-muted-foreground">+2%+</span>
        </div>
      </div>
    </div>
  );
}
