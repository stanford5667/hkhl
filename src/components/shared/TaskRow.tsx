import { motion } from 'framer-motion';
import { Task } from '@/hooks/useTasks';
import { TaskCheckbox } from './TaskCheckbox';
import { RelationshipBadges } from './RelationshipBadges';
import { DateDisplay } from './DateDisplay';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaskRowProps {
  task: Task;
  compact?: boolean;
  onToggle?: (taskId: string) => void;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-slate-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  urgent: 'bg-rose-500',
};

export function TaskRow({ task, compact = false, onToggle, onClick }: TaskRowProps) {
  const isCompleted = task.status === 'done';
  
  // Build relationship data
  const company = task.company_id ? { 
    id: task.company_id, 
    name: (task as any).company?.name || 'Company' 
  } : null;
  
  const contact = task.contact_id ? { 
    id: task.contact_id, 
    name: (task as any).contact?.name || 'Contact' 
  } : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 group rounded-lg transition-colors",
        compact ? "p-2" : "p-3",
        "hover:bg-slate-800/50 cursor-pointer"
      )}
    >
      <TaskCheckbox 
        checked={isCompleted}
        onChange={() => onToggle?.(task.id)}
        size={compact ? 'sm' : 'md'}
      />
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "truncate",
          compact ? "text-sm" : "text-base",
          isCompleted ? "line-through text-muted-foreground" : "text-foreground"
        )}>
          {task.title}
        </p>
        
        {!compact && (company || contact) && (
          <div className="mt-1">
            <RelationshipBadges 
              company={company}
              contact={contact}
              size="sm"
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {!compact && task.priority && task.priority !== 'medium' && (
          <div className={cn(
            "h-2 w-2 rounded-full",
            priorityColors[task.priority]
          )} />
        )}
        {task.due_date && (
          <DateDisplay date={task.due_date} showOverdue={!isCompleted} />
        )}
      </div>
    </motion.div>
  );
}
