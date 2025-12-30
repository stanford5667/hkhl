import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgId } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export type ContactCategory = 'lender' | 'executive' | 'board' | 'legal' | 'vendor' | 'team' | 'other';

export interface Contact {
  id: string;
  user_id: string;
  organization_id: string | null;
  company_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  category: ContactCategory;
  lender_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company?: {
    id: string;
    name: string;
  };
}

export interface CreateContactInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  title?: string;
  company_id?: string;
  category?: ContactCategory;
  lender_type?: string;
  notes?: string;
}

export function useContacts() {
  const { user } = useAuth();
  const orgId = useOrgId();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async () => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name)
        `)
        .order('last_name');

      // Filter by organization if available
      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContacts((data as Contact[]) || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const createContact = async (input: CreateContactInput): Promise<Contact | null> => {
    if (!user) {
      toast.error('Please sign in to create a contact');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          organization_id: orgId || null,
          ...input,
        })
        .select(`
          *,
          company:companies(id, name)
        `)
        .single();

      if (error) throw error;

      setContacts((prev) => [...prev, data as Contact]);
      toast.success(`Contact "${input.first_name} ${input.last_name}" created`);
      return data as Contact;
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error('Failed to create contact');
      return null;
    }
  };

  const updateContact = async (id: string, updates: Partial<CreateContactInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      toast.success('Contact updated');
      return true;
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Failed to update contact');
      return false;
    }
  };

  const deleteContact = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);

      if (error) throw error;

      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success('Contact deleted');
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
      return false;
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user, orgId]);

  return {
    contacts,
    loading,
    createContact,
    updateContact,
    deleteContact,
    refetch: fetchContacts,
  };
}
