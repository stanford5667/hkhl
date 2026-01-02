import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface DevModeState {
  marketDataEnabled: boolean;
  lastToggled: number | null;
  apiCallCount: number;
}

interface DevModeContextType extends DevModeState {
  toggleMarketData: () => void;
  setMarketDataEnabled: (enabled: boolean) => void;
  incrementApiCallCount: () => void;
  resetApiCallCount: () => void;
  logApiCall: (endpoint: string, params?: unknown) => void;
  isDevEnvironment: boolean;
}

const STORAGE_KEY = 'dev-mode-settings';

const getDefaultEnabled = (): boolean => {
  // In development (localhost), default to PAUSED
  // In production, default to ENABLED
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
    return !isDev; // Paused in dev, enabled in prod
  }
  return true;
};

const loadState = (): DevModeState => {
  if (typeof window === 'undefined') {
    return { marketDataEnabled: true, lastToggled: null, apiCallCount: 0 };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        marketDataEnabled: parsed.marketDataEnabled ?? getDefaultEnabled(),
        lastToggled: parsed.lastToggled ?? null,
        apiCallCount: 0, // Reset count on page load
      };
    }
  } catch {
    // Ignore parse errors
  }
  
  return { 
    marketDataEnabled: getDefaultEnabled(), 
    lastToggled: null, 
    apiCallCount: 0 
  };
};

const saveState = (state: Pick<DevModeState, 'marketDataEnabled' | 'lastToggled'>) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
};

const DevModeContext = createContext<DevModeContextType | null>(null);

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DevModeState>(loadState);
  
  const isDevEnvironment = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Persist to localStorage
  useEffect(() => {
    saveState({ 
      marketDataEnabled: state.marketDataEnabled, 
      lastToggled: state.lastToggled 
    });
  }, [state.marketDataEnabled, state.lastToggled]);

  const toggleMarketData = useCallback(() => {
    setState(prev => ({
      ...prev,
      marketDataEnabled: !prev.marketDataEnabled,
      lastToggled: Date.now(),
    }));
  }, []);

  const setMarketDataEnabled = useCallback((enabled: boolean) => {
    setState(prev => ({
      ...prev,
      marketDataEnabled: enabled,
      lastToggled: Date.now(),
    }));
  }, []);

  const incrementApiCallCount = useCallback(() => {
    setState(prev => ({
      ...prev,
      apiCallCount: prev.apiCallCount + 1,
    }));
  }, []);

  const resetApiCallCount = useCallback(() => {
    setState(prev => ({
      ...prev,
      apiCallCount: 0,
    }));
  }, []);

  const logApiCall = useCallback((endpoint: string, params?: unknown) => {
    console.log(`[API] ${endpoint}`, params ? params : '');
    setState(prev => ({
      ...prev,
      apiCallCount: prev.apiCallCount + 1,
    }));
  }, []);

  return (
    <DevModeContext.Provider
      value={{
        ...state,
        toggleMarketData,
        setMarketDataEnabled,
        incrementApiCallCount,
        resetApiCallCount,
        logApiCall,
        isDevEnvironment,
      }}
    >
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  const context = useContext(DevModeContext);
  if (!context) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return context;
}

// Optional hook for components that might render outside provider
export function useDevModeOptional() {
  return useContext(DevModeContext);
}
