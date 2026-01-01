import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgId, AssetType } from '@/contexts/OrganizationContext';
import { isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';

// Types
export type AssetClass = 'private_equity' | 'public_equity' | 'real_estate' | 'credit' | 'other';

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  description: string | null;
  company_type: 'pipeline' | 'portfolio' | 'prospect' | 'passed' | null;
  pipeline_stage: string | null;
  revenue_ltm: number | null;
  ebitda_ltm: number | null;
  deal_lead: string | null;
  status: string | null;
  user_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  // New asset fields
  asset_class: AssetClass | null;
  ticker_symbol: string | null;
  exchange: string | null;
  current_price: number | null;
  price_updated_at: string | null;
  shares_owned: number | null;
  cost_basis: number | null;
  market_value: number | null;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  company_id: string | null;
  category: string | null;
  notes: string | null;
  user_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  company_id: string | null;
  contact_id: string | null;
  assignee_id: string | null;
  user_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Document {
  id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  folder: string | null;
  company_id: string;
  user_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyWithRelations extends Company {
  contacts: Contact[];
  tasks: Task[];
  documents: Document[];
  openTaskCount: number;
  overdueTaskCount: number;
  contactCount: number;
  documentCount: number;
  lastActivity: string | null;
}

export interface ContactWithRelations extends Contact {
  company: Company | null;
  tasks: Task[];
  openTaskCount: number;
}

export interface TaskWithRelations extends Task {
  company: Company | null;
  contact: Contact | null;
}

export interface AssetClassStats {
  count: number;
  totalValue: number;
  totalCostBasis: number;
  totalMarketValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface DashboardStats {
  totalCompanies: number;
  pipelineCount: number;
  portfolioCount: number;
  prospectCount: number;
  totalContacts: number;
  openTasks: number;
  overdueTasks: number;
  todayTasks: number;
  totalDocuments: number;
  byAssetClass: Record<AssetClass, AssetClassStats>;
}

export interface PipelineStageStats {
  count: number;
  totalValue: number;
  companies: CompanyWithRelations[];
}

export interface PipelineStats {
  byStage: Record<string, PipelineStageStats>;
  totalPipelineValue: number;
  totalDeals: number;
}

export interface SearchResult {
  type: 'company' | 'contact' | 'task' | 'document';
  id: string;
  title: string;
  subtitle: string | null;
  data: Company | Contact | Task | Document;
}

interface UnifiedDataContextValue {
  // Raw data
  companies: Company[];
  contacts: Contact[];
  tasks: Task[];
  documents: Document[];
  
  // Enriched data
  companiesWithRelations: CompanyWithRelations[];
  contactsWithRelations: ContactWithRelations[];
  tasksWithRelations: TaskWithRelations[];
  
  // Stats
  dashboardStats: DashboardStats;
  pipelineStats: PipelineStats;
  
  // Loading states
  isLoading: boolean;
  isCompaniesLoading: boolean;
  isContactsLoading: boolean;
  isTasksLoading: boolean;
  isDocumentsLoading: boolean;
  
  // Actions
  refetchAll: () => void;
  searchAll: (query: string) => SearchResult[];
  
  // Filtered data helpers
  getCompaniesByAssetClass: (assetClass: AssetClass | 'all') => CompanyWithRelations[];
  getHoldings: () => CompanyWithRelations[];
}

const UnifiedDataContext = createContext<UnifiedDataContextValue | undefined>(undefined);

export function UnifiedDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  // Fetch companies
  const { data: companies = [], isLoading: isCompaniesLoading } = useQuery({
    queryKey: ['unified-companies', user?.id, orgId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase.from('companies').select('*').order('updated_at', { ascending: false });
      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        query = query.eq('user_id', user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Company[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Fetch contacts
  const { data: contacts = [], isLoading: isContactsLoading } = useQuery({
    queryKey: ['unified-contacts', user?.id, orgId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase.from('contacts').select('*').order('updated_at', { ascending: false });
      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        query = query.eq('user_id', user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Contact[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Fetch tasks
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['unified-tasks', user?.id, orgId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase.from('tasks').select('*').order('due_date', { ascending: true });
      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        query = query.eq('user_id', user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Task[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Fetch documents
  const { data: documents = [], isLoading: isDocumentsLoading } = useQuery({
    queryKey: ['unified-documents', user?.id, orgId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase.from('documents').select('*').order('updated_at', { ascending: false });
      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        query = query.eq('user_id', user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Document[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unified-data-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        queryClient.invalidateQueries({ queryKey: ['unified-companies'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['unified-contacts'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        queryClient.invalidateQueries({ queryKey: ['unified-tasks'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
        queryClient.invalidateQueries({ queryKey: ['unified-documents'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Compute companies with relations
  const companiesWithRelations = useMemo<CompanyWithRelations[]>(() => {
    const now = new Date();
    const todayStart = startOfDay(now);

    return companies.map(company => {
      const companyContacts = contacts.filter(c => c.company_id === company.id);
      const companyTasks = tasks.filter(t => t.company_id === company.id);
      const companyDocuments = documents.filter(d => d.company_id === company.id);
      
      const openTasks = companyTasks.filter(t => t.status !== 'done' && t.status !== 'completed');
      const overdueTasks = openTasks.filter(t => {
        if (!t.due_date) return false;
        return isBefore(parseISO(t.due_date), todayStart);
      });

      // Find last activity from tasks, contacts, documents
      const activityDates = [
        company.updated_at,
        ...companyTasks.map(t => t.updated_at),
        ...companyContacts.map(c => c.updated_at),
        ...companyDocuments.map(d => d.updated_at),
      ].filter(Boolean).map(d => new Date(d));

      const lastActivity = activityDates.length > 0
        ? new Date(Math.max(...activityDates.map(d => d.getTime()))).toISOString()
        : null;

      return {
        ...company,
        contacts: companyContacts,
        tasks: companyTasks,
        documents: companyDocuments,
        openTaskCount: openTasks.length,
        overdueTaskCount: overdueTasks.length,
        contactCount: companyContacts.length,
        documentCount: companyDocuments.length,
        lastActivity,
      };
    });
  }, [companies, contacts, tasks, documents]);

  // Compute contacts with relations
  const contactsWithRelations = useMemo<ContactWithRelations[]>(() => {
    return contacts.map(contact => {
      const company = contact.company_id 
        ? companies.find(c => c.id === contact.company_id) || null 
        : null;
      const contactTasks = tasks.filter(t => t.contact_id === contact.id);
      const openTasks = contactTasks.filter(t => t.status !== 'done' && t.status !== 'completed');

      return {
        ...contact,
        company,
        tasks: contactTasks,
        openTaskCount: openTasks.length,
      };
    });
  }, [contacts, companies, tasks]);

  // Compute tasks with relations
  const tasksWithRelations = useMemo<TaskWithRelations[]>(() => {
    return tasks.map(task => {
      const company = task.company_id 
        ? companies.find(c => c.id === task.company_id) || null 
        : null;
      const contact = task.contact_id 
        ? contacts.find(c => c.id === task.contact_id) || null 
        : null;

      return {
        ...task,
        company,
        contact,
      };
    });
  }, [tasks, companies, contacts]);

  // Compute dashboard stats
  const dashboardStats = useMemo<DashboardStats>(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'completed');
    const overdueTasks = openTasks.filter(t => {
      if (!t.due_date) return false;
      return isBefore(parseISO(t.due_date), todayStart);
    });
    const todayTasks = openTasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = parseISO(t.due_date);
      return !isBefore(dueDate, todayStart) && !isAfter(dueDate, todayEnd);
    });

    // Compute stats by asset class
    const assetClasses: AssetClass[] = ['private_equity', 'public_equity', 'real_estate', 'credit', 'other'];
    const byAssetClass: Record<AssetClass, AssetClassStats> = {} as Record<AssetClass, AssetClassStats>;
    
    assetClasses.forEach(assetClass => {
      const classCompanies = companies.filter(c => (c.asset_class || 'private_equity') === assetClass);
      const totalValue = classCompanies.reduce((sum, c) => sum + (c.ebitda_ltm || 0), 0);
      const totalCostBasis = classCompanies.reduce((sum, c) => sum + (c.cost_basis || 0), 0);
      const totalMarketValue = classCompanies.reduce((sum, c) => sum + (c.market_value || 0), 0);
      const gainLoss = totalMarketValue - totalCostBasis;
      const gainLossPercent = totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0;
      
      byAssetClass[assetClass] = {
        count: classCompanies.length,
        totalValue,
        totalCostBasis,
        totalMarketValue,
        gainLoss,
        gainLossPercent,
      };
    });

    return {
      totalCompanies: companies.length,
      pipelineCount: companies.filter(c => c.company_type === 'pipeline').length,
      portfolioCount: companies.filter(c => c.company_type === 'portfolio').length,
      prospectCount: companies.filter(c => c.company_type === 'prospect').length,
      totalContacts: contacts.length,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      todayTasks: todayTasks.length,
      totalDocuments: documents.length,
      byAssetClass,
    };
  }, [companies, contacts, tasks, documents]);

  // Compute pipeline stats
  const pipelineStats = useMemo<PipelineStats>(() => {
    const pipelineCompanies = companiesWithRelations.filter(c => c.company_type === 'pipeline');
    const byStage: Record<string, PipelineStageStats> = {};
    let totalPipelineValue = 0;

    pipelineCompanies.forEach(company => {
      const stage = company.pipeline_stage || 'sourcing';
      const value = company.ebitda_ltm || 0;
      
      if (!byStage[stage]) {
        byStage[stage] = { count: 0, totalValue: 0, companies: [] };
      }
      
      byStage[stage].count += 1;
      byStage[stage].totalValue += value;
      byStage[stage].companies.push(company);
      totalPipelineValue += value;
    });

    return {
      byStage,
      totalPipelineValue,
      totalDeals: pipelineCompanies.length,
    };
  }, [companiesWithRelations]);

  // Search function
  const searchAll = useCallback((query: string): SearchResult[] => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search companies
    companies.forEach(company => {
      if (
        company.name.toLowerCase().includes(lowerQuery) ||
        company.industry?.toLowerCase().includes(lowerQuery) ||
        company.description?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          type: 'company',
          id: company.id,
          title: company.name,
          subtitle: company.industry,
          data: company,
        });
      }
    });

    // Search contacts
    contacts.forEach(contact => {
      const fullName = `${contact.first_name} ${contact.last_name}`;
      if (
        fullName.toLowerCase().includes(lowerQuery) ||
        contact.email?.toLowerCase().includes(lowerQuery) ||
        contact.title?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          type: 'contact',
          id: contact.id,
          title: fullName,
          subtitle: contact.title || contact.email,
          data: contact,
        });
      }
    });

    // Search tasks
    tasks.forEach(task => {
      if (
        task.title.toLowerCase().includes(lowerQuery) ||
        task.description?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          type: 'task',
          id: task.id,
          title: task.title,
          subtitle: task.status,
          data: task,
        });
      }
    });

    // Search documents
    documents.forEach(doc => {
      if (
        doc.name.toLowerCase().includes(lowerQuery) ||
        doc.folder?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          type: 'document',
          id: doc.id,
          title: doc.name,
          subtitle: doc.folder,
          data: doc,
        });
      }
    });

    return results;
  }, [companies, contacts, tasks, documents]);

  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['unified-companies'] });
    queryClient.invalidateQueries({ queryKey: ['unified-contacts'] });
    queryClient.invalidateQueries({ queryKey: ['unified-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['unified-documents'] });
  }, [queryClient]);

  // Filter companies by asset class
  const getCompaniesByAssetClass = useCallback((assetClass: AssetClass | 'all'): CompanyWithRelations[] => {
    if (assetClass === 'all') return companiesWithRelations;
    return companiesWithRelations.filter(c => (c.asset_class || 'private_equity') === assetClass);
  }, [companiesWithRelations]);

  // Get holdings (portfolio companies across all asset classes)
  const getHoldings = useCallback((): CompanyWithRelations[] => {
    return companiesWithRelations.filter(c => c.company_type === 'portfolio');
  }, [companiesWithRelations]);

  const value: UnifiedDataContextValue = {
    companies,
    contacts,
    tasks,
    documents,
    companiesWithRelations,
    contactsWithRelations,
    tasksWithRelations,
    dashboardStats,
    pipelineStats,
    isLoading: isCompaniesLoading || isContactsLoading || isTasksLoading || isDocumentsLoading,
    isCompaniesLoading,
    isContactsLoading,
    isTasksLoading,
    isDocumentsLoading,
    refetchAll,
    searchAll,
    getCompaniesByAssetClass,
    getHoldings,
  };

  return (
    <UnifiedDataContext.Provider value={value}>
      {children}
    </UnifiedDataContext.Provider>
  );
}

// Hooks
export function useUnifiedData() {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useUnifiedData must be used within UnifiedDataProvider');
  }
  return context;
}

export function useDashboardData() {
  const { dashboardStats, companiesWithRelations, tasksWithRelations, isLoading } = useUnifiedData();
  
  const recentCompanies = useMemo(() => 
    companiesWithRelations.slice(0, 5), 
    [companiesWithRelations]
  );

  const upcomingTasks = useMemo(() => 
    tasksWithRelations
      .filter(t => t.status !== 'done' && t.status !== 'completed')
      .slice(0, 5),
    [tasksWithRelations]
  );

  return {
    stats: dashboardStats,
    recentCompanies,
    upcomingTasks,
    isLoading,
  };
}

export function usePipelineData() {
  const { pipelineStats, companiesWithRelations, isLoading } = useUnifiedData();
  
  const pipelineCompanies = useMemo(() => 
    companiesWithRelations.filter(c => c.company_type === 'pipeline'),
    [companiesWithRelations]
  );

  return {
    stats: pipelineStats,
    companies: pipelineCompanies,
    isLoading,
  };
}

export function useGlobalSearch(query: string) {
  const { searchAll, isLoading } = useUnifiedData();
  
  const results = useMemo(() => searchAll(query), [searchAll, query]);
  
  return {
    results,
    isLoading,
  };
}
