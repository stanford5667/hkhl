import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAppCompanies, useAppTasks, useAppContacts } from '@/hooks/useAppData';
import { CompanyMiniCard } from '@/components/shared/CompanyMiniCard';
import { Building2 , Plus } from 'lucide-react';
import { useMemo } from 'react';

export function RecentCompaniesCard() {
  const navigate = useNavigate();
  const { companies, isLoading: companiesLoading } = useAppCompanies();
  const { tasks, isLoading: tasksLoading } = useAppTasks();
  const { contacts, isLoading: contactsLoading } = useAppContacts();
  
  const isLoading = companiesLoading || tasksLoading || contactsLoading;
  
  // Get top 6 recent companies with relationship counts
  const recentCompaniesWithCounts = useMemo(() => {
    return companies.slice(0, 6).map(company => {
      const openTasks = tasks.filter(
        t => t.company_id === company.id && t.status !== 'done'
      ).length;
      const companyContacts = contacts.filter(
        c => c.company_id === company.id
      ).length;
      
      return {
        company,
        counts: {
          tasks: openTasks,
          contacts: companyContacts,
        }
      };
    });
  }, [companies, tasks, contacts]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Recent Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-medium">Recent Companies</CardTitle>
          {companies.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {companies.length} total
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate('/companies?create=true')}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-primary"
            onClick={() => navigate('/companies')}
          >
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentCompaniesWithCounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Building2 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No companies yet</p>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => navigate('/companies?create=true')}
              className="mt-1"
            >
              Add your first company
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentCompaniesWithCounts.map(({ company, counts }) => (
              <CompanyMiniCard
                key={company.id}
                company={company}
                variant="detailed"
                counts={counts}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}