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

export interface AppContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  category: string | null;
  company_id: string | null;
  organization_id: string | null;
  user_id: string;
  created_at: string;
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

  return {
    contacts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createContact: createMutation.mutateAsync,
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
