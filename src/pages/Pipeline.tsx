import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, parseISO } from 'date-fns';
import {
  Plus,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  Target,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckSquare,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { KanbanColumn } from '@/components/pipeline/KanbanColumn';
import { CreateCompanyDialog } from '@/components/companies/CreateCompanyDialog';
import { CompanyAvatar } from '@/components/companies/CompanyAvatar';
import { usePipelineData, useUnifiedData, type CompanyWithRelations } from '@/contexts/UnifiedDataContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ViewMode = 'kanban' | 'table' | 'timeline';
type SortField = 'name' | 'pipeline_stage' | 'ebitda_ltm' | 'industry' | 'openTaskCount' | 'updated_at';
type SortOrder = 'asc' | 'desc';

const STAGES = [
  { id: 'sourcing', title: 'Sourcing', color: 'bg-slate-500' },
  { id: 'screening', title: 'Screening', color: 'bg-blue-500' },
  { id: 'due-diligence', title: 'Due Diligence', color: 'bg-amber-500' },
  { id: 'ic-review', title: 'IC Review', color: 'bg-purple-500' },
  { id: 'closing', title: 'Closing', color: 'bg-emerald-500' },
];

const stageColors: Record<string, string> = {
  sourcing: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  screening: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'due-diligence': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'ic-review': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  closing: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const stageDotColors: Record<string, string> = {
  sourcing: 'bg-slate-500',
  screening: 'bg-blue-500',
  'due-diligence': 'bg-amber-500',
  'ic-review': 'bg-purple-500',
  closing: 'bg-emerald-500',
};

const listItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3 },
  }),
  exit: { opacity: 0, x: -20 },
};

function formatCurrency(value: number | null): string {
  if (!value) return '—';
  const ev = value * 8; // EBITDA * 8x multiple
  if (ev >= 1000) return `$${(ev / 1000).toFixed(1)}B`;
  return `$${ev.toFixed(0)}M`;
}

export default function Pipeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stats: pipelineStats, companies: pipelineCompanies, isLoading } = usePipelineData();
  const { refetchAll } = useUnifiedData();

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; company: CompanyWithRelations | null }>({
    open: false,
    company: null,
  });

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let result = [...pipelineCompanies];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          c.industry?.toLowerCase().includes(query)
      );
    }

    // Stage filter
    if (stageFilter !== 'all') {
      result = result.filter(c => c.pipeline_stage === stageFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'pipeline_stage':
          aVal = a.pipeline_stage || '';
          bVal = b.pipeline_stage || '';
          break;
        case 'ebitda_ltm':
          aVal = a.ebitda_ltm || 0;
          bVal = b.ebitda_ltm || 0;
          break;
        case 'industry':
          aVal = a.industry?.toLowerCase() || '';
          bVal = b.industry?.toLowerCase() || '';
          break;
        case 'openTaskCount':
          aVal = a.openTaskCount;
          bVal = b.openTaskCount;
          break;
        case 'updated_at':
          aVal = new Date(a.updated_at).getTime();
          bVal = new Date(b.updated_at).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [pipelineCompanies, searchQuery, stageFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  const handleDrop = async (companyId: string, newStage: string) => {
    const { error } = await supabase
      .from('companies')
      .update({ pipeline_stage: newStage })
      .eq('id', companyId);

    if (error) {
      toast.error('Failed to update stage');
      return;
    }

    refetchAll();
  };

  const handleDelete = async () => {
    if (!deleteDialog.company) return;

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', deleteDialog.company.id);

    if (error) {
      toast.error('Failed to delete company');
      return;
    }

    toast.success(`"${deleteDialog.company.name}" deleted`);
    setDeleteDialog({ open: false, company: null });
    refetchAll();
  };

  const getCompaniesByStage = (stageId: string) =>
    pipelineCompanies.filter(c => c.pipeline_stage === stageId);

  const getTotalValue = (stageCompanies: CompanyWithRelations[]) => {
    const total = stageCompanies.reduce((sum, c) => {
      const ev = c.ebitda_ltm ? c.ebitda_ltm * 8 : 0;
      return sum + ev;
    }, 0);
    return total > 0 ? `$${(total / 1000000).toFixed(0)}M` : '$0';
  };

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
    refetchAll();
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
            {pipelineStats.totalDeals} active deals •{' '}
            {pipelineStats.totalPipelineValue > 0
              ? `$${(pipelineStats.totalPipelineValue * 8 / 1000000).toFixed(0)}M total value`
              : 'No valuations yet'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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

        {(viewMode === 'table' || viewMode === 'timeline') && (
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or industry..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {STAGES.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center w-full py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            STAGES.map(stage => {
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

      {/* Table View */}
      {viewMode === 'table' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-border rounded-lg overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Company
                    <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('pipeline_stage')}
                >
                  <div className="flex items-center">
                    Stage
                    <SortIcon field="pipeline_stage" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('ebitda_ltm')}
                >
                  <div className="flex items-center">
                    Est. Value
                    <SortIcon field="ebitda_ltm" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('industry')}
                >
                  <div className="flex items-center">
                    Industry
                    <SortIcon field="industry" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('openTaskCount')}
                >
                  <div className="flex items-center">
                    Tasks
                    <SortIcon field="openTaskCount" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('updated_at')}
                >
                  <div className="flex items-center">
                    Updated
                    <SortIcon field="updated_at" />
                  </div>
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No deals found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company, index) => (
                    <motion.tr
                      key={company.id}
                      custom={index}
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/companies/${company.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <CompanyAvatar company={{ name: company.name }} size="sm" />
                          <div>
                            <p className="font-medium">{company.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'capitalize',
                            stageColors[company.pipeline_stage || 'sourcing']
                          )}
                        >
                          {company.pipeline_stage?.replace('-', ' ') || 'Sourcing'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-emerald-400">
                        {formatCurrency(company.ebitda_ltm)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {company.industry || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CheckSquare className="h-3 w-3 text-muted-foreground" />
                          <span>{company.openTaskCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(parseISO(company.updated_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem onClick={e => {
                              e.stopPropagation();
                              navigate(`/companies/${company.id}`);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={e => {
                              e.stopPropagation();
                              navigate(`/companies/${company.id}?edit=true`);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={e => {
                                e.stopPropagation();
                                setDeleteDialog({ open: true, company });
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </motion.div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No deals found
            </div>
          ) : (
            <div className="relative pl-8">
              {/* Timeline line */}
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

              <AnimatePresence>
                {filteredCompanies.map((company, index) => {
                  const daysInPipeline = differenceInDays(
                    new Date(),
                    parseISO(company.created_at)
                  );

                  return (
                    <motion.div
                      key={company.id}
                      custom={index}
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="relative mb-6 cursor-pointer group"
                      onClick={() => navigate(`/companies/${company.id}`)}
                    >
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          'absolute -left-5 top-3 w-4 h-4 rounded-full border-2 border-background',
                          stageDotColors[company.pipeline_stage || 'sourcing']
                        )}
                      />

                      {/* Content card */}
                      <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all group-hover:shadow-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <CompanyAvatar company={{ name: company.name }} size="md" />
                            <div>
                              <h3 className="font-semibold group-hover:text-primary transition-colors">
                                {company.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'capitalize text-xs',
                                    stageColors[company.pipeline_stage || 'sourcing']
                                  )}
                                >
                                  {company.pipeline_stage?.replace('-', ' ') || 'Sourcing'}
                                </Badge>
                                {company.industry && (
                                  <span className="text-xs text-muted-foreground">
                                    {company.industry}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right text-sm">
                            <p className="font-medium text-emerald-400">
                              {formatCurrency(company.ebitda_ltm)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(company.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{daysInPipeline} days in pipeline</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" />
                            <span>{company.openTaskCount} open tasks</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* Create Dialog */}
      <CreateCompanyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateCompany}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={open => setDeleteDialog({ open, company: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.company?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
