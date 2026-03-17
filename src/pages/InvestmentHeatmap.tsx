import { useMemo, useCallback, useState } from 'react';
import type { MarketTheme } from '@/data/marketThemes';
import { useHeatmapThemes, useRegionHeatData, useThemeTickers, useSectorPerformance } from '@/hooks/useInvestmentHeatmap';
import { useMicroThemes, useGenerateMicroThemes, microThemesToMarketThemes } from '@/hooks/useMicroThemes';
import { D3WorldMap } from '@/components/heatmap/D3WorldMap';
import { ThemeCard } from '@/components/heatmap/ThemeCard';
import { ThemeDetailSheet } from '@/components/heatmap/ThemeDetailSheet';
import { CountryDetailSheet } from '@/components/heatmap/CountryDetailSheet';
import { SectorPerformancePanel } from '@/components/heatmap/SectorPerformancePanel';
import { ThemeCallouts } from '@/components/heatmap/ThemeCallouts';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Zap, Globe, Layers, Activity, Filter } from 'lucide-react';
import { useHeatmapStore } from '@/stores/heatmapStore';
import { useToast } from '@/hooks/use-toast';
import type { ThemeFilter } from '@/stores/heatmapStore';
import type { RegionThemeData } from '@/hooks/useInvestmentHeatmap';
import { cn } from '@/lib/utils';

function HeatmapContent() {
  const {
    selectedTheme, toggleTheme,
    searchQuery, setSearchQuery,
    themeFilter, setThemeFilter,
    callouts, addCallout, dismissCallout, togglePinCallout,
  } = useHeatmapStore();
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<RegionThemeData | null>(null);

  const { themes: macroThemes, isLoading: themesLoading } = useHeatmapThemes();
  const { data: microThemesRaw, isLoading: microLoading } = useMicroThemes();
  const generateMutation = useGenerateMicroThemes();

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

  // Build a region lookup for country click
  const regionMap = useMemo(() => {
    const map = new Map<string, RegionThemeData>();
    if (regionData) {
      for (const r of regionData) map.set(r.countryCode, r);
    }
    return map;
  }, [regionData]);

  const filteredThemes = useMemo(() => {
    let themes = allThemes;
    if (themeFilter === 'macro') themes = themes.filter(t => !(t as any)._micro);
    if (themeFilter === 'news') themes = themes.filter(t => (t as any)._micro);
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
  }, [allThemes, searchQuery, themeFilter]);

  const uniqueFilteredThemes = useMemo(() => {
    const seen = new Set<string>();
    return filteredThemes.filter((theme) => {
      const key = `${theme.id}::${theme.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filteredThemes]);

  const selectedCountryThemes = useMemo(() => {
    if (!selectedCountry || selectedCountry.activeThemes.length === 0) return [] as MarketTheme[];
    const titles = new Set(selectedCountry.activeThemes);
    const seen = new Set<string>();
    return allThemes.filter(theme => {
      if (!titles.has(theme.title)) return false;
      const key = `${theme.id}::${theme.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [selectedCountry, allThemes]);

  const handleThemeSelect = useCallback((theme: MarketTheme) => {
    toggleTheme(theme);
    setSheetOpen(true);
  }, [toggleTheme]);

  const handleCountryClick = useCallback((countryCode: string) => {
    const region = regionMap.get(countryCode);
    // Build a minimal region object even if no themes
    const countryData: RegionThemeData = region || {
      countryCode,
      countryName: countryCode,
      sentiment: 'neutral',
      activeThemes: [],
      themeIntensity: 0,
      keyStats: [],
    };
    setSelectedCountry(countryData);
    setCountrySheetOpen(true);
  }, [regionMap]);

  const handleRefreshNews = useCallback(async () => {
    try {
      await generateMutation.mutateAsync();
      toast({
        title: 'News themes refreshed',
        description: `Generated new live market themes from recent news`,
      });
    } catch (err) {
      toast({
        title: 'Failed to refresh',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [generateMutation, toast]);

  const handleCountryThemeSelect = useCallback((theme: MarketTheme) => {
    setCountrySheetOpen(false);
    toggleTheme(theme);
    setSheetOpen(true);
  }, [toggleTheme]);

  const liveCount = allThemes.filter(t => (t as any)._micro).length;
  const isLoading = themesLoading && microLoading;

  return (
    <div className="min-h-screen pb-20 md:pb-6">
      {/* ═══ Hero Section ═══ */}
      <div className="relative">
        {/* Header overlay on map */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                Global Investment Themes
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                Real-time macro and news-driven themes shaping global markets. Click any country to explore its regional dashboard.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1.5 text-xs bg-background/60 backdrop-blur-sm border-border/50">
                <Layers className="h-3 w-3" />
                {allThemes.length} Themes
              </Badge>
              <Badge variant="outline" className="gap-1.5 text-xs bg-background/60 backdrop-blur-sm border-border/50">
                <Globe className="h-3 w-3" />
                {regionData?.length || 0} Regions
              </Badge>
              {liveCount > 0 && (
                <Badge className="gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20">
                  <Activity className="h-3 w-3" />
                  {liveCount} Live
                </Badge>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            {[
              { label: 'Bullish', color: 'bg-emerald-500' },
              { label: 'Bearish', color: 'bg-rose-500' },
              { label: 'Neutral', color: 'bg-amber-500' },
              { label: 'Emerging', color: 'bg-primary' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={cn('h-2 w-2 rounded-full', l.color)} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="pt-28 sm:pt-32">
          {mapLoading || isLoading ? (
            <Skeleton className="h-[300px] sm:h-[400px] lg:h-[520px] w-full" />
          ) : (
            <D3WorldMap
              regionData={regionData || []}
              onCountryClick={handleCountryClick}
            />
          )}
        </div>
      </div>

      {/* ═══ Theme Explorer ═══ */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto mt-6 space-y-5">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Active Themes</h2>
            <Badge variant="secondary" className="text-xs">{uniqueFilteredThemes.length}</Badge>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search themes, tickers, sectors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-card border-border/50 text-sm"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'news', 'macro'] as ThemeFilter[]).map((f) => (
                <Button
                  key={f}
                  variant={themeFilter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setThemeFilter(f)}
                  className={cn(
                    'text-xs h-8 gap-1',
                    themeFilter === f ? '' : 'border-border/50'
                  )}
                >
                  {f === 'news' && <Zap className="h-3 w-3" />}
                  {f === 'macro' && <Globe className="h-3 w-3" />}
                  {f === 'all' && <Filter className="h-3 w-3" />}
                  {f === 'all' ? 'All' : f === 'news' ? 'Live News' : 'Macro'}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshNews}
                disabled={generateMutation.isPending}
                className="text-xs h-8 gap-1.5 border-border/50"
              >
                {generateMutation.isPending ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Theme Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueFilteredThemes.map((theme, index) => (
              <ThemeCard
                key={`${theme.id}-${index}`}
                theme={theme}
                isSelected={selectedTheme?.id === theme.id}
                onClick={() => handleThemeSelect(theme)}
              />
            ))}
            {uniqueFilteredThemes.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                <Globe className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No themes match your search.</p>
              </div>
            )}
          </div>
        )}

        {/* Sector Rotation */}
        <SectorPerformancePanel
          sectors={sectorStats || []}
          isLoading={sectorsLoading}
        />
      </div>

      {/* ═══ Deep-Dive Sheet ═══ */}
      <ThemeDetailSheet
        theme={selectedTheme}
        tickers={themeTickers || []}
        tickersLoading={tickersLoading}
        open={sheetOpen && !!selectedTheme}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) toggleTheme(selectedTheme!);
        }}
      />

      {/* ═══ Country Dashboard Sheet ═══ */}
      <CountryDetailSheet
        country={selectedCountry}
        themes={selectedCountryThemes}
        open={countrySheetOpen}
        onOpenChange={setCountrySheetOpen}
        onThemeSelect={handleCountryThemeSelect}
      />
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
