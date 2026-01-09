// Position Management Types

export interface BrokerageConnection {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  brokerage_name: string;
  account_name: string | null;
  account_mask: string | null;
  connection_status: 'pending' | 'connected' | 'error' | 'disconnected';
  last_sync_at: string | null;
  sync_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SyncedPosition {
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
  asset_type: string;
  source: 'manual' | 'brokerage' | 'csv';
  purchase_date: string | null;
  last_price_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface PositionFormData {
  symbol: string;
  name?: string;
  quantity: number;
  cost_per_share?: number;
  cost_basis?: number;
  asset_type?: string;
  purchase_date?: string; // ISO date string YYYY-MM-DD
}

export interface CSVImportRow {
  symbol: string;
  name?: string;
  quantity: number;
  costBasis?: number;
  costPerShare?: number;
  currentPrice?: number;
  [key: string]: string | number | undefined;
}

export interface ColumnMapping {
  symbol: string;
  name?: string;
  quantity: string;
  costBasis?: string;
  costPerShare?: string;
  currentPrice?: string;
}

export const SUPPORTED_BROKERAGES = [
  { id: 'robinhood', name: 'Robinhood', icon: '🟢', color: 'bg-emerald-500' },
  { id: 'fidelity', name: 'Fidelity', icon: '🟢', color: 'bg-green-600' },
  { id: 'schwab', name: 'Charles Schwab', icon: '🔵', color: 'bg-blue-600' },
  { id: 'tdameritrade', name: 'TD Ameritrade', icon: '🟢', color: 'bg-green-700' },
  { id: 'etrade', name: 'E*TRADE', icon: '🟣', color: 'bg-purple-600' },
  { id: 'vanguard', name: 'Vanguard', icon: '🔴', color: 'bg-red-600' },
  { id: 'webull', name: 'Webull', icon: '🟠', color: 'bg-orange-500' },
  { id: 'interactive_brokers', name: 'Interactive Brokers', icon: '🔴', color: 'bg-red-700' },
  { id: 'merrill', name: 'Merrill Edge', icon: '🔵', color: 'bg-blue-700' },
  { id: 'ally', name: 'Ally Invest', icon: '🟣', color: 'bg-violet-600' },
] as const;

export const ASSET_TYPES = [
  { id: 'stock', label: 'Stock', icon: '📈' },
  { id: 'etf', label: 'ETF', icon: '📊' },
  { id: 'mutual_fund', label: 'Mutual Fund', icon: '🏦' },
  { id: 'bond', label: 'Bond', icon: '📜' },
  { id: 'crypto', label: 'Crypto', icon: '🪙' },
  { id: 'option', label: 'Option', icon: '📋' },
  { id: 'other', label: 'Other', icon: '📦' },
] as const;

export type BrokerageId = typeof SUPPORTED_BROKERAGES[number]['id'];
export type AssetTypeId = typeof ASSET_TYPES[number]['id'];
