import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  PieChart,
  Eye,
  Newspaper,
  Activity,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  icon: LucideIcon;
  size: WidgetSize;
  enabled: boolean;
  order: number;
}

const STORAGE_KEY = 'dashboard-widgets-config';

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'portfolio-value', type: 'portfolio-value', title: 'Portfolio Value', icon: Wallet, size: 'medium', enabled: true, order: 0 },
  { id: 'portfolio-performance', type: 'portfolio-performance', title: 'Performance Chart', icon: TrendingUp, size: 'large', enabled: true, order: 1 },
  { id: 'asset-allocation', type: 'asset-allocation', title: 'Asset Allocation', icon: PieChart, size: 'medium', enabled: true, order: 2 },
  { id: 'watchlist', type: 'watchlist', title: 'Watchlist', icon: Eye, size: 'medium', enabled: true, order: 3 },
  { id: 'news', type: 'news', title: 'Market News', icon: Newspaper, size: 'medium', enabled: true, order: 4 },
  { id: 'health-indicators', type: 'health-indicators', title: 'Health Indicators', icon: Activity, size: 'medium', enabled: true, order: 5 },
  { id: 'market-movers', type: 'market-movers', title: 'Market Movers', icon: BarChart3, size: 'small', enabled: false, order: 6 },
  { id: 'ai-insights', type: 'ai-insights', title: 'AI Insights', icon: Sparkles, size: 'medium', enabled: false, order: 7 },
];

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDGETS;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DashboardWidget[];
        // Merge with defaults to handle new widgets
        return DEFAULT_WIDGETS.map(defaultWidget => {
          const storedWidget = parsed.find(w => w.id === defaultWidget.id);
          if (storedWidget) {
            return {
              ...defaultWidget,
              enabled: storedWidget.enabled,
              order: storedWidget.order,
              size: storedWidget.size,
            };
          }
          return defaultWidget;
        }).sort((a, b) => a.order - b.order);
      }
    } catch (error) {
      console.error('Failed to parse dashboard widgets config:', error);
    }
    return DEFAULT_WIDGETS;
  });

  // Save to localStorage whenever widgets change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch (error) {
      console.error('Failed to save dashboard widgets config:', error);
    }
  }, [widgets]);

  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);

  const toggleWidget = useCallback((widgetId: string) => {
    setWidgets(prev => 
      prev.map(w => 
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      )
    );
  }, []);

  const updateWidgetSize = useCallback((widgetId: string, size: WidgetSize) => {
    setWidgets(prev =>
      prev.map(w =>
        w.id === widgetId ? { ...w, size } : w
      )
    );
  }, []);

  const reorderWidgets = useCallback((startIndex: number, endIndex: number) => {
    setWidgets(prev => {
      const result = [...prev];
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result.map((w, i) => ({ ...w, order: i }));
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    widgets,
    enabledWidgets,
    toggleWidget,
    updateWidgetSize,
    reorderWidgets,
    resetToDefaults,
  };
}
