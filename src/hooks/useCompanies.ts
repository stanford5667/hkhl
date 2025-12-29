import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  industry: string | null;
  description: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    if (!user) {
      setCompanies([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (name: string, industry?: string): Promise<Company | null> => {
    if (!user) {
      toast.error('Please sign in to create a company');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({ user_id: user.id, name, industry })
        .select()
        .single();

      if (error) throw error;
      
      setCompanies(prev => [...prev, data]);
      toast.success(`Company "${name}" created`);
      return data;
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error('Failed to create company');
      return null;
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [user]);

  return { companies, loading, createCompany, refetch: fetchCompanies };
}
