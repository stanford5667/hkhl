import React from 'react';
import { CheckSquare, Calendar, Building2, User, Clock, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QuickPreviewCard } from './QuickPreviewCard';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Task = Tables<'tasks'>;

interface TaskQuickPreviewProps {
  task: Task;
  companyName?: string;
  assigneeName?: string;
  onClose: () => void;
  onOpenDetail: () => void;
  onEdit?: () => void;
}

export function TaskQuickPreview({
  task,
  companyName,
  assigneeName,
  onClose,
  onOpenDetail,
  onEdit,
}: TaskQuickPreviewProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'in_progress':
      case 'in progress':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'blocked':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'urgent':
        return 'text-rose-500';
      case 'medium':
        return 'text-amber-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatDueDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'MMM d');
  };

  const dueDate = formatDueDate(task.due_date);
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';

  return (
    <QuickPreviewCard
      title={task.title}
      subtitle={task.description?.slice(0, 60)}
      icon={<CheckSquare className="h-5 w-5" />}
      badge={
        <Badge variant="outline" className={getStatusColor(task.status)}>
          {task.status.replace('_', ' ')}
        </Badge>
      }
      onClose={onClose}
      onOpenDetail={onOpenDetail}
      onEdit={onEdit}
    >
      {/* Task Meta */}
      <div className="grid grid-cols-2 gap-3">
        {/* Due Date */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Due Date
          </div>
          <p className={`font-medium ${isOverdue ? 'text-rose-500' : ''}`}>
            {dueDate || '—'}
            {isOverdue && ' (overdue)'}
          </p>
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flag className="h-3 w-3" />
            Priority
          </div>
          <p className={`font-medium capitalize ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </p>
        </div>
      </div>

      {/* Related Company */}
      {companyName && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm truncate">{companyName}</span>
        </div>
      )}

      {/* Assignee */}
      {assigneeName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Assigned to {assigneeName}</span>
        </div>
      )}

      {/* Time info */}
      {task.due_time && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>at {task.due_time}</span>
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {task.tags.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{task.tags.length - 4}
            </Badge>
          )}
        </div>
      )}
    </QuickPreviewCard>
  );
}
