import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ExternalLink, FolderOpen, ArrowRight } from 'lucide-react';
import { PipelineCompany } from '@/hooks/usePipelineCompanies';

interface PipelineDealCardProps {
  company: PipelineCompany;
  onDragStart?: (e: React.DragEvent, company: PipelineCompany) => void;
  onMoveStage?: (companyId: string, stage: string) => void;
}

const STAGES = [
  { id: 'sourcing', label: 'Sourcing' },
  { id: 'screening', label: 'Screening' },
  { id: 'due-diligence', label: 'Due Diligence' },
  { id: 'ic-review', label: 'IC Review' },
  { id: 'closing', label: 'Closing' },
];

export function PipelineDealCard({ company, onDragStart, onMoveStage }: PipelineDealCardProps) {
  const navigate = useNavigate();

  // Calculate EV and multiple
  const ev = company.ebitda_ltm ? (company.ebitda_ltm * 8).toFixed(0) : null; // Simple placeholder calc
  const multiple = company.ebitda_ltm && company.revenue_ltm
    ? (company.revenue_ltm / company.ebitda_ltm).toFixed(1)
    : null;

  const handleViewDetails = () => {
    navigate(`/portfolio/${company.id}`);
  };

  const handleOpenDataRoom = () => {
    navigate(`/documents?company=${company.id}`);
  };

  return (
    <Card
      variant="interactive"
      className="p-4 cursor-grab active:cursor-grabbing group"
      draggable
      onDragStart={(e) => onDragStart?.(e, company)}
      onClick={handleViewDetails}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
            {company.name}
          </h4>
          <span className="text-xs text-muted-foreground">{company.industry || 'No industry'}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={handleViewDetails}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenDataRoom}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Open Data Room
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRight className="h-4 w-4 mr-2" />
                Move Stage
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {STAGES.filter((s) => s.id !== company.pipeline_stage).map((stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => onMoveStage?.(company.id, stage.id)}
                  >
                    {stage.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Financials */}
      <div className="flex gap-4 text-sm mb-3">
        <div>
          <span className="text-muted-foreground">EV</span>
          <span className="text-foreground ml-1 font-mono">
            {ev ? `$${ev}M` : '—'}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Multiple</span>
          <span className="text-foreground ml-1 font-mono">
            {multiple ? `${multiple}x` : '—'}
          </span>
        </div>
      </div>

      {/* Team avatars placeholder */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          <Avatar className="h-6 w-6 border-2 border-card">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {company.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        {company.ebitda_ltm && (
          <Badge variant="outline" className="text-xs">
            EBITDA: ${(company.ebitda_ltm / 1000000).toFixed(1)}M
          </Badge>
        )}
      </div>
    </Card>
  );
}
