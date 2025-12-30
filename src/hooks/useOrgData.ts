import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgId } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrgCompany {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  pipeline_stage: string | null;
  company_type: 'pipeline' | 'portfolio' | 'prospect' | 'passed' | null;
  revenue_ltm: number | null;
  ebitda_ltm: number | null;
  deal_lead: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string | null;
}

export function useOrgCompanies(filters?: { 
  company_type?: string; 
  pipeline_stage?: string;
  search?: string;
}) {
  const { user } = useAuth();
  const orgId = useOrgId();
  const [companies, setCompanies] = useState<OrgCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by organization if available
      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        // Fallback to user_id for backward compatibility
        query = query.eq('user_id', user.id);
      }

      // Apply filters
      if (filters?.company_type) {
        query = query.eq('company_type', filters.company_type as any);
      }
      if (filters?.pipeline_stage) {
        query = query.eq('pipeline_stage', filters.pipeline_stage);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setIsLoading(false);
    }
  }, [user, orgId, filters?.company_type, filters?.pipeline_stage, filters?.search]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return { companies, isLoading, refetch: fetchCompanies };
}

export function useOrgContacts(filters?: { search?: string; category?: string }) {
  const { user } = useAuth();
  const orgId = useOrgId();
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!user) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('contacts')
        .select('*, company:companies(id, name)')
        .order('created_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        query = query.eq('user_id', user.id);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category as any);
      }
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, orgId, filters?.category, filters?.search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return { contacts, isLoading, refetch: fetchContacts };
}

export function useOrgTasks(filters?: { status?: string; priority?: string; assignee_id?: string }) {
  const { user } = useAuth();
  const orgId = useOrgId();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('tasks')
        .select('*, company:companies(id, name), assignee:team_members(id, name), assignee_contact:contacts(id, first_name, last_name)')
        .eq('is_template', false)
        .order('created_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        query = query.eq('user_id', user.id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, orgId, filters?.status, filters?.priority, filters?.assignee_id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, isLoading, refetch: fetchTasks };
}

export function useOrgDeals(filters?: { stage?: string }) {
  const { user } = useAuth();
  const orgId = useOrgId();
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    if (!user) {
      setDeals([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('deals')
        .select('*, company:companies(id, name)')
        .order('created_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        query = query.eq('user_id', user.id);
      }

      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, orgId, filters?.stage]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return { deals, isLoading, refetch: fetchDeals };
}

export function useOrgDocuments(companyId?: string) {
  const { user } = useAuth();
  const orgId = useOrgId();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!user) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        query = query.eq('user_id', user.id);
      }

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, orgId, companyId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, isLoading, refetch: fetchDocuments };
}
