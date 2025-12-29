import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PipelineDealCard } from './PipelineDealCard';
import { PipelineCompany } from '@/hooks/usePipelineCompanies';

interface KanbanColumnProps {
  title: string;
  stage: string;
  companies: PipelineCompany[];
  totalValue: string;
  color: string;
  onDrop?: (companyId: string, stage: string) => void;
  onMoveStage?: (companyId: string, stage: string) => void;
}

export function KanbanColumn({
  title,
  stage,
  companies,
  totalValue,
  color,
  onDrop,
  onMoveStage,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const companyId = e.dataTransfer.getData('companyId');
    if (companyId && onDrop) {
      onDrop(companyId, stage);
    }
  };

  const handleDragStart = (e: React.DragEvent, company: PipelineCompany) => {
    e.dataTransfer.setData('companyId', company.id);
  };

  return (
    <div
      className={cn(
        'flex flex-col min-w-[300px] max-w-[320px] rounded-lg transition-colors',
        isDragOver && 'bg-primary/5'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header with colored indicator */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className={cn('w-3 h-3 rounded-full', color)} />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
            {companies.length}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{totalValue}</span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 flex-1">
        {companies.map((company) => (
          <PipelineDealCard
            key={company.id}
            company={company}
            onDragStart={handleDragStart}
            onMoveStage={onMoveStage}
          />
        ))}

        {/* Empty state */}
        {companies.length === 0 && (
          <div className="flex items-center justify-center h-24 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
            Drop deals here
          </div>
        )}
      </div>
    </div>
  );
}
