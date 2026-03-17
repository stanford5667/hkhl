import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MarketTheme } from '@/data/marketThemes';
import type { ThemeCallout, CalloutSeverity } from '@/components/heatmap/ThemeCallouts';

export type TimeRange = '1M' | '3M' | '6M' | '1Y';
export type ThemeFilter = 'all' | 'macro' | 'news';

interface HeatmapState {
  // Selection
  selectedTheme: MarketTheme | null;
  hoveredCountry: string | null;
  searchQuery: string;
  timeRange: TimeRange;
  isPlaying: boolean;
  playbackMonth: number;
  themeFilter: ThemeFilter;
  
  // UI
  showCorrelationMatrix: boolean;
  expandedTicker: string | null;

  // Callouts
  callouts: ThemeCallout[];
  
  // Actions
  setSelectedTheme: (theme: MarketTheme | null) => void;
  toggleTheme: (theme: MarketTheme) => void;
  setHoveredCountry: (code: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTimeRange: (range: TimeRange) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackMonth: (month: number) => void;
  setThemeFilter: (filter: ThemeFilter) => void;
  setShowCorrelationMatrix: (show: boolean) => void;
  setExpandedTicker: (ticker: string | null) => void;
  addCallout: (callout: Omit<ThemeCallout, 'id' | 'createdAt'>) => void;
  dismissCallout: (id: string) => void;
  togglePinCallout: (id: string) => void;
  reset: () => void;
}

const initialState = {
  selectedTheme: null as MarketTheme | null,
  hoveredCountry: null as string | null,
  searchQuery: '',
  timeRange: '3M' as TimeRange,
  isPlaying: false,
  playbackMonth: 0,
  themeFilter: 'all' as ThemeFilter,
  showCorrelationMatrix: false,
  expandedTicker: null as string | null,
  callouts: [] as ThemeCallout[],
};

export const useHeatmapStore = create<HeatmapState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setSelectedTheme: (theme) => set({ selectedTheme: theme }),
      toggleTheme: (theme) => set((state) => ({
        selectedTheme: state.selectedTheme?.id === theme.id ? null : theme,
        expandedTicker: null,
      })),
      setHoveredCountry: (code) => set({ hoveredCountry: code }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setTimeRange: (range) => set({ timeRange: range, playbackMonth: 0, isPlaying: false }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setPlaybackMonth: (month) => set({ playbackMonth: month }),
      setThemeFilter: (filter) => set({ themeFilter: filter }),
      setShowCorrelationMatrix: (show) => set({ showCorrelationMatrix: show }),
      setExpandedTicker: (ticker) => set((state) => ({
        expandedTicker: state.expandedTicker === ticker ? null : ticker,
      })),
      addCallout: (callout) => set((state) => ({
        callouts: [
          ...state.callouts,
          { ...callout, id: crypto.randomUUID(), createdAt: Date.now() },
        ],
      })),
      dismissCallout: (id) => set((state) => ({
        callouts: state.callouts.filter(c => c.id !== id),
      })),
      togglePinCallout: (id) => set((state) => ({
        callouts: state.callouts.map(c =>
          c.id === id ? { ...c, pinned: !c.pinned } : c,
        ),
      })),
      reset: () => set(initialState),
    }),
    {
      name: 'heatmap-store',
      partialize: (state) => ({ callouts: state.callouts }),
    },
  ),
);
