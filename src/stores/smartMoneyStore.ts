import { create } from 'zustand';

export type SmartMoneyTab = 
  | 'dashboard' 
  | 'insiders' 
  | 'options-flow' 
  | 'block-trades' 
  | 'institutional' 
  | 'ai-chat' 
  | 'leaderboards' 
  | 'alerts' 
  | 'settings';

interface SmartMoneyFilters {
  ticker?: string;
  dateRange?: { from: string; to: string };
  transactionType?: string[];
  minValue?: number;
  sector?: string;
}

interface SmartMoneyState {
  activeTab: SmartMoneyTab;
  setActiveTab: (tab: SmartMoneyTab) => void;
  filters: SmartMoneyFilters;
  setFilters: (filters: Partial<SmartMoneyFilters>) => void;
  resetFilters: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const defaultFilters: SmartMoneyFilters = {};

export const useSmartMoneyStore = create<SmartMoneyState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  filters: defaultFilters,
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
