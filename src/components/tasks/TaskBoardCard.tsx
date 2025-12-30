import { format, isPast, isToday } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Building2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskPriority } from '@/hooks/useTasks';

interface TaskBoardCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

const priorityConfig: Record<TaskPriority, { color: string }> = {
  low: { color: 'bg-slate-400' },
  medium: { color: 'bg-amber-400' },
  high: { color: 'bg-orange-400' },
  urgent: { color: 'bg-rose-400' },
};

export function TaskBoardCard({ task, onClick, isDragging }: TaskBoardCardProps) {
  const isCompleted = task.status === 'done';
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !isCompleted;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group bg-slate-800 rounded-lg p-3 cursor-pointer transition-all border border-transparent',
        'hover:bg-slate-750 hover:border-slate-700',
        isDragging && 'shadow-xl border-purple-500 scale-[1.02] rotate-1',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Drag handle and priority */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className={cn('h-2 w-2 rounded-full', priorityConfig[task.priority].color)} />
        </div>
        {(task.priority === 'high' || task.priority === 'urgent') && (
          <Badge 
            variant="outline" 
            className={cn(
              'text-[10px] px-1.5 py-0 border-0',
              task.priority === 'urgent' ? 'bg-rose-400/10 text-rose-400' : 'bg-orange-400/10 text-orange-400'
            )}
          >
            {task.priority === 'urgent' ? 'Urgent' : 'High'}
          </Badge>
        )}
      </div>

      {/* Title */}
      <p className={cn(
        'text-sm text-white line-clamp-2 mb-2',
        isCompleted && 'line-through text-slate-500'
      )}>
        {task.title}
      </p>

      {/* Company badge */}
      {task.company && (
        <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700 mb-2">
          <Building2 className="h-2.5 w-2.5 mr-1" />
          {task.company.name}
        </Badge>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
        {/* Assignee */}
        <div className="flex items-center gap-1">
          {task.assignee ? (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] bg-slate-700">
                {task.assignee.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          ) : task.assignee_contact ? (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] bg-purple-700/50">
                {task.assignee_contact.first_name[0]}{task.assignee_contact.last_name[0]}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-5 w-5 rounded-full bg-slate-700/50 border border-dashed border-slate-600" />
          )}
        </div>

        {/* Due date */}
        {task.due_date && (
          <span className={cn(
            'text-xs',
            isOverdue ? 'text-rose-400' : 'text-slate-500'
          )}>
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  );
}