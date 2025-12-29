import { useState, useMemo } from 'react';
import { Plus, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CompanyTypeFilter, CompanyType } from '@/components/companies/CompanyTypeFilter';
import { CompaniesTable } from '@/components/companies/CompaniesTable';
import { CreateCompanyDialog } from '@/components/companies/CreateCompanyDialog';
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

export default function Companies() {
  const { user } = useAuth();
  const { companies, loading, refetch } = useCompanies();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CompanyType>('all');
  const [industryFilter, setIndustryFilter] = useState('All Industries');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch =
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        typeFilter === 'all' || (company as any).company_type === typeFilter;

      const matchesIndustry =
        industryFilter === 'All Industries' ||
        company.industry === industryFilter;

      return matchesSearch && matchesType && matchesIndustry;
    });
  }, [companies, searchQuery, typeFilter, industryFilter]);

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

  const handleDeleteCompany = async (company: any) => {
    const { error } = await supabase.from('companies').delete().eq('id', company.id);
    if (error) {
      toast.error('Failed to delete company');
      return;
    }
    toast.success('Company deleted');
    refetch();
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Companies
          </h1>
          <p className="text-muted-foreground mt-1">
            Master list of all companies in your deal universe
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <CompanyTypeFilter value={typeFilter} onChange={setTypeFilter} />
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[160px] bg-card border-border">
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

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span>
          Showing <span className="text-foreground font-medium">{filteredCompanies.length}</span> of{' '}
          <span className="text-foreground font-medium">{companies.length}</span> companies
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <CompaniesTable
          companies={filteredCompanies}
          onDelete={handleDeleteCompany}
        />
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
