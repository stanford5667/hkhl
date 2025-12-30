import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: string;
  type: 'meeting' | 'deadline' | 'call';
}

const events: Event[] = [
  { id: '1', title: 'TechCo Board Meeting', date: 'Dec 31', type: 'meeting' },
  { id: '2', title: 'Beta IC Presentation', date: 'Jan 2', type: 'meeting' },
  { id: '3', title: 'Q4 Financials Due', date: 'Jan 5', type: 'deadline' },
  { id: '4', title: 'LP Call - Fund III', date: 'Jan 8', type: 'call' },
  { id: '5', title: 'Midwest Management', date: 'Jan 10', type: 'meeting' },
];

const typeColors = {
  meeting: 'bg-primary/20 text-primary',
  deadline: 'bg-warning/20 text-warning',
  call: 'bg-success/20 text-success',
};

export function UpcomingEvents() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Upcoming
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-3 py-2 border-b border-border last:border-0"
          >
            <span className="text-xs font-medium text-muted-foreground w-12">{event.date}</span>
            <span className="text-sm text-foreground flex-1 truncate">{event.title}</span>
            <Badge variant="outline" className={typeColors[event.type]}>
              {event.type}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}