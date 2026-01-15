/**
 * Terminal Design System
 * 
 * Bloomberg-terminal inspired components for professional traders.
 * High information density, keyboard-first, real-time aesthetics.
 */

import React, { useState, useEffect, useCallback, useMemo, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

export const TERMINAL_COLORS = {
  // Background layers
  bg: {
    base: 'rgb(8, 12, 16)',
    elevated: 'rgb(13, 17, 23)',
    panel: 'rgb(17, 21, 28)',
    hover: 'rgb(22, 27, 34)',
    active: 'rgb(27, 32, 40)',
  },
  // Text hierarchy
  text: {
    primary: 'rgb(230, 237, 243)',
    secondary: 'rgb(139, 148, 158)',
    muted: 'rgb(87, 96, 106)',
    inverse: 'rgb(8, 12, 16)',
  },
  // Semantic colors
  semantic: {
    positive: 'rgb(35, 197, 94)',
    positiveSubtle: 'rgba(35, 197, 94, 0.15)',
    negative: 'rgb(248, 81, 73)',
    negativeSubtle: 'rgba(248, 81, 73, 0.15)',
    warning: 'rgb(255, 166, 0)',
    warningSubtle: 'rgba(255, 166, 0, 0.15)',
    info: 'rgb(56, 139, 253)',
    infoSubtle: 'rgba(56, 139, 253, 0.15)',
  },
  // Accent colors (Bloomberg-inspired)
  accent: {
    orange: 'rgb(255, 123, 0)',
    cyan: 'rgb(0, 200, 200)',
    yellow: 'rgb(255, 204, 0)',
    blue: 'rgb(0, 122, 204)',
  },
  // Border
  border: {
    default: 'rgb(33, 38, 45)',
    subtle: 'rgb(27, 31, 36)',
    strong: 'rgb(48, 54, 61)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SPARKLINE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: 'positive' | 'negative' | 'neutral' | 'auto';
  showArea?: boolean;
  className?: string;
}

export function Sparkline({ 
  data, 
  width = 80, 
  height = 24, 
  color = 'auto',
  showArea = true,
  className 
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  // Determine color
  const trend = data[data.length - 1] - data[0];
  const strokeColor = color === 'auto' 
    ? trend >= 0 ? TERMINAL_COLORS.semantic.positive : TERMINAL_COLORS.semantic.negative
    : color === 'positive' ? TERMINAL_COLORS.semantic.positive
    : color === 'negative' ? TERMINAL_COLORS.semantic.negative
    : TERMINAL_COLORS.text.muted;

  const fillColor = color === 'auto'
    ? trend >= 0 ? TERMINAL_COLORS.semantic.positiveSubtle : TERMINAL_COLORS.semantic.negativeSubtle
    : color === 'positive' ? TERMINAL_COLORS.semantic.positiveSubtle
    : color === 'negative' ? TERMINAL_COLORS.semantic.negativeSubtle
    : 'rgba(139, 148, 158, 0.1)';

  return (
    <svg width={width} height={height} className={className}>
      {showArea && (
        <path d={areaPath} fill={fillColor} />
      )}
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={1.5} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2} fill={strokeColor} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC CELL - Core building block
// ═══════════════════════════════════════════════════════════════════════════════

interface MetricCellProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  sparklineData?: number[];
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'highlight' | 'warning' | 'danger';
  className?: string;
  onClick?: () => void;
}

export function MetricCell({
  label,
  value,
  subValue,
  change,
  changeLabel,
  trend,
  sparklineData,
  size = 'md',
  variant = 'default',
  className,
  onClick,
}: MetricCellProps) {
  const sizes = {
    sm: { label: 'text-[9px]', value: 'text-sm', change: 'text-[10px]' },
    md: { label: 'text-[10px]', value: 'text-lg', change: 'text-xs' },
    lg: { label: 'text-xs', value: 'text-2xl', change: 'text-sm' },
  };

  const variants = {
    default: 'bg-[rgb(17,21,28)]',
    highlight: 'bg-[rgba(56,139,253,0.1)] border-[rgb(56,139,253)]',
    warning: 'bg-[rgba(255,166,0,0.1)] border-[rgb(255,166,0)]',
    danger: 'bg-[rgba(248,81,73,0.1)] border-[rgb(248,81,73)]',
  };

  const changeColor = change !== undefined
    ? change > 0 ? 'text-[rgb(35,197,94)]' : change < 0 ? 'text-[rgb(248,81,73)]' : 'text-[rgb(139,148,158)]'
    : '';

  const ChangeIcon = change !== undefined
    ? change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus
    : null;

  return (
    <div 
      className={cn(
        'p-2 rounded border border-[rgb(33,38,45)] transition-all',
        variants[variant],
        onClick && 'cursor-pointer hover:border-[rgb(48,54,61)] hover:bg-[rgb(22,27,34)]',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn(
            'uppercase tracking-wider text-[rgb(139,148,158)] font-medium truncate',
            sizes[size].label
          )}>
            {label}
          </p>
          <p className={cn(
            'font-mono font-semibold text-[rgb(230,237,243)] mt-0.5',
            sizes[size].value
          )}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subValue && (
            <p className="text-[10px] text-[rgb(87,96,106)] font-mono mt-0.5">
              {subValue}
            </p>
          )}
        </div>
        
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline data={sparklineData} width={48} height={20} />
        )}
      </div>
      
      {(change !== undefined || changeLabel) && (
        <div className={cn('flex items-center gap-1 mt-1', changeColor, sizes[size].change)}>
          {ChangeIcon && <ChangeIcon className="h-3 w-3" />}
          <span className="font-mono font-medium">
            {change !== undefined && (change > 0 ? '+' : '')}{change?.toFixed(2)}%
          </span>
          {changeLabel && <span className="text-[rgb(87,96,106)]">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

interface LiveIndicatorProps {
  status: 'live' | 'delayed' | 'stale' | 'error';
  timestamp?: Date;
  className?: string;
}

export function LiveIndicator({ status, timestamp, className }: LiveIndicatorProps) {
  const configs = {
    live: { color: 'bg-[rgb(35,197,94)]', label: 'LIVE', pulse: true },
    delayed: { color: 'bg-[rgb(255,166,0)]', label: '15M DELAY', pulse: false },
    stale: { color: 'bg-[rgb(139,148,158)]', label: 'STALE', pulse: false },
    error: { color: 'bg-[rgb(248,81,73)]', label: 'ERROR', pulse: false },
  };

  const config = configs[status];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="relative">
        <div className={cn('h-1.5 w-1.5 rounded-full', config.color)} />
        {config.pulse && (
          <div className={cn('absolute inset-0 h-1.5 w-1.5 rounded-full animate-ping', config.color, 'opacity-75')} />
        )}
      </div>
      <span className="text-[9px] font-mono uppercase tracking-wider text-[rgb(139,148,158)]">
        {config.label}
      </span>
      {timestamp && (
        <span className="text-[9px] font-mono text-[rgb(87,96,106)]">
          {timestamp.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL HEADER
// ═══════════════════════════════════════════════════════════════════════════════

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'default' | 'positive' | 'negative' | 'warning';
  status?: 'live' | 'delayed' | 'stale' | 'error';
  actions?: React.ReactNode;
  className?: string;
}

export function PanelHeader({
  title,
  subtitle,
  badge,
  badgeVariant = 'default',
  status,
  actions,
  className,
}: PanelHeaderProps) {
  const badgeColors = {
    default: 'bg-[rgb(33,38,45)] text-[rgb(139,148,158)]',
    positive: 'bg-[rgba(35,197,94,0.2)] text-[rgb(35,197,94)]',
    negative: 'bg-[rgba(248,81,73,0.2)] text-[rgb(248,81,73)]',
    warning: 'bg-[rgba(255,166,0,0.2)] text-[rgb(255,166,0)]',
  };

  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-2 border-b border-[rgb(33,38,45)] bg-[rgb(13,17,23)]',
      className
    )}>
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[rgb(230,237,243)]">
              {title}
            </h3>
            {badge && (
              <span className={cn(
                'px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded',
                badgeColors[badgeVariant]
              )}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] text-[rgb(87,96,106)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {status && <LiveIndicator status={status} />}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TERMINAL PANEL
// ═══════════════════════════════════════════════════════════════════════════════

interface TerminalPanelProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function TerminalPanel({ children, className, noPadding }: TerminalPanelProps) {
  return (
    <div className={cn(
      'bg-[rgb(13,17,23)] border border-[rgb(33,38,45)] rounded-lg overflow-hidden',
      !noPadding && 'p-3',
      className
    )}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA TABLE
// ═══════════════════════════════════════════════════════════════════════════════

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  selectedRow?: T;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  selectedRow,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[rgb(33,38,45)]">
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={cn(
                  'px-2 py-1.5 font-semibold uppercase tracking-wider text-[rgb(139,148,158)]',
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                )}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={cn(
                'border-b border-[rgb(27,31,36)] transition-colors',
                onRowClick && 'cursor-pointer hover:bg-[rgb(22,27,34)]',
                selectedRow === row && 'bg-[rgba(56,139,253,0.1)]'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(col => (
                <td
                  key={String(col.key)}
                  className={cn(
                    'px-2 py-1.5 font-mono text-[rgb(230,237,243)]',
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  )}
                >
                  {col.render
                    ? col.render(row[col.key as keyof T], row)
                    : String(row[col.key as keyof T] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUT BADGE
// ═══════════════════════════════════════════════════════════════════════════════

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd className={cn(
      'inline-flex items-center justify-center h-5 min-w-[20px] px-1.5',
      'text-[10px] font-mono font-medium',
      'bg-[rgb(27,32,40)] border border-[rgb(48,54,61)] rounded',
      'text-[rgb(139,148,158)]',
      className
    )}>
      {children}
    </kbd>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════════════════

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  variant?: 'default' | 'positive' | 'negative' | 'warning';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = 'sm',
  variant = 'default',
  className,
}: ProgressBarProps) {
  const percent = Math.min(100, (value / max) * 100);
  
  const colors = {
    default: 'bg-[rgb(56,139,253)]',
    positive: 'bg-[rgb(35,197,94)]',
    negative: 'bg-[rgb(248,81,73)]',
    warning: 'bg-[rgb(255,166,0)]',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'flex-1 bg-[rgb(27,32,40)] rounded-full overflow-hidden',
        size === 'sm' ? 'h-1' : 'h-2'
      )}>
        <div
          className={cn('h-full rounded-full transition-all', colors[variant])}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] font-mono text-[rgb(139,148,158)] w-10 text-right">
          {percent.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEAT MAP CELL
// ═══════════════════════════════════════════════════════════════════════════════

interface HeatMapCellProps {
  value: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  className?: string;
}

export function HeatMapCell({ value, min = -50, max = 50, format, className }: HeatMapCellProps) {
  const normalized = Math.max(-1, Math.min(1, (value - min) / (max - min) * 2 - 1));
  
  const bgColor = normalized >= 0
    ? `rgba(35, 197, 94, ${Math.abs(normalized) * 0.5})`
    : `rgba(248, 81, 73, ${Math.abs(normalized) * 0.5})`;
  
  const textColor = Math.abs(normalized) > 0.5 ? 'rgb(230,237,243)' : 'rgb(139,148,158)';

  return (
    <div
      className={cn('px-2 py-1 text-center font-mono text-xs', className)}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {format ? format(value) : value.toFixed(1)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TICKER BADGE
// ═══════════════════════════════════════════════════════════════════════════════

interface TickerBadgeProps {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export function TickerBadge({
  symbol,
  name,
  price,
  change,
  size = 'md',
  onClick,
  className,
}: TickerBadgeProps) {
  const changeColor = change !== undefined
    ? change >= 0 ? 'text-[rgb(35,197,94)]' : 'text-[rgb(248,81,73)]'
    : '';

  const sizes = {
    sm: { wrapper: 'px-2 py-1', symbol: 'text-xs', name: 'text-[9px]', price: 'text-[10px]' },
    md: { wrapper: 'px-3 py-1.5', symbol: 'text-sm', name: 'text-[10px]', price: 'text-xs' },
    lg: { wrapper: 'px-4 py-2', symbol: 'text-base', name: 'text-xs', price: 'text-sm' },
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 bg-[rgb(17,21,28)] border border-[rgb(33,38,45)] rounded-lg',
        onClick && 'cursor-pointer hover:border-[rgb(48,54,61)] hover:bg-[rgb(22,27,34)]',
        sizes[size].wrapper,
        className
      )}
      onClick={onClick}
    >
      <div>
        <p className={cn('font-mono font-bold text-[rgb(230,237,243)]', sizes[size].symbol)}>
          {symbol}
        </p>
        {name && (
          <p className={cn('text-[rgb(87,96,106)] truncate max-w-[100px]', sizes[size].name)}>
            {name}
          </p>
        )}
      </div>
      {(price !== undefined || change !== undefined) && (
        <div className="text-right">
          {price !== undefined && (
            <p className={cn('font-mono text-[rgb(230,237,243)]', sizes[size].price)}>
              ${price.toFixed(2)}
            </p>
          )}
          {change !== undefined && (
            <p className={cn('font-mono', changeColor, sizes[size].name)}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION DIVIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface SectionDividerProps {
  label?: string;
  className?: string;
}

export function SectionDivider({ label, className }: SectionDividerProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 h-px bg-[rgb(33,38,45)]" />
      {label && (
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[rgb(87,96,106)]">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-[rgb(33,38,45)]" />
    </div>
  );
}

export default {
  TERMINAL_COLORS,
  Sparkline,
  MetricCell,
  LiveIndicator,
  PanelHeader,
  TerminalPanel,
  DataTable,
  Kbd,
  ProgressBar,
  HeatMapCell,
  TickerBadge,
  SectionDivider,
};
