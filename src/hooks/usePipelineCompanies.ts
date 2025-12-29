import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type CompanyType = 'pipeline' | 'portfolio' | 'prospect' | 'passed';

export interface PipelineCompany {
  id: string;
  user_id: string;
  name: string;
  industry: string | null;
  website: string | null;
  description: string | null;
  company_type: CompanyType | null;
  pipeline_stage: string | null;
  revenue_ltm: number | null;
  ebitda_ltm: number | null;
  deal_lead: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export function usePipelineCompanies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<PipelineCompany[]>([]);
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
        .eq('company_type', 'pipeline')
        .order('name');

      if (error) throw error;
      setCompanies((data as PipelineCompany[]) || []);
    } catch (error) {
      console.error('Error fetching pipeline companies:', error);
      toast.error('Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  };

  const updateStage = async (companyId: string, newStage: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ pipeline_stage: newStage })
        .eq('id', companyId);

      if (error) throw error;

      setCompanies((prev) =>
        prev.map((c) =>
          c.id === companyId ? { ...c, pipeline_stage: newStage } : c
        )
      );
      return true;
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
      return false;
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [user]);

  return {
    companies,
    loading,
    updateStage,
    refetch: fetchCompanies,
  };
}
