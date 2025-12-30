import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  FileUp,
  Plus,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useTasks } from '@/hooks/useTasks';

interface UniversalCreateMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCompany: () => void;
  onCreateContact: (companyId?: string) => void;
  onCreateTask: (companyId?: string, contactId?: string) => void;
  onUploadDocument: (companyId?: string) => void;
}

export function UniversalCreateMenu({
  open,
  onOpenChange,
  onCreateCompany,
  onCreateContact,
  onCreateTask,
  onUploadDocument,
}: UniversalCreateMenuProps) {
  const location = useLocation();
  const { companies } = useCompanies();
  
  // Determine context from URL
  const context = useMemo(() => {
    const path = location.pathname;
    
    if (path.startsWith('/companies/')) {
      const companyId = path.split('/')[2];
      const company = companies.find(c => c.id === companyId);
      if (company) {
        return { type: 'company' as const, id: companyId, name: company.name };
      }
    }
    
    if (path.startsWith('/contacts')) {
      const params = new URLSearchParams(location.search);
      const contactId = params.get('id');
      if (contactId) {
        return { type: 'contact' as const, id: contactId };
      }
    }
    
    return null;
  }, [location, companies]);

  // Global keyboard shortcut for 'c'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if in input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Don't trigger with modifier keys
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      
      if (e.key === 'c') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-slate-900 border-slate-800 rounded-xl overflow-hidden">
        <CommandInput placeholder="Create..." className="border-b border-slate-800" />
        <CommandList className="max-h-[400px]">
          <CommandEmpty className="py-6 text-center">
            <p className="text-muted-foreground">Start typing to filter options</p>
          </CommandEmpty>
          
          {/* Context indicator */}
          {context && (
            <>
              <div className="px-3 py-2 bg-blue-900/20 border-b border-slate-800">
                <div className="flex items-center gap-2 text-sm text-blue-300">
                  {context.type === 'company' && (
                    <>
                      <Building2 className="h-4 w-4" />
                      <span>Creating for: {context.name}</span>
                    </>
                  )}
                  {context.type === 'contact' && (
                    <>
                      <User className="h-4 w-4" />
                      <span>Creating for current contact</span>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
          
          <CommandGroup heading="Create New">
            <CommandItem 
              onSelect={() => runCommand(onCreateCompany)}
              className="text-slate-300 hover:bg-slate-800"
            >
              <Building2 className="mr-2 h-4 w-4 text-blue-400" />
              <span>New Company</span>
              <span className="ml-auto text-xs text-muted-foreground">Add to pipeline</span>
            </CommandItem>
            
            <CommandItem 
              onSelect={() => runCommand(() => onCreateContact(context?.type === 'company' ? context.id : undefined))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <User className="mr-2 h-4 w-4 text-emerald-400" />
              <span>New Contact</span>
              {context?.type === 'company' && (
                <span className="ml-auto text-xs text-blue-400 flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  linked
                </span>
              )}
            </CommandItem>
            
            <CommandItem 
              onSelect={() => runCommand(() => onCreateTask(
                context?.type === 'company' ? context.id : undefined,
                context?.type === 'contact' ? context.id : undefined
              ))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <CheckSquare className="mr-2 h-4 w-4 text-purple-400" />
              <span>New Task</span>
              {context && (
                <span className="ml-auto text-xs text-blue-400 flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  linked
                </span>
              )}
            </CommandItem>
            
            <CommandItem 
              onSelect={() => runCommand(() => onUploadDocument(context?.type === 'company' ? context.id : undefined))}
              className="text-slate-300 hover:bg-slate-800"
            >
              <FileUp className="mr-2 h-4 w-4 text-amber-400" />
              <span>Upload Documents</span>
              {context?.type === 'company' && (
                <span className="ml-auto text-xs text-blue-400 flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  to data room
                </span>
              )}
            </CommandItem>
          </CommandGroup>
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
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">c</kbd> anywhere
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}
