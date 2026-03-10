import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Building2, User, CheckSquare, FileUp, ArrowRight } from 'lucide-react';
import { useCompanies } from '@/hooks/useCompanies';

interface UniversalCreateMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCompany: () => void;
  onCreateContact: (companyId?: string) => void;
  onCreateTask: (companyId?: string, contactId?: string) => void;
  onUploadDocument: (companyId?: string) => void;
}

export function UniversalCreateMenu({ open, onOpenChange, onCreateCompany, onCreateContact, onCreateTask, onUploadDocument }: UniversalCreateMenuProps) {
  const location = useLocation();
  const { companies } = useCompanies();
  
  const context = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/portfolio/')) {
      const companyId = path.split('/')[2];
      const company = companies.find(c => c.id === companyId);
      if (company) return { type: 'company' as const, id: companyId, name: company.name };
    }
    if (path.startsWith('/contacts')) {
      const params = new URLSearchParams(location.search);
      const contactId = params.get('id');
      if (contactId) return { type: 'contact' as const, id: contactId };
    }
    return null;
  }, [location, companies]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'c') { e.preventDefault(); onOpenChange(true); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  const runCommand = (command: () => void) => { onOpenChange(false); command(); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-card border-border rounded-xl overflow-hidden">
        <CommandInput placeholder="Create..." className="border-b border-border" />
        <CommandList className="max-h-[400px]">
          <CommandEmpty className="py-6 text-center">
            <p className="text-muted-foreground">Start typing to filter options</p>
          </CommandEmpty>
          
          {context && (
            <div className="px-3 py-2 bg-blue-500/10 border-b border-border">
              <div className="flex items-center gap-2 text-sm text-blue-400">
                {context.type === 'company' && (<><Building2 className="h-4 w-4" /><span>Creating for: {context.name}</span></>)}
                {context.type === 'contact' && (<><User className="h-4 w-4" /><span>Creating for current contact</span></>)}
              </div>
            </div>
          )}
          
          <CommandGroup heading="Create New">
            <CommandItem onSelect={() => runCommand(onCreateCompany)}>
              <Building2 className="mr-2 h-4 w-4 text-blue-400" /><span>New Company</span><span className="ml-auto text-xs text-muted-foreground">Add to pipeline</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onCreateContact(context?.type === 'company' ? context.id : undefined))}>
              <User className="mr-2 h-4 w-4 text-emerald-400" /><span>New Contact</span>
              {context?.type === 'company' && <span className="ml-auto text-xs text-blue-400 flex items-center gap-1"><ArrowRight className="h-3 w-3" />linked</span>}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onCreateTask(context?.type === 'company' ? context.id : undefined, context?.type === 'contact' ? context.id : undefined))}>
              <CheckSquare className="mr-2 h-4 w-4 text-primary" /><span>New Task</span>
              {context && <span className="ml-auto text-xs text-blue-400 flex items-center gap-1"><ArrowRight className="h-3 w-3" />linked</span>}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => onUploadDocument(context?.type === 'company' ? context.id : undefined))}>
              <FileUp className="mr-2 h-4 w-4 text-amber-400" /><span>Upload Documents</span>
              {context?.type === 'company' && <span className="ml-auto text-xs text-blue-400 flex items-center gap-1"><ArrowRight className="h-3 w-3" />to data room</span>}
            </CommandItem>
          </CommandGroup>
        </CommandList>
        
        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted rounded">↑</kbd><kbd className="px-1 py-0.5 bg-muted rounded">↓</kbd>Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd>Select</span>
          </div>
          <span className="flex items-center gap-1">Press <kbd className="px-1.5 py-0.5 bg-muted rounded">c</kbd> anywhere</span>
        </div>
      </div>
    </CommandDialog>
  );
}
