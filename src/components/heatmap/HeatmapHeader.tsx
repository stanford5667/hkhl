import { Globe, Layers, Activity, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MarketTheme } from '@/data/marketThemes';

interface Props {
  selectedTheme: MarketTheme | null;
  totalThemes: number;
  totalRegions: number;
}

export function HeatmapHeader({ selectedTheme, totalThemes, totalRegions }: Props) {
  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Globe className="h-5 w-5 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
            Investment Themes Heat Map
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Top-down global theme analysis • Real-time data
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs">
            <Layers className="h-3 w-3" />
            {totalThemes} Themes
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs">
            <Globe className="h-3 w-3" />
            {totalRegions} Regions
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs">
            <Clock className="h-3 w-3" />
            Live
          </Badge>
        </div>
      </div>

      {selectedTheme && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 flex-wrap">
          <Activity className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-xs sm:text-sm text-foreground">
            Filtering: <span className="font-semibold text-primary">{selectedTheme.title}</span>
          </span>
          <Badge className="text-[10px] sm:text-xs" variant={selectedTheme.sentimentScore > 0.6 ? 'default' : 'secondary'}>
            {selectedTheme.sentimentScore > 0.6 ? 'Bullish' : selectedTheme.sentimentScore < 0.4 ? 'Bearish' : 'Neutral'}
          </Badge>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500" />
          Bullish
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-500" />
          Bearish
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-500" />
          Neutral
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-sky-500" />
          Emerging
        </div>
      </div>
    </div>
  );
}
