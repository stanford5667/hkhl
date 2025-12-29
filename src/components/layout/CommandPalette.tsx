import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog as CommandDialogPrimitive,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Plus,
  FileUp,
  Calculator,
  Target,
  Building2,
  FileText,
  LayoutDashboard,
  Brain,
  Briefcase,
} from "lucide-react";

interface CommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandDialog({ open, onOpenChange }: CommandDialogProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <CommandDialogPrimitive open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search deals, companies, documents..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => navigate("/pipeline?new=true"))}>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Deal</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/documents?upload=true"))}>
            <FileUp className="mr-2 h-4 w-4" />
            <span>Upload Document</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/models?new=true"))}>
            <Calculator className="mr-2 h-4 w-4" />
            <span>New Model</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/pipeline"))}>
            <Target className="mr-2 h-4 w-4" />
            <span>Deal Pipeline</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/models"))}>
            <Brain className="mr-2 h-4 w-4" />
            <span>AI Models</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/portfolio"))}>
            <Briefcase className="mr-2 h-4 w-4" />
            <span>Portfolio</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Recent Deals">
          <CommandItem onSelect={() => runCommand(() => navigate("/pipeline/acme"))}>
            <Building2 className="mr-2 h-4 w-4" />
            <span>Acme Corp</span>
            <span className="ml-auto text-xs text-muted-foreground">Software • DD</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/pipeline/techco"))}>
            <Building2 className="mr-2 h-4 w-4" />
            <span>TechCo Inc</span>
            <span className="ml-auto text-xs text-muted-foreground">SaaS • Screening</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Recent Documents">
          <CommandItem>
            <FileText className="mr-2 h-4 w-4" />
            <span>FY24 Financials - Acme</span>
            <span className="ml-auto text-xs text-muted-foreground">2 hours ago</span>
          </CommandItem>
          <CommandItem>
            <FileText className="mr-2 h-4 w-4" />
            <span>CIM - TechCo</span>
            <span className="ml-auto text-xs text-muted-foreground">Yesterday</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialogPrimitive>
  );
}
