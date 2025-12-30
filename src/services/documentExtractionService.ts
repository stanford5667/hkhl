import { supabase } from '@/integrations/supabase/client';

interface ExtractedField {
  value: any;
  confidence: number;
  excerpt?: string;
  sourceId?: string;
  sourceName?: string;
  sourceType?: string;
}

interface ExtractionResult {
  success: boolean;
  fieldsExtracted: number;
  data: Record<string, ExtractedField>;
  errors?: string[];
}

class DocumentExtractionService {
  /**
   * Extract structured data from a document using AI
   */
  async extractFromDocument(
    documentId: string,
    documentContent: string,
    documentType: string,
    documentName: string
  ): Promise<ExtractionResult> {
    try {
      const fields = this.getFieldsForDocumentType(documentType);
      
      const { data: responseData, error: fnError } = await supabase.functions.invoke('extract-document', {
        body: {
          content: documentContent,
          documentType,
          documentName,
          fields
        }
      });
      
      if (fnError) {
        console.error('Document extraction error:', fnError);
        return { success: false, fieldsExtracted: 0, data: {}, errors: [fnError.message] };
      }
      
      if (!responseData?.success) {
        return { success: false, fieldsExtracted: 0, data: {}, errors: [responseData?.error || 'Extraction failed'] };
      }
      
      const extractedData = responseData.data || {};
      
      // Add document source info to each field
      Object.keys(extractedData).forEach(key => {
        if (extractedData[key].value !== null) {
          extractedData[key].sourceId = documentId;
          extractedData[key].sourceName = documentName;
          extractedData[key].sourceType = 'document';
        }
      });
      
      return {
        success: true,
        fieldsExtracted: Object.keys(extractedData).filter(k => extractedData[k].value !== null).length,
        data: extractedData
      };
    } catch (error) {
      console.error('Document extraction error:', error);
      return { 
        success: false, 
        fieldsExtracted: 0, 
        data: {}, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }
  
  /**
   * Extract from all documents for a company
   */
  async extractFromAllDocuments(companyId: string): Promise<Record<string, ExtractedField>> {
    const { data: documents } = await supabase
      .from('documents')
      .select('id, name, file_type')
      .eq('company_id', companyId);
    
    if (!documents || documents.length === 0) {
      return {};
    }
    
    const allExtracted: Record<string, ExtractedField> = {};
    
    // For now, we'll use summarize-document to get content
    // In a full implementation, you'd extract text from stored files
    for (const doc of documents) {
      const docType = this.inferDocumentType(doc.name);
      
      // Skip if we can't process this type
      if (!['pdf', 'xlsx', 'docx', 'txt'].some(ext => doc.file_type?.includes(ext))) {
        continue;
      }
      
      // For MVP, we'll mark documents as sources but use company-level extraction
      // Real implementation would parse each document individually
    }
    
    return allExtracted;
  }
  
  /**
   * Infer document type from filename
   */
  inferDocumentType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes('cim') || lower.includes('memorandum')) return 'cim';
    if (lower.includes('financial') || lower.includes('p&l') || lower.includes('income')) return 'financials';
    if (lower.includes('presentation') || lower.includes('deck') || lower.includes('pitch')) return 'presentation';
    if (lower.includes('cap') && lower.includes('table')) return 'cap_table';
    if (lower.includes('teaser')) return 'teaser';
    return 'default';
  }
  
  /**
   * Get relevant fields based on document type
   */
  getFieldsForDocumentType(docType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      'cim': [
        'revenue_ltm', 'ebitda_ltm', 'ebitda_margin', 'gross_margin',
        'employee_count', 'founded', 'headquarters', 'business_model',
        'key_competitors', 'market_position', 'tam', 'customer_count',
        'top_customers', 'customer_concentration', 'investment_thesis',
        'ceo_name', 'leadership_team', 'revenue_growth_yoy'
      ],
      'financials': [
        'revenue_ltm', 'revenue_growth_yoy', 'revenue_cagr_3yr',
        'ebitda_ltm', 'ebitda_margin', 'gross_margin', 'net_income',
        'total_debt', 'cash', 'net_debt', 'employee_count',
        'revenue_per_employee', 'recurring_revenue_pct'
      ],
      'presentation': [
        'revenue_ltm', 'ebitda_ltm', 'employee_count', 'key_competitors',
        'market_position', 'tam', 'customer_count', 'business_model'
      ],
      'teaser': [
        'revenue_ltm', 'ebitda_ltm', 'employee_count', 'industry',
        'headquarters', 'business_model', 'asking_price'
      ],
      'cap_table': ['ownership_type', 'total_debt'],
      'default': ['revenue_ltm', 'ebitda_ltm', 'employee_count', 'headquarters', 'description', 'business_model']
    };
    
    return fieldMap[docType] || fieldMap.default;
  }
}

export const documentExtractionService = new DocumentExtractionService();
