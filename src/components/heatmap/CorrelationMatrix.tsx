import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { MarketTheme } from '@/data/marketThemes';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { GitCompareArrows, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHeatmapStore } from '@/stores/heatmapStore';

interface Props {
  themes: MarketTheme[];
  selectedTheme: MarketTheme | null;
}

// Asset class correlation to themes (simulated from real-world relationships)
const ASSET_CLASSES = [
  'US Equities', 'Intl Equities', 'EM Equities', 'US Bonds',
  'Gold', 'Oil', 'USD', 'Crypto', 'Real Estate', 'Commodities'
];

// Deterministic pseudo-correlation based on theme category + asset class
function getCorrelation(category: string, asset: string): number {
  const correlations: Record<string, Record<string, number>> = {
    'Technology': { 'US Equities': 0.85, 'Intl Equities': 0.55, 'EM Equities': 0.45, 'US Bonds': -0.35, 'Gold': -0.2, 'Oil': 0.1, 'USD': 0.3, 'Crypto': 0.6, 'Real Estate': 0.2, 'Commodities': -0.1 },
    'Healthcare': { 'US Equities': 0.6, 'Intl Equities': 0.4, 'EM Equities': 0.2, 'US Bonds': 0.1, 'Gold': 0.05, 'Oil': -0.1, 'USD': 0.15, 'Crypto': 0.1, 'Real Estate': 0.15, 'Commodities': -0.05 },
    'Energy': { 'US Equities': 0.4, 'Intl Equities': 0.35, 'EM Equities': 0.5, 'US Bonds': -0.25, 'Gold': 0.3, 'Oil': 0.9, 'USD': -0.4, 'Crypto': 0.05, 'Real Estate': 0.1, 'Commodities': 0.8 },
    'Commodities': { 'US Equities': 0.3, 'Intl Equities': 0.4, 'EM Equities': 0.6, 'US Bonds': -0.3, 'Gold': 0.7, 'Oil': 0.75, 'USD': -0.5, 'Crypto': 0.15, 'Real Estate': 0.2, 'Commodities': 0.95 },
    'Macro': { 'US Equities': 0.5, 'Intl Equities': 0.45, 'EM Equities': 0.35, 'US Bonds': 0.6, 'Gold': 0.4, 'Oil': 0.2, 'USD': 0.5, 'Crypto': 0.2, 'Real Estate': 0.35, 'Commodities': 0.25 },
    'Geopolitics': { 'US Equities': -0.3, 'Intl Equities': -0.45, 'EM Equities': -0.55, 'US Bonds': 0.5, 'Gold': 0.7, 'Oil': 0.5, 'USD': 0.4, 'Crypto': -0.15, 'Real Estate': -0.2, 'Commodities': 0.35 },
    'Industrials': { 'US Equities': 0.7, 'Intl Equities': 0.5, 'EM Equities': 0.55, 'US Bonds': -0.15, 'Gold': -0.1, 'Oil': 0.3, 'USD': 0.1, 'Crypto': 0.05, 'Real Estate': 0.4, 'Commodities': 0.5 },
    'Finance': { 'US Equities': 0.75, 'Intl Equities': 0.6, 'EM Equities': 0.4, 'US Bonds': -0.45, 'Gold': -0.15, 'Oil': 0.15, 'USD': 0.35, 'Crypto': 0.3, 'Real Estate': 0.5, 'Commodities': 0.1 },
  };

  const cat = correlations[category] || correlations['Technology'];
  return cat[asset] ?? 0;
}

function getCorrelationColor(val: number): string {
  if (val > 0.6) return 'bg-emerald-500/80 text-white';
  if (val > 0.3) return 'bg-emerald-500/40 text-emerald-100';
  if (val > 0.1) return 'bg-emerald-500/20 text-foreground';
  if (val > -0.1) return 'bg-muted/30 text-muted-foreground';
  if (val > -0.3) return 'bg-rose-500/20 text-foreground';
  if (val > -0.6) return 'bg-rose-500/40 text-rose-100';
  return 'bg-rose-500/80 text-white';
}

export function CorrelationMatrix({ themes, selectedTheme }: Props) {
  const { setShowCorrelationMatrix } = useHeatmapStore();
  
  const displayThemes = useMemo(() => {
    if (selectedTheme) return [selectedTheme];
    return themes.slice(0, 8);
  }, [themes, selectedTheme]);

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 sm:p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            {selectedTheme ? `${selectedTheme.title} — Asset Correlation` : 'Theme–Asset Correlation Matrix'}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowCorrelationMatrix(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="min-w-[600px]">
          {/* Header row */}
          <div className="grid gap-1" style={{ gridTemplateColumns: `160px repeat(${ASSET_CLASSES.length}, 1fr)` }}>
            <div className="text-[10px] text-muted-foreground font-medium p-1">Theme / Asset</div>
            {ASSET_CLASSES.map(asset => (
              <div key={asset} className="text-[9px] sm:text-[10px] text-muted-foreground font-medium p-1 text-center truncate">
                {asset}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {displayThemes.map(theme => (
            <div
              key={theme.id}
              className="grid gap-1 hover:bg-muted/10 rounded"
              style={{ gridTemplateColumns: `160px repeat(${ASSET_CLASSES.length}, 1fr)` }}
            >
              <div className="text-xs font-medium text-foreground p-1 truncate flex items-center gap-1">
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">{theme.category}</Badge>
                <span className="truncate">{theme.title}</span>
              </div>
              {ASSET_CLASSES.map(asset => {
                const corr = getCorrelation(theme.category, asset);
                return (
                  <div
                    key={asset}
                    className={cn(
                      'text-[10px] sm:text-xs font-mono font-medium p-1 rounded text-center transition-colors',
                      getCorrelationColor(corr)
                    )}
                    title={`${theme.title} vs ${asset}: ${corr.toFixed(2)}`}
                  >
                    {corr.toFixed(2)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="mt-3 flex items-center gap-4 text-[9px] sm:text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-6 rounded bg-emerald-500/80" /> Strong Positive
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-6 rounded bg-muted/30" /> Neutral
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-6 rounded bg-rose-500/80" /> Strong Negative
        </div>
      </div>
    </div>
  );
}
