import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MarketTheme } from '@/data/marketThemes';
import { useHeatmapThemes, useRegionHeatData, useThemeTickers, useSectorPerformance } from '@/hooks/useInvestmentHeatmap';
import { WorldMapVisualization } from '@/components/heatmap/WorldMapVisualization';
import { ThemesPanel } from '@/components/heatmap/ThemesPanel';
import { ImpactedTickersTable } from '@/components/heatmap/ImpactedTickersTable';
import { SectorPerformancePanel } from '@/components/heatmap/SectorPerformancePanel';
import { HeatmapHeader } from '@/components/heatmap/HeatmapHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';

export default function InvestmentHeatmap() {
  const [selectedTheme, setSelectedTheme] = useState<MarketTheme | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    setSelectedTheme(prev => prev?.id === theme.id ? null : theme);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <HeatmapHeader
        selectedTheme={selectedTheme}
        totalThemes={themes.length}
        totalRegions={regionData?.length || 0}
      />

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search themes, tickers, sectors..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 bg-card/50 border-border/50"
        />
      </div>

      {/* Main grid: Map + Themes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* World Map */}
        <div className="lg:col-span-2">
          {mapLoading || themesLoading ? (
            <Skeleton className="h-[450px] w-full rounded-xl" />
          ) : (
            <WorldMapVisualization
              regionData={regionData || []}
              selectedTheme={selectedTheme}
            />
          )}
        </div>

        {/* Themes Panel */}
        <div className="lg:col-span-1">
          {themesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
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
      </div>

      {/* Bottom grid: Tickers + Sector Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tickers Table */}
        <div className="xl:col-span-2">
          <ImpactedTickersTable
            tickers={themeTickers || []}
            isLoading={tickersLoading}
            selectedTheme={selectedTheme}
          />
        </div>

        {/* Sector Stats */}
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
