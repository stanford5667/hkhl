import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, BarChart3, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface MarketStat {
  label: string;
  value: string;
  change?: number;
  icon: typeof Activity;
  tooltip: string;
}

export function LiveMarketStatsBar() {
  const [stats, setStats] = useState<MarketStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarketStats = async () => {
      try {
        // Fetch VIX proxy (UVXY or VXX)
        const { data: vixData } = await supabase
          .from('asset_universe')
          .select('ticker, last_close, change_percent_1d')
          .eq('ticker', 'VXX')
          .maybeSingle();

        // Fetch advance/decline approximation from universe
        const { data: adData } = await supabase
          .from('asset_universe')
          .select('change_percent_1d')
          .eq('is_active', true)
          .not('change_percent_1d', 'is', null)
          .limit(500);

        const advancers = adData?.filter(d => (d.change_percent_1d ?? 0) > 0).length ?? 0;
        const decliners = adData?.filter(d => (d.change_percent_1d ?? 0) < 0).length ?? 0;
        const total = adData?.length ?? 1;
        const breadthPercent = ((advancers / total) * 100);

        // Calculate market breadth
        const adRatio = decliners > 0 ? (advancers / decliners).toFixed(2) : 'N/A';

        setStats([
          {
            label: 'VIX',
            value: vixData?.last_close?.toFixed(1) ?? '18.5',
            change: vixData?.change_percent_1d ?? 0,
            icon: AlertTriangle,
            tooltip: 'Volatility Index - Fear gauge',
          },
          {
            label: 'A/D Ratio',
            value: adRatio,
            change: advancers > decliners ? 1 : -1,
            icon: BarChart3,
            tooltip: `${advancers} advancing / ${decliners} declining`,
          },
          {
            label: 'Breadth',
            value: `${breadthPercent.toFixed(0)}%`,
            change: breadthPercent > 50 ? 1 : -1,
            icon: Activity,
            tooltip: `% of stocks advancing`,
          },
          {
            label: 'Advancers',
            value: advancers.toString(),
            change: 1,
            icon: TrendingUp,
            tooltip: 'Stocks gaining today',
          },
          {
            label: 'Decliners',
            value: decliners.toString(),
            change: -1,
            icon: TrendingDown,
            tooltip: 'Stocks falling today',
          },
        ]);
      } catch (error) {
        console.error('Error fetching market stats:', error);
        // Fallback mock data
        setStats([
          { label: 'VIX', value: '18.5', change: -2.3, icon: AlertTriangle, tooltip: 'Volatility Index' },
          { label: 'A/D Ratio', value: '1.45', change: 1, icon: BarChart3, tooltip: 'Advance/Decline Ratio' },
          { label: 'Breadth', value: '58%', change: 1, icon: Activity, tooltip: '% stocks advancing' },
          { label: 'Advancers', value: '285', change: 1, icon: TrendingUp, tooltip: 'Stocks gaining' },
          { label: 'Decliners', value: '196', change: -1, icon: TrendingDown, tooltip: 'Stocks falling' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketStats();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMarketStats, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 px-4 py-2 bg-card/60 backdrop-blur-sm rounded-xl border border-border/40 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 sm:gap-4 px-3 py-2 bg-card/60 backdrop-blur-sm rounded-xl border border-border/40 overflow-x-auto scrollbar-hide"
    >
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium shrink-0">
        Market Stats
      </span>
      <div className="h-4 w-px bg-border/40 shrink-0" />
      
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="flex items-center gap-1.5 shrink-0 group cursor-help"
          title={stat.tooltip}
        >
          <stat.icon className={cn(
            "h-3 w-3",
            (stat.change ?? 0) > 0 ? "text-emerald-500" : (stat.change ?? 0) < 0 ? "text-red-500" : "text-muted-foreground"
          )} />
          <div className="flex flex-col leading-none">
            <span className="text-[9px] text-muted-foreground">{stat.label}</span>
            <span className={cn(
              "text-xs font-bold font-mono",
              stat.label === 'VIX' 
                ? ((stat.change ?? 0) > 0 ? "text-red-500" : "text-emerald-500") // VIX is inverse
                : ((stat.change ?? 0) > 0 ? "text-emerald-500" : (stat.change ?? 0) < 0 ? "text-red-500" : "text-foreground")
            )}>
              {stat.value}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
