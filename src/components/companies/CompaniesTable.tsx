import { format } from 'date-fns';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CompanyTypeBadge } from './CompanyTypeBadge';
import { MoreHorizontal, ExternalLink, Edit, Trash2, FolderOpen } from 'lucide-react';
import { Company } from '@/hooks/useCompanies';

interface CompaniesTableProps {
  companies: Company[];
  onEdit?: (company: Company) => void;
  onDelete?: (company: Company) => void;
  onViewDataRoom?: (company: Company) => void;
}

export function CompaniesTable({
  companies,
  onEdit,
  onDelete,
  onViewDataRoom,
}: CompaniesTableProps) {
  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No companies found</p>
        <p className="text-sm">Create your first company to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold">Company</TableHead>
            <TableHead className="font-semibold">Industry</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">Stage</TableHead>
            <TableHead className="font-semibold">Added</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id} className="group">
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{company.name}</span>
                  {(company as any).website && (
                    <a
                      href={(company as any).website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      {(company as any).website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {company.industry || '—'}
              </TableCell>
              <TableCell>
                <CompanyTypeBadge type={(company as any).company_type} />
              </TableCell>
              <TableCell className="text-muted-foreground capitalize">
                {(company as any).pipeline_stage || '—'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(company.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(company)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewDataRoom?.(company)}>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      View Data Room
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(company)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
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
