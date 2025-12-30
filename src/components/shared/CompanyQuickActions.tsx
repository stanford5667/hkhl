import { Button } from '@/components/ui/button';
import { Plus, CheckSquare, User, FileUp } from 'lucide-react';

interface CompanyQuickActionsProps {
  companyId: string;
  companyName: string;
  onCreateTask: () => void;
  onCreateContact: () => void;
  onUploadDocument: () => void;
}

export function CompanyQuickActions({
  companyId,
  companyName,
  onCreateTask,
  onCreateContact,
  onUploadDocument,
}: CompanyQuickActionsProps) {
  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onCreateTask}
        className="text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        <CheckSquare className="h-3 w-3 mr-1" />
        Task
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onCreateContact}
        className="text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        <User className="h-3 w-3 mr-1" />
        Contact
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onUploadDocument}
        className="text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        <FileUp className="h-3 w-3 mr-1" />
        Document
      </Button>
    </div>
  );
}
