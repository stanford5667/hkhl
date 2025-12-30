import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type CompanyStage = 'pipeline' | 'portfolio' | 'passed' | 'prospect';
export type PipelineSubStage = 'sourcing' | 'initial-review' | 'deep-dive' | 'loi' | 'due-diligence' | 'closing';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  industry: string | null;
  website: string | null;
  description: string | null;
  company_type: CompanyStage | null;
  pipeline_stage: string | null;
  revenue_ltm: number | null;
  ebitda_ltm: number | null;
  deal_lead: string | null;
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
      setCompanies((data as Company[]) || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (companyData: Partial<Company>): Promise<Company | null> => {
    if (!user) {
      toast.error('Please sign in to create a company');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({ 
          user_id: user.id, 
          name: companyData.name,
          industry: companyData.industry || null,
          website: companyData.website || null,
          description: companyData.description || null,
          company_type: companyData.company_type || 'pipeline',
          pipeline_stage: companyData.pipeline_stage || 'sourcing',
          revenue_ltm: companyData.revenue_ltm || null,
          ebitda_ltm: companyData.ebitda_ltm || null,
          deal_lead: companyData.deal_lead || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      setCompanies(prev => [...prev, data as Company]);
      toast.success(`Company "${companyData.name}" created`);
      return data as Company;
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error('Failed to create company');
      return null;
    }
  };

  const updateCompany = async (companyId: string, updates: Partial<Company>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId);

      if (error) throw error;

      setCompanies(prev =>
        prev.map(c => c.id === companyId ? { ...c, ...updates } : c)
      );
      return true;
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company');
      return false;
    }
  };

  const updateStage = async (
    companyId: string, 
    stage: CompanyStage, 
    pipelineStage?: string
  ): Promise<boolean> => {
    try {
      const updates: Partial<Company> = { 
        company_type: stage,
        pipeline_stage: stage === 'pipeline' ? (pipelineStage || 'sourcing') : null
      };

      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId);

      if (error) throw error;

      setCompanies(prev =>
        prev.map(c => c.id === companyId ? { ...c, ...updates } : c)
      );
      
      return true;
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
      return false;
    }
  };

  const updatePipelineStage = async (companyId: string, pipelineStage: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ pipeline_stage: pipelineStage })
        .eq('id', companyId);

      if (error) throw error;

      setCompanies(prev =>
        prev.map(c => c.id === companyId ? { ...c, pipeline_stage: pipelineStage } : c)
      );
      return true;
    } catch (error) {
      console.error('Error updating pipeline stage:', error);
      toast.error('Failed to update stage');
      return false;
    }
  };

  const deleteCompany = async (companyId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;

      setCompanies(prev => prev.filter(c => c.id !== companyId));
      toast.success('Company deleted');
      return true;
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('Failed to delete company');
      return false;
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [user]);

  return { 
    companies, 
    loading, 
    createCompany, 
    updateCompany,
    updateStage,
    updatePipelineStage,
    deleteCompany,
    refetch: fetchCompanies 
  };
}
