import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TeamRole = 'partner' | 'principal' | 'vp' | 'associate' | 'analyst';

export interface TeamMember {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  avatar_url: string | null;
  role: TeamRole;
  title: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateTeamMemberInput {
  name: string;
  email: string;
  avatar_url?: string;
  role?: TeamRole;
  title?: string;
  user_id?: string;
}

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchTeamMembers = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setTeamMembers((data || []) as TeamMember[]);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createTeamMember = useCallback(async (input: CreateTeamMemberInput) => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        ...input,
        role: input.role || 'analyst',
      })
      .select()
      .single();
    
    if (error) throw error;
    await fetchTeamMembers();
    return data as TeamMember;
  }, [user, fetchTeamMembers]);

  const updateTeamMember = useCallback(async (id: string, updates: Partial<CreateTeamMemberInput>) => {
    const { error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    await fetchTeamMembers();
  }, [fetchTeamMembers]);

  const deleteTeamMember = useCallback(async (id: string) => {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
    await fetchTeamMembers();
  }, [fetchTeamMembers]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  return {
    teamMembers,
    isLoading,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    refetch: fetchTeamMembers,
  };
}
