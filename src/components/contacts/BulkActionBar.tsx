import { Button } from '@/components/ui/button';
import { ListTodo, Mail, Workflow, X } from 'lucide-react';

interface BulkActionBarProps {
  count: number;
  onAssignTask: () => void;
  onSendEmail: () => void;
  onAddToFlow: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  count,
  onAssignTask,
  onSendEmail,
  onAddToFlow,
  onClear,
}: BulkActionBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
      <span className="text-sm font-medium text-primary">{count} selected</span>
      <div className="w-px h-4 bg-primary/20" />

      <Button variant="ghost" size="sm" className="h-8" onClick={onAssignTask}>
        <ListTodo className="h-4 w-4 mr-1.5" />
        Assign Task
      </Button>
      <Button variant="ghost" size="sm" className="h-8" onClick={onSendEmail}>
        <Mail className="h-4 w-4 mr-1.5" />
        Send Email
      </Button>
      <Button variant="ghost" size="sm" className="h-8" onClick={onAddToFlow}>
        <Workflow className="h-4 w-4 mr-1.5" />
        Add to Flow
      </Button>

      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-auto" onClick={onClear}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
