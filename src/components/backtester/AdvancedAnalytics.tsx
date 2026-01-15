/**
 * Advanced Analytics Components
 * 
 * Professional-grade visualization components for the terminal.
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════════
// CORRELATION MATRIX
// ═══════════════════════════════════════════════════════════════════════════════

interface CorrelationMatrixProps {
  data: { ticker: string; correlations: Record<string, number> }[];
  className?: string;
}

export function CorrelationMatrix({ data, className }: CorrelationMatrixProps) {
  const tickers = data.map(d => d.ticker);

  const getColor = (value: number) => {
    if (value === 1) return 'rgb(33,38,45)';
    if (value >= 0.8) return 'rgba(248,81,73,0.6)';
    if (value >= 0.5) return 'rgba(255,166,0,0.5)';
    if (value >= 0.2) return 'rgba(255,166,0,0.3)';
    if (value >= -0.2) return 'rgba(139,148,158,0.2)';
    if (value >= -0.5) return 'rgba(35,197,94,0.3)';
    return 'rgba(35,197,94,0.5)';
  };

  return (
    <div className={cn('overflow-auto', className)}>
      <table className="text-[10px] font-mono">
        <thead>
          <tr>
            <th className="p-1 text-[rgb(87,96,106)]"></th>
            {tickers.map(t => (
              <th key={t} className="p-1 text-[rgb(139,148,158)] font-medium">{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.ticker}>
              <td className="p-1 text-[rgb(139,148,158)] font-medium">{row.ticker}</td>
              {tickers.map(t => (
                <td
                  key={t}
                  className="p-1 text-center min-w-[36px]"
                  style={{ backgroundColor: getColor(row.correlations[t] || 0) }}
                >
                  <span className="text-[rgb(230,237,243)]">
                    {row.ticker === t ? '-' : (row.correlations[t] || 0).toFixed(2)}
                  </span>
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
// ALLOCATION DONUT CHART
// ═══════════════════════════════════════════════════════════════════════════════

interface AllocationChartProps {
  data: { symbol: string; weight: number; color: string }[];
  className?: string;
}

export function AllocationDonut({ data, className }: AllocationChartProps) {
  return (
    <div className={cn('h-48', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="weight"
            nameKey="symbol"
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0];
              return (
                <div className="bg-[rgb(17,21,28)] border border-[rgb(33,38,45)] rounded-lg px-3 py-2 text-xs">
                  <p className="font-mono font-semibold">{item.name}</p>
                  <p className="text-[rgb(139,148,158)]">{item.value}%</p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS GAUGE
// ═══════════════════════════════════════════════════════════════════════════════

interface MetricsGaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  thresholds?: { good: number; warning: number };
  format?: (v: number) => string;
  className?: string;
}

export function MetricsGauge({
  value,
  min,
  max,
  label,
  thresholds = { good: 0.7, warning: 0.4 },
  format = (v) => v.toFixed(2),
  className,
}: MetricsGaugeProps) {
  const percent = ((value - min) / (max - min)) * 100;
  const normalizedThresholdGood = ((thresholds.good * max - min) / (max - min)) * 100;
  const normalizedThresholdWarn = ((thresholds.warning * max - min) / (max - min)) * 100;

  const color = percent >= normalizedThresholdGood
    ? 'rgb(35,197,94)'
    : percent >= normalizedThresholdWarn
    ? 'rgb(255,166,0)'
    : 'rgb(248,81,73)';

  return (
    <div className={cn('text-center', className)}>
      <div className="relative w-24 h-12 mx-auto mb-1">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="rgb(33,38,45)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percent * 1.26} 126`}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="font-mono font-bold text-sm text-[rgb(230,237,243)]">
            {format(value)}
          </span>
        </div>
      </div>
      <p className="text-[9px] uppercase tracking-wider text-[rgb(87,96,106)]">{label}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK SCORE CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface RiskScoreProps {
  score: number; // 0-100
  label: string;
  description?: string;
  className?: string;
}

export function RiskScore({ score, label, description, className }: RiskScoreProps) {
  const color = score >= 70
    ? 'text-[rgb(35,197,94)]'
    : score >= 40
    ? 'text-[rgb(255,166,0)]'
    : 'text-[rgb(248,81,73)]';

  const bgColor = score >= 70
    ? 'bg-[rgba(35,197,94,0.1)]'
    : score >= 40
    ? 'bg-[rgba(255,166,0,0.1)]'
    : 'bg-[rgba(248,81,73,0.1)]';

  const rating = score >= 80 ? 'Excellent' 
    : score >= 60 ? 'Good' 
    : score >= 40 ? 'Moderate' 
    : score >= 20 ? 'Poor' 
    : 'Very Poor';

  return (
    <div className={cn('p-3 rounded-lg border border-[rgb(33,38,45)]', bgColor, className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] uppercase tracking-wider text-[rgb(87,96,106)]">{label}</span>
        <span className={cn('font-mono font-bold text-xl', color)}>{score}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[rgb(27,32,40)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${score}%`,
              backgroundColor: score >= 70 ? 'rgb(35,197,94)' : score >= 40 ? 'rgb(255,166,0)' : 'rgb(248,81,73)',
            }}
          />
        </div>
        <span className={cn('text-[10px] font-medium', color)}>{rating}</span>
      </div>
      {description && (
        <p className="text-[10px] text-[rgb(87,96,106)] mt-2">{description}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLING RETURNS CHART
// ═══════════════════════════════════════════════════════════════════════════════

interface RollingReturnsProps {
  data: { date: string; return1y: number; return3y?: number; return5y?: number }[];
  className?: string;
}

export function RollingReturnsChart({ data, className }: RollingReturnsProps) {
  // Calculate percentiles
  const returns1y = data.map(d => d.return1y).filter(Boolean);
  const sorted = [...returns1y].sort((a, b) => a - b);
  const p5 = sorted[Math.floor(sorted.length * 0.05)] || 0;
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;

  return (
    <div className={cn('', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] uppercase tracking-wider text-[rgb(87,96,106)]">
          Rolling 1Y Returns Distribution
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-[rgb(17,21,28)] rounded">
          <p className="text-[9px] text-[rgb(87,96,106)]">5th %ile</p>
          <p className="font-mono text-sm text-[rgb(248,81,73)]">{p5.toFixed(1)}%</p>
        </div>
        <div className="text-center p-2 bg-[rgb(17,21,28)] rounded">
          <p className="text-[9px] text-[rgb(87,96,106)]">Median</p>
          <p className="font-mono text-sm text-[rgb(230,237,243)]">{p50.toFixed(1)}%</p>
        </div>
        <div className="text-center p-2 bg-[rgb(17,21,28)] rounded">
          <p className="text-[9px] text-[rgb(87,96,106)]">95th %ile</p>
          <p className="font-mono text-sm text-[rgb(35,197,94)]">{p95.toFixed(1)}%</p>
        </div>
      </div>
      {/* Simple histogram */}
      <div className="h-16 flex items-end gap-0.5">
        {Array.from({ length: 20 }, (_, i) => {
          const min = p5 + (i / 20) * (p95 - p5);
          const max = p5 + ((i + 1) / 20) * (p95 - p5);
          const count = returns1y.filter(r => r >= min && r < max).length;
          const height = (count / returns1y.length) * 100 * 5;
          const color = min < 0 ? 'rgb(248,81,73)' : 'rgb(35,197,94)';
          return (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{ 
                height: `${Math.max(2, height)}%`,
                backgroundColor: color,
                opacity: 0.6 + (count / returns1y.length) * 2,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTOR EXPOSURE BAR
// ═══════════════════════════════════════════════════════════════════════════════

interface FactorExposureProps {
  factors: { name: string; exposure: number }[];
  className?: string;
}

export function FactorExposure({ factors, className }: FactorExposureProps) {
  const maxAbs = Math.max(...factors.map(f => Math.abs(f.exposure)));

  return (
    <div className={cn('space-y-2', className)}>
      {factors.map(factor => (
        <div key={factor.name} className="flex items-center gap-2">
          <span className="text-[10px] text-[rgb(139,148,158)] w-16 truncate">{factor.name}</span>
          <div className="flex-1 h-3 bg-[rgb(17,21,28)] rounded relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[rgb(48,54,61)]" />
            <div
              className="absolute top-0 bottom-0 rounded"
              style={{
                left: factor.exposure >= 0 ? '50%' : `${50 - (Math.abs(factor.exposure) / maxAbs) * 50}%`,
                width: `${(Math.abs(factor.exposure) / maxAbs) * 50}%`,
                backgroundColor: factor.exposure >= 0 ? 'rgb(56,139,253)' : 'rgb(248,81,73)',
              }}
            />
          </div>
          <span className={cn(
            'text-[10px] font-mono w-10 text-right',
            factor.exposure >= 0 ? 'text-[rgb(56,139,253)]' : 'text-[rgb(248,81,73)]'
          )}>
            {factor.exposure >= 0 ? '+' : ''}{factor.exposure.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS TABLE
// ═══════════════════════════════════════════════════════════════════════════════

interface StatsTableProps {
  stats: { label: string; portfolio: number | string; benchmark?: number | string; format?: string }[];
  className?: string;
}

export function StatsTable({ stats, className }: StatsTableProps) {
  const formatValue = (value: number | string, format?: string) => {
    if (typeof value === 'string') return value;
    switch (format) {
      case 'percent': return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
      case 'ratio': return value.toFixed(2);
      case 'currency': return `$${value.toLocaleString()}`;
      default: return value.toFixed(2);
    }
  };

  return (
    <table className={cn('w-full text-xs', className)}>
      <thead>
        <tr className="border-b border-[rgb(33,38,45)]">
          <th className="py-1 text-left text-[9px] uppercase tracking-wider text-[rgb(87,96,106)]">Metric</th>
          <th className="py-1 text-right text-[9px] uppercase tracking-wider text-[rgb(87,96,106)]">Portfolio</th>
          {stats.some(s => s.benchmark !== undefined) && (
            <th className="py-1 text-right text-[9px] uppercase tracking-wider text-[rgb(87,96,106)]">Benchmark</th>
          )}
        </tr>
      </thead>
      <tbody>
        {stats.map(stat => (
          <tr key={stat.label} className="border-b border-[rgb(27,31,36)]">
            <td className="py-1.5 text-[rgb(139,148,158)]">{stat.label}</td>
            <td className="py-1.5 text-right font-mono text-[rgb(230,237,243)]">
              {formatValue(stat.portfolio, stat.format)}
            </td>
            {stat.benchmark !== undefined && (
              <td className="py-1.5 text-right font-mono text-[rgb(87,96,106)]">
                {formatValue(stat.benchmark, stat.format)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default {
  CorrelationMatrix,
  AllocationDonut,
  MetricsGauge,
  RiskScore,
  RollingReturnsChart,
  FactorExposure,
  StatsTable,
};
