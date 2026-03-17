import { create } from 'zustand';
import type { MarketTheme } from '@/data/marketThemes';
import type { RegionThemeData, ThemeTicker, SectorStat } from '@/hooks/useInvestmentHeatmap';

export type TimeRange = '1M' | '3M' | '6M' | '1Y';

interface HeatmapState {
  // Selection
  selectedTheme: MarketTheme | null;
  hoveredCountry: string | null;
  searchQuery: string;
  timeRange: TimeRange;
  isPlaying: boolean;
  playbackMonth: number; // 0 = current, negative = months ago
  
  // UI
  showCorrelationMatrix: boolean;
  expandedTicker: string | null;
  
  // Actions
  setSelectedTheme: (theme: MarketTheme | null) => void;
  toggleTheme: (theme: MarketTheme) => void;
  setHoveredCountry: (code: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTimeRange: (range: TimeRange) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackMonth: (month: number) => void;
  setShowCorrelationMatrix: (show: boolean) => void;
  setExpandedTicker: (ticker: string | null) => void;
  reset: () => void;
}

const initialState = {
  selectedTheme: null,
  hoveredCountry: null,
  searchQuery: '',
  timeRange: '3M' as TimeRange,
  isPlaying: false,
  playbackMonth: 0,
  showCorrelationMatrix: false,
  expandedTicker: null,
};

export const useHeatmapStore = create<HeatmapState>((set) => ({
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
  setShowCorrelationMatrix: (show) => set({ showCorrelationMatrix: show }),
  setExpandedTicker: (ticker) => set((state) => ({
    expandedTicker: state.expandedTicker === ticker ? null : ticker,
  })),
  reset: () => set(initialState),
}));
