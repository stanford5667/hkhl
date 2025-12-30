import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useAppCompanies, AppCompany } from '@/hooks/useAppData';
import { cn } from '@/lib/utils';
import { Building2 } from 'lucide-react';

function getHealthStatus(company: AppCompany): 'good' | 'warning' | 'critical' {
  // Simple health logic based on available data
  if (!company.revenue_ltm && !company.ebitda_ltm) return 'warning';
  if (company.ebitda_ltm && company.revenue_ltm) {
    const margin = company.ebitda_ltm / company.revenue_ltm;
    if (margin > 0.15) return 'good';
    if (margin > 0.05) return 'warning';
    return 'critical';
  }
  return 'good';
}

function formatValue(value: number | null): string {
  if (!value) return '-';
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  if (value >= 1) return `$${value.toFixed(0)}M`;
  return `$${(value * 1000).toFixed(0)}K`;
}

function HealthDot({ status }: { status: 'good' | 'warning' | 'critical' }) {
  return (
    <div className={cn(
      'h-2 w-2 rounded-full',
      status === 'good' && 'bg-emerald-500',
      status === 'warning' && 'bg-amber-500',
      status === 'critical' && 'bg-rose-500'
    )} />
  );
}

export function PortfolioSnapshot() {
  const navigate = useNavigate();
  const { companies, isLoading } = useAppCompanies({ company_type: 'portfolio' });
  
  // Show top 5 portfolio companies
  const portfolioCompanies = companies.slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Portfolio Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Portfolio Snapshot</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-primary"
          onClick={() => navigate('/companies?view=portfolio')}
        >
          View all
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {portfolioCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Building2 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No portfolio companies yet</p>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => navigate('/companies')}
              className="mt-1"
            >
              Add your first company
            </Button>
          </div>
        ) : (
          portfolioCompanies.map((company) => (
            <button
              key={company.id}
              onClick={() => navigate(`/companies/${company.id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left group"
            >
              <div className="h-9 w-9 rounded-lg bg-surface-3 flex items-center justify-center text-sm font-medium text-muted-foreground">
                {company.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground truncate block">
                  {company.name}
                </span>
                {company.industry && (
                  <span className="text-xs text-muted-foreground">{company.industry}</span>
                )}
              </div>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {formatValue(company.revenue_ltm)}
              </span>
              <HealthDot status={getHealthStatus(company)} />
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
