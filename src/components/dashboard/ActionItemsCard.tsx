import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAppTasks } from "@/hooks/useAppData";
import { AlertTriangle, FileText, Clock, ChevronRight, CheckCircle2 } from "lucide-react";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";

export function ActionItemsCard() {
  const navigate = useNavigate();
  const { tasks, isLoading } = useAppTasks();

  // Get open tasks sorted by urgency
  const openTasks = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      // Overdue first
      const aOverdue = a.due_date && isPast(parseISO(a.due_date));
      const bOverdue = b.due_date && isPast(parseISO(b.due_date));
      if (aOverdue && !bOverdue) return -1;
      if (bOverdue && !aOverdue) return 1;
      
      // Then by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
    })
    .slice(0, 5);

  const getTaskType = (task: typeof openTasks[0]): 'urgent' | 'task' | 'deadline' => {
    if (task.due_date && isPast(parseISO(task.due_date))) return 'urgent';
    if (task.priority === 'urgent' || task.priority === 'high') return 'urgent';
    if (task.due_date && (isToday(parseISO(task.due_date)) || isTomorrow(parseISO(task.due_date)))) return 'deadline';
    return 'task';
  };

  const getDescription = (task: typeof openTasks[0]): string => {
    if (!task.due_date) return task.company?.name || 'No due date';
    const dueDate = parseISO(task.due_date);
    if (isPast(dueDate)) return `Overdue - was due ${format(dueDate, 'MMM d')}`;
    if (isToday(dueDate)) return 'Due today';
    if (isTomorrow(dueDate)) return 'Due tomorrow';
    return `Due ${format(dueDate, 'MMM d')}`;
  };

  const getIcon = (type: 'urgent' | 'task' | 'deadline') => {
    switch (type) {
      case "urgent":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "task":
        return <FileText className="h-4 w-4 text-primary" />;
      case "deadline":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getBadge = (type: 'urgent' | 'task' | 'deadline') => {
    switch (type) {
      case "urgent":
        return <Badge variant="warning">Urgent</Badge>;
      case "task":
        return <Badge variant="default">Task</Badge>;
      case "deadline":
        return <Badge variant="outline">Deadline</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Tasks Requiring Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Tasks Requiring Action</CardTitle>
        {openTasks.length > 0 && (
          <Badge variant="destructive">{openTasks.length}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {openTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2 opacity-50 text-emerald-500" />
            <p className="text-sm">All caught up!</p>
            <p className="text-xs">No pending tasks</p>
          </div>
        ) : (
          openTasks.map((task) => {
            const taskType = getTaskType(task);
            return (
              <button
                key={task.id}
                onClick={() => navigate('/tasks')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors group text-left"
              >
                {getIcon(taskType)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {task.title}
                    </span>
                    {getBadge(taskType)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {getDescription(task)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
