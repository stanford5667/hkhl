import { create } from 'zustand';
import type { TradeIntent } from '@/components/options-analyzer/OptionsAnalyzer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  messages: Message[];
  hasStarted: boolean;
}

interface OptionsAnalyzerState {
  ticker: string;
  activeTicker: string;
  intent: TradeIntent;
  activeTab: string;
  sessions: Record<string, ChatSession>; // keyed by ticker
  setTicker: (t: string) => void;
  setActiveTicker: (t: string) => void;
  setIntent: (i: TradeIntent) => void;
  setActiveTab: (t: string) => void;
  getSession: (ticker: string) => ChatSession;
  setMessages: (ticker: string, messages: Message[]) => void;
  setHasStarted: (ticker: string, started: boolean) => void;
  resetSession: (ticker: string) => void;
}

const DEFAULT_SESSION: ChatSession = { messages: [], hasStarted: false };

export const useOptionsAnalyzerStore = create<OptionsAnalyzerState>((set, get) => ({
  ticker: '',
  activeTicker: '',
  intent: 'growth',
  activeTab: 'advisor',
  sessions: {},
  setTicker: (t) => set({ ticker: t }),
  setActiveTicker: (t) => set({ activeTicker: t }),
  setIntent: (i) => set({ intent: i }),
  setActiveTab: (t) => set({ activeTab: t }),
  getSession: (ticker) => get().sessions[ticker] || DEFAULT_SESSION,
  setMessages: (ticker, messages) =>
    set((s) => ({ sessions: { ...s.sessions, [ticker]: { ...s.sessions[ticker] || DEFAULT_SESSION, messages } } })),
  setHasStarted: (ticker, started) =>
    set((s) => ({ sessions: { ...s.sessions, [ticker]: { ...s.sessions[ticker] || DEFAULT_SESSION, hasStarted: started } } })),
  resetSession: (ticker) =>
    set((s) => ({ sessions: { ...s.sessions, [ticker]: DEFAULT_SESSION } })),
}));
