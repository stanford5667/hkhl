import { useState, useMemo } from 'react';
import { Plus, Search, List, Columns, Grid3X3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppCompanies, CompanyStage } from '@/hooks/useAppData';
import { CompanyListView } from '@/components/companies/CompanyListView';
import { PipelineKanbanView } from '@/components/companies/PipelineKanbanView';
import { PortfolioGridView } from '@/components/companies/PortfolioGridView';
import { CompanyCreationWizard } from '@/components/companies/CompanyCreationWizard';
import { Skeleton } from '@/components/ui/skeleton';

type ViewType = 'list' | 'pipeline' | 'portfolio';
type StageFilter = 'all' | 'pipeline' | 'portfolio' | 'passed';

export default function Companies() {
  const navigate = useNavigate();
  const { companies, loading, createCompany, updateStage, updatePipelineStage, deleteCompany } = useAppCompanies();
  const [view, setView] = useState<ViewType>('list');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  // Calculate counts
  const counts = useMemo(() => {
    return {
      all: companies.length,
      pipeline: companies.filter(c => c.company_type === 'pipeline').length,
      portfolio: companies.filter(c => c.company_type === 'portfolio').length,
      passed: companies.filter(c => c.company_type === 'passed').length,
    };
  }, [companies]);

  // Calculate totals
  const totalValue = useMemo(() => {
    return companies.reduce((sum, c) => sum + (c.revenue_ltm || 0), 0);
  }, [companies]);

  // Filter companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.industry?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === 'all' || c.company_type === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [companies, searchQuery, stageFilter]);

  const handleUpdateStage = async (companyId: string, stage: CompanyStage, subStage?: string) => {
    await updateStage(companyId, stage, subStage);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Companies</h1>
          <p className="text-muted-foreground">All your opportunities in one place</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* View Switcher */}
          <div className="flex bg-muted rounded-lg p-1">
            <Button 
              variant={view === 'list' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button 
              variant={view === 'pipeline' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setView('pipeline')}
            >
              <Columns className="h-4 w-4 mr-1" />
              Pipeline
            </Button>
            <Button 
              variant={view === 'portfolio' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setView('portfolio')}
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Portfolio
            </Button>
          </div>
          
          <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Stage Filter Tabs */}
      <div className="flex items-center gap-4">
        <Tabs value={stageFilter} onValueChange={(v) => setStageFilter(v as StageFilter)}>
          <TabsList className="bg-muted">
            <TabsTrigger value="all">
              All
              <Badge className="ml-2 bg-muted-foreground/20">{counts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pipeline">
              <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
              Pipeline
              <Badge className="ml-2 bg-blue-600/30 text-blue-400">{counts.pipeline}</Badge>
            </TabsTrigger>
            <TabsTrigger value="portfolio">
              <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
              Portfolio
              <Badge className="ml-2 bg-emerald-600/30 text-emerald-400">{counts.portfolio}</Badge>
            </TabsTrigger>
            <TabsTrigger value="passed">
              <div className="h-2 w-2 rounded-full bg-slate-500 mr-2" />
              Passed
              <Badge className="ml-2 bg-slate-600/30">{counts.passed}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Quick Stats */}
        <div className="ml-auto flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Total Value:</span>
            <span className="text-foreground font-medium ml-2">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <>
          {view === 'list' && (
            <CompanyListView 
              companies={filteredCompanies} 
              onUpdateStage={handleUpdateStage}
              onDelete={deleteCompany}
            />
          )}
          {view === 'pipeline' && (
            <PipelineKanbanView 
              companies={filteredCompanies}
              onUpdatePipelineStage={updatePipelineStage}
            />
          )}
          {view === 'portfolio' && (
            <PortfolioGridView 
              companies={filteredCompanies}
              onViewChange={setView}
            />
          )}
        </>
      )}

      {/* Creation Wizard */}
      <CompanyCreationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreate={createCompany}
        onComplete={(company) => {
          if (company.company_type === 'pipeline') setView('pipeline');
          else if (company.company_type === 'portfolio') setView('portfolio');
          navigate(`/companies/${company.id}`);
        }}
      />
    </div>
  );
}
