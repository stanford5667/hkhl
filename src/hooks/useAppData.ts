import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgId } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

// ============ Types ============
export type CompanyStage = 'pipeline' | 'portfolio' | 'prospect' | 'passed';

export interface AppCompany {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  pipeline_stage: string | null;
  company_type: CompanyStage | null;
  revenue_ltm: number | null;
  ebitda_ltm: number | null;
  deal_lead: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string | null;
  user_id: string;
}

export type ContactCategory = 'lender' | 'executive' | 'board' | 'legal' | 'vendor' | 'team' | 'other';

export interface AppContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  category: ContactCategory | null;
  lender_type: string | null;
  notes: string | null;
  company_id: string | null;
  organization_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  company?: { id: string; name: string } | null;
}

export interface AppTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  company_id: string | null;
  contact_id: string | null;
  assignee_id: string | null;
  assignee_user_id: string | null;
  organization_id: string | null;
  user_id: string;
  created_at: string;
  company?: { id: string; name: string } | null;
  assignee?: { id: string; name: string } | null;
}

// ============ Companies Hook ============
export function useAppCompanies(filters?: { 
  company_type?: string; 
  pipeline_stage?: string;
  search?: string;
}) {
  const { user } = useAuth();
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['companies', orgId, user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      let q = supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgId) {
        q = q.eq('organization_id', orgId);
      } else {
        q = q.eq('user_id', user.id);
      }

      if (filters?.company_type) {
        q = q.eq('company_type', filters.company_type as any);
      }
      if (filters?.pipeline_stage) {
        q = q.eq('pipeline_stage', filters.pipeline_stage);
      }
      if (filters?.search) {
        q = q.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AppCompany[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (companyData: Partial<AppCompany>) => {
      if (!user) throw new Error('Not authenticated');
      
      const insertData = {
        name: companyData.name || 'Untitled',
        user_id: user.id,
        organization_id: orgId || null,
        description: companyData.description,
        website: companyData.website,
        industry: companyData.industry,
        pipeline_stage: companyData.pipeline_stage,
        company_type: companyData.company_type,
        revenue_ltm: companyData.revenue_ltm,
        ebitda_ltm: companyData.ebitda_ltm,
        deal_lead: companyData.deal_lead,
        status: companyData.status,
      };
      
      const { data, error } = await supabase
        .from('companies')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as AppCompany;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create company: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AppCompany> }) => {
      const { name, ...rest } = updates;
      const { error } = await supabase
        .from('companies')
        .update({ name, ...rest })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update company: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete company: ' + error.message);
    },
  });

  const updateStage = async (companyId: string, stage: CompanyStage, pipelineStage?: string) => {
    const updates: Partial<AppCompany> = { company_type: stage };
    if (pipelineStage) {
      updates.pipeline_stage = pipelineStage;
    }
    await updateMutation.mutateAsync({ id: companyId, updates });
  };

  const updatePipelineStage = async (companyId: string, pipelineStage: string) => {
    await updateMutation.mutateAsync({ id: companyId, updates: { pipeline_stage: pipelineStage } });
  };

  return {
    companies: query.data || [],
    isLoading: query.isLoading,
    loading: query.isLoading, // Alias for backward compatibility
    error: query.error,
    refetch: query.refetch,
    createCompany: createMutation.mutateAsync,
    updateCompany: (id: string, updates: Partial<AppCompany>) => 
      updateMutation.mutateAsync({ id, updates }),
    updateStage,
    updatePipelineStage,
    deleteCompany: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

// ============ Contacts Hook ============
export function useAppContacts(filters?: { 
  category?: string; 
  search?: string;
}) {
  const { user } = useAuth();
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['contacts', orgId, user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      let q = supabase
        .from('contacts')
        .select('*, company:companies(id, name)')
        .order('created_at', { ascending: false });

      if (orgId) {
        q = q.eq('organization_id', orgId);
      } else {
        q = q.eq('user_id', user.id);
      }

      if (filters?.category) {
        q = q.eq('category', filters.category as any);
      }
      if (filters?.search) {
        q = q.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AppContact[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (contactData: Partial<AppContact>) => {
      if (!user) throw new Error('Not authenticated');
      
      const insertData = {
        first_name: contactData.first_name || '',
        last_name: contactData.last_name || '',
        user_id: user.id,
        organization_id: orgId || null,
        email: contactData.email,
        phone: contactData.phone,
        title: contactData.title,
        category: contactData.category as any,
        company_id: contactData.company_id,
      };
      
      const { data, error } = await supabase
        .from('contacts')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create contact: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AppContact> }) => {
      const { company, ...rest } = updates;
      const updateData: Record<string, any> = { ...rest };
      if (rest.category) {
        updateData.category = rest.category as ContactCategory;
      }
      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update contact: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete contact: ' + error.message);
    },
  });

  return {
    contacts: query.data || [],
    isLoading: query.isLoading,
    loading: query.isLoading, // Alias for backward compatibility
    error: query.error,
    refetch: query.refetch,
    createContact: createMutation.mutateAsync,
    updateContact: (id: string, updates: Partial<AppContact>) => 
      updateMutation.mutateAsync({ id, updates }),
    deleteContact: deleteMutation.mutateAsync,
  };
}

// ============ Tasks Hook ============
export function useAppTasks(filters?: { 
  status?: string; 
  priority?: string;
  assignee_id?: string;
}) {
  const { user } = useAuth();
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['tasks', orgId, user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      let q = supabase
        .from('tasks')
        .select('*, company:companies(id, name), assignee:team_members!tasks_assignee_id_fkey(id, name)')
        .eq('is_template', false)
        .order('created_at', { ascending: false });

      if (orgId) {
        q = q.eq('organization_id', orgId);
      } else {
        q = q.eq('user_id', user.id);
      }

      if (filters?.status && filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }
      if (filters?.priority && filters.priority !== 'all') {
        q = q.eq('priority', filters.priority);
      }
      if (filters?.assignee_id && filters.assignee_id !== 'all') {
        q = q.eq('assignee_id', filters.assignee_id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as AppTask[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (taskData: Partial<AppTask>) => {
      if (!user) throw new Error('Not authenticated');
      
      const insertData = {
        title: taskData.title || 'Untitled',
        user_id: user.id,
        organization_id: orgId || null,
        description: taskData.description,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date,
        company_id: taskData.company_id,
        contact_id: taskData.contact_id,
        assignee_id: taskData.assignee_id,
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create task: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AppTask> }) => {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to update task: ' + error.message);
    },
  });

  return {
    tasks: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createTask: createMutation.mutateAsync,
    updateTask: (id: string, updates: Partial<AppTask>) => 
      updateMutation.mutateAsync({ id, updates }),
  };
}

// ============ Dashboard Stats Hook ============
export function useDashboardStats() {
  const { companies, isLoading: companiesLoading } = useAppCompanies();
  const { tasks, isLoading: tasksLoading } = useAppTasks();
  const { contacts, isLoading: contactsLoading } = useAppContacts();

  const now = new Date();
  
  const stats = {
    // Company counts
    pipeline: companies.filter(c => c.company_type === 'pipeline').length,
    portfolio: companies.filter(c => c.company_type === 'portfolio').length,
    prospect: companies.filter(c => c.company_type === 'prospect').length,
    passed: companies.filter(c => c.company_type === 'passed').length,
    totalCompanies: companies.length,
    
    // Financial totals
    totalRevenue: companies.reduce((sum, c) => sum + (c.revenue_ltm || 0), 0),
    totalEbitda: companies.reduce((sum, c) => sum + (c.ebitda_ltm || 0), 0),
    
    // Task counts
    totalTasks: tasks.length,
    openTasks: tasks.filter(t => t.status !== 'done').length,
    overdueTasks: tasks.filter(t => 
      t.status !== 'done' && 
      t.due_date && 
      new Date(t.due_date) < now
    ).length,
    todayTasks: tasks.filter(t => {
      if (t.status === 'done' || !t.due_date) return false;
      const due = new Date(t.due_date);
      return due.toDateString() === now.toDateString();
    }).length,
    
    // Contact counts
    totalContacts: contacts.length,
    teamContacts: contacts.filter(c => c.category === 'team').length,
  };

  return {
    stats,
    isLoading: companiesLoading || tasksLoading || contactsLoading,
    companies,
    tasks,
    contacts,
  };
}

// ============ Recent Activity Hook ============
export function useRecentCompanies(limit = 5) {
  const { companies, isLoading } = useAppCompanies();
  return {
    recentCompanies: companies.slice(0, limit),
    isLoading,
  };
}

// ============ Document Types ============
export interface AppDocument {
  id: string;
  company_id: string;
  organization_id: string | null;
  user_id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  folder: string | null;
  subfolder: string | null;
  document_type: string | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at: string | null;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AISummary {
  id: string;
  company_id: string;
  user_id: string;
  summary_type: 'overview' | 'investment_thesis' | 'risks' | 'highlights' | 'key_metrics';
  content: string;
  items: Array<{ title: string; description: string; sentiment?: string }>;
  source_document_ids: string[];
  model_used: string;
  generated_at: string;
  created_at: string;
}

// ============ Company Documents Hook ============
export function useCompanyDocuments(companyId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-documents', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AppDocument[];
    },
    enabled: !!companyId,
    staleTime: Infinity, // Never auto-stale
    refetchOnWindowFocus: false, // No auto-refresh
    refetchOnMount: false, // No auto-fetch on mount
    refetchOnReconnect: false, // No auto-fetch on reconnect
    // DISABLED: Auto-polling removed - user must click Refresh
    // refetchInterval: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, error }: { 
      id: string; 
      status: AppDocument['processing_status']; 
      error?: string 
    }) => {
      const updateData: Record<string, any> = { 
        processing_status: status,
        updated_at: new Date().toISOString()
      };
      if (status === 'completed') {
        updateData.processed_at = new Date().toISOString();
      }
      if (error) {
        updateData.processing_error = error;
      }
      
      const { error: updateError } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-documents', companyId] });
    },
  });

  // Processing stats
  const processingStats = {
    pending: query.data?.filter(d => d.processing_status === 'pending').length || 0,
    processing: query.data?.filter(d => d.processing_status === 'processing').length || 0,
    completed: query.data?.filter(d => d.processing_status === 'completed').length || 0,
    failed: query.data?.filter(d => d.processing_status === 'failed').length || 0,
    total: query.data?.length || 0,
  };
  
  const isProcessing = processingStats.pending > 0 || processingStats.processing > 0;

  return {
    documents: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateDocumentStatus: updateStatusMutation.mutateAsync,
    processingStats,
    isProcessing,
  };
}

// ============ AI Summaries Hook ============
export function useCompanySummaries(companyId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-summaries', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('company_ai_summaries')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;
      return (data || []) as unknown as AISummary[];
    },
    enabled: !!companyId,
  });

  const createSummaryMutation = useMutation({
    mutationFn: async (summaryData: Partial<AISummary> & { company_id: string; summary_type: AISummary['summary_type']; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('company_ai_summaries')
        .upsert({
          company_id: summaryData.company_id,
          user_id: user.id,
          summary_type: summaryData.summary_type,
          content: summaryData.content,
          items: summaryData.items || [],
          source_document_ids: summaryData.source_document_ids || [],
          model_used: summaryData.model_used || 'gemini-2.5-flash',
          generated_at: new Date().toISOString(),
        }, { onConflict: 'company_id,summary_type' })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AISummary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-summaries', companyId] });
    },
  });

  // Get specific summary types
  const overview = query.data?.find(s => s.summary_type === 'overview');
  const highlights = query.data?.find(s => s.summary_type === 'highlights');
  const risks = query.data?.find(s => s.summary_type === 'risks');
  const investmentThesis = query.data?.find(s => s.summary_type === 'investment_thesis');

  return {
    summaries: query.data || [],
    overview,
    highlights,
    risks,
    investmentThesis,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createSummary: createSummaryMutation.mutateAsync,
    isCreatingSummary: createSummaryMutation.isPending,
  };
}

// ============ Trigger Document Processing ============
export async function triggerDocumentProcessing(companyId: string) {
  const { data, error } = await supabase.functions.invoke('process-documents', {
    body: { company_id: companyId }
  });
  
  return { data, error };
}

// ============ Trigger AI Summary Generation ============
export async function generateAISummary(companyId: string, summaryType: AISummary['summary_type']) {
  const { data, error } = await supabase.functions.invoke('generate-ai-summary', {
    body: { company_id: companyId, summary_type: summaryType }
  });
  
  return { data, error };
}

export function useMyTasks(limit = 5) {
  const { user } = useAuth();
  const { tasks, isLoading } = useAppTasks();
  
  const myOpenTasks = tasks
    .filter(t => t.status !== 'done')
    .slice(0, limit);
  
  return {
    myTasks: myOpenTasks,
    isLoading,
  };
}
