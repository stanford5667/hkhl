import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Building2,
  User,
  CheckSquare,
  Search,
  Clock,
  FileText,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');

  // Reset query when closing
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', query, user?.id],
    queryFn: async () => {
      if (!query.trim() || query.length < 2) {
        return { companies: [], contacts: [], tasks: [] };
      }

      const searchTerm = `%${query}%`;

      const [companiesRes, contactsRes, tasksRes] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, company_type, industry')
          .ilike('name', searchTerm)
          .limit(5),
        supabase
          .from('contacts')
          .select('id, first_name, last_name, title, company_id')
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from('tasks')
          .select('id, title, due_date, status, company_id')
          .ilike('title', searchTerm)
          .eq('status', 'todo')
          .limit(5),
      ]);

      return {
        companies: companiesRes.data || [],
        contacts: contactsRes.data || [],
        tasks: tasksRes.data || [],
      };
    },
    enabled: query.length >= 2 && open,
    staleTime: 1000,
  });

  // Fetch recent items when no query
  const { data: recentItems } = useQuery({
    queryKey: ['recent-items', user?.id],
    queryFn: async () => {
      const [companiesRes, tasksRes] = await Promise.all([
        supabase
          .from('companies')
          .select('id, name, company_type, industry')
          .order('updated_at', { ascending: false })
          .limit(3),
        supabase
          .from('tasks')
          .select('id, title, due_date, status')
          .eq('status', 'todo')
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      return {
        companies: companiesRes.data || [],
        tasks: tasksRes.data || [],
      };
    },
    enabled: open && !query,
    staleTime: 30000,
  });

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  const hasResults = results && (
    results.companies.length > 0 ||
    results.contacts.length > 0 ||
    results.tasks.length > 0
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-slate-900 border-slate-800 rounded-xl overflow-hidden">
        <CommandInput
          placeholder="Search companies, contacts, tasks..."
          value={query}
          onValueChange={setQuery}
          className="border-b border-slate-800"
        />
        <CommandList className="max-h-[400px]">
          {/* Loading state */}
          {isLoading && query.length >= 2 && (
            <div className="py-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Searching...</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && query.length >= 2 && !hasResults && (
            <CommandEmpty className="py-6 text-center">
              <Search className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-muted-foreground">No results for "{query}"</p>
              <p className="text-sm text-slate-500 mt-1">Try a different search term</p>
            </CommandEmpty>
          )}

          {/* Search results */}
          {!isLoading && hasResults && (
            <>
              {results.companies.length > 0 && (
                <CommandGroup heading="Companies">
                  {results.companies.map((company) => (
                    <CommandItem
                      key={company.id}
                      onSelect={() => runCommand(() => navigate(`/companies/${company.id}`))}
                      className="text-slate-300 hover:bg-slate-800"
                    >
                      <Building2 className="mr-2 h-4 w-4 text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{company.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {company.company_type} • {company.industry || 'No industry'}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.contacts.length > 0 && (
                <>
                  <CommandSeparator className="bg-slate-800" />
                  <CommandGroup heading="Contacts">
                    {results.contacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        onSelect={() => runCommand(() => navigate(`/contacts?id=${contact.id}`))}
                        className="text-slate-300 hover:bg-slate-800"
                      >
                        <User className="mr-2 h-4 w-4 text-emerald-400" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{contact.first_name} {contact.last_name}</p>
                          {contact.title && (
                            <p className="text-xs text-muted-foreground truncate">{contact.title}</p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {results.tasks.length > 0 && (
                <>
                  <CommandSeparator className="bg-slate-800" />
                  <CommandGroup heading="Tasks">
                    {results.tasks.map((task) => (
                      <CommandItem
                        key={task.id}
                        onSelect={() => runCommand(() => navigate('/tasks'))}
                        className="text-slate-300 hover:bg-slate-800"
                      >
                        <CheckSquare className="mr-2 h-4 w-4 text-purple-400" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{task.title}</p>
                          {task.due_date && (
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}

          {/* Recent items when no query */}
          {!query && recentItems && (
            <>
              {recentItems.companies.length > 0 && (
                <CommandGroup heading="Recent Companies">
                  {recentItems.companies.map((company) => (
                    <CommandItem
                      key={company.id}
                      onSelect={() => runCommand(() => navigate(`/companies/${company.id}`))}
                      className="text-slate-300 hover:bg-slate-800"
                    >
                      <Clock className="mr-2 h-4 w-4 text-slate-500" />
                      <span>{company.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground capitalize">
                        {company.company_type}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {recentItems.tasks.length > 0 && (
                <>
                  <CommandSeparator className="bg-slate-800" />
                  <CommandGroup heading="Open Tasks">
                    {recentItems.tasks.map((task) => (
                      <CommandItem
                        key={task.id}
                        onSelect={() => runCommand(() => navigate('/tasks'))}
                        className="text-slate-300 hover:bg-slate-800"
                      >
                        <CheckSquare className="mr-2 h-4 w-4 text-purple-400" />
                        <span className="truncate">{task.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-800 rounded">↑</kbd>
              <kbd className="px-1 py-0.5 bg-slate-800 rounded">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Enter</kbd>
              Open
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">⌘K</kbd> to search
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}
