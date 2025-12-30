import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  CheckSquare, 
  Filter,
  AlertCircle
} from 'lucide-react';
import { useCompanyTasks } from '@/hooks/useTasks';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { TaskCard } from '@/components/tasks/TaskCard';

interface CompanyTasksTabProps {
  companyId: string;
  companyName: string;
}

type FilterStatus = 'all' | 'open' | 'completed';

export function CompanyTasksTab({ companyId, companyName }: CompanyTasksTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('open');
  const { 
    tasks, 
    isLoading, 
    openTasks, 
    completedTasks, 
    overdueTasks,
    refetch
  } = useCompanyTasks(companyId);

  const filteredTasks = filterStatus === 'all' 
    ? tasks 
    : filterStatus === 'open' 
      ? openTasks 
      : completedTasks;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-muted rounded w-full" />
          <div className="h-24 bg-muted rounded w-full" />
          <div className="h-24 bg-muted rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Tasks</h3>
            {openTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {openTasks.length} open
              </Badge>
            )}
            {overdueTasks.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {overdueTasks.length} overdue
              </Badge>
            )}
          </div>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <Button
            variant={filterStatus === 'open' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterStatus('open')}
          >
            Open ({openTasks.length})
          </Button>
          <Button
            variant={filterStatus === 'completed' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterStatus('completed')}
          >
            Completed ({completedTasks.length})
          </Button>
          <Button
            variant={filterStatus === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilterStatus('all')}
          >
            All ({tasks.length})
          </Button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card className="p-8 text-center glass-card">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">
              {filterStatus === 'open' 
                ? 'No open tasks' 
                : filterStatus === 'completed' 
                  ? 'No completed tasks' 
                  : 'No tasks yet'}
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create a task
            </Button>
          </Card>
        ) : (
          filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              showCompanyLink={false}
            />
          ))
        )}
      </div>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        companyId={companyId}
        companyName={companyName}
        onTaskCreated={refetch}
      />
    </div>
  );
}
