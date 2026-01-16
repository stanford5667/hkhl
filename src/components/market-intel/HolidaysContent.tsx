import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Globe } from 'lucide-react';

interface MarketHoliday {
  date: string;
  name: string;
  markets: string[];
  type: 'closed' | 'early';
}

const marketHolidays: MarketHoliday[] = [
  { date: '2026-01-01', name: "New Year's Day", markets: ['US', 'UK', 'EU', 'JP', 'CN', 'HK'], type: 'closed' },
  { date: '2026-01-20', name: 'Martin Luther King Jr. Day', markets: ['US'], type: 'closed' },
  { date: '2026-01-28', name: 'Chinese New Year', markets: ['CN', 'HK', 'SG', 'TW'], type: 'closed' },
  { date: '2026-01-29', name: 'Chinese New Year (Day 2)', markets: ['CN', 'HK', 'SG'], type: 'closed' },
  { date: '2026-02-11', name: 'National Foundation Day', markets: ['JP'], type: 'closed' },
  { date: '2026-02-16', name: "Presidents' Day", markets: ['US'], type: 'closed' },
  { date: '2026-03-20', name: 'Vernal Equinox Day', markets: ['JP'], type: 'closed' },
  { date: '2026-04-03', name: 'Good Friday', markets: ['US', 'UK', 'EU', 'HK', 'AU'], type: 'closed' },
  { date: '2026-04-06', name: 'Easter Monday', markets: ['UK', 'EU', 'AU', 'HK'], type: 'closed' },
  { date: '2026-05-01', name: 'Labour Day', markets: ['EU', 'CN', 'HK'], type: 'closed' },
  { date: '2026-05-04', name: 'Early May Bank Holiday', markets: ['UK'], type: 'closed' },
  { date: '2026-05-25', name: 'Memorial Day', markets: ['US'], type: 'closed' },
  { date: '2026-07-03', name: 'Independence Day (Early Close)', markets: ['US'], type: 'early' },
  { date: '2026-07-04', name: 'Independence Day', markets: ['US'], type: 'closed' },
  { date: '2026-09-07', name: 'Labor Day', markets: ['US'], type: 'closed' },
  { date: '2026-11-26', name: 'Thanksgiving Day', markets: ['US'], type: 'closed' },
  { date: '2026-11-27', name: 'Thanksgiving (Early Close)', markets: ['US'], type: 'early' },
  { date: '2026-12-24', name: 'Christmas Eve (Early Close)', markets: ['US', 'UK'], type: 'early' },
  { date: '2026-12-25', name: 'Christmas Day', markets: ['US', 'UK', 'EU', 'AU', 'HK'], type: 'closed' },
  { date: '2026-12-26', name: 'Boxing Day', markets: ['UK', 'AU', 'HK'], type: 'closed' },
];

const marketFlags: Record<string, { flag: string; name: string }> = {
  'US': { flag: '🇺🇸', name: 'United States' },
  'UK': { flag: '🇬🇧', name: 'United Kingdom' },
  'EU': { flag: '🇪🇺', name: 'Europe' },
  'JP': { flag: '🇯🇵', name: 'Japan' },
  'CN': { flag: '🇨🇳', name: 'China' },
  'HK': { flag: '🇭🇰', name: 'Hong Kong' },
  'SG': { flag: '🇸🇬', name: 'Singapore' },
  'TW': { flag: '🇹🇼', name: 'Taiwan' },
  'AU': { flag: '🇦🇺', name: 'Australia' },
};

export function HolidaysContent() {
  const today = new Date();
  const upcoming = marketHolidays.filter(h => new Date(h.date) >= today);
  const past = marketHolidays.filter(h => new Date(h.date) < today);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff} days`;
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(marketFlags).map(([code, { flag, name }]) => (
          <div key={code} className="flex items-center gap-1.5 text-sm">
            <span>{flag}</span>
            <span className="text-muted-foreground">{code}</span>
          </div>
        ))}
      </div>

      {/* Upcoming Holidays */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Upcoming Market Holidays 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcoming.map((holiday, idx) => (
              <div 
                key={`${holiday.date}-${idx}`}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[60px]">
                    <p className="text-xs text-muted-foreground">
                      {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                    <p className="text-2xl font-bold">
                      {new Date(holiday.date).getDate()}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium">{holiday.name}</h4>
                    <p className="text-xs text-muted-foreground">{formatDate(holiday.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {holiday.markets.map(market => (
                      <span key={market} title={marketFlags[market]?.name}>
                        {marketFlags[market]?.flag}
                      </span>
                    ))}
                  </div>
                  <Badge 
                    variant={holiday.type === 'closed' ? 'destructive' : 'outline'}
                    className="text-[10px]"
                  >
                    {holiday.type === 'closed' ? 'Closed' : 'Early Close'}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {getDaysUntil(holiday.date)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
