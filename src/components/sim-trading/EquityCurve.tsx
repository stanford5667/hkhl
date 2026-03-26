import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';

interface Props {
  portfolioId: string;
  initialCapital: number;
}

interface SnapshotData {
  date: string;
  value: number;
  change: number;
}

export function EquityCurve({ portfolioId, initialCapital }: Props) {
  const [data, setData] = useState<SnapshotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: snapshots } = await supabase
        .from('sim_snapshots')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('snapshot_date', { ascending: true });

      if (snapshots && snapshots.length > 0) {
        setData(snapshots.map((s: any) => ({
          date: s.snapshot_date,
          value: Number(s.total_value),
          change: ((Number(s.total_value) - initialCapital) / initialCapital) * 100,
        })));
      }
      setLoading(false);
    };
    fetch();
  }, [portfolioId, initialCapital]);

  if (loading) return <div className="text-muted-foreground text-center py-8">Loading performance data...</div>;

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No performance data yet. Trade and refresh to generate snapshots over time.</p>
          <p className="text-xs text-muted-foreground mt-2">Portfolio value is tracked each time you view this page.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Equity Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tickFormatter={v => format(parseISO(v), 'MM/dd')} className="text-xs" />
            <YAxis domain={['auto', 'auto']} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} className="text-xs" />
            <Tooltip 
              formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Value']}
              labelFormatter={v => format(parseISO(v as string), 'MMM d, yyyy')}
            />
            <ReferenceLine y={initialCapital} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label="Initial" />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
