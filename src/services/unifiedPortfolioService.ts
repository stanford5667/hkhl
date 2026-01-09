// Unified Portfolio Service - Single source of truth for positions
import { supabase } from '@/integrations/supabase/client';
import type { AssetClass, PortfolioAllocation } from '@/types/portfolio';
import type { SyncedPosition, PositionFormData } from '@/types/positions';

// Central unified position type
export interface UnifiedPosition {
  id: string;
  portfolioId: string | null;
  
  // Core identifiers
  symbol: string;
  name: string | null;
  
  // Quantity & value
  quantity: number;
  costBasis: number | null;
  costPerShare: number | null;
  currentPrice: number | null;
  currentValue: number | null;
  
  // Calculated
  unrealizedGain: number | null;
  unrealizedGainPercent: number | null;
  weight: number | null; // % of portfolio
  
  // Classification
  assetType: string;
  assetClass: AssetClass | null;
  sector: string | null;
  
  // Tracking
  source: 'manual' | 'brokerage' | 'csv' | 'visualizer';
  connectionId: string | null;
  purchaseDate: string | null;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalGain: number;
  totalGainPercent: number;
  positionCount: number;
  byAssetClass: Record<string, { value: number; weight: number; count: number }>;
}

// Map asset type to asset class
const assetTypeToClass: Record<string, AssetClass> = {
  stock: 'stocks',
  stocks: 'stocks',
  etf: 'etfs',
  etfs: 'etfs',
  crypto: 'crypto',
  bond: 'bonds',
  bonds: 'bonds',
  commodity: 'commodities',
  commodities: 'commodities',
  real_estate: 'real_estate',
  mutual_fund: 'etfs',
  option: 'stocks',
  other: 'stocks',
};

// Convert SyncedPosition (DB) → UnifiedPosition
export function syncedToUnified(position: SyncedPosition, totalValue?: number): UnifiedPosition {
  const currentValue = position.current_value ?? (position.quantity * (position.current_price ?? 0));
  const weight = totalValue && totalValue > 0 ? (currentValue / totalValue) * 100 : null;
  
  return {
    id: position.id,
    portfolioId: position.portfolio_id,
    symbol: position.symbol,
    name: position.name,
    quantity: position.quantity,
    costBasis: position.cost_basis,
    costPerShare: position.cost_per_share,
    currentPrice: position.current_price,
    currentValue,
    unrealizedGain: position.unrealized_gain,
    unrealizedGainPercent: position.unrealized_gain_percent,
    weight,
    assetType: position.asset_type,
    assetClass: assetTypeToClass[position.asset_type] || 'stocks',
    sector: null, // Would come from external data
    source: position.source,
    connectionId: position.connection_id,
    purchaseDate: position.purchase_date,
    createdAt: position.created_at,
    updatedAt: position.updated_at,
  };
}

// Convert PortfolioAllocation (Visualizer) → UnifiedPosition
export function allocationToUnified(
  alloc: PortfolioAllocation, 
  totalValue: number,
  portfolioId?: string | null
): UnifiedPosition {
  const value = (alloc.weight / 100) * totalValue;
  const quantity = 1; // Allocations don't track quantity, just weight
  
  return {
    id: `alloc-${alloc.symbol}`,
    portfolioId: portfolioId || null,
    symbol: alloc.symbol,
    name: alloc.name || null,
    quantity,
    costBasis: null,
    costPerShare: null,
    currentPrice: value, // Treat value as "price" for display
    currentValue: value,
    unrealizedGain: null,
    unrealizedGainPercent: null,
    weight: alloc.weight,
    assetType: alloc.assetClass,
    assetClass: alloc.assetClass,
    sector: null,
    source: 'visualizer',
    connectionId: null,
    purchaseDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Convert UnifiedPosition → PortfolioAllocation (for visualizer)
export function unifiedToAllocation(position: UnifiedPosition): PortfolioAllocation {
  return {
    symbol: position.symbol,
    weight: position.weight ?? 0,
    assetClass: position.assetClass || 'stocks',
    name: position.name || undefined,
  };
}

// Convert UnifiedPosition back to DB format for inserts
export function unifiedToPositionData(position: UnifiedPosition): Omit<PositionFormData, 'symbol'> & { symbol: string } {
  return {
    symbol: position.symbol,
    name: position.name || undefined,
    quantity: position.quantity,
    cost_per_share: position.costPerShare || undefined,
    cost_basis: position.costBasis || undefined,
    asset_type: position.assetType,
    purchase_date: position.purchaseDate || undefined,
  };
}

// Calculate portfolio summary from positions
export function calculateSummary(positions: UnifiedPosition[]): PortfolioSummary {
  const totalValue = positions.reduce((sum, p) => sum + (p.currentValue ?? 0), 0);
  const totalCostBasis = positions.reduce((sum, p) => sum + (p.costBasis ?? 0), 0);
  const totalGain = totalValue - totalCostBasis;
  const totalGainPercent = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;
  
  const byAssetClass: Record<string, { value: number; weight: number; count: number }> = {};
  
  for (const position of positions) {
    const assetClass = position.assetClass || 'other';
    if (!byAssetClass[assetClass]) {
      byAssetClass[assetClass] = { value: 0, weight: 0, count: 0 };
    }
    byAssetClass[assetClass].value += position.currentValue ?? 0;
    byAssetClass[assetClass].count += 1;
  }
  
  // Calculate weights after totaling
  for (const key of Object.keys(byAssetClass)) {
    byAssetClass[key].weight = totalValue > 0 
      ? (byAssetClass[key].value / totalValue) * 100 
      : 0;
  }
  
  return {
    totalValue,
    totalCostBasis,
    totalGain,
    totalGainPercent,
    positionCount: positions.length,
    byAssetClass,
  };
}

// Unified Portfolio Service Class
export class UnifiedPortfolioService {
  private userId: string;
  private portfolioId: string | null;
  
  constructor(userId: string, portfolioId?: string | null) {
    this.userId = userId;
    this.portfolioId = portfolioId ?? null;
  }
  
  // Fetch all positions from DB
  async getPositions(): Promise<UnifiedPosition[]> {
    let query = supabase
      .from('synced_positions')
      .select('*')
      .eq('user_id', this.userId)
      .order('symbol', { ascending: true });
    
    if (this.portfolioId) {
      query = query.eq('portfolio_id', this.portfolioId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const positions = (data || []) as SyncedPosition[];
    const totalValue = positions.reduce((sum, p) => {
      const value = p.current_value ?? (p.quantity * (p.current_price ?? 0));
      return sum + value;
    }, 0);
    
    return positions.map(p => syncedToUnified(p, totalValue));
  }
  
  // Get summary stats
  async getSummary(): Promise<PortfolioSummary> {
    const positions = await this.getPositions();
    return calculateSummary(positions);
  }
  
  // Get just tickers
  async getTickers(): Promise<string[]> {
    const positions = await this.getPositions();
    return [...new Set(positions.map(p => p.symbol))];
  }
  
  // Get tickers with weights
  async getTickerWeights(): Promise<Record<string, number>> {
    const positions = await this.getPositions();
    const result: Record<string, number> = {};
    for (const p of positions) {
      result[p.symbol] = p.weight ?? 0;
    }
    return result;
  }
  
  // Add single position
  async addPosition(data: PositionFormData, source: 'manual' | 'csv' | 'visualizer' = 'manual'): Promise<UnifiedPosition> {
    const costBasis = data.cost_basis ?? (data.cost_per_share && data.quantity ? data.cost_per_share * data.quantity : null);
    
    const position = {
      user_id: this.userId,
      portfolio_id: this.portfolioId,
      symbol: data.symbol.toUpperCase(),
      name: data.name || null,
      quantity: data.quantity,
      cost_basis: costBasis,
      cost_per_share: data.cost_per_share || null,
      asset_type: data.asset_type || 'stock',
      purchase_date: data.purchase_date || new Date().toISOString().split('T')[0],
      source,
    };
    
    const { data: inserted, error } = await supabase
      .from('synced_positions')
      .insert(position)
      .select()
      .single();
    
    if (error) throw error;
    
    return syncedToUnified(inserted as SyncedPosition);
  }
  
  // Add multiple positions (bulk import)
  async addPositions(positionsData: PositionFormData[], source: 'csv' | 'visualizer' = 'csv'): Promise<UnifiedPosition[]> {
    const toInsert = positionsData.map(data => ({
      user_id: this.userId,
      portfolio_id: this.portfolioId,
      symbol: data.symbol.toUpperCase(),
      name: data.name || null,
      quantity: data.quantity,
      cost_basis: data.cost_basis ?? (data.cost_per_share && data.quantity ? data.cost_per_share * data.quantity : null),
      cost_per_share: data.cost_per_share || null,
      asset_type: data.asset_type || 'stock',
      purchase_date: data.purchase_date || new Date().toISOString().split('T')[0],
      source,
    }));
    
    const { data: inserted, error } = await supabase
      .from('synced_positions')
      .insert(toInsert)
      .select();
    
    if (error) throw error;
    
    return (inserted as SyncedPosition[]).map(p => syncedToUnified(p));
  }
  
  // Update position
  async updatePosition(id: string, data: Partial<PositionFormData>): Promise<UnifiedPosition> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (data.symbol) updateData.symbol = data.symbol.toUpperCase();
    if (data.name !== undefined) updateData.name = data.name;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.cost_per_share !== undefined) updateData.cost_per_share = data.cost_per_share;
    if (data.cost_basis !== undefined) updateData.cost_basis = data.cost_basis;
    if (data.asset_type !== undefined) updateData.asset_type = data.asset_type;
    if (data.purchase_date !== undefined) updateData.purchase_date = data.purchase_date;
    
    const { data: updated, error } = await supabase
      .from('synced_positions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', this.userId)
      .select()
      .single();
    
    if (error) throw error;
    
    return syncedToUnified(updated as SyncedPosition);
  }
  
  // Delete position
  async deletePosition(id: string): Promise<void> {
    const { error } = await supabase
      .from('synced_positions')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);
    
    if (error) throw error;
  }
  
  // Clear all positions for portfolio
  async clearPositions(): Promise<void> {
    let query = supabase
      .from('synced_positions')
      .delete()
      .eq('user_id', this.userId);
    
    if (this.portfolioId) {
      query = query.eq('portfolio_id', this.portfolioId);
    }
    
    const { error } = await query;
    if (error) throw error;
  }
  
  // Sync from allocations (visualizer → positions)
  async syncFromAllocations(
    allocations: PortfolioAllocation[], 
    totalValue: number,
    clearExisting = false
  ): Promise<UnifiedPosition[]> {
    if (clearExisting) {
      await this.clearPositions();
    }
    
    const positionsData: PositionFormData[] = allocations.map(alloc => ({
      symbol: alloc.symbol,
      name: alloc.name,
      quantity: 1,
      cost_basis: (alloc.weight / 100) * totalValue,
      asset_type: alloc.assetClass,
    }));
    
    return this.addPositions(positionsData, 'visualizer');
  }
  
  // Convert positions to allocations (positions → visualizer)
  async toAllocations(): Promise<PortfolioAllocation[]> {
    const positions = await this.getPositions();
    return positions.map(p => unifiedToAllocation(p));
  }
}

// Factory function
export function createPortfolioService(userId: string, portfolioId?: string | null): UnifiedPortfolioService {
  return new UnifiedPortfolioService(userId, portfolioId);
}
