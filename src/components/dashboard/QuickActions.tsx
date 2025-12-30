import { Plus, Building2, Calculator, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  onAddCompany?: () => void;
  onCreateModel?: () => void;
  onUploadFiles?: () => void;
}

export function QuickActions({ onAddCompany, onCreateModel, onUploadFiles }: QuickActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={onAddCompany} className="flex-1 justify-center">
        <Building2 className="h-4 w-4 mr-2" />
        Add Company
      </Button>
      <Button variant="outline" onClick={onCreateModel} className="flex-1 justify-center">
        <Calculator className="h-4 w-4 mr-2" />
        Create Model
      </Button>
      <Button variant="outline" onClick={onUploadFiles} className="flex-1 justify-center">
        <Upload className="h-4 w-4 mr-2" />
        Upload Files
      </Button>
    </div>
  );
}