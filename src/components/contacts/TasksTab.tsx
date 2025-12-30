import { useState } from 'react';
import { Contact } from '@/hooks/useContacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  CheckSquare,
  Check,
  Calendar as CalendarIcon,
  User,
  Edit,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';

interface TasksTabProps {
  contact: Contact;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high';
  assignee: { id: string; name: string } | null;
}

export function TasksTab({ contact }: TasksTabProps) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Follow up on proposal',
      completed: false,
      dueDate: new Date().toISOString(),
      priority: 'high',
      assignee: { id: 'me', name: 'Me' },
    },
    {
      id: '2',
      title: 'Schedule intro call',
      completed: true,
      dueDate: null,
      priority: 'medium',
      assignee: null,
    },
  ]);

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'open') return !t.completed;
    if (filterStatus === 'completed') return t.completed;
    return true;
  });

  const openTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const addTask = (task: Omit<Task, 'id'>) => {
    setTasks([...tasks, { ...task, id: crypto.randomUUID() }]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h4 className="text-foreground font-medium">Tasks</h4>
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={filterStatus === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilterStatus('all')}
            >
              All ({tasks.length})
            </Button>
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
              Done ({completedTasks.length})
            </Button>
          </div>
        </div>

        <Button size="sm" onClick={() => setShowNewTask(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Task
        </Button>
      </div>

      {/* Quick Add */}
      {showNewTask && (
        <QuickTaskAdd
          contactId={contact.id}
          onAdd={addTask}
          onCancel={() => setShowNewTask(false)}
        />
      )}

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground">No tasks</p>
            <Button variant="link" className="text-primary" onClick={() => setShowNewTask(true)}>
              Create a task
            </Button>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} />
          ))
        )}
      </div>
    </div>
  );
}

function QuickTaskAdd({
  contactId,
  onAdd,
  onCancel,
}: {
  contactId: string;
  onAdd: (task: Omit<Task, 'id'>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [assignee, setAssignee] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;

    onAdd({
      title,
      dueDate: dueDate?.toISOString() || null,
      priority,
      assignee: assignee ? { id: assignee, name: assignee === 'me' ? 'Me' : assignee } : null,
      completed: false,
    });

    setTitle('');
    setDueDate(undefined);
    setPriority('medium');
    setAssignee('');
    onCancel();
  };

  return (
    <Card className="p-4 bg-muted/30 border-border">
      <div className="space-y-3">
        <Input
          placeholder="Task title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-muted/50 border-border"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onCancel();
          }}
        />

        <div className="flex items-center gap-2 flex-wrap">
          {/* Due Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {dueDate ? format(dueDate, 'MMM d') : 'Due date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
            </PopoverContent>
          </Popover>

          {/* Priority */}
          <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  Low
                </span>
              </SelectItem>
              <SelectItem value="medium">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  Medium
                </span>
              </SelectItem>
              <SelectItem value="high">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  High
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee */}
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className="w-36 h-8">
              <User className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">Me</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!title.trim()}>
            Add Task
          </Button>
        </div>
      </div>
    </Card>
  );
}

function TaskCard({
  task,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const priorityColors = {
    low: 'bg-muted-foreground',
    medium: 'bg-amber-400',
    high: 'bg-destructive',
  };

  const handleToggleComplete = () => {
    onUpdate(task.id, { completed: !task.completed });
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdate(task.id, { title: editTitle });
    }
    setIsEditing(false);
  };

  const isPastDue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));

  return (
    <Card className={cn('p-3 bg-muted/30 border-border group', task.completed && 'opacity-60')}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleToggleComplete}
          className={cn(
            'mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
            task.completed
              ? 'bg-emerald-600 border-emerald-600'
              : 'border-border hover:border-muted-foreground'
          )}
        >
          {task.completed && <Check className="h-3 w-3 text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-7 bg-muted/50 border-border"
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
                'text-foreground text-sm cursor-pointer',
                task.completed && 'line-through text-muted-foreground'
              )}
              onClick={() => setIsEditing(true)}
            >
              {task.title}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2">
            {/* Priority */}
            <div className={cn('h-1.5 w-1.5 rounded-full', priorityColors[task.priority])} />

            {/* Due Date */}
            {task.dueDate && (
              <span
                className={cn(
                  'text-xs flex items-center gap-1',
                  isPastDue && !task.completed ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(task.dueDate), 'MMM d')}
              </span>
            )}

            {/* Assignee */}
            {task.assignee && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px]">
                    {task.assignee.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                {task.assignee.name}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
