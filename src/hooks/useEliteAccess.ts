import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useEliteAccess() {
  const { user } = useAuth();
  const [isElite, setIsElite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsElite(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'elite_client');

        if (!error && data && data.length > 0) {
          setIsElite(true);
        } else {
          setIsElite(false);
        }
      } catch {
        setIsElite(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user]);

  return { isElite, loading };
}
