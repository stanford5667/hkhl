import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format, parseISO, isBefore, startOfDay } from 'date-fns';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Building2,
  Users,
  CheckSquare,
  FileText,
  Search,
  Loader2,
  Target,
  Briefcase,
  Plus,
  Upload,
  ArrowRight,
  Calendar,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { useGlobalSearch, type SearchResult } from '@/contexts/UnifiedDataContext';
import { cn } from '@/lib/utils';

interface EnhancedGlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickNavigation = [
  { title: 'Pipeline', icon: Target, path: '/pipeline', description: 'View deal pipeline' },
  { title: 'Portfolio', icon: Briefcase, path: '/portfolio', description: 'Portfolio companies' },
  { title: 'Companies', icon: Building2, path: '/companies', description: 'All companies' },
  { title: 'Contacts', icon: Users, path: '/contacts', description: 'Contact directory' },
  { title: 'Tasks', icon: CheckSquare, path: '/tasks', description: 'Task management' },
  { title: 'Documents', icon: FileText, path: '/documents', description: 'Data room' },
];

const quickActions = [
  { title: 'Add Company', icon: Building2, path: '/companies?create=true', color: 'text-blue-400' },
  { title: 'Add Contact', icon: Users, path: '/contacts?create=true', color: 'text-emerald-400' },
  { title: 'Create Task', icon: CheckSquare, path: '/tasks?create=true', color: 'text-purple-400' },
  { title: 'Upload Document', icon: Upload, path: '/documents?upload=true', color: 'text-amber-400' },
];

const typeColors: Record<string, string> = {
  pipeline: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  portfolio: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  prospect: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  passed: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const categoryColors: Record<string, string> = {
  lender: 'bg-blue-500/20 text-blue-300',
  executive: 'bg-purple-500/20 text-purple-300',
  board: 'bg-amber-500/20 text-amber-300',
  legal: 'bg-slate-500/20 text-slate-300',
  vendor: 'bg-emerald-500/20 text-emerald-300',
  team: 'bg-cyan-500/20 text-cyan-300',
  other: 'bg-gray-500/20 text-gray-300',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-500/20 text-slate-300',
  medium: 'bg-amber-500/20 text-amber-300',
  high: 'bg-orange-500/20 text-orange-300',
  urgent: 'bg-rose-500/20 text-rose-300',
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string | null): string {
  if (!fileType) return '📄';
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('image')) return '🖼️';
  return '📄';
}

export function EnhancedGlobalSearch({ open, onOpenChange }: EnhancedGlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { results, isLoading } = useGlobalSearch(query);

  // Reset query when closing
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const runCommand = useCallback((command: () => void) => {
    onOpenChange(false);
    command();
  }, [onOpenChange]);

  // Group results by type
  const groupedResults = {
    companies: results.filter(r => r.type === 'company'),
    contacts: results.filter(r => r.type === 'contact'),
    tasks: results.filter(r => r.type === 'task'),
    documents: results.filter(r => r.type === 'document'),
  };

  const totalResults = results.length;
  const hasQuery = query.trim().length > 0;
  const hasResults = totalResults > 0;

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isBefore(parseISO(dueDate), startOfDay(new Date()));
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-card border-border rounded-xl overflow-hidden">
        <CommandInput
          placeholder="Search companies, contacts, tasks, documents..."
          value={query}
          onValueChange={setQuery}
          className="border-b border-border"
        />
        <CommandList className="max-h-[450px]">
          {/* Loading state */}
          {isLoading && hasQuery && (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Searching...</p>
            </div>
          )}

          {/* Empty search results */}
          {!isLoading && hasQuery && !hasResults && (
            <CommandEmpty className="py-8 text-center">
              <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No results for "{query}"</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try a different search term</p>
            </CommandEmpty>
          )}

          {/* Search results */}
          {!isLoading && hasQuery && hasResults && (
            <AnimatePresence>
              {/* Companies */}
              {groupedResults.companies.length > 0 && (
                <CommandGroup heading={`Companies (${groupedResults.companies.length})`}>
                  {groupedResults.companies.map((result) => {
                    const company = result.data as any;
                    return (
                      <CommandItem
                        key={result.id}
                        onSelect={() => runCommand(() => navigate(`/companies/${result.id}`))}
                        className="py-3"
                      >
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {company.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{company.name}</p>
                            {company.company_type && (
                              <Badge variant="outline" className={cn('text-[10px] capitalize', typeColors[company.company_type])}>
                                {company.company_type}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {company.industry && <span>{company.industry}</span>}
                            {company.revenue_ltm && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400">${company.revenue_ltm}M</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {/* Contacts */}
              {groupedResults.contacts.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={`Contacts (${groupedResults.contacts.length})`}>
                    {groupedResults.contacts.map((result) => {
                      const contact = result.data as any;
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => runCommand(() => navigate(`/contacts?id=${result.id}`))}
                          className="py-3"
                        >
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs">
                              {getInitials(contact.first_name, contact.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">
                                {contact.first_name} {contact.last_name}
                              </p>
                              {contact.category && (
                                <Badge variant="outline" className={cn('text-[10px] capitalize', categoryColors[contact.category] || categoryColors.other)}>
                                  {contact.category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {contact.title && <span>{contact.title}</span>}
                              {contact.email && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {contact.email}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}

              {/* Tasks */}
              {groupedResults.tasks.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={`Tasks (${groupedResults.tasks.length})`}>
                    {groupedResults.tasks.map((result) => {
                      const task = result.data as any;
                      const overdue = isOverdue(task.due_date);
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => runCommand(() => navigate(`/tasks?id=${result.id}`))}
                          className="py-3"
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-md flex items-center justify-center mr-3",
                            task.status === 'done' ? 'bg-emerald-500/20' : 'bg-purple-500/20'
                          )}>
                            <CheckSquare className={cn(
                              "h-4 w-4",
                              task.status === 'done' ? 'text-emerald-400' : 'text-purple-400'
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "font-medium truncate",
                                task.status === 'done' && 'line-through text-muted-foreground'
                              )}>
                                {task.title}
                              </p>
                              {task.priority && task.priority !== 'medium' && (
                                <Badge variant="outline" className={cn('text-[10px] capitalize', priorityColors[task.priority])}>
                                  {task.priority}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {task.due_date && (
                                <span className={cn(
                                  "flex items-center gap-1",
                                  overdue && 'text-destructive'
                                )}>
                                  {overdue && <AlertTriangle className="h-3 w-3" />}
                                  <Calendar className="h-3 w-3" />
                                  {format(parseISO(task.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}

              {/* Documents */}
              {groupedResults.documents.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={`Documents (${groupedResults.documents.length})`}>
                    {groupedResults.documents.map((result) => {
                      const doc = result.data as any;
                      return (
                        <CommandItem
                          key={result.id}
                          onSelect={() => runCommand(() => navigate(`/documents?id=${result.id}`))}
                          className="py-3"
                        >
                          <div className="h-8 w-8 rounded-md bg-amber-500/20 flex items-center justify-center mr-3 text-lg">
                            {getFileIcon(doc.file_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {doc.folder && <span>{doc.folder}</span>}
                              {doc.file_type && (
                                <>
                                  <span>•</span>
                                  <span className="uppercase">{doc.file_type.split('/').pop()}</span>
                                </>
                              )}
                              {doc.created_at && (
                                <>
                                  <span>•</span>
                                  <span>{formatDistanceToNow(parseISO(doc.created_at), { addSuffix: true })}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </AnimatePresence>
          )}

          {/* Quick Navigation & Actions (when no query) */}
          {!hasQuery && (
            <>
              <CommandGroup heading="Quick Navigation">
                {quickNavigation.map((item) => (
                  <CommandItem
                    key={item.path}
                    onSelect={() => runCommand(() => navigate(item.path))}
                    className="py-2"
                  >
                    <item.icon className="h-4 w-4 mr-3 text-muted-foreground" />
                    <div className="flex-1">
                      <p>{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Quick Actions">
                {quickActions.map((item) => (
                  <CommandItem
                    key={item.path}
                    onSelect={() => runCommand(() => navigate(item.path))}
                    className="py-2"
                  >
                    <div className={cn("h-6 w-6 rounded-md bg-muted flex items-center justify-center mr-3")}>
                      <Plus className={cn("h-3 w-3", item.color)} />
                    </div>
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↓</kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
              <span className="ml-1">Open</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
              <span className="ml-1">Close</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasQuery && hasResults && (
              <span className="text-primary">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
            )}
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">K</kbd>
            </span>
          </div>
        </div>
      </div>
    </CommandDialog>
  );
}

// Hook for keyboard shortcuts
export function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
        return;
      }

      // "/" key (when not in an input/textarea)
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        onOpen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);
}
