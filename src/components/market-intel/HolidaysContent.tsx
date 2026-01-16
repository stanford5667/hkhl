import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Globe, MapPin, History } from 'lucide-react';

interface MarketHoliday {
  date: string;
  name: string;
  markets: string[];
  type: 'closed' | 'early';
}

const marketHolidays: MarketHoliday[] = [
  { date: '2026-01-20', name: "Martin Luther King Jr. Day", markets: ['US'], type: 'closed' },
  { date: '2026-02-17', name: "Presidents' Day", markets: ['US'], type: 'closed' },
  { date: '2026-04-03', name: "Good Friday", markets: ['US', 'UK', 'EU'], type: 'closed' },
  { date: '2026-04-06', name: "Easter Monday", markets: ['UK', 'EU'], type: 'closed' },
  { date: '2026-05-04', name: "Early May Bank Holiday", markets: ['UK'], type: 'closed' },
  { date: '2026-05-25', name: "Memorial Day", markets: ['US'], type: 'closed' },
  { date: '2026-07-03', name: "Independence Day (Observed)", markets: ['US'], type: 'early' },
  { date: '2026-09-07', name: "Labor Day", markets: ['US'], type: 'closed' },
  { date: '2026-11-26', name: "Thanksgiving Day", markets: ['US'], type: 'closed' },
  { date: '2026-11-27', name: "Day After Thanksgiving", markets: ['US'], type: 'early' },
  { date: '2026-12-24', name: "Christmas Eve", markets: ['US'], type: 'early' },
  { date: '2026-12-25', name: "Christmas Day", markets: ['US', 'UK', 'EU'], type: 'closed' },
  { date: '2026-01-01', name: "New Year's Day 2026", markets: ['US', 'UK', 'EU'], type: 'closed' },
];

const marketFlags: Record<string, { flag: string; name: string }> = {
  'US': { flag: '🇺🇸', name: 'United States' },
  'UK': { flag: '🇬🇧', name: 'United Kingdom' },
  'EU': { flag: '🇪🇺', name: 'Europe' },
  'JP': { flag: '🇯🇵', name: 'Japan' },
  'CN': { flag: '🇨🇳', name: 'China' },
};

const HolidayCard = ({ holiday, formatDate, getDaysUntil }: { 
  holiday: MarketHoliday; 
  formatDate: (date: string) => string;
  getDaysUntil: (date: string) => string;
}) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
    <div className="flex items-center gap-3">
      <div className="text-center min-w-[50px]">
        <p className="text-lg font-bold">{new Date(holiday.date).getDate()}</p>
        <p className="text-xs text-muted-foreground">{new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' })}</p>
      </div>
      <div>
        <p className="font-medium text-sm">{holiday.name}</p>
        <div className="flex items-center gap-1 mt-1">
          {holiday.markets.map((market) => (
            <span key={market} className="text-sm" title={marketFlags[market]?.name}>
              {marketFlags[market]?.flag}
            </span>
          ))}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge variant={holiday.type === 'closed' ? 'destructive' : 'outline'} className="text-[10px]">
        {holiday.type === 'closed' ? 'Closed' : 'Early Close'}
      </Badge>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{getDaysUntil(holiday.date)}</span>
    </div>
  </div>
);

export function HolidaysContent() {
  const [activeTab, setActiveTab] = useState('upcoming');
  
  const tabs = [
    { id: 'upcoming', label: 'Upcoming', icon: Clock },
    { id: 'past', label: 'Past', icon: History },
    { id: 'US', label: 'US Markets', icon: Globe },
    { id: 'UK', label: 'UK Markets', icon: Globe },
  ];

  const today = new Date();
  const upcoming = marketHolidays
    .filter(h => new Date(h.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = marketHolidays
    .filter(h => new Date(h.date) < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return `${diffDays} days`;
  };

  const getFilteredHolidays = () => {
    switch (activeTab) {
      case 'upcoming': return upcoming;
      case 'past': return past;
      case 'US': return marketHolidays.filter(h => h.markets.includes('US')).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'UK': return marketHolidays.filter(h => h.markets.includes('UK')).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      default: return upcoming;
    }
  };

  const filteredHolidays = getFilteredHolidays();

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
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Next Holiday</span>
                <p className="text-lg font-bold mt-1">{upcoming.length > 0 ? getDaysUntil(upcoming[0].date) : 'N/A'}</p>
                <p className="text-xs text-muted-foreground truncate">{upcoming.length > 0 ? upcoming[0].name : '-'}</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">This Month</span>
                <p className="text-2xl font-bold">
                  {upcoming.filter(h => {
                    const holidayDate = new Date(h.date);
                    return holidayDate.getMonth() === today.getMonth() && holidayDate.getFullYear() === today.getFullYear();
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground">Market Holidays</p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Full Closures</span>
                <p className="text-2xl font-bold text-destructive">
                  {filteredHolidays.filter(h => h.type === 'closed').length}
                </p>
                <p className="text-xs text-muted-foreground">Markets Closed</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground">Early Closes</span>
                <p className="text-2xl font-bold text-yellow-500">
                  {filteredHolidays.filter(h => h.type === 'early').length}
                </p>
                <p className="text-xs text-muted-foreground">Shortened Sessions</p>
              </CardContent>
            </Card>
          </div>

          {/* Market Legend */}
          <Card className="bg-secondary/20">
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-muted-foreground font-medium">Markets:</span>
                {Object.entries(marketFlags).map(([code, { flag, name }]) => (
                  <span key={code} className="flex items-center gap-1">
                    <span>{flag}</span>
                    <span className="text-muted-foreground">{name}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Holidays List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {tabs.find(t => t.id === activeTab)?.label} Market Holidays
                <Badge variant="secondary" className="ml-2">{filteredHolidays.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredHolidays.map((holiday) => (
                  <HolidayCard 
                    key={`${holiday.date}-${holiday.name}`} 
                    holiday={holiday}
                    formatDate={formatDate}
                    getDaysUntil={getDaysUntil}
                  />
                ))}
                {filteredHolidays.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No holidays found for this filter
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
