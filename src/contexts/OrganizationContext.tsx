import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export type AssetType = 'private_equity' | 'public_equity' | 'real_estate' | 'credit' | 'other';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  type: string;
  is_public: boolean;
  plan: string;
  max_members: number;
  max_companies: number;
  settings: Record<string, unknown>;
  created_at: string;
  enabled_asset_types: AssetType[];
  default_asset_view: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  phone: string | null;
  linkedin_url: string | null;
  current_organization_id: string | null;
  onboarding_completed: boolean;
  onboarding_step: string;
  preferences: Record<string, unknown>;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  job_title: string | null;
  status: string;
  joined_at: string;
  organization?: Organization;
}

interface OrganizationContextValue {
  currentOrganization: Organization | null;
  userProfile: UserProfile | null;
  memberships: OrganizationMembership[];
  isLoading: boolean;
  enabledAssetTypes: AssetType[];
  switchOrganization: (orgId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setUserProfile(null);
      setIsLoading(false);
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setIsLoading(false);
      return null;
    }

    const profile: UserProfile = {
      id: data.id,
      user_id: data.user_id,
      full_name: data.full_name,
      avatar_url: data.avatar_url,
      job_title: data.job_title,
      phone: data.phone,
      linkedin_url: data.linkedin_url,
      current_organization_id: data.current_organization_id,
      onboarding_completed: data.onboarding_completed ?? false,
      onboarding_step: data.onboarding_step ?? 'profile',
      preferences: (data.preferences as Record<string, unknown>) ?? {},
    };

    setUserProfile(profile);
    return profile;
  }, [user]);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      return [];
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching memberships:', error);
      return [];
    }

    const membershipData = (data || []).map((m: any) => ({
      id: m.id,
      organization_id: m.organization_id,
      user_id: m.user_id,
      role: m.role,
      job_title: m.job_title,
      status: m.status,
      joined_at: m.joined_at,
      organization: m.organization,
    }));

    setMemberships(membershipData);
    return membershipData;
  }, [user]);

  const fetchCurrentOrganization = useCallback(async (orgId: string | null) => {
    if (!orgId) {
      setCurrentOrganization(null);
      return null;
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      setCurrentOrganization(null);
      return null;
    }

    const org: Organization = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      logo_url: data.logo_url,
      website: data.website,
      type: data.type || 'private_equity',
      is_public: data.is_public || false,
      plan: data.plan || 'free',
      max_members: data.max_members || 5,
      max_companies: data.max_companies || 50,
      settings: (data.settings as Record<string, unknown>) || {},
      created_at: data.created_at,
      enabled_asset_types: (data.enabled_asset_types as AssetType[]) || ['private_equity'],
      default_asset_view: data.default_asset_view || 'all',
    };

    setCurrentOrganization(org);
    return org;
  }, []);

  const switchOrganization = useCallback(async (orgId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ current_organization_id: orgId })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error switching organization:', error);
      return;
    }

    await fetchCurrentOrganization(orgId);
    setUserProfile(prev => prev ? { ...prev, current_organization_id: orgId } : null);
  }, [user, fetchCurrentOrganization]);

  const refreshProfile = useCallback(async () => {
    const profile = await fetchProfile();
    if (profile?.current_organization_id) {
      await fetchCurrentOrganization(profile.current_organization_id);
    }
  }, [fetchProfile, fetchCurrentOrganization]);

  const refreshOrganization = useCallback(async () => {
    if (userProfile?.current_organization_id) {
      await fetchCurrentOrganization(userProfile.current_organization_id);
    }
    await fetchMemberships();
  }, [userProfile?.current_organization_id, fetchCurrentOrganization, fetchMemberships]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const profile = await fetchProfile();
      await fetchMemberships();
      if (profile?.current_organization_id) {
        await fetchCurrentOrganization(profile.current_organization_id);
      }
      setIsLoading(false);
    };

    loadData();
  }, [user, fetchProfile, fetchMemberships, fetchCurrentOrganization]);

  const enabledAssetTypes: AssetType[] = currentOrganization?.enabled_asset_types || ['private_equity'];

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        userProfile,
        memberships,
        isLoading,
        enabledAssetTypes,
        switchOrganization,
        refreshProfile,
        refreshOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}

export function useCurrentOrg() {
  const { currentOrganization } = useOrganization();
  return currentOrganization;
}

export function useOrgId() {
  const { currentOrganization } = useOrganization();
  return currentOrganization?.id ?? null;
}
