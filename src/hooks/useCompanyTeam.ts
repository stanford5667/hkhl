import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeamMember } from './useTeamMembers';

export type AssignmentRole = 'lead' | 'associate' | 'analyst' | 'reviewer';

export interface TeamAssignment {
  id: string;
  company_id: string;
  team_member_id: string;
  role: AssignmentRole;
  assigned_at: string;
  team_member?: TeamMember;
}

export function useCompanyTeam(companyId: string | undefined) {
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchAssignments = useCallback(async () => {
    if (!user || !companyId) {
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('company_team_assignments')
        .select(`
          *,
          team_member:team_members(*)
        `)
        .eq('company_id', companyId);
      
      if (error) throw error;
      
      const mapped = (data || []).map(item => ({
        id: item.id,
        company_id: item.company_id,
        team_member_id: item.team_member_id,
        role: item.role as AssignmentRole,
        assigned_at: item.assigned_at,
        team_member: item.team_member as TeamMember,
      }));
      
      setAssignments(mapped);
    } catch (error) {
      console.error('Error fetching company team:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, companyId]);

  const addAssignment = useCallback(async (teamMemberId: string, role: AssignmentRole) => {
    if (!user || !companyId) return null;
    
    const { data, error } = await supabase
      .from('company_team_assignments')
      .insert({
        company_id: companyId,
        team_member_id: teamMemberId,
        role,
        user_id: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    await fetchAssignments();
    return data;
  }, [user, companyId, fetchAssignments]);

  const updateRole = useCallback(async (assignmentId: string, role: AssignmentRole) => {
    const { error } = await supabase
      .from('company_team_assignments')
      .update({ role })
      .eq('id', assignmentId);
    
    if (error) throw error;
    await fetchAssignments();
  }, [fetchAssignments]);

  const removeAssignment = useCallback(async (assignmentId: string) => {
    const { error } = await supabase
      .from('company_team_assignments')
      .delete()
      .eq('id', assignmentId);
    
    if (error) throw error;
    await fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    isLoading,
    addAssignment,
    updateRole,
    removeAssignment,
    refetch: fetchAssignments,
  };
}
