import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  TrendingUp, Activity, Zap, Flame, BarChart3, Filter, X, ChevronDown, ChevronUp,
  Building2, DollarSign, Percent, Scale, Target, LineChart, AlertTriangle,
  Clock, Volume2, Gauge, TrendingDown, Calculator, Ratio, ChevronLeft, ChevronRight, SlidersHorizontal,
  Sparkles, Lightbulb, Newspaper
} from 'lucide-react';
import { ColumnSettings, loadSavedColumns } from '@/components/screener/ColumnSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { screenStocksFromPolygon, QUICK_SCREENS, type ScreenerResult, type ScreenerFilters } from '@/services/polygonScreenerService';
import { generateBatchInsights, getInsightSummary, type StockInsight } from '@/services/stockInsightGenerator';
import { CustomFilterBuilder, type CustomFiltersPayload } from '@/components/screener/CustomFilterBuilder';
import { TickerHoverPreview } from '@/components/screener/TickerHoverPreview';
import { DailyDigestCell } from '@/components/screener/DailyDigestCell';

const ITEMS_PER_PAGE = 50;

// =====================
// Tab Configuration
// =====================

const SCREENER_TABS = [
  { id: 'topGainers', label: 'Top Gainers', icon: TrendingUp },
  { id: 'mostActive', label: 'Most Active', icon: Activity },
  { id: 'momentum', label: 'Momentum', icon: Flame },
  { id: 'unusualVolume', label: 'Unusual Vol', icon: Zap },
] as const;

type TabId = typeof SCREENER_TABS[number]['id'];

// =====================
// Filter Configurations - All 19 Metrics
// =====================

const MARKET_CAP_DIRECTION_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'above', label: 'Above' },
  { value: 'below', label: 'Below' },
  { value: 'between', label: 'Between' },
];

const MARKET_CAP_PRESETS = [
  { label: '$100M', value: 100_000_000 },
  { label: '$300M', value: 300_000_000 },
  { label: '$500M', value: 500_000_000 },
  { label: '$1B', value: 1_000_000_000 },
  { label: '$2B', value: 2_000_000_000 },
  { label: '$10B', value: 10_000_000_000 },
  { label: '$50B', value: 50_000_000_000 },
  { label: '$100B', value: 100_000_000_000 },
  { label: '$200B', value: 200_000_000_000 },
];

// Keep a dummy options array for FILTER_CONFIG compatibility
const MARKET_CAP_OPTIONS = [
  { value: 'all', label: 'Any' },
];

const PE_RATIO_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under10', label: '<10', max: 10 },
  { value: '10to20', label: '10-20', min: 10, max: 20 },
  { value: '20to35', label: '20-35', min: 20, max: 35 },
  { value: 'over35', label: '>35', min: 35 },
  { value: 'negative', label: 'Negative', max: 0 },
];

const FORWARD_PE_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under15', label: '<15', max: 15 },
  { value: '15to25', label: '15-25', min: 15, max: 25 },
  { value: '25to40', label: '25-40', min: 25, max: 40 },
  { value: 'over40', label: '>40', min: 40 },
];

const PEG_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under1', label: '<1 (Undervalued)', max: 1 },
  { value: '1to2', label: '1-2 (Fair)', min: 1, max: 2 },
  { value: 'over2', label: '>2 (Expensive)', min: 2 },
];

const PRICE_TO_BOOK_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under1', label: '<1 (Below Book)', max: 1 },
  { value: '1to3', label: '1-3', min: 1, max: 3 },
  { value: '3to10', label: '3-10', min: 3, max: 10 },
  { value: 'over10', label: '>10', min: 10 },
];

const PRICE_TO_CASH_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under5', label: '<5', max: 5 },
  { value: '5to15', label: '5-15', min: 5, max: 15 },
  { value: '15to30', label: '15-30', min: 15, max: 30 },
  { value: 'over30', label: '>30', min: 30 },
];

const OP_MARGIN_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over30', label: '>30% (Excellent)', min: 30 },
  { value: '20to30', label: '20-30% (Strong)', min: 20, max: 30 },
  { value: '10to20', label: '10-20% (Good)', min: 10, max: 20 },
  { value: '0to10', label: '0-10% (Fair)', min: 0, max: 10 },
  { value: 'negative', label: 'Negative', max: 0 },
];

const EPS_GROWTH_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over50', label: '>50%', min: 50 },
  { value: '20to50', label: '20-50%', min: 20, max: 50 },
  { value: '0to20', label: '0-20%', min: 0, max: 20 },
  { value: 'negative', label: 'Negative', max: 0 },
];

const REVENUE_GROWTH_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over30', label: '>30%', min: 30 },
  { value: '15to30', label: '15-30%', min: 15, max: 30 },
  { value: '0to15', label: '0-15%', min: 0, max: 15 },
  { value: 'negative', label: 'Declining', max: 0 },
];

const EPS_STDDEV_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'low', label: 'Low (<$0.10)', max: 0.10 },
  { value: 'medium', label: 'Medium ($0.10-$0.30)', min: 0.10, max: 0.30 },
  { value: 'high', label: 'High (>$0.30)', min: 0.30 },
];

const DEBT_EQUITY_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under0.5', label: '<0.5 (Low)', max: 0.5 },
  { value: '0.5to1', label: '0.5-1.0 (Moderate)', min: 0.5, max: 1 },
  { value: '1to2', label: '1.0-2.0 (High)', min: 1, max: 2 },
  { value: 'over2', label: '>2.0 (Very High)', min: 2 },
];

const QUICK_RATIO_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over2', label: '>2 (Strong)', min: 2 },
  { value: '1to2', label: '1-2 (Healthy)', min: 1, max: 2 },
  { value: 'under1', label: '<1 (Weak)', max: 1 },
];

const EV_EBITDA_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under10', label: '<10 (Cheap)', max: 10 },
  { value: '10to15', label: '10-15 (Fair)', min: 10, max: 15 },
  { value: '15to25', label: '15-25 (Pricey)', min: 15, max: 25 },
  { value: 'over25', label: '>25 (Expensive)', min: 25 },
];

const VOLATILITY_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under20', label: '<20% (Low)', max: 20 },
  { value: '20to40', label: '20-40% (Medium)', min: 20, max: 40 },
  { value: '40to60', label: '40-60% (High)', min: 40, max: 60 },
  { value: 'over60', label: '>60% (Very High)', min: 60 },
];

const MAX_DRAWDOWN_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under10', label: '<-10% (Minimal)', max: -10 },
  { value: '10to25', label: '-10 to -25%', max: -25, min: -10 },
  { value: '25to50', label: '-25 to -50%', max: -50, min: -25 },
  { value: 'over50', label: '>-50% (Severe)', min: -50 },
];

const SHARPE_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over2', label: '>2 (Excellent)', min: 2 },
  { value: '1to2', label: '1-2 (Good)', min: 1, max: 2 },
  { value: '0to1', label: '0-1 (Fair)', min: 0, max: 1 },
  { value: 'negative', label: '<0 (Poor)', max: 0 },
];

const BETA_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'under0.5', label: '<0.5 (Defensive)', max: 0.5 },
  { value: '0.5to1', label: '0.5-1.0 (Low Vol)', min: 0.5, max: 1 },
  { value: '1to1.5', label: '1.0-1.5 (Market)', min: 1, max: 1.5 },
  { value: 'over1.5', label: '>1.5 (Aggressive)', min: 1.5 },
];

const AVG_VOLUME_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'over10m', label: '>10M', min: 10_000_000 },
  { value: '5to10m', label: '5-10M', min: 5_000_000, max: 10_000_000 },
  { value: '1to5m', label: '1-5M', min: 1_000_000, max: 5_000_000 },
  { value: '500kto1m', label: '500K-1M', min: 500_000, max: 1_000_000 },
  { value: 'under500k', label: '<500K', max: 500_000 },
];

const BEAT_PROBABILITY_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'high', label: 'High (70%+)', min: 70 },
  { value: 'medium', label: 'Medium (50-70%)', min: 50, max: 70 },
  { value: 'low', label: 'Low (<50%)', max: 50 },
];

const PERFORMANCE_PERIOD_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
  { value: '2w', label: '2 Weeks' },
  { value: '1m', label: '1 Month' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: '2y', label: '2 Years' },
  { value: '3y', label: '3 Years' },
  { value: '5y', label: '5 Years' },
];

const PERFORMANCE_DIRECTION_OPTIONS = [
  { value: 'all', label: 'Any' },
  { value: 'up50', label: '>+50%', min: 50 },
  { value: 'up20', label: '>+20%', min: 20 },
  { value: 'up10', label: '>+10%', min: 10 },
  { value: 'up0', label: 'Positive', min: 0 },
  { value: 'down0', label: 'Negative', max: 0 },
  { value: 'down10', label: '<-10%', max: -10 },
  { value: 'down20', label: '<-20%', max: -20 },
];

// =====================
// Filter State Interface
// =====================

interface FilterState {
  // Valuation
  marketCap: string;
  peRatio: string;
  forwardPE: string;
  peg: string;
  priceToBook: string;
  priceToCash: string;
  evEbitda: string;
  // Profitability & Growth
  opMargin: string;
  epsGrowth: string;
  revenueGrowth: string;
  epsStdDev: string;
  // Stability
  debtEquity: string;
  quickRatio: string;
  // Risk
  volatility: string;
  maxDrawdown: string;
  sharpe: string;
  beta: string;
  // Volume & Earnings
  avgVolume: string;
  beatProbability: string;
  // Performance
  performancePeriod: string;
  performanceDirection: string;
}

const DEFAULT_FILTERS: FilterState = {
  marketCap: 'all',
  peRatio: 'all',
  forwardPE: 'all',
  peg: 'all',
  priceToBook: 'all',
  priceToCash: 'all',
  evEbitda: 'all',
  opMargin: 'all',
  epsGrowth: 'all',
  revenueGrowth: 'all',
  epsStdDev: 'all',
  debtEquity: 'all',
  quickRatio: 'all',
  volatility: 'all',
  maxDrawdown: 'all',
  sharpe: 'all',
  beta: 'all',
  avgVolume: 'all',
  beatProbability: 'all',
  performancePeriod: 'all',
  performanceDirection: 'all',
};

// Filter metadata for display
const FILTER_CONFIG: Record<keyof FilterState, { label: string; options: { value: string; label: string; min?: number; max?: number }[]; icon: React.ElementType; category: string }> = {
  marketCap: { label: 'Market Cap', options: MARKET_CAP_OPTIONS, icon: Building2, category: 'Valuation' },
  peRatio: { label: 'P/E', options: PE_RATIO_OPTIONS, icon: DollarSign, category: 'Valuation' },
  forwardPE: { label: 'Forward P/E', options: FORWARD_PE_OPTIONS, icon: DollarSign, category: 'Valuation' },
  peg: { label: 'PEG', options: PEG_OPTIONS, icon: Ratio, category: 'Valuation' },
  priceToBook: { label: 'P/B', options: PRICE_TO_BOOK_OPTIONS, icon: Calculator, category: 'Valuation' },
  priceToCash: { label: 'P/Cash', options: PRICE_TO_CASH_OPTIONS, icon: DollarSign, category: 'Valuation' },
  evEbitda: { label: 'EV/EBITDA', options: EV_EBITDA_OPTIONS, icon: Calculator, category: 'Valuation' },
  opMargin: { label: 'Op Margin', options: OP_MARGIN_OPTIONS, icon: Percent, category: 'Profitability' },
  epsGrowth: { label: 'EPS Growth', options: EPS_GROWTH_OPTIONS, icon: TrendingUp, category: 'Growth' },
  revenueGrowth: { label: 'Rev Growth', options: REVENUE_GROWTH_OPTIONS, icon: TrendingUp, category: 'Growth' },
  epsStdDev: { label: 'EPS Std Dev', options: EPS_STDDEV_OPTIONS, icon: Gauge, category: 'Stability' },
  debtEquity: { label: 'D/E', options: DEBT_EQUITY_OPTIONS, icon: Scale, category: 'Stability' },
  quickRatio: { label: 'Quick Ratio', options: QUICK_RATIO_OPTIONS, icon: Gauge, category: 'Stability' },
  volatility: { label: 'Volatility', options: VOLATILITY_OPTIONS, icon: Activity, category: 'Risk' },
  maxDrawdown: { label: 'Max DD', options: MAX_DRAWDOWN_OPTIONS, icon: TrendingDown, category: 'Risk' },
  sharpe: { label: 'Sharpe', options: SHARPE_OPTIONS, icon: LineChart, category: 'Risk' },
  beta: { label: 'Beta', options: BETA_OPTIONS, icon: Activity, category: 'Risk' },
  avgVolume: { label: 'Avg Volume', options: AVG_VOLUME_OPTIONS, icon: Volume2, category: 'Volume' },
  beatProbability: { label: 'Beat Prob', options: BEAT_PROBABILITY_OPTIONS, icon: Target, category: 'Earnings' },
  performancePeriod: { label: 'Perf Period', options: PERFORMANCE_PERIOD_OPTIONS, icon: Clock, category: 'Performance' },
  performanceDirection: { label: 'Perf Range', options: PERFORMANCE_DIRECTION_OPTIONS, icon: TrendingUp, category: 'Performance' },
};

// Group filters by category
const FILTER_CATEGORIES = [
  { 
    name: 'Valuation', 
    filters: ['marketCap', 'peRatio', 'forwardPE', 'peg', 'priceToBook', 'priceToCash', 'evEbitda'] as (keyof FilterState)[],
    isPrimary: true
  },
  { 
    name: 'Profitability & Growth', 
    filters: ['opMargin', 'epsGrowth', 'revenueGrowth'] as (keyof FilterState)[],
    isPrimary: false
  },
  { 
    name: 'Stability', 
    filters: ['debtEquity', 'quickRatio', 'epsStdDev'] as (keyof FilterState)[],
    isPrimary: false
  },
  { 
    name: 'Risk', 
    filters: ['volatility', 'maxDrawdown', 'sharpe', 'beta'] as (keyof FilterState)[],
    isPrimary: false
  },
  { 
    name: 'Volume & Earnings', 
    filters: ['avgVolume', 'beatProbability'] as (keyof FilterState)[],
    isPrimary: false
  },
  { 
    name: 'Performance', 
    filters: ['performancePeriod', 'performanceDirection'] as (keyof FilterState)[],
    isPrimary: false
  },
];

// =====================
// Utility Functions
// =====================

function formatVolume(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toString();
}

function formatMarketCap(value: number | null): string {
  if (!value) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

// =====================
// Components
// =====================

// Sortable column definitions - maps filter keys to stock properties
type SortableColumn = {
  key: string;
  label: string;
  filterKey?: keyof FilterState;
  getValue: (stock: ScreenerResult) => number | null;
  format: (value: number | null) => string;
  width: string;
  alwaysShow?: boolean;
};

const SORTABLE_COLUMNS: SortableColumn[] = [
  // Always-show columns
  { key: 'symbol', label: 'Symbol', getValue: () => null, format: () => '', width: 'w-14', alwaysShow: true },
  { key: 'name', label: 'Name', getValue: () => null, format: () => '', width: 'flex-1', alwaysShow: true },
  { key: 'price', label: 'Price', getValue: (s) => s.price, format: (v) => v != null ? `$${v.toFixed(2)}` : '—', width: 'w-16', alwaysShow: true },
  { key: 'marketCap', label: 'Mkt Cap', filterKey: 'marketCap', getValue: (s) => s.marketCap, format: (v) => formatMarketCap(v), width: 'w-16', alwaysShow: true },
  { key: 'change', label: '% Chg', getValue: (s) => s.changePercent, format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—', width: 'w-16', alwaysShow: true },
  
  // Valuation metrics - shown when their filters are active
  { key: 'pe', label: 'P/E', filterKey: 'peRatio', getValue: (s) => s.pe, format: (v) => v != null ? v.toFixed(1) : '—', width: 'w-12' },
  { key: 'forwardPE', label: 'Fwd P/E', filterKey: 'forwardPE', getValue: (s) => s.forwardPE, format: (v) => v != null ? v.toFixed(1) : '—', width: 'w-14' },
  { key: 'peg', label: 'PEG', filterKey: 'peg', getValue: (s) => s.peg, format: (v) => v != null ? v.toFixed(2) : '—', width: 'w-12' },
  { key: 'pb', label: 'P/B', filterKey: 'priceToBook', getValue: (s) => s.pb, format: (v) => v != null ? v.toFixed(2) : '—', width: 'w-12' },
  { key: 'pCash', label: 'P/Cash', filterKey: 'priceToCash', getValue: (s) => s.pCash, format: (v) => v != null ? v.toFixed(1) : '—', width: 'w-14' },
  { key: 'evEbitda', label: 'EV/EBITDA', filterKey: 'evEbitda', getValue: (s) => s.evEbitda, format: (v) => v != null ? v.toFixed(1) : '—', width: 'w-16' },
  
  // Profitability & Growth - shown when their filters are active
  { key: 'opMargin', label: 'Op Margin', filterKey: 'opMargin', getValue: (s) => s.opMargin, format: (v) => v != null ? `${v.toFixed(1)}%` : '—', width: 'w-16' },
  { key: 'epsGrowth', label: 'EPS Grw', filterKey: 'epsGrowth', getValue: (s) => s.epsGrowth, format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—', width: 'w-14' },
  { key: 'revenueGrowth', label: 'Rev Grw', filterKey: 'revenueGrowth', getValue: (s) => s.revenueGrowth, format: (v) => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—', width: 'w-14' },
  
  // Stability metrics
  { key: 'debtEquity', label: 'D/E', filterKey: 'debtEquity', getValue: (s) => s.debtEquity, format: (v) => v != null ? v.toFixed(2) : '—', width: 'w-12' },
  { key: 'quickRatio', label: 'Quick', filterKey: 'quickRatio', getValue: (s) => s.quickRatio, format: (v) => v != null ? v.toFixed(2) : '—', width: 'w-12' },
  
  // Risk metrics
  { key: 'volatility', label: 'Vol', filterKey: 'volatility', getValue: (s) => s.volatility, format: (v) => v != null ? `${v.toFixed(1)}%` : '—', width: 'w-12' },
  { key: 'beta', label: 'Beta', filterKey: 'beta', getValue: (s) => s.beta, format: (v) => v != null ? v.toFixed(2) : '—', width: 'w-12' },
  { key: 'sharpe', label: 'Sharpe', filterKey: 'sharpe', getValue: (s) => s.sharpe, format: (v) => v != null ? v.toFixed(2) : '—', width: 'w-12' },
  { key: 'maxDrawdown', label: 'Max DD', filterKey: 'maxDrawdown', getValue: (s) => s.maxDrawdown, format: (v) => v != null ? `${v.toFixed(1)}%` : '—', width: 'w-14' },
  
  // Volume - shown when volume filter is active
  { key: 'volume', label: 'Volume', filterKey: 'avgVolume', getValue: (s) => s.volume, format: (v) => v != null ? formatVolume(v) : '—', width: 'w-14' },
];

function StockRowMobile({ stock, onClick, showInsights, insight }: { stock: ScreenerResult; onClick: () => void; showInsights: boolean; insight?: StockInsight }) {
  const isPositive = stock.changePercent >= 0;
  return (
    <button onClick={onClick} className="w-full p-3 text-left border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors active:scale-[0.99]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-primary">{stock.symbol}</span>
            {stock.marketCap && (
              <span className="text-[10px] text-muted-foreground tabular-nums">{formatMarketCap(stock.marketCap)}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{stock.name}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-medium text-foreground tabular-nums block">${stock.price.toFixed(2)}</span>
          <span className={cn(
            "text-xs font-semibold tabular-nums",
            isPositive ? 'text-emerald-500' : 'text-destructive'
          )}>
            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      {/* Extra metrics row */}
      {(stock.volume || stock.pe) && (
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
          {stock.volume && <span>Vol: {formatVolume(stock.volume)}</span>}
          {stock.pe != null && <span>P/E: {stock.pe.toFixed(1)}</span>}
          {stock.beta != null && <span>β: {stock.beta.toFixed(2)}</span>}
        </div>
      )}
      {showInsights && insight && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground line-clamp-2">
            <Sparkles className="h-3 w-3 text-amber-500 inline mr-1" />
            {getInsightSummary(insight)}
          </p>
        </div>
      )}
    </button>
  );
}

function StockRow({ 
  stock, 
  onClick,
  visibleColumns,
  insight,
  showInsights,
}: { 
  stock: ScreenerResult; 
  onClick: () => void;
  visibleColumns: SortableColumn[];
  insight?: StockInsight;
  showInsights: boolean;
}) {
  const isPositive = stock.changePercent >= 0;
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 py-2.5 px-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
    >
      {visibleColumns.map(col => {
        if (col.key === 'symbol') {
          return (
            <div key={col.key} className={col.width}>
              <TickerHoverPreview ticker={stock.symbol} stock={stock}>
                <span className="text-sm font-semibold text-primary cursor-pointer hover:underline">{stock.symbol}</span>
              </TickerHoverPreview>
            </div>
          );
        }
        if (col.key === 'name') {
          return (
            <div key={col.key} className={cn(col.width, 'min-w-0')}>
              <span className="text-xs text-muted-foreground truncate block">{stock.name}</span>
            </div>
          );
        }
        if (col.key === 'price') {
          return (
            <div key={col.key} className={cn(col.width, 'text-right')}>
              <span className="text-xs font-medium text-foreground tabular-nums">
                ${stock.price.toFixed(2)}
              </span>
            </div>
          );
        }
        if (col.key === 'change') {
          return (
            <div key={col.key} className={cn(
              col.width, 'text-right text-xs font-semibold tabular-nums',
              isPositive ? 'text-emerald-500' : 'text-destructive'
            )}>
              {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </div>
          );
        }
        // Generic column rendering
        const value = col.getValue(stock);
        return (
          <div key={col.key} className={cn(col.width, 'text-right')}>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {col.format(value)}
            </span>
          </div>
        );
      })}
      
      {/* Insight column */}
      {showInsights && insight && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-32 flex-shrink-0 flex items-center gap-1.5 text-left">
                <Lightbulb className={cn(
                  "h-3 w-3 flex-shrink-0",
                  insight.confidence === 'high' ? 'text-amber-500' : 
                  insight.confidence === 'medium' ? 'text-amber-400/70' : 'text-muted-foreground'
                )} />
                <span className="text-[10px] text-muted-foreground truncate">
                  {getInsightSummary(insight)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-1.5">
                <p className="text-xs font-medium">{stock.symbol} — AI Insight</p>
                <p className="text-[11px] text-muted-foreground">{insight.headline}</p>
                {insight.matchReasons && insight.matchReasons.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {insight.matchReasons.map((reason, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px] h-4">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* Daily Digest column */}
      <div className="w-36 flex-shrink-0">
        <DailyDigestCell ticker={stock.symbol} />
      </div>
    </button>
  );
}

type SortConfig = {
  column: string;
  direction: 'asc' | 'desc';
};

function StockList({ 
  stocks, 
  isLoading, 
  onStockClick,
  currentPage,
  totalCount,
  onPageChange,
  hasMore,
  activeFilters,
  sortConfig,
  onSortChange,
  showInsights,
  insights,
  insightsLoading,
  userVisibleColumnKeys,
}: { 
  stocks: ScreenerResult[] | undefined; 
  isLoading: boolean;
  onStockClick: (symbol: string) => void;
  currentPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  hasMore: boolean;
  activeFilters: Set<keyof FilterState>;
  sortConfig: SortConfig;
  onSortChange: (column: string) => void;
  showInsights: boolean;
  insights: Map<string, StockInsight>;
  insightsLoading: boolean;
  userVisibleColumnKeys: Set<string>;
}) {
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startItem = currentPage * ITEMS_PER_PAGE + 1;
  const endItem = Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalCount);

  // Determine which columns to show: user settings + filter-activated columns
  const visibleColumns = useMemo(() => {
    const columns: SortableColumn[] = [];
    
    SORTABLE_COLUMNS.forEach(col => {
      // Show if user explicitly enabled it, OR if its filter is active
      const userEnabled = userVisibleColumnKeys.has(col.key);
      const filterActive = col.filterKey && activeFilters.has(col.filterKey);
      if (userEnabled || filterActive) {
        columns.push(col);
      }
    });
    
    return columns;
  }, [activeFilters, userVisibleColumnKeys]);

  // Sort stocks locally
  const sortedStocks = useMemo(() => {
    if (!stocks) return [];
    const col = SORTABLE_COLUMNS.find(c => c.key === sortConfig.column);
    if (!col || col.key === 'symbol' || col.key === 'name') return stocks;
    
    return [...stocks].sort((a, b) => {
      const aVal = col.getValue(a);
      const bVal = col.getValue(b);
      
      // Handle nulls - push to end
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      
      const diff = aVal - bVal;
      return sortConfig.direction === 'asc' ? diff : -diff;
    });
  }, [stocks, sortConfig]);

  if (isLoading) {
    return (
      <div className="space-y-1 p-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stocks || stocks.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No stocks found matching your filters
      </div>
    );
  }

  return (
    <div>
      {/* Desktop: Header with sortable columns */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
        {visibleColumns.map(col => {
          const isSorted = sortConfig.column === col.key;
          const canSort = col.key !== 'symbol' && col.key !== 'name';
          
          return (
            <button
              key={col.key}
              onClick={() => canSort && onSortChange(col.key)}
              disabled={!canSort}
              className={cn(
                col.width,
                col.key !== 'symbol' && col.key !== 'name' && 'text-right',
                'text-[10px] font-medium text-muted-foreground flex items-center gap-0.5',
                col.key !== 'symbol' && col.key !== 'name' && 'justify-end',
                canSort && 'hover:text-foreground cursor-pointer transition-colors',
                isSorted && 'text-primary',
                col.filterKey && activeFilters.has(col.filterKey) && 'text-primary font-semibold'
              )}
            >
              {col.label}
              {isSorted && (
                sortConfig.direction === 'desc' 
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronUp className="h-3 w-3" />
              )}
            </button>
          );
        })}
        {showInsights && (
          <div className="w-32 flex-shrink-0 flex items-center gap-1 text-[10px] font-medium text-amber-500">
            <Sparkles className="h-3 w-3" />
            Insight
            {insightsLoading && (
              <span className="text-[9px] text-muted-foreground animate-pulse">loading...</span>
            )}
          </div>
        )}
        <div className="w-36 flex-shrink-0 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <Newspaper className="h-3 w-3" />
          Daily Digest
        </div>
      </div>
      
      {/* Mobile: sort control */}
      <div className="sm:hidden flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
        <span className="text-[10px] text-muted-foreground">{totalCount.toLocaleString()} results</span>
        <Select value={sortConfig.column} onValueChange={onSortChange}>
          <SelectTrigger className="h-6 text-[10px] w-auto gap-1 border-none bg-transparent px-1">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="change" className="text-xs">% Change</SelectItem>
            <SelectItem value="price" className="text-xs">Price</SelectItem>
            <SelectItem value="marketCap" className="text-xs">Market Cap</SelectItem>
            <SelectItem value="volume" className="text-xs">Volume</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Stock rows — cards on mobile, table rows on desktop */}
      <div className="max-h-[500px] overflow-y-auto">
        {sortedStocks.map(stock => (
          <div key={stock.symbol}>
            {/* Mobile card */}
            <div className="sm:hidden">
              <StockRowMobile 
                stock={stock} 
                onClick={() => onStockClick(stock.symbol)}
                showInsights={showInsights}
                insight={insights.get(stock.symbol)}
              />
            </div>
            {/* Desktop row */}
            <div className="hidden sm:block">
              <StockRow 
                stock={stock} 
                onClick={() => onStockClick(stock.symbol)}
                visibleColumns={visibleColumns}
                showInsights={showInsights}
                insight={insights.get(stock.symbol)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalCount > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between px-3 py-3 border-t border-border bg-muted/20">
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            {startItem}-{endItem} of {totalCount.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page numbers — show fewer on mobile */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 3) {
                  pageNum = i;
                } else if (currentPage < 2) {
                  pageNum = i;
                } else if (currentPage > totalPages - 3) {
                  pageNum = totalPages - 3 + i;
                } else {
                  pageNum = currentPage - 1 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 text-xs",
                      currentPage === pageNum && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => onPageChange(pageNum)}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
              
              {totalPages > 3 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-xs text-muted-foreground px-1">...</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-xs"
                    onClick={() => onPageChange(totalPages - 1)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasMore}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterDropdown({ 
  label, 
  value, 
  options, 
  onChange,
  icon: Icon
}: { 
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon: React.ElementType;
}) {
  const selectedLabel = options.find(o => o.value === value)?.label || label;
  const isFiltered = value !== 'all';
  
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(
          "h-7 text-[11px] w-full min-w-[100px]",
          isFiltered && "border-primary bg-primary/5"
        )}>
          <SelectValue placeholder={label}>
            <span className={cn(isFiltered && "text-primary font-medium")}>
              {selectedLabel}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Market Cap custom filter component
function MarketCapFilter({
  direction,
  value1,
  value2,
  onDirectionChange,
  onValue1Change,
  onValue2Change,
}: {
  direction: string;
  value1: string;
  value2: string;
  onDirectionChange: (d: string) => void;
  onValue1Change: (v: string) => void;
  onValue2Change: (v: string) => void;
}) {
  const isActive = direction !== 'any';

  const parseDisplayValue = (raw: string): string => {
    const num = parseFloat(raw);
    if (!raw || isNaN(num)) return '';
    return raw;
  };

  return (
    <div className="flex flex-col gap-1 col-span-2">
      <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Building2 className="h-3 w-3" />
        Market Cap
      </Label>
      <div className="flex items-center gap-1.5">
        <Select value={direction} onValueChange={onDirectionChange}>
          <SelectTrigger className={cn(
            "h-7 text-[11px] w-[90px] shrink-0",
            isActive && "border-primary bg-primary/5"
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MARKET_CAP_DIRECTION_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {direction !== 'any' && (
          <>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="e.g. 1000000000"
                value={parseDisplayValue(value1)}
                onChange={(e) => onValue1Change(e.target.value)}
                className="h-7 text-[11px] pl-5 w-[130px]"
              />
            </div>
            {direction === 'between' && (
              <>
                <span className="text-[10px] text-muted-foreground">and</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="e.g. 10000000000"
                    value={parseDisplayValue(value2)}
                    onChange={(e) => onValue2Change(e.target.value)}
                    className="h-7 text-[11px] pl-5 w-[130px]"
                  />
                </div>
              </>
            )}
            {/* Quick preset buttons */}
            <div className="flex gap-0.5 flex-wrap">
              {MARKET_CAP_PRESETS.slice(direction === 'below' ? 0 : 3, direction === 'above' ? undefined : 7).map(preset => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-1.5"
                  onClick={() => {
                    if (direction === 'between' && value1) {
                      onValue2Change(String(preset.value));
                    } else {
                      onValue1Change(String(preset.value));
                    }
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function ActiveFilterBadges({ 
  filters, 
  onClearFilter,
  onClearAll,
  marketCapLabel
}: { 
  filters: FilterState;
  onClearFilter: (key: keyof FilterState | 'marketCapCustom') => void;
  onClearAll: () => void;
  marketCapLabel?: string;
}) {
  const activeFilters: { key: keyof FilterState | 'marketCapCustom'; label: string }[] = [];
  
  // Add market cap custom filter if active
  if (marketCapLabel) {
    activeFilters.push({ key: 'marketCapCustom', label: `Mkt Cap: ${marketCapLabel}` });
  }

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== 'all' && key !== 'marketCap') {
      const config = FILTER_CONFIG[key as keyof FilterState];
      const opt = config.options.find(o => o.value === value);
      if (opt) {
        activeFilters.push({ 
          key: key as keyof FilterState, 
          label: `${config.label}: ${opt.label}` 
        });
      }
    }
  });

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 border-b border-border bg-muted/20">
      <span className="text-[10px] text-muted-foreground mr-1">Active ({activeFilters.length}):</span>
      {activeFilters.slice(0, 5).map(({ key, label }) => (
        <Badge 
          key={key} 
          variant="secondary" 
          className="h-5 text-[10px] gap-1 cursor-pointer hover:bg-destructive/20"
          onClick={() => onClearFilter(key)}
        >
          {label}
          <X className="h-2.5 w-2.5" />
        </Badge>
      ))}
      {activeFilters.length > 5 && (
        <Badge variant="outline" className="h-5 text-[10px]">
          +{activeFilters.length - 5} more
        </Badge>
      )}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-5 text-[10px] px-2 ml-auto"
        onClick={onClearAll}
      >
        Clear All
      </Button>
    </div>
  );
}

function FilterCategory({ 
  name, 
  filterKeys, 
  filters, 
  onFilterChange,
  marketCapFilter
}: { 
  name: string;
  filterKeys: (keyof FilterState)[];
  filters: FilterState;
  onFilterChange: (key: keyof FilterState) => (value: string) => void;
  marketCapFilter?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{name}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {filterKeys.map(key => {
          if (key === 'marketCap' && marketCapFilter) {
            return <span key={key}>{marketCapFilter}</span>;
          }
          const config = FILTER_CONFIG[key];
          return (
            <FilterDropdown
              key={key}
              label={config.label}
              value={filters[key]}
              options={config.options}
              onChange={onFilterChange(key)}
              icon={config.icon}
            />
          );
        })}
      </div>
    </div>
  );
}

// =====================
// Main Component
// =====================

export function UnifiedDiscoveryScreener() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Restore persisted state from sessionStorage
  const stored = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('screener-state');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const [activeTab, setActiveTab] = useState<TabId>(stored?.activeTab || 'topGainers');
  const [filters, setFilters] = useState<FilterState>(stored?.filters || DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(stored?.showFilters || false);
  const [currentPage, setCurrentPage] = useState(stored?.currentPage || 0);
  const [sortConfig, setSortConfig] = useState<SortConfig>(stored?.sortConfig || { column: 'change', direction: 'desc' });
  const [customFilters, setCustomFilters] = useState<CustomFiltersPayload>(stored?.customFilters || {});
  const [userVisibleColumnKeys, setUserVisibleColumnKeys] = useState<Set<string>>(loadSavedColumns);
  
  // Sector filter state
  const [sectorFilter, setSectorFilter] = useState<string>(stored?.sectorFilter || 'all');

  // Custom market cap state
  const [mcDirection, setMcDirection] = useState<string>(stored?.mcDirection || 'any');
  const [mcValue1, setMcValue1] = useState<string>(stored?.mcValue1 || '');
  const [mcValue2, setMcValue2] = useState<string>(stored?.mcValue2 || '');

  // Debounced versions of market cap values for queries
  const [debouncedMcValue1, setDebouncedMcValue1] = useState(stored?.debouncedMcValue1 || '');
  const [debouncedMcValue2, setDebouncedMcValue2] = useState(stored?.debouncedMcValue2 || '');
  const mcDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const debounceMcUpdate = useCallback((v1: string, v2: string) => {
    if (mcDebounceRef.current) clearTimeout(mcDebounceRef.current);
    mcDebounceRef.current = setTimeout(() => {
      setDebouncedMcValue1(v1);
      setDebouncedMcValue2(v2);
      setCurrentPage(0);
    }, 500);
  }, []);

  // Persist screener state to sessionStorage
  useEffect(() => {
    const state = {
      activeTab, filters, showFilters, currentPage, sortConfig, customFilters,
      mcDirection, mcValue1, mcValue2, debouncedMcValue1, debouncedMcValue2,
      sectorFilter,
    };
    sessionStorage.setItem('screener-state', JSON.stringify(state));
  }, [activeTab, filters, showFilters, currentPage, sortConfig, customFilters, mcDirection, mcValue1, mcValue2, debouncedMcValue1, debouncedMcValue2, sectorFilter]);

  // AI Insights state
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState<Map<string, StockInsight>>(new Map());
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Compute active filter keys as a Set for StockList
  const activeFilterKeys = useMemo(() => {
    const keys = new Set<keyof FilterState>();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== 'all') {
        keys.add(key as keyof FilterState);
      }
    });
    return keys;
  }, [filters]);

  const activeFilterCount = useMemo(() => 
    Object.values(filters).filter(v => v !== 'all').length,
    [filters]
  );

  const hasActiveFilters = activeFilterCount > 0;

  // Reset page when tab or filters change
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setCurrentPage(0);
  };

  // Check if fundamental filters are active - this affects how we apply tab filters
  const hasFundamentalFilters = useMemo(() => {
    return mcDirection !== 'any' || 
           filters.peRatio !== 'all' || 
           filters.forwardPE !== 'all' ||
           filters.peg !== 'all' ||
           filters.priceToBook !== 'all' ||
           filters.evEbitda !== 'all' ||
           filters.beta !== 'all' ||
           filters.avgVolume !== 'all';
  }, [filters, mcDirection]);

  // Build query filters based on active tab + fundamental filters
  // Must be stable with useCallback to avoid stale closures in useQuery
  const buildQueryFilters = useMemo(() => {
    return (tabFilters: ScreenerFilters, offset: number = 0): ScreenerFilters => {
      // When fundamental filters are active, remove the tab-specific change requirements
      // to allow more stocks through for filtering by fundamentals
      const combined: ScreenerFilters = { ...tabFilters };
      
      if (hasFundamentalFilters) {
        // Remove change requirements when filtering by fundamentals
        delete combined.minChange1D;
        delete combined.maxChange1D;
        delete combined.minRelativeVolume;
      }
      
      // Market Cap filter (custom numeric)
      if (mcDirection !== 'any') {
        const v1 = parseFloat(debouncedMcValue1);
        const v2 = parseFloat(debouncedMcValue2);
        if (mcDirection === 'above' && !isNaN(v1)) {
          combined.minMarketCap = v1;
        } else if (mcDirection === 'below' && !isNaN(v1)) {
          combined.maxMarketCap = v1;
        } else if (mcDirection === 'between' && !isNaN(v1) && !isNaN(v2)) {
          combined.minMarketCap = Math.min(v1, v2);
          combined.maxMarketCap = Math.max(v1, v2);
        }
      }

      // Volume filter
      const volOption = AVG_VOLUME_OPTIONS.find(o => o.value === filters.avgVolume);
      if (volOption && filters.avgVolume !== 'all') {
        if (volOption.min !== undefined) combined.minVolume = volOption.min;
      }

      // P/E Ratio filter
      const peOption = PE_RATIO_OPTIONS.find(o => o.value === filters.peRatio);
      if (peOption && filters.peRatio !== 'all') {
        if (peOption.min !== undefined) combined.minPE = peOption.min;
        if (peOption.max !== undefined) combined.maxPE = peOption.max;
      }

      // Forward P/E filter
      const fwdPEOption = FORWARD_PE_OPTIONS.find(o => o.value === filters.forwardPE);
      if (fwdPEOption && filters.forwardPE !== 'all') {
        if (fwdPEOption.min !== undefined) combined.minForwardPE = fwdPEOption.min;
        if (fwdPEOption.max !== undefined) combined.maxForwardPE = fwdPEOption.max;
      }

      // PEG filter
      const pegOption = PEG_OPTIONS.find(o => o.value === filters.peg);
      if (pegOption && filters.peg !== 'all') {
        if (pegOption.min !== undefined) combined.minPEG = pegOption.min;
        if (pegOption.max !== undefined) combined.maxPEG = pegOption.max;
      }

      // P/B filter
      const pbOption = PRICE_TO_BOOK_OPTIONS.find(o => o.value === filters.priceToBook);
      if (pbOption && filters.priceToBook !== 'all') {
        if (pbOption.min !== undefined) combined.minPB = pbOption.min;
        if (pbOption.max !== undefined) combined.maxPB = pbOption.max;
      }

      // EV/EBITDA filter
      const evOption = EV_EBITDA_OPTIONS.find(o => o.value === filters.evEbitda);
      if (evOption && filters.evEbitda !== 'all') {
        if (evOption.min !== undefined) combined.minEvEbitda = evOption.min;
        if (evOption.max !== undefined) combined.maxEvEbitda = evOption.max;
      }

      // Operating Margin filter
      const opOption = OP_MARGIN_OPTIONS.find(o => o.value === filters.opMargin);
      if (opOption && filters.opMargin !== 'all') {
        if (opOption.min !== undefined) combined.minOpMargin = opOption.min;
        if (opOption.max !== undefined) combined.maxOpMargin = opOption.max;
      }

      // Debt/Equity filter
      const deOption = DEBT_EQUITY_OPTIONS.find(o => o.value === filters.debtEquity);
      if (deOption && filters.debtEquity !== 'all') {
        if (deOption.min !== undefined) combined.minDebtEquity = deOption.min;
        if (deOption.max !== undefined) combined.maxDebtEquity = deOption.max;
      }

      // Quick Ratio filter
      const qrOption = QUICK_RATIO_OPTIONS.find(o => o.value === filters.quickRatio);
      if (qrOption && filters.quickRatio !== 'all') {
        if (qrOption.min !== undefined) combined.minQuickRatio = qrOption.min;
        if (qrOption.max !== undefined) combined.maxQuickRatio = qrOption.max;
      }

      // Volatility filter
      const volOption2 = VOLATILITY_OPTIONS.find(o => o.value === filters.volatility);
      if (volOption2 && filters.volatility !== 'all') {
        if (volOption2.min !== undefined) combined.minVolatility = volOption2.min;
        if (volOption2.max !== undefined) combined.maxVolatility = volOption2.max;
      }

      // Beta filter
      const betaOption = BETA_OPTIONS.find(o => o.value === filters.beta);
      if (betaOption && filters.beta !== 'all') {
        if (betaOption.min !== undefined) combined.minBeta = betaOption.min;
        if (betaOption.max !== undefined) combined.maxBeta = betaOption.max;
      }

      // EPS Growth filter
      const epsOption = EPS_GROWTH_OPTIONS.find(o => o.value === filters.epsGrowth);
      if (epsOption && filters.epsGrowth !== 'all') {
        if (epsOption.min !== undefined) combined.minEpsGrowth = epsOption.min;
        if (epsOption.max !== undefined) combined.maxEpsGrowth = epsOption.max;
      }

      // Revenue Growth filter
      const revOption = REVENUE_GROWTH_OPTIONS.find(o => o.value === filters.revenueGrowth);
      if (revOption && filters.revenueGrowth !== 'all') {
        if (revOption.min !== undefined) combined.minRevenueGrowth = revOption.min;
        if (revOption.max !== undefined) combined.maxRevenueGrowth = revOption.max;
      }
      
      // Sector filter
      if (sectorFilter !== 'all') {
        combined.sectors = [sectorFilter];
      }

      // Pagination
      combined.limit = ITEMS_PER_PAGE;
      combined.offset = offset;

      // Custom filters
      if (Object.keys(customFilters).length > 0) {
        combined.customFilters = customFilters;
      }
      
      return combined;
    };
  }, [filters, hasFundamentalFilters, customFilters, mcDirection, debouncedMcValue1, debouncedMcValue2, sectorFilter]);

  // Top Gainers query
  const { data: gainersData, isLoading: loadingGainers } = useQuery({
    queryKey: ['screener', 'topGainers-full', filters, currentPage, mcDirection, debouncedMcValue1, debouncedMcValue2],
    queryFn: async () => {
      const baseFilters: ScreenerFilters = {
        minChange1D: 2,
        minPrice: 2,
        minVolume: 500000,
        sortBy: 'change',
        sortDirection: 'desc',
      };
      return await screenStocksFromPolygon(buildQueryFilters(baseFilters, currentPage * ITEMS_PER_PAGE));
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev: any) => prev,
    enabled: activeTab === 'topGainers',
  });

  // Most Active query
  const { data: mostActiveData, isLoading: loadingActive } = useQuery({
    queryKey: ['screener', 'mostActive-full', filters, currentPage, mcDirection, debouncedMcValue1, debouncedMcValue2],
    queryFn: async () => {
      const baseFilters: ScreenerFilters = {
        minPrice: 2,
        minVolume: 500000,
        sortBy: 'volume',
        sortDirection: 'desc',
      };
      return await screenStocksFromPolygon(buildQueryFilters(baseFilters, currentPage * ITEMS_PER_PAGE));
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev: any) => prev,
    enabled: activeTab === 'mostActive',
  });

  // Momentum query
  const { data: momentumData, isLoading: loadingMomentum } = useQuery({
    queryKey: ['screener', 'smallCapMomentum-full', filters, currentPage, mcDirection, debouncedMcValue1, debouncedMcValue2],
    queryFn: async () => {
      const screenConfig = QUICK_SCREENS['smallCapMomentum'];
      if (!screenConfig) return { results: [], count: 0, pagination: { hasMore: false, total: 0 } };
      return await screenStocksFromPolygon(buildQueryFilters(screenConfig.filters, currentPage * ITEMS_PER_PAGE));
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev: any) => prev,
    enabled: activeTab === 'momentum',
  });

  // Unusual Volume query
  const { data: unusualVolData, isLoading: loadingUnusual } = useQuery({
    queryKey: ['screener', 'unusualVolume-full', filters, currentPage, mcDirection, debouncedMcValue1, debouncedMcValue2],
    queryFn: async () => {
      const screenConfig = QUICK_SCREENS['unusualVolume'];
      if (!screenConfig) return { results: [], count: 0, pagination: { hasMore: false, total: 0 } };
      return await screenStocksFromPolygon(buildQueryFilters(screenConfig.filters, currentPage * ITEMS_PER_PAGE));
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev: any) => prev,
    enabled: activeTab === 'unusualVolume',
  });

  const handleStockClick = (symbol: string) => {
    window.open(`/stock/${symbol}`, '_blank');
  };

  const handleFilterChange = (key: keyof FilterState) => (value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0); // Reset to first page when filters change

    // Ensure we actually refetch from the backend when a filter changes.
    // (We’ve seen cases where the UI selection changes but the previous query result
    // stays rendered due to caching/stale query state.)
    queryClient.invalidateQueries({ queryKey: ['screener'] });
  };

  const handleClearFilter = (key: keyof FilterState) => {
    setFilters(prev => ({ ...prev, [key]: 'all' }));
    setCurrentPage(0);
    queryClient.invalidateQueries({ queryKey: ['screener'] });
  };

  const handleClearAllFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setMcDirection('any');
    setMcValue1('');
    setMcValue2('');
    setDebouncedMcValue1('');
    setDebouncedMcValue2('');
    if (mcDebounceRef.current) clearTimeout(mcDebounceRef.current);
    setCurrentPage(0);
    queryClient.invalidateQueries({ queryKey: ['screener'] });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'topGainers':
        return { 
          stocks: gainersData?.results, 
          isLoading: loadingGainers,
          totalCount: gainersData?.pagination?.total || gainersData?.count || 0,
          hasMore: gainersData?.pagination?.hasMore || false
        };
      case 'mostActive':
        return { 
          stocks: mostActiveData?.results, 
          isLoading: loadingActive,
          totalCount: mostActiveData?.pagination?.total || mostActiveData?.count || 0,
          hasMore: mostActiveData?.pagination?.hasMore || false
        };
      case 'momentum':
        return { 
          stocks: momentumData?.results, 
          isLoading: loadingMomentum,
          totalCount: momentumData?.pagination?.total || momentumData?.count || 0,
          hasMore: momentumData?.pagination?.hasMore || false
        };
      case 'unusualVolume':
        return { 
          stocks: unusualVolData?.results, 
          isLoading: loadingUnusual,
          totalCount: unusualVolData?.pagination?.total || unusualVolData?.count || 0,
          hasMore: unusualVolData?.pagination?.hasMore || false
        };
      default:
        return { stocks: undefined, isLoading: false, totalCount: 0, hasMore: false };
    }
  };

  const { stocks, isLoading, totalCount, hasMore } = getTabData();

  // Generate insights asynchronously when stocks change and insights are enabled
  useEffect(() => {
    if (!showInsights || !stocks || stocks.length === 0) {
      return;
    }

    setInsightsLoading(true);
    
    // Build filter object for context
    const activeFiltersObj: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      activeFiltersObj[key] = value;
    });

    generateBatchInsights(stocks, activeFiltersObj)
      .then((newInsights) => {
        setInsights(newInsights);
        setInsightsLoading(false);
      })
      .catch(() => {
        setInsightsLoading(false);
      });
  }, [showInsights, stocks, filters]);

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-3 px-3 sm:px-6">
        {/* Screener Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Stock Screener</CardTitle>
              <p className="text-[10px] text-muted-foreground hidden sm:block">Filter stocks by fundamentals and technicals</p>
            </div>
          </div>
        </div>
        
        {/* Primary Filters - Always visible with clear label */}
        <div className="pt-3 pb-3 px-3 -mx-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Quick Filters</span>
          </div>
          {FILTER_CATEGORIES.filter(c => c.isPrimary).map(category => (
            <FilterCategory
              key={category.name}
              name=""
              filterKeys={category.filters}
              filters={filters}
              onFilterChange={handleFilterChange}
              marketCapFilter={
                <MarketCapFilter
                  direction={mcDirection}
                  value1={mcValue1}
                  value2={mcValue2}
                  onDirectionChange={(d) => {
                    setMcDirection(d);
                    if (d === 'any') {
                      setMcValue1(''); setMcValue2('');
                      setDebouncedMcValue1(''); setDebouncedMcValue2('');
                      if (mcDebounceRef.current) clearTimeout(mcDebounceRef.current);
                    }
                    setCurrentPage(0);
                    queryClient.invalidateQueries({ queryKey: ['screener'] });
                  }}
                  onValue1Change={(v) => {
                    setMcValue1(v);
                    debounceMcUpdate(v, mcValue2);
                  }}
                  onValue2Change={(v) => {
                    setMcValue2(v);
                    debounceMcUpdate(mcValue1, v);
                  }}
                />
              }
            />
          ))}
        </div>

        {/* Tab Navigation — horizontal scroll on mobile */}
        <div className="pt-3 -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className="flex gap-1 items-center overflow-x-auto scrollbar-hide pb-1">
            {SCREENER_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 text-xs gap-1 sm:gap-1.5 transition-all shrink-0 px-2.5 sm:px-3',
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                  <span className="xs:hidden sm:hidden">{tab.label.split(' ')[0]}</span>
                </Button>
              );
            })}
            
            {/* More Filters button */}
            <Button 
              variant={showFilters ? 'default' : 'outline'}
              size="sm" 
              className={cn(
                "h-8 text-xs gap-1 sm:gap-1.5 ml-auto transition-all shrink-0",
                !showFilters && "border-primary/50 text-primary hover:bg-primary/10 hover:text-primary",
                showFilters && "bg-primary text-primary-foreground shadow-sm"
              )}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{showFilters ? 'Hide Advanced' : 'Advanced Filters'}</span>
              <span className="sm:hidden">{showFilters ? 'Hide' : 'Filters'}</span>
              {hasActiveFilters && !showFilters && activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-4 min-w-4 p-0 text-[9px] flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
              {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Extended Filter Panel */}
        {showFilters && (
          <div className="pt-4 mt-3 space-y-4 bg-muted/20 -mx-3 px-3 pb-3 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Advanced Screening Filters</span>
            </div>
            {FILTER_CATEGORIES.filter(c => !c.isPrimary).map(category => (
              <FilterCategory
                key={category.name}
                name={category.name}
                filterKeys={category.filters}
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            ))}
            
            {/* Custom Filter Builder */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Custom Metric Filters</h4>
              <CustomFilterBuilder onChange={(cf) => { setCustomFilters(cf); setCurrentPage(0); queryClient.invalidateQueries({ queryKey: ['screener'] }); }} />
            </div>
            
            {hasActiveFilters && (
              <div className="flex justify-end pt-2 border-t border-border/50">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-7"
                  onClick={handleClearAllFilters}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0 pt-0">
        {/* AI Insights Toggle */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="show-insights"
              checked={showInsights}
              onCheckedChange={(checked) => setShowInsights(checked === true)}
            />
            <Label 
              htmlFor="show-insights" 
              className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Show AI Insights</span>
              <span className="sm:hidden">AI Insights</span>
            </Label>
          </div>
          <div className="flex items-center gap-2">
            {showInsights && (
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Explains why each stock matches your criteria
              </span>
            )}
            <ColumnSettings onChange={setUserVisibleColumnKeys} />
          </div>
        </div>
        
        <ActiveFilterBadges 
          filters={filters}
          onClearFilter={(key) => {
            if (key === 'marketCapCustom') {
              setMcDirection('any');
              setMcValue1('');
              setMcValue2('');
              setDebouncedMcValue1('');
              setDebouncedMcValue2('');
              if (mcDebounceRef.current) clearTimeout(mcDebounceRef.current);
              setCurrentPage(0);
              queryClient.invalidateQueries({ queryKey: ['screener'] });
            } else {
              handleClearFilter(key as keyof FilterState);
            }
          }}
          onClearAll={handleClearAllFilters}
          marketCapLabel={
            mcDirection !== 'any' 
              ? `${mcDirection === 'above' ? '>' : mcDirection === 'below' ? '<' : ''} ${mcValue1 ? formatMarketCap(parseFloat(mcValue1)) : '...'}${mcDirection === 'between' && mcValue2 ? ` - ${formatMarketCap(parseFloat(mcValue2))}` : ''}`
              : undefined
          }
        />
        <StockList 
          stocks={stocks} 
          isLoading={isLoading} 
          onStockClick={handleStockClick}
          currentPage={currentPage}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          hasMore={hasMore}
          activeFilters={activeFilterKeys}
          sortConfig={sortConfig}
          onSortChange={(column) => {
            setSortConfig(prev => ({
              column,
              direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc'
            }));
          }}
          showInsights={showInsights}
          insights={insights}
          insightsLoading={insightsLoading}
          userVisibleColumnKeys={userVisibleColumnKeys}
        />
      </CardContent>
    </Card>
  );
}
