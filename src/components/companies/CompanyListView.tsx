import { useNavigate } from 'react-router-dom';
import { 
  MoreHorizontal, 
  Eye, 
  Calculator, 
  ArrowRight, 
  Archive,
  Target,
  Briefcase,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Company, CompanyStage } from '@/hooks/useCompanies';
import { CompanyAvatar } from './CompanyAvatar';
import { StageIndicator } from './StageIndicator';
import { HealthScore } from './HealthScore';

interface CompanyListViewProps {
  companies: Company[];
  onUpdateStage: (companyId: string, stage: CompanyStage, subStage?: string) => void;
  onDelete?: (companyId: string) => void;
}

export function CompanyListView({ companies, onUpdateStage, onDelete }: CompanyListViewProps) {
  const navigate = useNavigate();

  const getHealthScore = (company: Company) => {
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

  if (companies.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground">No companies found</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground font-medium">Company</TableHead>
            <TableHead className="text-muted-foreground font-medium">Stage</TableHead>
            <TableHead className="text-muted-foreground font-medium">Industry</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">Revenue</TableHead>
            <TableHead className="text-muted-foreground font-medium text-right">EBITDA</TableHead>
            <TableHead className="text-muted-foreground font-medium">Last Activity</TableHead>
            <TableHead className="text-muted-foreground font-medium text-center">Health</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map(company => (
            <TableRow 
              key={company.id}
              className="border-border hover:bg-muted/50 cursor-pointer"
              onClick={() => navigate(`/companies/${company.id}`)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <CompanyAvatar company={company} size="md" />
                  <div>
                    <p className="text-foreground font-medium">{company.name}</p>
                    <p className="text-muted-foreground text-xs">{company.website || 'No website'}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StageIndicator stage={company.company_type} subStage={company.pipeline_stage} />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-muted-foreground">
                  {company.industry || 'N/A'}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-foreground font-medium">
                {formatCurrency(company.revenue_ltm)}
              </TableCell>
              <TableCell className="text-right text-foreground">
                {formatCurrency(company.ebitda_ltm)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDistanceToNow(new Date(company.updated_at), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-center">
                <HealthScore score={getHealthScore(company)} size="sm" />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/companies/${company.id}`); }}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/models/new?company=${company.id}`); }}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Create Model
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Move to Stage
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuLabel>Pipeline Stages</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStage(company.id, 'pipeline', 'sourcing'); }}>
                          Sourcing
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStage(company.id, 'pipeline', 'initial-review'); }}>
                          Initial Review
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStage(company.id, 'pipeline', 'deep-dive'); }}>
                          Deep Dive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStage(company.id, 'pipeline', 'loi'); }}>
                          LOI
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStage(company.id, 'pipeline', 'due-diligence'); }}>
                          Due Diligence
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStage(company.id, 'pipeline', 'closing'); }}>
                          Closing
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Other</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStage(company.id, 'portfolio'); }}>
                          <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                          Portfolio Company
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStage(company.id, 'passed'); }}>
                          <div className="h-2 w-2 rounded-full bg-slate-500 mr-2" />
                          Passed
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive" 
                      onClick={(e) => { e.stopPropagation(); onDelete?.(company.id); }}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
