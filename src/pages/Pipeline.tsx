import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Filter, LayoutGrid, List, Calendar, Target } from 'lucide-react';
import { KanbanColumn } from '@/components/pipeline/KanbanColumn';
import { usePipelineCompanies } from '@/hooks/usePipelineCompanies';
import { CreateCompanyDialog } from '@/components/companies/CreateCompanyDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type ViewMode = 'kanban' | 'table' | 'timeline';

const STAGES = [
  { id: 'sourcing', title: 'Sourcing', color: 'bg-slate-500' },
  { id: 'screening', title: 'Screening', color: 'bg-primary' },
  { id: 'due-diligence', title: 'Due Diligence', color: 'bg-warning' },
  { id: 'ic-review', title: 'IC Review', color: 'bg-purple-500' },
  { id: 'closing', title: 'Closing', color: 'bg-success' },
];

export default function Pipeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { companies, loading, updateStage, refetch } = usePipelineCompanies();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleDrop = async (companyId: string, newStage: string) => {
    await updateStage(companyId, newStage);
  };

  const getCompaniesByStage = (stageId: string) =>
    companies.filter((c) => c.pipeline_stage === stageId);

  const getTotalValue = (stageCompanies: typeof companies) => {
    const total = stageCompanies.reduce((sum, c) => {
      const ev = c.ebitda_ltm ? c.ebitda_ltm * 8 : 0;
      return sum + ev;
    }, 0);
    return total > 0 ? `$${(total / 1000000).toFixed(0)}M` : '$0';
  };

  const totalPipelineValue = companies.reduce((sum, c) => {
    const ev = c.ebitda_ltm ? c.ebitda_ltm * 8 : 0;
    return sum + ev;
  }, 0);

  const handleCreateCompany = async (values: {
    name: string;
    industry?: string;
    website?: string;
    company_type: 'pipeline' | 'portfolio' | 'prospect';
    pipeline_stage?: string;
    ebitda_ltm?: number;
    valuation?: number;
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
      company_type: 'pipeline',
      pipeline_stage: values.pipeline_stage || 'sourcing',
      ebitda_ltm: values.ebitda_ltm || null,
    });

    if (error) {
      toast.error('Failed to create deal');
      console.error(error);
      return;
    }

    toast.success(`Deal "${values.name}" added to pipeline`);
    refetch();
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="h1 flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Deal Pipeline
          </h1>
          <p className="text-muted-foreground mt-1">
            {companies.length} active deals •{' '}
            {totalPipelineValue > 0
              ? `$${(totalPipelineValue / 1000000).toFixed(0)}M total value`
              : 'No valuations yet'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center p-1 bg-secondary rounded-lg">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            Table
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('timeline')}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Timeline
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center w-full py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            STAGES.map((stage) => {
              const stageCompanies = getCompaniesByStage(stage.id);
              return (
                <KanbanColumn
                  key={stage.id}
                  title={stage.title}
                  stage={stage.id}
                  companies={stageCompanies}
                  totalValue={getTotalValue(stageCompanies)}
                  color={stage.color}
                  onDrop={handleDrop}
                  onMoveStage={handleDrop}
                />
              );
            })
          )}
        </div>
      )}

      {/* Table View Placeholder */}
      {viewMode === 'table' && (
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">Table view coming soon</p>
        </div>
      )}

      {/* Timeline View Placeholder */}
      {viewMode === 'timeline' && (
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">Timeline view coming soon</p>
        </div>
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
