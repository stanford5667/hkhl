import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DocumentRecord {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  folder: string | null;
  subfolder: string | null;
  created_at: string;
  updated_at: string;
}

interface SaveDocumentParams {
  companyId: string;
  name: string;
  filePath: string;
  fileType?: string;
  fileSize?: number;
  folder?: string;
  subfolder?: string;
}

export function useDocuments() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const saveDocument = async (params: SaveDocumentParams): Promise<DocumentRecord | null> => {
    if (!user) {
      toast.error('Please sign in to save documents');
      return null;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          company_id: params.companyId,
          user_id: user.id,
          name: params.name,
          file_path: params.filePath,
          file_type: params.fileType,
          file_size: params.fileSize,
          folder: params.folder || 'Financial',
          subfolder: params.subfolder || 'Historical'
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Document saved to data room');
      return data;
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const getDocumentsForCompany = async (companyId: string): Promise<DocumentRecord[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  };

  const deleteDocument = async (documentId: string, filePath?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Delete from storage if file path provided
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath]);
        
        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
        }
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      toast.success('Document deleted');
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
      return false;
    }
  };

  const updateDocumentFolder = async (documentId: string, folder: string, subfolder?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ folder, subfolder: subfolder || null })
        .eq('id', documentId);

      if (error) throw error;
      toast.success(`Document moved to ${folder}${subfolder ? ` / ${subfolder}` : ''}`);
      return true;
    } catch (error) {
      console.error('Error updating document folder:', error);
      toast.error('Failed to move document');
      return false;
    }
  };

  const getDownloadUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting download URL:', error);
      toast.error('Failed to get download link');
      return null;
    }
  };

  return { saveDocument, getDocumentsForCompany, deleteDocument, updateDocumentFolder, getDownloadUrl, saving };
}
