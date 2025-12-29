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
  version: number | null;
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

interface UpdateModelParams {
  modelData?: any;
  assumptions?: any;
  historicalData?: any;
  status?: 'draft' | 'final';
  name?: string;
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

  const updateModel = async (modelId: string, params: UpdateModelParams): Promise<Model | null> => {
    if (!user) {
      toast.error('Please sign in to update a model');
      return null;
    }

    setSaving(true);
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (params.modelData !== undefined) updateData.model_data = params.modelData;
      if (params.assumptions !== undefined) updateData.assumptions = params.assumptions;
      if (params.historicalData !== undefined) updateData.historical_data = params.historicalData;
      if (params.status !== undefined) updateData.status = params.status;
      if (params.name !== undefined) updateData.name = params.name;

      const { data, error } = await supabase
        .from('models')
        .update(updateData)
        .eq('id', modelId)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Model updated');
      return data;
    } catch (error) {
      console.error('Error updating model:', error);
      toast.error('Failed to update model');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const getModel = async (modelId: string): Promise<Model | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('id', modelId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching model:', error);
      return null;
    }
  };

  const duplicateModel = async (modelId: string): Promise<Model | null> => {
    if (!user) {
      toast.error('Please sign in');
      return null;
    }

    try {
      const original = await getModel(modelId);
      if (!original) throw new Error('Model not found');

      const { data, error } = await supabase
        .from('models')
        .insert({
          company_id: original.company_id,
          user_id: user.id,
          model_type: original.model_type,
          name: `${original.name} (Copy)`,
          model_data: original.model_data,
          assumptions: original.assumptions,
          historical_data: original.historical_data,
          interview_responses: original.interview_responses,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Model duplicated');
      return data;
    } catch (error) {
      console.error('Error duplicating model:', error);
      toast.error('Failed to duplicate model');
      return null;
    }
  };

  const deleteModel = async (modelId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in');
      return false;
    }

    try {
      const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;
      toast.success('Model deleted');
      return true;
    } catch (error) {
      console.error('Error deleting model:', error);
      toast.error('Failed to delete model');
      return false;
    }
  };

  const saveAsNewVersion = async (modelId: string, params: UpdateModelParams): Promise<Model | null> => {
    if (!user) {
      toast.error('Please sign in');
      return null;
    }

    try {
      const original = await getModel(modelId);
      if (!original) throw new Error('Model not found');

      const newVersion = (original.version || 1) + 1;

      const { data, error } = await supabase
        .from('models')
        .insert({
          company_id: original.company_id,
          user_id: user.id,
          model_type: original.model_type,
          name: `${original.name.replace(/ v\d+$/, '')} v${newVersion}`,
          model_data: params.modelData ?? original.model_data,
          assumptions: params.assumptions ?? original.assumptions,
          historical_data: params.historicalData ?? original.historical_data,
          interview_responses: original.interview_responses,
          status: params.status || 'draft',
          version: newVersion
        })
        .select()
        .single();

      if (error) throw error;
      toast.success(`Saved as version ${newVersion}`);
      return data;
    } catch (error) {
      console.error('Error saving new version:', error);
      toast.error('Failed to save new version');
      return null;
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

  const getAllModels = async (): Promise<Model[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  };

  return { 
    saveModel, 
    updateModel,
    getModel,
    duplicateModel,
    deleteModel,
    saveAsNewVersion,
    getModelsForCompany, 
    getAllModels,
    saving 
  };
}
