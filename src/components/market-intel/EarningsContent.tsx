import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, TrendingUp, TrendingDown, CheckCircle, Clock } from 'lucide-react';

interface EarningsEvent {
  symbol: string;
  company: string;
  date: string;
  time: 'BMO' | 'AMC' | 'During';
  epsEstimate: number;
  epsActual?: number;
  revenueEstimate: string;
  revenueActual?: string;
  surprise?: number;
  status: 'upcoming' | 'reported';
}

const earningsEvents: EarningsEvent[] = [
  // Upcoming
  { symbol: 'AAPL', company: 'Apple Inc.', date: '2026-01-30', time: 'AMC', epsEstimate: 2.35, revenueEstimate: '124.1B', status: 'upcoming' },
  { symbol: 'MSFT', company: 'Microsoft Corp.', date: '2026-01-28', time: 'AMC', epsEstimate: 3.12, revenueEstimate: '68.9B', status: 'upcoming' },
  { symbol: 'META', company: 'Meta Platforms', date: '2026-01-29', time: 'AMC', epsEstimate: 6.75, revenueEstimate: '46.8B', status: 'upcoming' },
  { symbol: 'AMZN', company: 'Amazon.com', date: '2026-01-30', time: 'AMC', epsEstimate: 1.48, revenueEstimate: '186.2B', status: 'upcoming' },
  { symbol: 'GOOGL', company: 'Alphabet Inc.', date: '2026-02-04', time: 'AMC', epsEstimate: 2.05, revenueEstimate: '96.5B', status: 'upcoming' },
  
  // Recent
  { symbol: 'TSLA', company: 'Tesla Inc.', date: '2026-01-15', time: 'AMC', epsEstimate: 0.72, epsActual: 0.85, revenueEstimate: '25.8B', revenueActual: '26.2B', surprise: 18.1, status: 'reported' },
  { symbol: 'NFLX', company: 'Netflix Inc.', date: '2026-01-14', time: 'AMC', epsEstimate: 4.52, epsActual: 4.89, revenueEstimate: '10.1B', revenueActual: '10.3B', surprise: 8.2, status: 'reported' },
  { symbol: 'JPM', company: 'JPMorgan Chase', date: '2026-01-10', time: 'BMO', epsEstimate: 4.85, epsActual: 5.12, revenueEstimate: '42.5B', revenueActual: '43.1B', surprise: 5.6, status: 'reported' },
  { symbol: 'BAC', company: 'Bank of America', date: '2026-01-10', time: 'BMO', epsEstimate: 0.82, epsActual: 0.78, revenueEstimate: '25.2B', revenueActual: '24.8B', surprise: -4.9, status: 'reported' },
];

export function EarningsContent() {
  const upcoming = earningsEvents.filter(e => e.status === 'upcoming');
  const reported = earningsEvents.filter(e => e.status === 'reported');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Upcoming Earnings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Upcoming Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Symbol</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Company</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Time</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">EPS Est.</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Rev. Est.</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((event) => (
                  <tr key={`${event.symbol}-${event.date}`} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer">
                    <td className="py-3 px-2 font-semibold">{event.symbol}</td>
                    <td className="py-3 px-2 text-muted-foreground">{event.company}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(event.date)}
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <Badge variant="outline" className="text-[10px]">
                        {event.time}
                      </Badge>
                    </td>
                    <td className="text-right py-3 px-2">${event.epsEstimate.toFixed(2)}</td>
                    <td className="text-right py-3 px-2">${event.revenueEstimate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Earnings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            Recent Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Symbol</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Company</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">EPS Est.</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">EPS Actual</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Surprise</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reported.map((event) => (
                  <tr key={`${event.symbol}-${event.date}`} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer">
                    <td className="py-3 px-2 font-semibold">{event.symbol}</td>
                    <td className="py-3 px-2 text-muted-foreground">{event.company}</td>
                    <td className="py-3 px-2 text-muted-foreground">{formatDate(event.date)}</td>
                    <td className="text-right py-3 px-2">${event.epsEstimate.toFixed(2)}</td>
                    <td className="text-right py-3 px-2 font-medium">${event.epsActual?.toFixed(2)}</td>
                    <td className={`text-right py-3 px-2 font-medium ${(event.surprise || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {(event.surprise || 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {(event.surprise || 0) >= 0 ? '+' : ''}{event.surprise?.toFixed(1)}%
                      </div>
                    </td>
                    <td className="text-right py-3 px-2">${event.revenueActual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
