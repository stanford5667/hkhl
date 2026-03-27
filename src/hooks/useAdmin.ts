import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'member' | 'viewer' | 'elite_client';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setUserRole(null);
      setLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        // Check if user has admin role (user can have multiple roles)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          setUserRole(null);
        } else if (data && data.length > 0) {
          const roles = data.map(r => r.role as AppRole);
          // Check if admin is among the roles
          const hasAdmin = roles.includes('admin');
          setIsAdmin(hasAdmin);
          // Set the highest privilege role
          setUserRole(hasAdmin ? 'admin' : roles[0]);
        } else {
          setIsAdmin(false);
          setUserRole(null);
        }
      } catch (err) {
        console.error('Error in admin check:', err);
        setIsAdmin(false);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, userRole, loading };
}

// Hook to manage user roles (admin only)
export function useUserRoles() {
  const { isAdmin } = useAdmin();
  const [loading, setLoading] = useState(false);

  const assignRole = async (userId: string, role: AppRole) => {
    if (!isAdmin) {
      throw new Error('Only admins can assign roles');
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert(
          { user_id: userId, role },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error assigning role:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeRole = async (userId: string) => {
    if (!isAdmin) {
      throw new Error('Only admins can remove roles');
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error removing role:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getAllRoles = async () => {
    if (!isAdmin) {
      throw new Error('Only admins can view all roles');
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('*');

    if (error) throw error;
    return data as UserRole[];
  };

  return { assignRole, removeRole, getAllRoles, loading };
}
