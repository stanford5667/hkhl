import { useMemo, useCallback } from 'react';
import type { MarketTheme } from '@/data/marketThemes';
import { useHeatmapThemes, useRegionHeatData, useThemeTickers, useSectorPerformance } from '@/hooks/useInvestmentHeatmap';
import { useMicroThemes, useGenerateMicroThemes, microThemesToMarketThemes } from '@/hooks/useMicroThemes';
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
import { Search, GitCompareArrows, RefreshCw, Zap } from 'lucide-react';
import { useHeatmapStore } from '@/stores/heatmapStore';
import { useToast } from '@/hooks/use-toast';

function HeatmapContent() {
  const {
    selectedTheme, toggleTheme,
    searchQuery, setSearchQuery,
    showCorrelationMatrix, setShowCorrelationMatrix,
    themeFilter, setThemeFilter,
  } = useHeatmapStore();
  const { toast } = useToast();

  // Macro themes (existing)
  const { themes: macroThemes, isLoading: themesLoading } = useHeatmapThemes();
  
  // News-driven micro-themes (new)
  const { data: microThemesRaw, isLoading: microLoading } = useMicroThemes();
  const generateMutation = useGenerateMicroThemes();
  
  // Convert micro-themes to MarketTheme format and merge
  const microThemes = useMemo(() => 
    microThemesToMarketThemes(microThemesRaw || []),
    [microThemesRaw]
  );

  const allThemes = useMemo(() => {
    return [...microThemes, ...macroThemes];
  }, [microThemes, macroThemes]);

  const { data: regionData, isLoading: mapLoading } = useRegionHeatData(allThemes);
  const { data: themeTickers, isLoading: tickersLoading } = useThemeTickers(selectedTheme);
  const { data: sectorStats, isLoading: sectorsLoading } = useSectorPerformance();

  const filteredThemes = useMemo(() => {
    let themes = allThemes;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      themes = themes.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.tickers?.some(tk => tk.symbol.toLowerCase().includes(q))
      );
    }
    return themes;
  }, [allThemes, searchQuery]);

  const handleThemeSelect = useCallback((theme: MarketTheme) => {
    toggleTheme(theme);
  }, [toggleTheme]);

  const handleRefreshNews = useCallback(async () => {
    try {
      await generateMutation.mutateAsync();
      toast({
        title: 'News themes refreshed',
        description: `Generated ${generateMutation.data?.themes_generated || 0} live market themes`,
      });
    } catch (err) {
      toast({
        title: 'Failed to refresh',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [generateMutation, toast]);

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto pb-20 md:pb-6">
      <HeatmapHeader
        selectedTheme={selectedTheme}
        totalThemes={allThemes.length}
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshNews}
            disabled={generateMutation.isPending}
            className="gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            {generateMutation.isPending ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {generateMutation.isPending ? 'Scanning...' : 'Refresh Live News'}
          </Button>
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
      </div>

      {/* Time-lapse slider */}
      <TimeLapseSlider />

      {/* Map + Themes side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-1 order-1 lg:order-2">
          {themesLoading && microLoading ? (
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
              themeFilter={themeFilter}
              onFilterChange={setThemeFilter}
            />
          )}
        </div>

        <div className="lg:col-span-2 order-2 lg:order-1">
          {mapLoading || (themesLoading && microLoading) ? (
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
