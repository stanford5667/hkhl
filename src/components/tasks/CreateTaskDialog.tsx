import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, nextMonday } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Calendar as CalendarIcon, Building2, User, Loader2, Users, RepeatIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks, TaskPriority, RecurrencePattern } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { RecurrenceSettings, RecurrenceConfig } from './RecurrenceSettings';
import { TaskTemplateManager, TaskTemplate } from './TaskTemplateManager';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignee_id: z.string().optional(),
  assignee_type: z.enum(['user', 'contact', 'team_member']).optional(),
  due_date: z.date().optional().nullable(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  defaultAssignee?: string;
  onTaskCreated?: () => void;
}

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-slate-500' },
  medium: { label: 'Medium', color: 'bg-amber-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: 'bg-rose-500' },
};

export function CreateTaskDialog({
  open,
  onClose,
  companyId,
  companyName,
  contactId,
  contactName,
  defaultAssignee,
  onTaskCreated,
}: CreateTaskDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({
    pattern: null,
    interval: 1,
    endDate: null,
  });
  const { createTask } = useTasks();
  const { teamMembers } = useTeamMembers();
  const { contacts } = useContacts();
  const { user } = useAuth();
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      assignee_id: defaultAssignee || '',
      assignee_type: undefined,
      due_date: null,
    },
  });

  // Reset recurrence when dialog closes
  useEffect(() => {
    if (!open) {
      setRecurrence({ pattern: null, interval: 1, endDate: null });
    }
  }, [open]);

  // Find current user's team member profile
  const myTeamMember = teamMembers.find(tm => tm.email === user?.email);

  const handleTemplateSelect = (template: TaskTemplate) => {
    form.setValue('title', template.title);
    form.setValue('description', template.description || '');
    form.setValue('priority', template.priority);
    if (template.recurrence_pattern) {
      setRecurrence({
        pattern: template.recurrence_pattern as RecurrencePattern,
        interval: template.recurrence_interval || 1,
        endDate: null,
      });
    }
  };

  const handleSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      let assigneeId: string | null = null;
      let assigneeType: 'user' | 'contact' | 'team_member' | null = null;
      let assigneeUserId: string | null = null;
      let assigneeContactId: string | null = null;

      // Parse assignee selection
      if (data.assignee_id && data.assignee_id !== 'unassigned') {
        if (data.assignee_id === 'me' && myTeamMember) {
          assigneeId = myTeamMember.id;
          assigneeType = 'team_member';
          assigneeUserId = user?.id || null;
        } else if (data.assignee_id.startsWith('team:')) {
          assigneeId = data.assignee_id.replace('team:', '');
          assigneeType = 'team_member';
        } else if (data.assignee_id.startsWith('contact:')) {
          assigneeContactId = data.assignee_id.replace('contact:', '');
          assigneeType = 'contact';
        }
      }
      
      await createTask({
        title: data.title,
        description: data.description,
        priority: data.priority,
        assignee_id: assigneeId,
        assignee_type: assigneeType,
        assignee_user_id: assigneeUserId,
        assignee_contact_id: assigneeContactId,
        due_date: data.due_date?.toISOString() || null,
        company_id: companyId || null,
        contact_id: contactId || null,
        recurrence_pattern: recurrence.pattern,
        recurrence_interval: recurrence.interval,
        recurrence_end_date: recurrence.endDate?.toISOString() || null,
      });
      toast.success(recurrence.pattern ? 'Recurring task created' : 'Task created');
      form.reset();
      setRecurrence({ pattern: null, interval: 1, endDate: null });
      onTaskCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setQuickDate = (date: Date) => {
    form.setValue('due_date', date);
  };

  const currentTaskData = {
    title: form.watch('title'),
    description: form.watch('description'),
    priority: form.watch('priority'),
    recurrence_pattern: recurrence.pattern,
    recurrence_interval: recurrence.interval,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Create Task</DialogTitle>
            <TaskTemplateManager 
              onSelectTemplate={handleTemplateSelect}
              currentTask={currentTaskData}
            />
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Recurrence Settings */}
            <div className="space-y-2">
              <FormLabel className="text-slate-400">Repeat</FormLabel>
              <RecurrenceSettings value={recurrence} onChange={setRecurrence} />
            </div>
            
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Task title..."
                      className="text-lg bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add description (optional)"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                      rows={3}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {/* Linked Entity Badge */}
            {(companyId || contactId) && (
              <div className="flex gap-2">
                {companyId && (
                  <Badge variant="outline" className="text-slate-300 border-slate-700">
                    <Building2 className="h-3 w-3 mr-1" />
                    Linked to {companyName || 'Company'}
                  </Badge>
                )}
                {contactId && (
                  <Badge variant="outline" className="text-slate-300 border-slate-700">
                    <User className="h-3 w-3 mr-1" />
                    Linked to {contactName || 'Contact'}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              {/* Assignee */}
              <FormField
                control={form.control}
                name="assignee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-400">Assignee</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-900 border-slate-800 max-h-72">
                        <SelectItem value="unassigned" className="text-slate-300">
                          Unassigned
                        </SelectItem>
                        
                        {/* Me option */}
                        {myTeamMember && (
                          <SelectItem value="me" className="text-emerald-400">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px] bg-emerald-700">
                                  {myTeamMember.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              Me ({myTeamMember.name})
                            </div>
                          </SelectItem>
                        )}
                        
                        {/* Team Members Section */}
                        {teamMembers.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Team Members
                            </div>
                            {teamMembers
                              .filter(m => m.id !== myTeamMember?.id)
                              .map((member) => (
                                <SelectItem key={member.id} value={`team:${member.id}`} className="text-slate-300">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[10px] bg-slate-700">
                                        {member.name.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    {member.name}
                                  </div>
                                </SelectItem>
                              ))}
                          </>
                        )}
                        
                        {/* Contacts Section */}
                        {contacts.length > 0 && (
                          <>
                            <Separator className="my-1 bg-slate-700" />
                            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              From Contacts
                            </div>
                            {contacts.slice(0, 10).map((contact) => (
                              <SelectItem key={contact.id} value={`contact:${contact.id}`} className="text-purple-300">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[10px] bg-purple-700/50">
                                      {contact.first_name[0]}{contact.last_name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  {contact.first_name} {contact.last_name}
                                  {contact.company && (
                                    <span className="text-slate-500 text-xs ml-1">
                                      @ {contact.company.name}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                            {contacts.length > 10 && (
                              <div className="px-2 py-1 text-xs text-slate-500">
                                +{contacts.length - 10} more contacts
                              </div>
                            )}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              
              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-400">Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
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
                  </FormItem>
                )}
              />
            </div>
            
            {/* Due Date */}
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-400">Due Date</FormLabel>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'flex-1 justify-start text-left bg-slate-800 border-slate-700',
                              !field.value && 'text-slate-500'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    
                    {/* Quick date buttons */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      onClick={() => setQuickDate(new Date())}
                    >
                      Today
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      onClick={() => setQuickDate(addDays(new Date(), 1))}
                    >
                      Tomorrow
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      onClick={() => setQuickDate(nextMonday(new Date()))}
                    >
                      Next Week
                    </Button>
                  </div>
                </FormItem>
              )}
            />
            
            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Task
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}