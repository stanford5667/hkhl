import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  tickers: string[];
  weights: number[];
  capitalAllocated: number;
  onMarketValueUpdate: (value: number) => void;
}

interface BarData {
  t: number; // timestamp ms
  c: number; // close
}

export function PortfolioBacktestChart({ tickers, weights, capitalAllocated, onMarketValueUpdate }: Props) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAndBlend();
  }, [tickers.join(',')]);

  async function fetchAndBlend() {
    setLoading(true);
    setError(null);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch all tickers + SPY benchmark in parallel
      const allTickers = [...new Set([...tickers, 'SPY'])];
      const results = await Promise.all(
        allTickers.map(async (ticker) => {
          const { data, error } = await supabase.functions.invoke('polygon-aggs', {
            body: { ticker, startDate, endDate, timespan: 'day' },
          });
          if (error) throw new Error(`Failed to fetch ${ticker}`);
          return { ticker, bars: (data?.results || data?.bars || []) as BarData[] };
        })
      );

      // Build date-indexed maps
      const tickerMap: Record<string, Record<string, number>> = {};
      for (const { ticker, bars } of results) {
        tickerMap[ticker] = {};
        for (const bar of bars) {
          const date = new Date(bar.t).toISOString().split('T')[0];
          tickerMap[ticker][date] = bar.c;
        }
      }

      // Get all dates where all tickers have data
      const allDates = Object.keys(tickerMap['SPY'] || {}).sort();
      const validDates = allDates.filter(d =>
        tickers.every(t => tickerMap[t]?.[d] !== undefined)
      );

      if (validDates.length < 2) {
        setError('Insufficient data');
        setLoading(false);
        return;
      }

      // Calculate normalized growth
      const firstDate = validDates[0];
      const data = validDates.map(date => {
        let portfolioGrowth = 0;
        for (let i = 0; i < tickers.length; i++) {
          const basePrice = tickerMap[tickers[i]][firstDate];
          const currentPrice = tickerMap[tickers[i]][date];
          portfolioGrowth += weights[i] * (currentPrice / basePrice);
        }

        const spyBase = tickerMap['SPY']?.[firstDate] || 1;
        const spyCurrent = tickerMap['SPY']?.[date] || spyBase;

        return {
          date,
          portfolio: +(capitalAllocated * portfolioGrowth).toFixed(0),
          spy: +(capitalAllocated * (spyCurrent / spyBase)).toFixed(0),
        };
      });

      setChartData(data);
      if (data.length > 0) {
        onMarketValueUpdate(data[data.length - 1].portfolio);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        {error}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short' })}
          stroke="hsl(var(--muted-foreground))"
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          stroke="hsl(var(--muted-foreground))"
          width={55}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: 12,
          }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
          labelFormatter={(d) => new Date(d).toLocaleDateString()}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="portfolio"
          name="Your Portfolio"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="spy"
          name="SPY Benchmark"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
