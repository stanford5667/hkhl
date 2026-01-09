// Portfolio Real-time Service - Supabase realtime subscriptions for positions
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Types
export interface RealtimePosition {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  connection_id: string | null;
  symbol: string;
  name: string | null;
  quantity: number;
  cost_basis: number | null;
  cost_per_share: number | null;
  current_price: number | null;
  current_value: number | null;
  unrealized_gain: number | null;
  unrealized_gain_percent: number | null;
  asset_type: string | null;
  source: string;
  purchase_date: string | null;
  last_price_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiveMetrics {
  totalValue: number;
  totalCostBasis: number;
  totalGain: number;
  totalGainPercent: number;
  positionCount: number;
  holdings: Array<{
    symbol: string;
    value: number;
    quantity: number;
    costBasis: number;
    weight: number;
    gain: number;
    gainPercent: number;
  }>;
  allocation: Array<{
    type: string;
    value: number;
    count: number;
    weight: number;
  }>;
  topHolding: { symbol: string; weight: number } | null;
  diversificationScore: number;
}

export interface PositionChangeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  position: RealtimePosition;
  oldPosition?: RealtimePosition;
}

type PositionChangeCallback = (event: PositionChangeEvent) => void;

// Singleton manager for realtime subscriptions
class PortfolioRealtimeManager {
  private channel: RealtimeChannel | null = null;
  private listeners: Set<PositionChangeCallback> = new Set();
  private userId: string | null = null;
  private isSubscribed = false;

  subscribe(userId: string): void {
    if (this.isSubscribed && this.userId === userId) return;

    this.unsubscribe();
    this.userId = userId;

    this.channel = supabase
      .channel('portfolio-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'synced_positions',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<RealtimePosition>) => {
          this.handleChange(payload);
        }
      )
      .subscribe((status) => {
        this.isSubscribed = status === 'SUBSCRIBED';
        console.log('[PortfolioRealtime] Subscription status:', status);
      });
  }

  unsubscribe(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.isSubscribed = false;
    }
  }

  addListener(callback: PositionChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private handleChange(payload: RealtimePostgresChangesPayload<RealtimePosition>): void {
    const event: PositionChangeEvent = {
      type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
      position: (payload.new as RealtimePosition) || (payload.old as RealtimePosition),
      oldPosition: payload.eventType === 'UPDATE' ? (payload.old as RealtimePosition) : undefined,
    };

    console.log('[PortfolioRealtime] Change detected:', event.type, event.position?.symbol);

    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error('[PortfolioRealtime] Listener error:', err);
      }
    });
  }

  get connected(): boolean {
    return this.isSubscribed;
  }
}

// Singleton instance
export const portfolioRealtimeManager = new PortfolioRealtimeManager();

// Calculate live metrics from positions
export function calculateLiveMetrics(positions: RealtimePosition[]): LiveMetrics {
  const totalValue = positions.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalCostBasis = positions.reduce((sum, p) => sum + (p.cost_basis || 0), 0);
  const totalGain = totalValue - totalCostBasis;
  const totalGainPercent = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;

  const holdings = positions.map((p) => {
    const value = p.current_value || 0;
    const costBasis = p.cost_basis || 0;
    const gain = value - costBasis;
    return {
      symbol: p.symbol,
      value,
      quantity: p.quantity,
      costBasis,
      weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      gain,
      gainPercent: costBasis > 0 ? (gain / costBasis) * 100 : 0,
    };
  });

  // Group by asset type
  const allocationMap = new Map<string, { value: number; count: number }>();
  positions.forEach((p) => {
    const type = p.asset_type || 'Unknown';
    const existing = allocationMap.get(type) || { value: 0, count: 0 };
    allocationMap.set(type, {
      value: existing.value + (p.current_value || 0),
      count: existing.count + 1,
    });
  });

  const allocation = Array.from(allocationMap.entries()).map(([type, data]) => ({
    type,
    value: data.value,
    count: data.count,
    weight: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
  }));

  // Top holding
  const sortedHoldings = [...holdings].sort((a, b) => b.weight - a.weight);
  const topHolding = sortedHoldings.length > 0 
    ? { symbol: sortedHoldings[0].symbol, weight: sortedHoldings[0].weight }
    : null;

  // Diversification score (higher = more diversified)
  // Based on Herfindahl-Hirschman Index (HHI)
  const hhi = holdings.reduce((sum, h) => sum + Math.pow(h.weight / 100, 2), 0);
  const diversificationScore = Math.round((1 - hhi) * 100);

  return {
    totalValue,
    totalCostBasis,
    totalGain,
    totalGainPercent,
    positionCount: positions.length,
    holdings,
    allocation,
    topHolding,
    diversificationScore,
  };
}

// React hook for realtime position updates
interface UseRealtimePositionsOptions {
  portfolioId?: string | null;
  onInsert?: (position: RealtimePosition) => void;
  onUpdate?: (position: RealtimePosition, oldPosition?: RealtimePosition) => void;
  onDelete?: (position: RealtimePosition) => void;
  onChange?: (event: PositionChangeEvent) => void;
}

export function useRealtimePositions(options: UseRealtimePositionsOptions = {}): {
  isConnected: boolean;
} {
  const { portfolioId, onInsert, onUpdate, onDelete, onChange } = options;
  const isConnectedRef = useRef(false);

  const handleChange = useCallback((event: PositionChangeEvent) => {
    // Filter by portfolioId if specified
    if (portfolioId && event.position.portfolio_id !== portfolioId) {
      return;
    }

    onChange?.(event);

    switch (event.type) {
      case 'INSERT':
        onInsert?.(event.position);
        break;
      case 'UPDATE':
        onUpdate?.(event.position, event.oldPosition);
        break;
      case 'DELETE':
        onDelete?.(event.position);
        break;
    }
  }, [portfolioId, onInsert, onUpdate, onDelete, onChange]);

  useEffect(() => {
    const unsubscribe = portfolioRealtimeManager.addListener(handleChange);
    isConnectedRef.current = portfolioRealtimeManager.connected;

    return () => {
      unsubscribe();
    };
  }, [handleChange]);

  return {
    isConnected: portfolioRealtimeManager.connected,
  };
}

// Hook to initialize realtime for a user
export function usePortfolioRealtimeInit(userId: string | undefined): void {
  useEffect(() => {
    if (userId) {
      portfolioRealtimeManager.subscribe(userId);
    }

    return () => {
      // Don't unsubscribe on unmount - let the manager handle lifecycle
    };
  }, [userId]);
}
