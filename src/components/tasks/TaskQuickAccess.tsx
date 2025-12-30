import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckSquare, 
  Check, 
  AlertTriangle, 
  Clock, 
  Calendar,
  ArrowRight,
  Plus,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyTasks, Task } from '@/hooks/useTasks';

export function TaskQuickAccess() {
  const [open, setOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  
  const { 
    openTasks, 
    overdueTasks, 
    todayTasks, 
    tomorrowTasks,
    thisWeekTasks,
    toggleTaskComplete,
    createTask,
    isLoading 
  } = useMyTasks();

  // Combine upcoming tasks (tomorrow + this week)
  const upcomingTasks = [...tomorrowTasks, ...thisWeekTasks].slice(0, 5);

  const handleQuickCreate = async () => {
    if (!quickTaskTitle.trim()) return;
    
    setIsCreating(true);
    try {
      await createTask({
        title: quickTaskTitle.trim(),
        priority: 'medium',
      });
      setQuickTaskTitle('');
    } catch (error) {
      console.error('Error creating quick task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/tasks');
  };

  const handleToggle = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    await toggleTaskComplete(taskId);
  };

  const hasOverdue = overdueTasks.length > 0;
  const badgeCount = openTasks.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800",
            hasOverdue && "text-rose-400"
          )}
        >
          <CheckSquare className="h-4 w-4" />
          {badgeCount > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full text-white",
              hasOverdue ? "bg-rose-500" : "bg-slate-600"
            )}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-96 bg-slate-900 border-slate-800 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white">My Tasks</SheetTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleViewAll}
              className="text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 gap-1"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </SheetHeader>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 p-4 border-b border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{openTasks.length}</p>
            <p className="text-xs text-slate-500">Open</p>
          </div>
          <div className={cn(
            "rounded-lg p-3 text-center",
            hasOverdue ? "bg-rose-500/10" : "bg-slate-800/50"
          )}>
            <p className={cn(
              "text-2xl font-bold",
              hasOverdue ? "text-rose-400" : "text-white"
            )}>
              {overdueTasks.length}
            </p>
            <p className={cn(
              "text-xs",
              hasOverdue ? "text-rose-400/70" : "text-slate-500"
            )}>
              Overdue
            </p>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{todayTasks.length}</p>
            <p className="text-xs text-blue-400/70">Today</p>
          </div>
        </div>

        {/* Task Lists */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : (
              <>
                {/* Overdue Section */}
                {overdueTasks.length > 0 && (
                  <TaskSection
                    title="Overdue"
                    icon={AlertTriangle}
                    iconClass="text-rose-400"
                    labelClass="text-rose-400 bg-rose-400/10"
                    tasks={overdueTasks.slice(0, 5)}
                    onToggle={handleToggle}
                    showOverdueDate
                  />
                )}

                {/* Today Section */}
                <TaskSection
                  title="Today"
                  icon={Clock}
                  iconClass="text-blue-400"
                  labelClass="text-blue-400 bg-blue-400/10"
                  tasks={todayTasks}
                  onToggle={handleToggle}
                  emptyMessage="Nothing due today ✓"
                />

                {/* Upcoming Section */}
                {upcomingTasks.length > 0 && (
                  <TaskSection
                    title="Upcoming"
                    icon={Calendar}
                    iconClass="text-slate-400"
                    labelClass="text-slate-400 bg-slate-400/10"
                    tasks={upcomingTasks}
                    onToggle={handleToggle}
                    showDueDate
                  />
                )}

                {/* Empty State */}
                {openTasks.length === 0 && (
                  <div className="text-center py-8">
                    <CheckSquare className="h-12 w-12 mx-auto text-slate-700 mb-3" />
                    <p className="text-slate-500 text-sm">You're all caught up!</p>
                    <p className="text-slate-600 text-xs mt-1">No open tasks</p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Quick Add Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex gap-2">
            <Input
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              placeholder="Add a task..."
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleQuickCreate();
              }}
            />
            <Button 
              size="icon" 
              onClick={handleQuickCreate}
              disabled={!quickTaskTitle.trim() || isCreating}
              className="shrink-0"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface TaskSectionProps {
  title: string;
  icon: React.ElementType;
  iconClass: string;
  labelClass: string;
  tasks: Task[];
  onToggle: (e: React.MouseEvent, taskId: string) => void;
  emptyMessage?: string;
  showDueDate?: boolean;
  showOverdueDate?: boolean;
}

function TaskSection({ 
  title, 
  icon: Icon, 
  iconClass, 
  labelClass, 
  tasks, 
  onToggle,
  emptyMessage,
  showDueDate,
  showOverdueDate
}: TaskSectionProps) {
  return (
    <div>
      <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium mb-2", labelClass)}>
        <Icon className={cn("h-3 w-3", iconClass)} />
        {title}
      </div>
      
      {tasks.length === 0 && emptyMessage ? (
        <p className="text-slate-600 text-sm pl-2">{emptyMessage}</p>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => (
            <QuickTaskItem 
              key={task.id} 
              task={task} 
              onToggle={onToggle}
              showDueDate={showDueDate}
              showOverdueDate={showOverdueDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface QuickTaskItemProps {
  task: Task;
  onToggle: (e: React.MouseEvent, taskId: string) => void;
  showDueDate?: boolean;
  showOverdueDate?: boolean;
}

function QuickTaskItem({ task, onToggle, showDueDate, showOverdueDate }: QuickTaskItemProps) {
  const isCompleted = task.status === 'done';

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors group">
      <button
        onClick={(e) => onToggle(e, task.id)}
        className={cn(
          'mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0',
          isCompleted
            ? 'bg-emerald-600 border-emerald-600'
            : 'border-slate-600 hover:border-slate-500'
        )}
      >
        {isCompleted && <Check className="h-2.5 w-2.5 text-white" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm text-white truncate',
          isCompleted && 'line-through text-slate-500'
        )}>
          {task.title}
        </p>
        {task.company && (
          <p className="text-xs text-slate-600 truncate">
            {task.company.name}
          </p>
        )}
      </div>
      
      {(showDueDate || showOverdueDate) && task.due_date && (
        <span className={cn(
          'text-xs flex-shrink-0',
          showOverdueDate ? 'text-rose-400' : 'text-slate-500'
        )}>
          {format(new Date(task.due_date), 'MMM d')}
        </span>
      )}
    </div>
  );
}