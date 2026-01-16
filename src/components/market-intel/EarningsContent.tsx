import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle } from 'lucide-react';

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
  { symbol: 'AAPL', company: 'Apple Inc.', date: '2026-01-23', time: 'AMC', epsEstimate: 2.35, revenueEstimate: '$123.5B', status: 'upcoming' },
  { symbol: 'MSFT', company: 'Microsoft Corp.', date: '2026-01-28', time: 'AMC', epsEstimate: 3.12, revenueEstimate: '$68.2B', status: 'upcoming' },
  { symbol: 'GOOGL', company: 'Alphabet Inc.', date: '2026-01-30', time: 'AMC', epsEstimate: 1.89, revenueEstimate: '$92.1B', status: 'upcoming' },
  { symbol: 'AMZN', company: 'Amazon.com Inc.', date: '2026-01-30', time: 'AMC', epsEstimate: 1.45, revenueEstimate: '$186.4B', status: 'upcoming' },
  { symbol: 'META', company: 'Meta Platforms', date: '2026-01-29', time: 'AMC', epsEstimate: 5.22, revenueEstimate: '$45.8B', status: 'upcoming' },
  { symbol: 'NVDA', company: 'NVIDIA Corp.', date: '2026-02-19', time: 'AMC', epsEstimate: 0.85, revenueEstimate: '$38.5B', status: 'upcoming' },
  { symbol: 'JPM', company: 'JPMorgan Chase', date: '2026-01-14', time: 'BMO', epsEstimate: 4.15, epsActual: 4.81, revenueEstimate: '$42.2B', revenueActual: '$43.7B', surprise: 15.9, status: 'reported' },
  { symbol: 'UNH', company: 'UnitedHealth', date: '2026-01-15', time: 'BMO', epsEstimate: 6.72, epsActual: 6.89, revenueEstimate: '$100.8B', revenueActual: '$101.5B', surprise: 2.5, status: 'reported' },
  { symbol: 'GS', company: 'Goldman Sachs', date: '2026-01-15', time: 'BMO', epsEstimate: 8.25, epsActual: 11.95, revenueEstimate: '$12.4B', revenueActual: '$13.9B', surprise: 44.8, status: 'reported' },
  { symbol: 'BAC', company: 'Bank of America', date: '2026-01-16', time: 'BMO', epsEstimate: 0.77, epsActual: 0.82, revenueEstimate: '$25.1B', revenueActual: '$25.5B', surprise: 6.5, status: 'reported' },
];

const EarningsRow = ({ event, formatDate }: { event: EarningsEvent; formatDate: (date: string) => string }) => (
  <tr className="border-b border-border/50 hover:bg-secondary/30">
    <td className="py-3 px-2">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{event.symbol}</span>
      </div>
    </td>
    <td className="py-3 px-2 text-muted-foreground text-sm">{event.company}</td>
    <td className="py-3 px-2 text-sm">{formatDate(event.date)}</td>
    <td className="py-3 px-2">
      <Badge variant="outline" className="text-[10px]">
        {event.time}
      </Badge>
    </td>
    <td className="text-right py-3 px-2 font-medium">${event.epsEstimate.toFixed(2)}</td>
    {event.status === 'reported' && (
      <>
        <td className="text-right py-3 px-2 font-medium">${event.epsActual?.toFixed(2)}</td>
        <td className={`text-right py-3 px-2 font-medium ${(event.surprise || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          <div className="flex items-center justify-end gap-1">
            {(event.surprise || 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {(event.surprise || 0) >= 0 ? '+' : ''}{event.surprise?.toFixed(1)}%
          </div>
        </td>
      </>
    )}
    {event.status === 'upcoming' && (
      <td className="text-right py-3 px-2 text-sm text-muted-foreground">{event.revenueEstimate}</td>
    )}
  </tr>
);

export function EarningsContent() {
  const [activeTab, setActiveTab] = useState('upcoming');
  
  const tabs = [
    { id: 'upcoming', label: 'Upcoming', icon: Clock },
    { id: 'reported', label: 'Recently Reported', icon: CheckCircle },
    { id: 'beats', label: 'Top Beats', icon: TrendingUp },
    { id: 'misses', label: 'Misses', icon: TrendingDown },
  ];
  
  const upcoming = earningsEvents.filter(e => e.status === 'upcoming');
  const reported = earningsEvents.filter(e => e.status === 'reported');
  const beats = reported.filter(e => (e.surprise || 0) > 10).sort((a, b) => (b.surprise || 0) - (a.surprise || 0));
  const misses = reported.filter(e => (e.surprise || 0) < 0).sort((a, b) => (a.surprise || 0) - (b.surprise || 0));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getFilteredEvents = () => {
    switch (activeTab) {
      case 'upcoming': return upcoming;
      case 'reported': return reported;
      case 'beats': return beats;
      case 'misses': return misses;
      default: return upcoming;
    }
  };

  const filteredEvents = getFilteredEvents();

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 p-1 h-auto flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm"
            >
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">This Week</span>
                <p className="text-2xl font-bold">{upcoming.filter(e => {
                  const eventDate = new Date(e.date);
                  const now = new Date();
                  const weekEnd = new Date(now);
                  weekEnd.setDate(now.getDate() + 7);
                  return eventDate >= now && eventDate <= weekEnd;
                }).length}</p>
                <p className="text-xs text-muted-foreground">Earnings Reports</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Beat Rate</span>
                <p className="text-2xl font-bold text-emerald-500">
                  {reported.length > 0 ? Math.round((reported.filter(e => (e.surprise || 0) > 0).length / reported.length) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Last 10 Reports</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-500/10 border-emerald-500/30">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Biggest Beat</span>
                <p className="text-2xl font-bold text-emerald-500">
                  {beats.length > 0 ? `+${beats[0].surprise?.toFixed(0)}%` : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">{beats.length > 0 ? beats[0].symbol : '-'}</p>
              </CardContent>
            </Card>
            <Card className="bg-rose-500/10 border-rose-500/30">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Biggest Miss</span>
                <p className="text-2xl font-bold text-rose-500">
                  {misses.length > 0 ? `${misses[0].surprise?.toFixed(0)}%` : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">{misses.length > 0 ? misses[0].symbol : '-'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Earnings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {tabs.find(t => t.id === activeTab)?.label} Earnings
                <Badge variant="secondary" className="ml-2">{filteredEvents.length}</Badge>
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
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Time</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">EPS Est.</th>
                      {(activeTab === 'reported' || activeTab === 'beats' || activeTab === 'misses') && (
                        <>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">EPS Act.</th>
                          <th className="text-right py-3 px-2 font-medium text-muted-foreground">Surprise</th>
                        </>
                      )}
                      {activeTab === 'upcoming' && (
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">Rev Est.</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((event) => (
                      <EarningsRow key={event.symbol} event={event} formatDate={formatDate} />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
