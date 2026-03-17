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
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" />
            Investment Themes Heat Map
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top-down global theme analysis • Real-time data
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1 text-xs">
            <Layers className="h-3 w-3" />
            {totalThemes} Themes
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Globe className="h-3 w-3" />
            {totalRegions} Regions
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Clock className="h-3 w-3" />
            Live
          </Badge>
        </div>
      </div>

      {selectedTheme && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex items-center gap-3">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">
            Filtering by: <span className="font-semibold text-primary">{selectedTheme.title}</span>
          </span>
          <Badge className="text-xs" variant={selectedTheme.sentimentScore > 0.6 ? 'default' : 'secondary'}>
            {selectedTheme.sentimentScore > 0.6 ? 'Bullish' : selectedTheme.sentimentScore < 0.4 ? 'Bearish' : 'Neutral'}
          </Badge>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          Bullish / Opportunity
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-rose-500" />
          Bearish / Risk
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          Neutral / Monitoring
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-sky-500" />
          Emerging Theme
        </div>
      </div>
    </div>
  );
}
