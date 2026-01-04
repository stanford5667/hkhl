import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  FolderOpen,
  Search,
  Trash2,
  MoreHorizontal,
  Clock,
  PieChart,
  ArrowUpDown,
  Briefcase,
  Brain,
  FileText,
  Loader2,
  ExternalLink,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Parsed allocation type for display
interface ParsedAllocation {
  symbol: string;
  weight: number;
  name?: string;
}

interface ParsedInvestorProfile {
  investableCapital?: number;
  riskTolerance?: number;
}

export interface SavedPortfolio {
  id: string;
  name: string;
  description: string | null;
  allocations: unknown;
  investor_profile: unknown;
  portfolio_mode: string | null;
  created_at: string;
  updated_at: string;
}

interface SavedPortfoliosPanelProps {
  portfolios: SavedPortfolio[];
  isLoading?: boolean;
  onLoad: (portfolio: SavedPortfolio) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

// Helper to safely parse allocations
function parseAllocations(allocations: unknown): ParsedAllocation[] {
  if (Array.isArray(allocations)) {
    return allocations as ParsedAllocation[];
  }
  return [];
}

// Helper to safely parse investor profile
function parseInvestorProfile(profile: unknown): ParsedInvestorProfile | null {
  if (profile && typeof profile === 'object') {
    return profile as ParsedInvestorProfile;
  }
  return null;
}

type SortOption = 'updated' | 'created' | 'name' | 'capital';

export function SavedPortfoliosPanel({
  portfolios,
  isLoading,
  onLoad,
  onDelete,
  isDeleting,
}: SavedPortfoliosPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredAndSortedPortfolios = useMemo(() => {
    let filtered = portfolios;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = portfolios.filter((p) => {
        const allocs = parseAllocations(p.allocations);
        return (
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          allocs.some((a) => a.symbol.toLowerCase().includes(query))
        );
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const profileA = parseInvestorProfile(a.investor_profile);
      const profileB = parseInvestorProfile(b.investor_profile);
      
      switch (sortBy) {
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'capital':
          return (profileB?.investableCapital || 0) - (profileA?.investableCapital || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [portfolios, searchQuery, sortBy]);

  const getModeIcon = (mode: string | null) => {
    switch (mode) {
      case 'ai':
        return <Brain className="h-3.5 w-3.5" />;
      case 'questionnaire':
        return <FileText className="h-3.5 w-3.5" />;
      default:
        return <Briefcase className="h-3.5 w-3.5" />;
    }
  };

  const getModeLabel = (mode: string | null) => {
    switch (mode) {
      case 'ai':
        return 'AI Co-Pilot';
      case 'questionnaire':
        return 'IPS Questionnaire';
      default:
        return 'Manual';
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search portfolios by name, ticker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Last Updated</SelectItem>
            <SelectItem value="created">Date Created</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="capital">Capital (High-Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {filteredAndSortedPortfolios.length} portfolio{filteredAndSortedPortfolios.length !== 1 ? 's' : ''} found
      </div>

      {/* Portfolio Cards */}
      {filteredAndSortedPortfolios.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No Portfolios Found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery
                ? 'No portfolios match your search criteria. Try a different search term.'
                : 'You haven\'t saved any portfolios yet. Build a portfolio and save it to access it later.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          <div className="grid gap-3">
            {filteredAndSortedPortfolios.map((portfolio) => {
              const allocs = parseAllocations(portfolio.allocations);
              const profile = parseInvestorProfile(portfolio.investor_profile);
              
              return (
                <Card
                  key={portfolio.id}
                  className={cn(
                    'group transition-all hover:border-primary/50 hover:shadow-md cursor-pointer',
                    'relative overflow-hidden'
                  )}
                  onClick={() => onLoad(portfolio)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{portfolio.name}</h3>
                          <Badge variant="outline" className="flex items-center gap-1 text-xs shrink-0">
                            {getModeIcon(portfolio.portfolio_mode)}
                            {getModeLabel(portfolio.portfolio_mode)}
                          </Badge>
                        </div>
                        
                        {portfolio.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {portfolio.description}
                          </p>
                        )}

                        {/* Holdings Preview */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {allocs.slice(0, 5).map((alloc) => (
                            <Badge
                              key={alloc.symbol}
                              variant="secondary"
                              className="text-xs font-mono"
                            >
                              {alloc.symbol} {alloc.weight}%
                            </Badge>
                          ))}
                          {allocs.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{allocs.length - 5} more
                            </Badge>
                          )}
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(portfolio.updated_at), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <PieChart className="h-3 w-3" />
                            {allocs.length} holdings
                          </span>
                          {profile?.investableCapital && (
                            <span className="font-medium text-foreground">
                              {formatCurrency(profile.investableCapital)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side - Actions */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLoad(portfolio);
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Load
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onLoad(portfolio)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Portfolio
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteConfirmId(portfolio.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Portfolio</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this portfolio? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                if (deleteConfirmId) {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
