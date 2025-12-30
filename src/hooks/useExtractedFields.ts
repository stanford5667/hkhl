import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getFieldInfo } from '@/config/companyFields';

interface ExtractedFieldData {
  fieldName: string;
  label: string;
  value: any;
  type: string;
  unit?: string;
  category: string;
  sourceType: string;
  sourceName: string;
  sourceUrl?: string;
  sourceExcerpt?: string;
  confidence: number;
  isVerified: boolean;
  extractedAt: string;
}

interface UseExtractedFieldsReturn {
  fields: ExtractedFieldData[];
  fieldsByCategory: Record<string, ExtractedFieldData[]>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useExtractedFields(companyId: string): UseExtractedFieldsReturn {
  const [fields, setFields] = useState<ExtractedFieldData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFields = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('company_data_fields')
        .select('*')
        .eq('company_id', companyId);

      if (fetchError) throw fetchError;

      const mappedFields: ExtractedFieldData[] = (data || []).map(row => {
        const fieldInfo = getFieldInfo(row.field_name);
        return {
          fieldName: row.field_name,
          label: fieldInfo?.label || row.field_name,
          value: row.value,
          type: fieldInfo?.type || row.value_type,
          unit: fieldInfo?.unit,
          category: row.field_category,
          sourceType: row.source_type,
          sourceName: row.source_name || 'Unknown',
          sourceUrl: row.source_url || undefined,
          sourceExcerpt: row.source_excerpt || undefined,
          confidence: Number(row.confidence) || 0.5,
          isVerified: row.is_verified || false,
          extractedAt: row.extracted_at
        };
      });

      setFields(mappedFields);
    } catch (err) {
      console.error('Error fetching extracted fields:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch fields'));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // Group fields by category
  const fieldsByCategory = fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, ExtractedFieldData[]>);

  return {
    fields,
    fieldsByCategory,
    loading,
    error,
    refetch: fetchFields
  };
}
