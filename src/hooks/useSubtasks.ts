import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  user_id: string;
}

export function useSubtasks(taskId: string | undefined) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchSubtasks = useCallback(async () => {
    if (!taskId || !user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      setSubtasks(data || []);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, user]);

  const addSubtask = useCallback(async (title: string) => {
    if (!taskId || !user) return null;
    
    const maxOrder = subtasks.length > 0 
      ? Math.max(...subtasks.map(s => s.sort_order)) + 1 
      : 0;

    const { data, error } = await supabase
      .from('subtasks')
      .insert({
        task_id: taskId,
        title,
        sort_order: maxOrder,
        user_id: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    setSubtasks(prev => [...prev, data]);
    return data;
  }, [taskId, user, subtasks]);

  const updateSubtask = useCallback(async (id: string, updates: Partial<Pick<Subtask, 'title' | 'completed'>>) => {
    const updateData: Record<string, unknown> = { ...updates };
    
    if (updates.completed !== undefined) {
      updateData.completed_at = updates.completed ? new Date().toISOString() : null;
    }

    const { error } = await supabase
      .from('subtasks')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    setSubtasks(prev => prev.map(s => 
      s.id === id ? { ...s, ...updateData } as Subtask : s
    ));
  }, []);

  const deleteSubtask = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('subtasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    setSubtasks(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleSubtask = useCallback(async (id: string) => {
    const subtask = subtasks.find(s => s.id === id);
    if (!subtask) return;
    
    await updateSubtask(id, { completed: !subtask.completed });
  }, [subtasks, updateSubtask]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return {
    subtasks,
    isLoading,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtask,
    refetch: fetchSubtasks,
    completedCount,
    totalCount,
    progress,
  };
}