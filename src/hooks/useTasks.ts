import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeamMember } from './useTeamMembers';
import { isToday, isTomorrow, isThisWeek, isPast, startOfDay } from 'date-fns';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type AssigneeType = 'user' | 'contact' | 'team_member';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  assignee_id: string | null;
  assignee_type: AssigneeType | null;
  assignee_user_id: string | null;
  assignee_contact_id: string | null;
  created_by: string | null;
  company_id: string | null;
  contact_id: string | null;
  tags: string[] | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  assignee?: TeamMember;
  assignee_contact?: { id: string; first_name: string; last_name: string };
  company?: { id: string; name: string };
  linked_contact?: { id: string; first_name: string; last_name: string };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string | null;
  due_time?: string | null;
  assignee_id?: string | null;
  assignee_type?: AssigneeType | null;
  assignee_user_id?: string | null;
  assignee_contact_id?: string | null;
  company_id?: string | null;
  contact_id?: string | null;
  tags?: string[];
}

export interface TaskFilters {
  assignee_id?: string;
  assignee_user_id?: string;
  assignee_contact_id?: string;
  company_id?: string;
  contact_id?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
}

export function useTasks(filters?: TaskFilters) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:team_members!tasks_assignee_id_fkey(*),
          assignee_contact:contacts!tasks_assignee_contact_id_fkey(id, first_name, last_name),
          company:companies(id, name),
          linked_contact:contacts!tasks_contact_id_fkey(id, first_name, last_name)
        `)
        .order('due_date', { ascending: true, nullsFirst: false });
      
      if (filters?.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
      }
      if (filters?.assignee_user_id) {
        query = query.eq('assignee_user_id', filters.assignee_user_id);
      }
      if (filters?.assignee_contact_id) {
        query = query.eq('assignee_contact_id', filters.assignee_contact_id);
      }
      if (filters?.company_id) {
        query = query.eq('company_id', filters.company_id);
      }
      if (filters?.contact_id) {
        query = query.eq('contact_id', filters.contact_id);
      }
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const mapped = (data || []).map(item => ({
        ...item,
        priority: item.priority as TaskPriority,
        status: item.status as TaskStatus,
        assignee_type: item.assignee_type as AssigneeType | null,
        assignee: item.assignee as TeamMember | undefined,
        assignee_contact: item.assignee_contact as { id: string; first_name: string; last_name: string } | undefined,
        company: item.company as { id: string; name: string } | undefined,
        linked_contact: item.linked_contact as { id: string; first_name: string; last_name: string } | undefined,
      })) as Task[];
      
      setTasks(mapped);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters?.assignee_id, filters?.assignee_user_id, filters?.assignee_contact_id, filters?.company_id, filters?.contact_id, filters?.status]);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: input.title,
        description: input.description,
        priority: input.priority || 'medium',
        status: input.status || 'todo',
        due_date: input.due_date,
        due_time: input.due_time,
        assignee_id: input.assignee_id,
        assignee_type: input.assignee_type,
        assignee_user_id: input.assignee_user_id,
        assignee_contact_id: input.assignee_contact_id,
        company_id: input.company_id,
        contact_id: input.contact_id,
        tags: input.tags,
        user_id: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    await fetchTasks();
    return data as Task;
  }, [user, fetchTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<CreateTaskInput> & { status?: TaskStatus; completed_at?: string | null }) => {
    // If status is changing to 'done', set completed_at
    if (updates.status === 'done' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    } else if (updates.status && updates.status !== 'done') {
      updates.completed_at = null;
    }
    
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    await fetchTasks();
  }, [fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    await fetchTasks();
  }, [fetchTasks]);

  const toggleTaskComplete = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    await updateTask(id, { status: newStatus });
  }, [tasks, updateTask]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Computed groups
  const { overdueTasks, todayTasks, tomorrowTasks, thisWeekTasks, laterTasks, noDueDateTasks, completedTasks, openTasks } = useMemo(() => {
    const now = startOfDay(new Date());
    
    const overdue: Task[] = [];
    const today: Task[] = [];
    const tomorrow: Task[] = [];
    const thisWeek: Task[] = [];
    const later: Task[] = [];
    const noDueDate: Task[] = [];
    const completed: Task[] = [];
    const open: Task[] = [];
    
    tasks.forEach(task => {
      if (task.status === 'done') {
        completed.push(task);
        return;
      }
      
      open.push(task);
      
      if (!task.due_date) {
        noDueDate.push(task);
        return;
      }
      
      const dueDate = new Date(task.due_date);
      
      if (isPast(dueDate) && !isToday(dueDate)) {
        overdue.push(task);
      } else if (isToday(dueDate)) {
        today.push(task);
      } else if (isTomorrow(dueDate)) {
        tomorrow.push(task);
      } else if (isThisWeek(dueDate)) {
        thisWeek.push(task);
      } else {
        later.push(task);
      }
    });
    
    return {
      overdueTasks: overdue,
      todayTasks: today,
      tomorrowTasks: tomorrow,
      thisWeekTasks: thisWeek,
      laterTasks: later,
      noDueDateTasks: noDueDate,
      completedTasks: completed,
      openTasks: open,
    };
  }, [tasks]);

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    refetch: fetchTasks,
    // Computed
    overdueTasks,
    todayTasks,
    tomorrowTasks,
    thisWeekTasks,
    laterTasks,
    noDueDateTasks,
    completedTasks,
    openTasks,
  };
}

// Shortcut hook for current user's tasks
export function useMyTasks() {
  const { user } = useAuth();
  // For now, just use all tasks - in a real app, you'd filter by assignee matching user
  return useTasks();
}

// Shortcut hook for company tasks
export function useCompanyTasks(companyId: string | undefined) {
  return useTasks(companyId ? { company_id: companyId } : undefined);
}

// Shortcut hook for contact tasks
export function useContactTasks(contactId: string | undefined) {
  return useTasks(contactId ? { contact_id: contactId } : undefined);
}