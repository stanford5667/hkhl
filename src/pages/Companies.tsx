import { useState, useMemo, useCallback } from 'react';
import { Plus, Search, List, Columns, Grid3X3, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppCompanies, CompanyStage } from '@/hooks/useAppData';
import { CompanyListView } from '@/components/companies/CompanyListView';
import { PipelineKanbanView } from '@/components/companies/PipelineKanbanView';
import { PortfolioGridView } from '@/components/companies/PortfolioGridView';
import { AddAssetWizard } from '@/components/companies/AddAssetWizard';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetTypeFilter, useAssetTypeFilter } from '@/components/shared/AssetTypeFilter';

type ViewType = 'list' | 'pipeline' | 'portfolio';
type StageFilter = 'all' | 'pipeline' | 'portfolio' | 'passed';

export type SortField = 'market_value' | 'revenue_ltm' | 'ebitda_ltm' | 'name' | 'updated_at' | 'health';
export type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'market_value', label: 'Market Cap' },
  { field: 'revenue_ltm', label: 'Revenue' },
  { field: 'ebitda_ltm', label: 'EBITDA' },
  { field: 'health', label: 'Health Score' },
  { field: 'name', label: 'Name' },
  { field: 'updated_at', label: 'Last Updated' },
];

export default function Companies() {
  const navigate = useNavigate();
  const { companies, loading, createCompany, updateStage, updatePipelineStage, deleteCompany } = useAppCompanies();
  const [view, setView] = useState<ViewType>('list');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const assetTypeFilter = useAssetTypeFilter();
  const [sortField, setSortField] = useState<SortField>('market_value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const getHealthScore = useCallback((company: any) => {
    if (company.ebitda_ltm && company.revenue_ltm) {
      return Math.min(100, Math.round((company.ebitda_ltm / company.revenue_ltm) * 100 * 5));
    }
    return 75;
  }, []);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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
    const filtered = companies.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.industry?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === 'all' || c.company_type === stageFilter;
      const matchesAssetType = assetTypeFilter === 'all' || 
        ((c as any).asset_class || 'private_equity') === assetTypeFilter;
      return matchesSearch && matchesStage && matchesAssetType;
    });

    // Sort the filtered results
    return [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'market_value':
          aVal = a.market_value ?? 0;
          bVal = b.market_value ?? 0;
          break;
        case 'revenue_ltm':
          aVal = a.revenue_ltm ?? 0;
          bVal = b.revenue_ltm ?? 0;
          break;
        case 'ebitda_ltm':
          aVal = a.ebitda_ltm ?? 0;
          bVal = b.ebitda_ltm ?? 0;
          break;
        case 'health':
          aVal = getHealthScore(a);
          bVal = getHealthScore(b);
          break;
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'updated_at':
          aVal = new Date(a.updated_at).getTime();
          bVal = new Date(b.updated_at).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [companies, searchQuery, stageFilter, assetTypeFilter, sortField, sortDirection, getHealthScore]);

  const handleUpdateStage = async (companyId: string, stage: CompanyStage, subStage?: string) => {
    await updateStage(companyId, stage, subStage);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30">
            <Grid3X3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Assets</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-0.5">All your investments in one place</p>
          </div>
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
            Add Asset
          </Button>
        </div>
      </div>

      {/* Asset Type Filter */}
      <AssetTypeFilter className="mb-2" />

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
      <div className="flex items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
              Sort: {SORT_OPTIONS.find(o => o.field === sortField)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SORT_OPTIONS.map(option => (
              <DropdownMenuItem 
                key={option.field}
                onClick={() => handleSort(option.field)}
                className="flex items-center justify-between"
              >
                {option.label}
                {sortField === option.field && (
                  sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 ml-2" /> : <ArrowDown className="h-3.5 w-3.5 ml-2" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
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
      <AddAssetWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreate={createCompany}
        onComplete={(company) => {
          if (company.company_type === 'pipeline') setView('pipeline');
          else if (company.company_type === 'portfolio') setView('portfolio');
          navigate(`/portfolio/${company.id}`);
        }}
      />
    </div>
  );
}
