import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, StickyNote, AlertCircle } from 'lucide-react';
import { CompanyTasksTab } from './CompanyTasksTab';
import { CompanyNotesSection } from './CompanyNotesSection';
import { useCompanyTasks } from '@/hooks/useTasks';

interface NotesTasksTabProps {
  companyId: string;
  companyName: string;
}

export function NotesTasksTab({ companyId, companyName }: NotesTasksTabProps) {
  const [activeTab, setActiveTab] = useState('tasks');
  const { openTasks, overdueTasks } = useCompanyTasks(companyId);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="tasks" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
            {openTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {openTasks.length}
              </Badge>
            )}
            {overdueTasks.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 flex items-center gap-0.5">
                <AlertCircle className="h-3 w-3" />
                {overdueTasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <CompanyTasksTab companyId={companyId} companyName={companyName} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <CompanyNotesSection companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
