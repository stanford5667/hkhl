import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { SectorStat } from '@/hooks/useInvestmentHeatmap';

interface Props {
  sectors: SectorStat[];
  isLoading: boolean;
}

export function SectorPerformancePanel({ sectors, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 sm:p-4">
        <Skeleton className="h-6 w-40 mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full mb-2 rounded-lg" />
        ))}
      </div>
    );
  }

  const sorted = [...sectors].sort((a, b) => (b.daily ?? 0) - (a.daily ?? 0));

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        <h2 className="text-base sm:text-lg font-semibold text-foreground">Sector Rotation</h2>
      </div>

      <ScrollArea className="h-[280px] sm:h-[350px]">
        <div className="space-y-1.5">
          {sorted.map(s => {
            const FlowIcon = s.flow === 'inflow' ? ArrowUpRight : s.flow === 'outflow' ? ArrowDownRight : Minus;
            const flowColor = s.flow === 'inflow' ? 'text-emerald-400' : s.flow === 'outflow' ? 'text-rose-400' : 'text-muted-foreground';

            return (
              <div
                key={s.sector}
                className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-card/30 hover:bg-card/60 transition-colors"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <FlowIcon className={cn('h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0', flowColor)} />
                  <span className="text-xs sm:text-sm font-medium text-foreground truncate">{s.sector}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <div className="text-right min-w-[44px]">
                    {s.daily != null ? (
                      <span className={cn(
                        'text-[10px] sm:text-xs font-semibold',
                        s.daily > 0 ? 'text-emerald-400' : s.daily < 0 ? 'text-rose-400' : 'text-muted-foreground'
                      )}>
                        {s.daily > 0 ? '+' : ''}{s.daily.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-xs text-muted-foreground">—</span>
                    )}
                    <div className="text-[8px] sm:text-[9px] text-muted-foreground">1D</div>
                  </div>

                  <div className="text-right min-w-[44px] hidden sm:block">
                    {s.weekly != null ? (
                      <span className={cn(
                        'text-xs font-semibold',
                        s.weekly > 0 ? 'text-emerald-400' : s.weekly < 0 ? 'text-rose-400' : 'text-muted-foreground'
                      )}>
                        {s.weekly > 0 ? '+' : ''}{s.weekly.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    <div className="text-[9px] text-muted-foreground">1W</div>
                  </div>

                  <Badge variant="outline" className={cn('text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 h-3.5 sm:h-4', flowColor)}>
                    {s.flow === 'inflow' ? '↑' : s.flow === 'outflow' ? '↓' : '—'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/30 text-[9px] sm:text-[10px] text-muted-foreground text-center">
        Based on sector ETF performance • Updates every 5 min
      </div>
    </div>
  );
}
