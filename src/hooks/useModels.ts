import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Model {
  id: string;
  company_id: string;
  user_id: string;
  model_type: string;
  name: string;
  model_data: any;
  assumptions: any;
  historical_data: any;
  interview_responses: any;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface SaveModelParams {
  companyId: string;
  modelType: string;
  name: string;
  modelData: any;
  assumptions?: any;
  historicalData?: any;
  interviewResponses?: any;
  status?: 'draft' | 'final';
}

export function useModels() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const saveModel = async (params: SaveModelParams): Promise<Model | null> => {
    if (!user) {
      toast.error('Please sign in to save a model');
      return null;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('models')
        .insert({
          company_id: params.companyId,
          user_id: user.id,
          model_type: params.modelType,
          name: params.name,
          model_data: params.modelData,
          assumptions: params.assumptions,
          historical_data: params.historicalData,
          interview_responses: params.interviewResponses,
          status: params.status || 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Model saved successfully');
      return data;
    } catch (error) {
      console.error('Error saving model:', error);
      toast.error('Failed to save model');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const getModelsForCompany = async (companyId: string): Promise<Model[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  };

  return { saveModel, getModelsForCompany, saving };
}
