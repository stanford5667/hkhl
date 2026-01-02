import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  Calendar,
  Building2,
  User,
  MoreHorizontal,
  Edit,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskPriority, useTasks } from '@/hooks/useTasks';
import { Link } from 'react-router-dom';

interface TaskCardProps {
  task: Task;
  onEdit?: () => void;
  compact?: boolean;
  showCompanyLink?: boolean;
}

const priorityConfig: Record<TaskPriority, { color: string; bgColor: string }> = {
  low: { color: 'bg-slate-400', bgColor: 'bg-slate-400/10' },
  medium: { color: 'bg-amber-400', bgColor: 'bg-amber-400/10' },
  high: { color: 'bg-orange-400', bgColor: 'bg-orange-400/10' },
  urgent: { color: 'bg-rose-400', bgColor: 'bg-rose-400/10' },
};

export function TaskCard({ task, onEdit, compact = false, showCompanyLink = true }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const { toggleTaskComplete, updateTask, deleteTask } = useTasks();
  
  const isCompleted = task.status === 'done';
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !isCompleted;
  
  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskComplete(task.id);
  };
  
  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      updateTask(task.id, { title: editTitle });
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  if (compact) {
    return (
      <div className={cn(
        'flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors group',
        isCompleted && 'opacity-60'
      )}>
        <button
          onClick={handleToggleComplete}
          className={cn(
            'mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0',
            isCompleted
              ? 'bg-emerald-600 border-emerald-600'
              : 'border-slate-600 hover:border-slate-500'
          )}
        >
          {isCompleted && <Check className="h-3 w-3 text-white" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm text-white truncate',
            isCompleted && 'line-through text-slate-400'
          )}>
            {task.title}
          </p>
          {task.company && (
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {task.company.name}
            </p>
          )}
        </div>
        
        {task.due_date && (
          <span className={cn(
            'text-xs flex-shrink-0',
            isOverdue ? 'text-rose-400' : 'text-slate-500'
          )}>
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
    );
  }
  
  return (
    <Card className={cn(
      'p-4 bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-colors group',
      isCompleted && 'opacity-60'
    )}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleToggleComplete}
          className={cn(
            'mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0',
            isCompleted
              ? 'bg-emerald-600 border-emerald-600'
              : 'border-slate-600 hover:border-slate-500'
          )}
        >
          {isCompleted && <Check className="h-3 w-3 text-white" />}
        </button>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-7 bg-slate-700 border-slate-600 text-white"
              autoFocus
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') {
                  setEditTitle(task.title);
                  setIsEditing(false);
                }
              }}
            />
          ) : (
            <p
              className={cn(
                'text-white text-sm cursor-pointer',
                isCompleted && 'line-through text-slate-400'
              )}
              onClick={() => setIsEditing(true)}
            >
              {task.title}
            </p>
          )}
          
          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Priority */}
            {(task.priority === 'high' || task.priority === 'urgent') && (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs px-1.5 py-0 border-0',
                  priorityConfig[task.priority].bgColor,
                  task.priority === 'high' ? 'text-orange-400' : 'text-rose-400'
                )}
              >
                {task.priority === 'urgent' ? 'Urgent' : 'High'}
              </Badge>
            )}
            
            {/* Priority dot for low/medium */}
            {(task.priority === 'low' || task.priority === 'medium') && (
              <div className={cn('h-2 w-2 rounded-full', priorityConfig[task.priority].color)} />
            )}
            
            {/* Due Date */}
            {task.due_date && (
              <span className={cn(
                'text-xs flex items-center gap-1',
                isOverdue ? 'text-rose-400' : 'text-slate-500'
              )}>
                <Calendar className="h-3 w-3" />
                {format(new Date(task.due_date), 'MMM d')}
              </span>
            )}
            
            {/* Team member assignee */}
            {task.assignee && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px] bg-slate-700">
                    {task.assignee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {task.assignee.name}
              </span>
            )}

            {/* Contact assignee */}
            {task.assignee_contact && !task.assignee && (
              <span className="text-xs text-purple-400 flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px] bg-purple-700/50">
                    {task.assignee_contact.first_name[0]}{task.assignee_contact.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                {task.assignee_contact.first_name} {task.assignee_contact.last_name}
                <span className="text-slate-500">(Contact)</span>
              </span>
            )}
            
            {/* Company link */}
            {showCompanyLink && task.company && (
              <Link
                to={`/portfolio/${task.company.id}`}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Building2 className="h-3 w-3" />
                {task.company.name}
              </Link>
            )}
            
            {/* Linked contact */}
            {task.linked_contact && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.linked_contact.first_name} {task.linked_contact.last_name}
              </span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
              <DropdownMenuItem
                onClick={() => setIsEditing(true)}
                className="text-slate-300 hover:text-white"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => deleteTask(task.id)}
                className="text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
