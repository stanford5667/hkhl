import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
  user_id: string;
  author?: {
    email: string;
  };
}

export function useTaskComments(taskId: string | undefined) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchComments = useCallback(async () => {
    if (!taskId || !user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, user]);

  const addComment = useCallback(async (content: string) => {
    if (!taskId || !user) return null;

    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        content,
        author_id: user.id,
        user_id: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    setComments(prev => [...prev, data]);
    return data;
  }, [taskId, user]);

  const deleteComment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    setComments(prev => prev.filter(c => c.id !== id));
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    isLoading,
    addComment,
    deleteComment,
    refetch: fetchComments,
  };
}