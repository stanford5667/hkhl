import { useState, useMemo } from 'react';
import { Plus, Search, Building2, Filter, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateCompanyDialog } from '@/components/companies/CreateCompanyDialog';
import { CompanyCard } from '@/components/companies/CompanyCard';
import { CompanyCardSkeleton } from '@/components/companies/CompanyCardSkeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const INDUSTRIES = [
  'All Industries',
  'Technology',
  'Healthcare',
  'Consumer',
  'Industrial',
  'Financial Services',
  'Energy',
  'Real Estate',
  'Media & Entertainment',
  'Other',
];

type TabType = 'all' | 'pipeline' | 'portfolio' | 'passed';

export default function Companies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companies, loading, refetch } = useCompanies();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [industryFilter, setIndustryFilter] = useState('All Industries');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: 0, pipeline: 0, portfolio: 0, passed: 0 };
    companies.forEach((c: any) => {
      counts.all++;
      if (c.company_type === 'pipeline') counts.pipeline++;
      else if (c.company_type === 'portfolio') counts.portfolio++;
      else if (c.company_type === 'passed') counts.passed++;
    });
    return counts;
  }, [companies]);

  // Calculate total value
  const totalValue = useMemo(() => {
    return companies.reduce((sum: number, c: any) => sum + (c.revenue_ltm || 0), 0);
  }, [companies]);

  // Stale deals warning
  const staleDeals = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return companies.filter((c: any) => 
      c.company_type === 'pipeline' && new Date(c.updated_at) < thirtyDaysAgo
    );
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company: any) => {
      const matchesSearch =
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab =
        activeTab === 'all' || company.company_type === activeTab;

      const matchesIndustry =
        industryFilter === 'All Industries' ||
        company.industry === industryFilter;

      return matchesSearch && matchesTab && matchesIndustry;
    });
  }, [companies, searchQuery, activeTab, industryFilter]);

  const handleCreateCompany = async (values: {
    name: string;
    industry?: string;
    website?: string;
    company_type: 'pipeline' | 'portfolio' | 'prospect';
    pipeline_stage?: string;
  }) => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    const { error } = await supabase.from('companies').insert({
      user_id: user.id,
      name: values.name,
      industry: values.industry || null,
      website: values.website || null,
      company_type: values.company_type,
      pipeline_stage: values.pipeline_stage || 'sourcing',
    });

    if (error) {
      toast.error('Failed to create company');
      console.error(error);
      return;
    }

    toast.success(`Company "${values.name}" created`);
    refetch();
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Value Proposition Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Your Investment Universe
          </h1>
          <p className="text-muted-foreground mt-1">
            Track every opportunity from first look to exit
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <span className="text-foreground font-medium">{companies.length}</span> companies • 
            <span className="text-foreground font-medium ml-1">${(totalValue / 1000).toFixed(0)}M</span> total value
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Urgency Banner */}
      {staleDeals.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <span className="text-sm text-warning">
            {staleDeals.length} pipeline deal{staleDeals.length > 1 ? 's' : ''} with no update in 30+ days
          </span>
          <Button variant="ghost" size="sm" className="ml-auto text-warning hover:text-warning">
            Review
          </Button>
        </div>
      )}

      {/* Smart Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <div className="flex items-center justify-between gap-4">
          <TabsList className="bg-surface-2">
            <TabsTrigger value="all" className="data-[state=active]:bg-card">
              All <Badge variant="secondary" className="ml-2 text-xs">{tabCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-card">
              Pipeline <Badge variant="secondary" className="ml-2 text-xs">{tabCounts.pipeline}</Badge>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-card">
              Portfolio <Badge variant="secondary" className="ml-2 text-xs">{tabCounts.portfolio}</Badge>
            </TabsTrigger>
            <TabsTrigger value="passed" className="data-[state=active]:bg-card">
              Passed <Badge variant="secondary" className="ml-2 text-xs">{tabCounts.passed}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute right-6 mt-2 z-50 bg-card border border-border rounded-lg p-4 shadow-xl">
                <div className="space-y-4 w-64">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Industry</label>
                    <Select value={industryFilter} onValueChange={setIndustryFilter}>
                      <SelectTrigger className="bg-surface-2 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>
                            {ind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </Tabs>

      {/* Companies Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CompanyCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 bg-surface-2 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No companies yet</h3>
          <p className="text-muted-foreground mb-4">Add your first company — takes 2 minutes</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filteredCompanies.map((company: any) => (
            <CompanyCard 
              key={company.id} 
              company={company}
              onClick={() => navigate(`/companies/${company.id}`)}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && filteredCompanies.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredCompanies.length} of {companies.length} companies
        </p>
      )}

      {/* Create Dialog */}
      <CreateCompanyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateCompany}
      />
    </div>
  );
}