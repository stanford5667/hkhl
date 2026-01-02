import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar as CalendarIcon,
  Building2,
  User,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ListChecks,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskPriority, TaskStatus, useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { SubtaskList } from './SubtaskList';
import { TaskComments } from './TaskComments';

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
  onTaskDeleted?: () => void;
}

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ElementType }> = {
  todo: { label: 'To Do', color: 'bg-slate-500', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-500', icon: Clock },
  blocked: { label: 'Blocked', color: 'bg-amber-500', icon: AlertCircle },
  done: { label: 'Done', color: 'bg-emerald-500', icon: CheckCircle2 },
};

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-slate-500' },
  medium: { label: 'Medium', color: 'bg-amber-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-rose-500' },
};

export function TaskDetailDialog({
  task,
  open,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('subtasks');

  const { updateTask, deleteTask } = useTasks();
  const { teamMembers } = useTeamMembers();
  const { contacts } = useContacts();
  const { user } = useAuth();

  const myTeamMember = teamMembers.find(tm => tm.email === user?.email);

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      
      // Determine assignee type
      if (task.assignee_id) {
        if (task.assignee_id === myTeamMember?.id) {
          setAssigneeId('me');
        } else {
          setAssigneeId(`team:${task.assignee_id}`);
        }
      } else if (task.assignee_contact_id) {
        setAssigneeId(`contact:${task.assignee_contact_id}`);
      } else {
        setAssigneeId('unassigned');
      }
    }
  }, [task, myTeamMember?.id]);

  const handleSave = async () => {
    if (!task) return;
    
    setIsSaving(true);
    try {
      let newAssigneeId: string | null = null;
      let newAssigneeType: 'user' | 'contact' | 'team_member' | null = null;
      let newAssigneeContactId: string | null = null;

      if (assigneeId && assigneeId !== 'unassigned') {
        if (assigneeId === 'me' && myTeamMember) {
          newAssigneeId = myTeamMember.id;
          newAssigneeType = 'team_member';
        } else if (assigneeId.startsWith('team:')) {
          newAssigneeId = assigneeId.replace('team:', '');
          newAssigneeType = 'team_member';
        } else if (assigneeId.startsWith('contact:')) {
          newAssigneeContactId = assigneeId.replace('contact:', '');
          newAssigneeType = 'contact';
        }
      }

      await updateTask(task.id, {
        title,
        description: description || undefined,
        status,
        priority,
        due_date: dueDate?.toISOString() || null,
        assignee_id: newAssigneeId,
        assignee_type: newAssigneeType,
        assignee_contact_id: newAssigneeContactId,
      });
      
      toast.success('Task updated');
      onTaskUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      toast.success('Task deleted');
      onTaskDeleted?.();
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl bg-slate-900 border-slate-800 p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 pb-0 flex-shrink-0">
          <div className="flex items-start justify-between">
            <DialogTitle className="text-white sr-only">Edit Task</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="flex gap-6 pb-4">
            {/* Left: Main Content */}
            <div className="flex-1 space-y-4 min-w-0">
              {/* Title */}
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title..."
                className="text-xl font-semibold bg-transparent border-0 p-0 h-auto text-white placeholder:text-slate-600 focus-visible:ring-0"
              />

              {/* Created info */}
              <p className="text-xs text-slate-600">
                Created {format(new Date(task.created_at), 'MMM d, yyyy')}
              </p>

              {/* Description */}
              <div>
                <label className="text-sm text-slate-500 block mb-2">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 min-h-[80px] resize-none"
                />
              </div>

              {/* Links */}
              {(task.company || task.linked_contact) && (
                <div className="space-y-2">
                  <label className="text-sm text-slate-500 block">Links</label>
                  <div className="flex flex-wrap gap-2">
                    {task.company && (
                      <Link to={`/portfolio/${task.company.id}`}>
                        <Badge variant="outline" className="text-slate-300 border-slate-700 hover:bg-slate-800">
                          <Building2 className="h-3 w-3 mr-1" />
                          {task.company.name}
                        </Badge>
                      </Link>
                    )}
                    {task.linked_contact && (
                      <Badge variant="outline" className="text-slate-300 border-slate-700">
                        <User className="h-3 w-3 mr-1" />
                        {task.linked_contact.first_name} {task.linked_contact.last_name}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <Separator className="bg-slate-800" />

              {/* Tabs for Subtasks and Comments */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-slate-800/50 border border-slate-700">
                  <TabsTrigger value="subtasks" className="data-[state=active]:bg-slate-700 gap-1.5">
                    <ListChecks className="h-4 w-4" />
                    Subtasks
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="data-[state=active]:bg-slate-700 gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    Comments
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="subtasks" className="mt-4">
                  <SubtaskList taskId={task.id} />
                </TabsContent>
                
                <TabsContent value="comments" className="mt-4">
                  <TaskComments taskId={task.id} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right: Properties Sidebar */}
            <div className="w-52 space-y-4 flex-shrink-0">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Properties</h3>

              {/* Status */}
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <div className={cn('h-2 w-2 rounded-full', config.color)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Priority</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <div className={cn('h-2 w-2 rounded-full', config.color)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Assignee</label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 max-h-60">
                    <SelectItem value="unassigned" className="text-slate-400">Unassigned</SelectItem>
                    {myTeamMember && (
                      <SelectItem value="me" className="text-emerald-400">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px] bg-emerald-700">
                              {myTeamMember.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          Me
                        </div>
                      </SelectItem>
                    )}
                    {teamMembers.filter(m => m.id !== myTeamMember?.id).map((member) => (
                      <SelectItem key={member.id} value={`team:${member.id}`} className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px] bg-slate-700">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {member.name}
                        </div>
                      </SelectItem>
                    ))}
                    {contacts.length > 0 && (
                      <>
                        <Separator className="my-1 bg-slate-700" />
                        {contacts.slice(0, 5).map((contact) => (
                          <SelectItem key={contact.id} value={`contact:${contact.id}`} className="text-purple-300">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[8px] bg-purple-700/50">
                                  {contact.first_name[0]}{contact.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              {contact.first_name} {contact.last_name}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Due Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left bg-slate-800 border-slate-700 h-9',
                        !dueDate && 'text-slate-500'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dueDate ? format(dueDate, 'MMM d, yyyy') : 'No date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                    {dueDate && (
                      <div className="p-2 border-t border-slate-800">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-slate-400"
                          onClick={() => setDueDate(undefined)}
                        >
                          Clear date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <Separator className="bg-slate-800" />

              {/* Delete */}
              <Button
                variant="ghost"
                className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-900/20"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Task
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-slate-800 flex-shrink-0">
          <Button variant="ghost" onClick={onClose} className="text-slate-400">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}