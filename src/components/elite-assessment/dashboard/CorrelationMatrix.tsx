import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  tickers: string[];
}

export function CorrelationMatrix({ tickers }: Props) {
  const [matrix, setMatrix] = useState<number[][] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    computeCorrelation();
  }, [tickers.join(',')]);

  async function computeCorrelation() {
    setLoading(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // ~45 days for 30 trading days

      const results = await Promise.all(
        tickers.map(async (ticker) => {
          const { data } = await supabase.functions.invoke('polygon-aggs', {
            body: { ticker, startDate, endDate, timespan: 'day' },
          });
          const bars = (data?.results || data?.bars || []) as any[];
          // Calculate daily returns
          const closes = bars.map((b: any) => b.c).filter(Boolean);
          const returns: number[] = [];
          for (let i = 1; i < closes.length; i++) {
            returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
          }
          return returns;
        })
      );

      // Trim all to same length (shortest)
      const minLen = Math.min(...results.map(r => r.length));
      const trimmed = results.map(r => r.slice(r.length - minLen));

      // Calculate correlation matrix
      const n = tickers.length;
      const corr: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) {
            corr[i][j] = 1;
          } else if (j > i) {
            const r = pearson(trimmed[i], trimmed[j]);
            corr[i][j] = r;
            corr[j][i] = r;
          }
        }
      }

      setMatrix(corr);
    } catch {
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Skeleton className="h-48 w-full rounded-lg" />;
  if (!matrix) return <div className="text-sm text-muted-foreground text-center py-8">Unable to compute correlations</div>;

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left text-muted-foreground font-medium text-xs"></th>
            {tickers.map(t => (
              <th key={t} className="p-2 text-center text-muted-foreground font-medium text-xs">{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickers.map((ticker, i) => (
            <tr key={ticker}>
              <td className="p-2 font-medium text-xs text-foreground">{ticker}</td>
              {tickers.map((_, j) => {
                const val = matrix[i][j];
                return (
                  <td
                    key={j}
                    className={cn(
                      'p-2 text-center text-xs font-mono rounded-sm',
                      getCorrColor(val)
                    )}
                  >
                    {val.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function getCorrColor(val: number): string {
  if (val >= 0.7) return 'bg-red-500/20 text-red-400';
  if (val >= 0.4) return 'bg-orange-500/15 text-orange-400';
  if (val >= 0.1) return 'bg-yellow-500/10 text-yellow-400';
  if (val >= -0.1) return 'bg-muted/50 text-muted-foreground';
  if (val >= -0.4) return 'bg-blue-500/10 text-blue-400';
  return 'bg-emerald-500/15 text-emerald-400';
}
