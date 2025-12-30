import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAppTasks } from "@/hooks/useAppData";
import { TaskRow } from "@/components/shared/TaskRow";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { isPast, isToday, parseISO } from "date-fns";
import { AnimatePresence } from "framer-motion";

export function ActionItemsCard() {
  const navigate = useNavigate();
  const { tasks, isLoading, updateTask } = useAppTasks();

  // Get open tasks sorted by urgency
  const openTasks = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      // Overdue first
      const aOverdue = a.due_date && isPast(parseISO(a.due_date)) && !isToday(parseISO(a.due_date));
      const bOverdue = b.due_date && isPast(parseISO(b.due_date)) && !isToday(parseISO(b.due_date));
      if (aOverdue && !bOverdue) return -1;
      if (bOverdue && !aOverdue) return 1;
      
      // Then today
      const aToday = a.due_date && isToday(parseISO(a.due_date));
      const bToday = b.due_date && isToday(parseISO(b.due_date));
      if (aToday && !bToday) return -1;
      if (bToday && !aToday) return 1;
      
      // Then by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
    })
    .slice(0, 5);

  // Categorize tasks
  const overdueTasks = openTasks.filter(t => 
    t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))
  );
  const todayTasks = openTasks.filter(t => 
    t.due_date && isToday(parseISO(t.due_date))
  );
  const otherTasks = openTasks.filter(t => 
    !overdueTasks.includes(t) && !todayTasks.includes(t)
  );

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await updateTask(taskId, {
        status: task.status === 'done' ? 'todo' : 'done',
        completed_at: task.status === 'done' ? null : new Date().toISOString(),
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">My Tasks</CardTitle>
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
        <CardTitle className="text-base font-medium">My Tasks</CardTitle>
        {openTasks.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {openTasks.length} open
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {openTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2 opacity-50 text-emerald-500" />
            <p className="text-sm">All caught up!</p>
            <p className="text-xs">No pending tasks</p>
          </div>
        ) : (
          <>
            {/* Overdue section */}
            {overdueTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <span className="text-sm font-medium text-rose-400">
                    Overdue ({overdueTasks.length})
                  </span>
                </div>
                <AnimatePresence mode="popLayout">
                  {overdueTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      compact
                      onToggle={handleToggleTask}
                      onClick={() => navigate('/tasks')}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
            
            {/* Today section */}
            {todayTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-blue-400">
                    📅 Today ({todayTasks.length})
                  </span>
                </div>
                <AnimatePresence mode="popLayout">
                  {todayTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      compact
                      onToggle={handleToggleTask}
                      onClick={() => navigate('/tasks')}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
            
            {/* Upcoming section */}
            {otherTasks.length > 0 && (
              <div>
                {(overdueTasks.length > 0 || todayTasks.length > 0) && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Upcoming ({otherTasks.length})
                    </span>
                  </div>
                )}
                <AnimatePresence mode="popLayout">
                  {otherTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      compact
                      onToggle={handleToggleTask}
                      onClick={() => navigate('/tasks')}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-primary hover:text-primary/80 mt-2"
              onClick={() => navigate('/tasks')}
            >
              View All Tasks
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}