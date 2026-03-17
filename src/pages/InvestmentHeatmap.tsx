import { useMemo, useCallback } from 'react';
import type { MarketTheme } from '@/data/marketThemes';
import { useHeatmapThemes, useRegionHeatData, useThemeTickers, useSectorPerformance } from '@/hooks/useInvestmentHeatmap';
import { D3WorldMap } from '@/components/heatmap/D3WorldMap';
import { ThemesPanel } from '@/components/heatmap/ThemesPanel';
import { ImpactedTickersTable } from '@/components/heatmap/ImpactedTickersTable';
import { SectorPerformancePanel } from '@/components/heatmap/SectorPerformancePanel';
import { HeatmapHeader } from '@/components/heatmap/HeatmapHeader';
import { TimeLapseSlider } from '@/components/heatmap/TimeLapseSlider';
import { CorrelationMatrix } from '@/components/heatmap/CorrelationMatrix';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, GitCompareArrows } from 'lucide-react';
import { useHeatmapStore } from '@/stores/heatmapStore';

function HeatmapContent() {
  const {
    selectedTheme, toggleTheme,
    searchQuery, setSearchQuery,
    showCorrelationMatrix, setShowCorrelationMatrix,
  } = useHeatmapStore();

  const { themes, isLoading: themesLoading } = useHeatmapThemes();
  const { data: regionData, isLoading: mapLoading } = useRegionHeatData(themes);
  const { data: themeTickers, isLoading: tickersLoading } = useThemeTickers(selectedTheme);
  const { data: sectorStats, isLoading: sectorsLoading } = useSectorPerformance();

  const filteredThemes = useMemo(() => {
    if (!searchQuery) return themes;
    const q = searchQuery.toLowerCase();
    return themes.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.tickers?.some(tk => tk.symbol.toLowerCase().includes(q))
    );
  }, [themes, searchQuery]);

  const handleThemeSelect = useCallback((theme: MarketTheme) => {
    toggleTheme(theme);
  }, [toggleTheme]);

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto pb-20 md:pb-6">
      <HeatmapHeader
        selectedTheme={selectedTheme}
        totalThemes={themes.length}
        totalRegions={regionData?.length || 0}
      />

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search themes, tickers, sectors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-card/50 border-border/50"
          />
        </div>
        <Button
          variant={showCorrelationMatrix ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowCorrelationMatrix(!showCorrelationMatrix)}
          className="gap-1.5 text-xs"
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          Correlation Matrix
        </Button>
      </div>

      {/* Time-lapse slider */}
      <TimeLapseSlider />

      {/* Map + Themes side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-1 order-1 lg:order-2">
          {themesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <ThemesPanel
              themes={filteredThemes}
              selectedTheme={selectedTheme}
              onSelectTheme={handleThemeSelect}
            />
          )}
        </div>

        <div className="lg:col-span-2 order-2 lg:order-1">
          {mapLoading || themesLoading ? (
            <Skeleton className="h-[250px] sm:h-[350px] lg:h-[500px] w-full rounded-xl" />
          ) : (
            <D3WorldMap regionData={regionData || []} />
          )}
        </div>
      </div>

      {/* Correlation Matrix */}
      {showCorrelationMatrix && (
        <CorrelationMatrix
          themes={filteredThemes}
          selectedTheme={selectedTheme}
        />
      )}

      {/* Bottom grid: Tickers + Sector Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2">
          <ImpactedTickersTable
            tickers={themeTickers || []}
            isLoading={tickersLoading}
            selectedTheme={selectedTheme}
          />
        </div>
        <div className="xl:col-span-1">
          <SectorPerformancePanel
            sectors={sectorStats || []}
            isLoading={sectorsLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default function InvestmentHeatmap() {
  return (
    <ErrorBoundary variant="default">
      <HeatmapContent />
    </ErrorBoundary>
  );
}
