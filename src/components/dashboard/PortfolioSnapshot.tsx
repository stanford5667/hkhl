import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PortfolioCompany {
  id: string;
  name: string;
  value: string;
  health: 'good' | 'warning' | 'critical';
}

const companies: PortfolioCompany[] = [
  { id: '1', name: 'TechCo Industries', value: '$245M', health: 'good' },
  { id: '2', name: 'Midwest Manufacturing', value: '$180M', health: 'good' },
  { id: '3', name: 'Healthcare Partners', value: '$165M', health: 'warning' },
  { id: '4', name: 'Beta Services', value: '$142M', health: 'good' },
  { id: '5', name: 'Acme Corp', value: '$115M', health: 'critical' },
];

function HealthDot({ status }: { status: PortfolioCompany['health'] }) {
  return (
    <div className={cn(
      'health-dot',
      status === 'good' && 'health-dot-good',
      status === 'warning' && 'health-dot-warning',
      status === 'critical' && 'health-dot-critical'
    )} />
  );
}

export function PortfolioSnapshot() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Portfolio Snapshot</CardTitle>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
          View all
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {companies.map((company) => (
          <button
            key={company.id}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left group"
          >
            <div className="h-9 w-9 rounded-lg bg-surface-3 flex items-center justify-center text-sm font-medium text-muted-foreground">
              {company.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground truncate block">{company.name}</span>
            </div>
            <span className="text-sm font-medium text-foreground tabular-nums">{company.value}</span>
            <HealthDot status={company.health} />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}