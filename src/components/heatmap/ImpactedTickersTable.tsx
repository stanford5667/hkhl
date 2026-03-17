import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Download, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import type { ThemeTicker } from '@/hooks/useInvestmentHeatmap';
import type { MarketTheme } from '@/data/marketThemes';
import { useNavigate } from 'react-router-dom';

interface Props {
  tickers: ThemeTicker[];
  isLoading: boolean;
  selectedTheme: MarketTheme | null;
}

type SortField = 'symbol' | 'price' | 'changePercent' | 'volume' | 'marketCap';
type SortDir = 'asc' | 'desc';

export function ImpactedTickersTable({ tickers, isLoading, selectedTheme }: Props) {
  const [sortField, setSortField] = useState<SortField>('changePercent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const navigate = useNavigate();

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }, [sortField]);

  const sorted = useMemo(() => {
    return [...tickers].sort((a, b) => {
      const aVal = a[sortField] ?? -Infinity;
      const bVal = b[sortField] ?? -Infinity;
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tickers, sortField, sortDir]);

  const exportCSV = useCallback(() => {
    const headers = ['Ticker', 'Company', 'Sector', 'Theme Exposure', 'Price', '% Change', 'Volume', 'Market Cap'];
    const rows = sorted.map(t => [
      t.symbol, t.name, t.sector, t.themeExposure,
      t.price?.toFixed(2) ?? '', t.changePercent?.toFixed(2) ?? '',
      t.volume?.toString() ?? '', t.marketCap?.toString() ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-tickers-${selectedTheme?.id || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted, selectedTheme]);

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={cn('h-3 w-3', sortField === field && 'text-primary')} />
    </button>
  );

  if (!selectedTheme) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Impacted Tickers</h2>
        </div>
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Select a theme to view impacted tickers
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Impacted Tickers</h2>
          <Badge variant="outline" className="text-xs">{tickers.length}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="py-2 px-2 text-left"><SortHeader field="symbol" label="Ticker" /></th>
                <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground">Company</th>
                <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Sector</th>
                <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Exposure</th>
                <th className="py-2 px-2 text-right"><SortHeader field="price" label="Price" /></th>
                <th className="py-2 px-2 text-right"><SortHeader field="changePercent" label="% Chg" /></th>
                <th className="py-2 px-2 text-right hidden md:table-cell"><SortHeader field="volume" label="Volume" /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => (
                <tr
                  key={t.symbol}
                  className="border-b border-border/10 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => navigate(`/stock/${t.symbol}`)}
                >
                  <td className="py-2.5 px-2 font-semibold text-foreground">{t.symbol}</td>
                  <td className="py-2.5 px-2 text-muted-foreground truncate max-w-[140px]">{t.name}</td>
                  <td className="py-2.5 px-2 text-muted-foreground hidden md:table-cell">
                    <Badge variant="secondary" className="text-[10px]">{t.sector}</Badge>
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground text-xs hidden lg:table-cell">{t.themeExposure}</td>
                  <td className="py-2.5 px-2 text-right font-medium text-foreground">
                    {t.price != null ? `$${t.price.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    {t.changePercent != null ? (
                      <span className={cn(
                        'flex items-center justify-end gap-1 font-medium',
                        t.changePercent > 0 ? 'text-emerald-400' : t.changePercent < 0 ? 'text-rose-400' : 'text-muted-foreground'
                      )}>
                        {t.changePercent > 0 ? <TrendingUp className="h-3 w-3" /> : t.changePercent < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                        {t.changePercent > 0 ? '+' : ''}{t.changePercent.toFixed(2)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right text-muted-foreground hidden md:table-cell">
                    {t.volume != null ? formatVolume(t.volume) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toString();
}
