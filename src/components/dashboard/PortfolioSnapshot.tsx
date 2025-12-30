import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useAppCompanies } from '@/hooks/useAppData';
import { CompanyMiniCard } from '@/components/shared/CompanyMiniCard';
import { Building2 } from 'lucide-react';

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
            <Skeleton key={i} className="h-20 w-full" />
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
      <CardContent className="space-y-3">
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
            <CompanyMiniCard
              key={company.id}
              company={company}
              variant="compact"
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}