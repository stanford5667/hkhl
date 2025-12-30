import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Clock, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AppCompany } from '@/hooks/useAppData';
import { CompanyAvatar } from './CompanyAvatar';
import { HealthScore } from './HealthScore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PipelineKanbanViewProps {
  companies: AppCompany[];
  onUpdatePipelineStage: (companyId: string, stage: string) => Promise<void>;
}

const PIPELINE_COLUMNS = [
  { id: 'sourcing', label: 'Sourcing', color: 'slate' },
  { id: 'initial-review', label: 'Initial Review', color: 'blue' },
  { id: 'deep-dive', label: 'Deep Dive', color: 'indigo' },
  { id: 'loi', label: 'LOI', color: 'purple' },
  { id: 'due-diligence', label: 'Due Diligence', color: 'amber' },
  { id: 'closing', label: 'Closing', color: 'emerald' },
];

export function PipelineKanbanView({ companies, onUpdatePipelineStage }: PipelineKanbanViewProps) {
  const navigate = useNavigate();
  const [draggedCompany, setDraggedCompany] = useState<AppCompany | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Filter only pipeline companies
  const pipelineCompanies = companies.filter(c => c.company_type === 'pipeline');

  // Group companies by stage
  const groupedCompanies = PIPELINE_COLUMNS.reduce((acc, col) => {
    acc[col.id] = pipelineCompanies.filter(c => (c.pipeline_stage || 'sourcing') === col.id);
    return acc;
  }, {} as Record<string, AppCompany[]>);

  // Calculate totals per column
  const columnTotals = PIPELINE_COLUMNS.reduce((acc, col) => {
    acc[col.id] = groupedCompanies[col.id].reduce((sum, c) => sum + (c.revenue_ltm || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const handleDragStart = (e: React.DragEvent, company: AppCompany) => {
    setDraggedCompany(company);
    e.dataTransfer.setData('companyId', company.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    const companyId = e.dataTransfer.getData('companyId');
    if (!companyId || !draggedCompany) return;

    if (draggedCompany.pipeline_stage === newStage) return;

    await onUpdatePipelineStage(companyId, newStage);
    const stageName = PIPELINE_COLUMNS.find(c => c.id === newStage)?.label || newStage;
    toast.success(`Moved to ${stageName}`);
    
    setDraggedCompany(null);
  };

  const handleDragEnd = () => {
    setDraggedCompany(null);
    setDragOverColumn(null);
  };

  const getHealthScore = (company: AppCompany) => {
    if (company.ebitda_ltm && company.revenue_ltm) {
      return Math.min(100, Math.round((company.ebitda_ltm / company.revenue_ltm) * 100 * 5));
    }
    return 75;
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '—';
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  };

  const getColumnColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; dot: string; header: string }> = {
      slate: { bg: 'bg-slate-900/50', dot: 'bg-slate-500', header: 'bg-slate-800/50' },
      blue: { bg: 'bg-blue-900/20', dot: 'bg-blue-500', header: 'bg-blue-900/30' },
      indigo: { bg: 'bg-indigo-900/20', dot: 'bg-indigo-500', header: 'bg-indigo-900/30' },
      purple: { bg: 'bg-purple-900/20', dot: 'bg-purple-500', header: 'bg-purple-900/30' },
      amber: { bg: 'bg-amber-900/20', dot: 'bg-amber-500', header: 'bg-amber-900/30' },
      emerald: { bg: 'bg-emerald-900/20', dot: 'bg-emerald-500', header: 'bg-emerald-900/30' },
    };
    return colorMap[color] || colorMap.slate;
  };

  // Calculate summary stats
  const totalDeals = pipelineCompanies.length;
  const totalValue = pipelineCompanies.reduce((sum, c) => sum + (c.revenue_ltm || 0), 0);

  return (
    <div>
      {/* Pipeline Summary */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-foreground font-medium">Pipeline Summary</h3>
            <p className="text-muted-foreground text-sm">Drag cards to move deals between stages</p>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalDeals}</p>
              <p className="text-muted-foreground text-xs">Active Deals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency(totalValue)}
              </p>
              <p className="text-muted-foreground text-xs">Total Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_COLUMNS.map(column => {
          const colors = getColumnColorClasses(column.color);
          const columnCompanies = groupedCompanies[column.id];
          const isDropTarget = dragOverColumn === column.id;

          return (
            <div 
              key={column.id}
              className={cn(
                "flex-shrink-0 w-72 bg-card/50 rounded-xl border transition-all",
                isDropTarget ? "border-primary ring-2 ring-primary/20" : "border-border"
              )}
            >
              {/* Column Header */}
              <div className={cn("p-3 border-b border-border rounded-t-xl", colors.header)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", colors.dot)} />
                    <span className="text-foreground font-medium">{column.label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {columnCompanies.length}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {formatCurrency(columnTotals[column.id])}
                  </span>
                </div>
              </div>
              
              {/* Column Content */}
              <div 
                className={cn(
                  "p-2 space-y-2 min-h-[400px] transition-colors",
                  isDropTarget && "bg-primary/5"
                )}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {columnCompanies.map(company => (
                  <PipelineCard 
                    key={company.id} 
                    company={company}
                    healthScore={getHealthScore(company)}
                    isDragging={draggedCompany?.id === company.id}
                    onDragStart={(e) => handleDragStart(e, company)}
                    onDragEnd={handleDragEnd}
                    onClick={() => navigate(`/companies/${company.id}`)}
                  />
                ))}
                
                {columnCompanies.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Inbox className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No deals</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PipelineCardProps {
  company: AppCompany;
  healthScore: number;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function PipelineCard({ company, healthScore, isDragging, onDragStart, onDragEnd, onClick }: PipelineCardProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return '—';
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  };

  return (
    <Card 
      className={cn(
        "p-3 bg-card border-border cursor-pointer hover:border-primary/50 transition-all",
        isDragging && "opacity-50 rotate-2 scale-105"
      )}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
          <CompanyAvatar company={company} size="sm" />
          <div>
            <p className="text-foreground font-medium text-sm">{company.name}</p>
            <p className="text-muted-foreground text-xs">{company.industry || 'N/A'}</p>
          </div>
        </div>
        <HealthScore score={healthScore} size="sm" />
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2 py-2 border-y border-border my-2">
        <div>
          <p className="text-muted-foreground text-xs">Revenue</p>
          <p className="text-foreground text-sm font-medium">{formatCurrency(company.revenue_ltm)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">EBITDA</p>
          <p className="text-foreground text-sm font-medium">{formatCurrency(company.ebitda_ltm)}</p>
        </div>
      </div>
      
      {/* Activity Indicator */}
      <div className="flex items-center gap-2 pt-2">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground text-xs">
          {new Date(company.updated_at).toLocaleDateString()}
        </span>
      </div>
    </Card>
  );
}
