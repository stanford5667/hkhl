import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  Plus,
  Check,
  FolderOpen,
  Trash2,
  Copy,
  Pencil,
  Loader2,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SavedPortfolio } from '@/hooks/useActivePortfolio';

interface PortfolioSwitcherProps {
  portfolios: SavedPortfolio[];
  activePortfolioId: string | null;
  onSelect: (id: string | null) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string, name: string) => void;
  onRename: (id: string, name: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
}

export function PortfolioSwitcher({
  portfolios,
  activePortfolioId,
  onSelect,
  onCreateNew,
  onDelete,
  onDuplicate,
  onRename,
  isLoading,
  isDeleting,
}: PortfolioSwitcherProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<SavedPortfolio | null>(null);
  const [newName, setNewName] = useState('');

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || portfolios[0];

  const handleDeleteClick = (portfolio: SavedPortfolio) => {
    setSelectedPortfolio(portfolio);
    setDeleteDialogOpen(true);
  };

  const handleDuplicateClick = (portfolio: SavedPortfolio) => {
    setSelectedPortfolio(portfolio);
    setNewName(`${portfolio.name} (Copy)`);
    setDuplicateDialogOpen(true);
  };

  const handleRenameClick = (portfolio: SavedPortfolio) => {
    setSelectedPortfolio(portfolio);
    setNewName(portfolio.name);
    setRenameDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPortfolio) {
      onDelete(selectedPortfolio.id);
      setDeleteDialogOpen(false);
      setSelectedPortfolio(null);
    }
  };

  const confirmDuplicate = () => {
    if (selectedPortfolio && newName.trim()) {
      onDuplicate(selectedPortfolio.id, newName.trim());
      setDuplicateDialogOpen(false);
      setSelectedPortfolio(null);
      setNewName('');
    }
  };

  const confirmRename = () => {
    if (selectedPortfolio && newName.trim()) {
      onRename(selectedPortfolio.id, newName.trim());
      setRenameDialogOpen(false);
      setSelectedPortfolio(null);
      setNewName('');
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="min-w-[200px]">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between">
            <div className="flex items-center gap-2 truncate">
              <Briefcase className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {activePortfolio?.name || 'Select Portfolio'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          {/* Saved portfolios */}
          {portfolios.map((portfolio) => (
            <DropdownMenuItem
              key={portfolio.id}
              className="flex items-center justify-between group p-0"
            >
              <button
                className="flex-1 flex items-center justify-between px-2 py-1.5 text-left"
                onClick={() => onSelect(portfolio.id)}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="truncate font-medium">{portfolio.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(portfolio.updated_at), 'MMM d, yyyy')}
                  </span>
                </div>
                {activePortfolioId === portfolio.id && (
                  <Check className="h-4 w-4 shrink-0 ml-2" />
                )}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                  <DropdownMenuItem onClick={() => handleRenameClick(portfolio)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateClick(portfolio)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(portfolio)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          {/* Create new portfolio */}
          <DropdownMenuItem onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Portfolio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Portfolio</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedPortfolio?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
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

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Portfolio</DialogTitle>
            <DialogDescription>
              Create a copy of "{selectedPortfolio?.name}" with a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="duplicate-name">Portfolio Name</Label>
            <Input
              id="duplicate-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter portfolio name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDuplicate} disabled={!newName.trim()}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Portfolio</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-name">Portfolio Name</Label>
            <Input
              id="rename-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter portfolio name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRename} disabled={!newName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
