import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useEconomicDataWithRefresh,
  calculateMarketHealthScore,
} from '@/hooks/useEconomicData';
import { useMemo } from 'react';

export function LiveEconomicDataHeader() {
  const { data, isLoading, useMockData } = useEconomicDataWithRefresh();

  const healthScore = useMemo(() => {
    return calculateMarketHealthScore(data?.indicators || []);
  }, [data?.indicators]);

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-card to-primary/10 border-primary/20">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 sm:gap-3">
            <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <div>
              <h2 className="text-sm sm:text-lg font-semibold">Live Economic Data</h2>
              <p className="text-[10px] sm:text-xs">
                {useMockData ? (
                  <span className="text-amber-400">Using demo data</span>
                ) : (
                  <span className="text-emerald-400">Live from FRED</span>
                )}
              </p>
            </div>
          </div>
          {/* Inline Market Health */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Market Health</p>
              <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
                {isLoading ? (
                  <span className="text-2xl sm:text-4xl font-bold tabular-nums text-muted-foreground">--</span>
                ) : (
                  <>
                    <span className={cn(
                      "text-2xl sm:text-4xl font-bold tabular-nums",
                      healthScore.score >= 60 ? "text-emerald-400" :
                      healthScore.score <= 40 ? "text-rose-400" : "text-amber-400"
                    )}>
                      {healthScore.score}
                    </span>
                    <Badge variant="outline" className={cn(
                      "text-[10px] sm:text-xs px-1.5 sm:px-2",
                      healthScore.score >= 60 ? "border-emerald-500/30 text-emerald-400" :
                      healthScore.score <= 40 ? "border-rose-500/30 text-rose-400" : 
                      "border-amber-500/30 text-amber-400"
                    )}>
                      {healthScore.label}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
