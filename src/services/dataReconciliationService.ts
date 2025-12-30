import { supabase } from '@/integrations/supabase/client';
import { SOURCE_PRIORITY, getFieldInfo } from '@/config/companyFields';

interface ExtractedField {
  value: any;
  confidence: number;
  excerpt?: string;
  sourceId?: string;
  sourceName?: string;
  sourceType?: string;
  sourceUrl?: string;
}

interface DataSource {
  type: 'document' | 'website' | 'user_input' | 'perplexity' | 'calculated';
  sourceId?: string;
  sourceName: string;
  sourceUrl?: string;
  data: Record<string, ExtractedField>;
}

interface MergedField {
  value: any;
  confidence: number;
  source: {
    type: string;
    name: string;
    id?: string;
    url?: string;
    excerpt?: string;
  };
  alternateValues?: Array<{
    value: any;
    source: string;
    confidence: number;
  }>;
}

interface Conflict {
  fieldName: string;
  fieldLabel: string;
  currentValue: any;
  newValue: any;
  currentSource: string;
  newSource: string;
  recommendation: 'keep_current' | 'use_new' | 'needs_review';
}

interface ReconciliationResult {
  merged: Record<string, MergedField>;
  conflicts: Conflict[];
  fieldsUpdated: number;
  fieldsSkipped: number;
}

class DataReconciliationService {
  /**
   * Reconcile data from multiple sources and save
   */
  async reconcileAndSave(
    companyId: string,
    userId: string,
    sources: DataSource[]
  ): Promise<ReconciliationResult> {
    const existing = await this.getExistingData(companyId);
    
    const merged: Record<string, MergedField> = {};
    const conflicts: Conflict[] = [];
    let fieldsSkipped = 0;
    
    // Process each source
    for (const source of sources) {
      for (const [fieldName, fieldData] of Object.entries(source.data)) {
        if (fieldData.value === null || fieldData.value === undefined) continue;
        
        const existingField = existing[fieldName];
        const currentMerged = merged[fieldName];
        
        const newPriority = this.calculatePriority(source.type, fieldData.confidence);
        const existingPriority = existingField 
          ? this.calculatePriority(existingField.source_type, existingField.confidence)
          : 0;
        const currentPriority = currentMerged
          ? this.calculatePriority(currentMerged.source.type, currentMerged.confidence)
          : 0;
        
        const compareValue = currentMerged?.value ?? existingField?.value;
        const comparePriority = Math.max(currentPriority, existingPriority);
        const compareSource = currentMerged?.source.type ?? existingField?.source_type;
        
        // No existing value - just add
        if (compareValue === null || compareValue === undefined) {
          merged[fieldName] = this.createMergedField(fieldData, source);
          continue;
        }
        
        // Check if values match
        if (this.valuesMatch(compareValue, fieldData.value)) {
          if (currentMerged) {
            currentMerged.confidence = Math.min(1, currentMerged.confidence + 0.1);
          }
          continue;
        }
        
        // Values differ - handle conflict
        const fieldInfo = getFieldInfo(fieldName);
        const conflict: Conflict = {
          fieldName,
          fieldLabel: fieldInfo?.label || fieldName,
          currentValue: compareValue,
          newValue: fieldData.value,
          currentSource: compareSource || 'unknown',
          newSource: source.type,
          recommendation: this.getRecommendation(comparePriority, newPriority, fieldData.confidence)
        };
        conflicts.push(conflict);
        
        // Auto-resolve if new value is clearly better
        if (conflict.recommendation === 'use_new') {
          merged[fieldName] = this.createMergedField(fieldData, source);
          merged[fieldName].alternateValues = [{
            value: compareValue,
            source: compareSource || 'unknown',
            confidence: existingField?.confidence ?? currentMerged?.confidence ?? 0.5
          }];
        } else {
          fieldsSkipped++;
        }
      }
    }
    
    // Save to database
    const fieldsUpdated = await this.saveToDatabase(companyId, userId, merged);
    
    // Log extraction history
    await this.logExtraction(companyId, userId, sources, fieldsUpdated, conflicts);
    
    return { merged, conflicts, fieldsUpdated, fieldsSkipped };
  }
  
  /**
   * Get existing data for a company
   */
  private async getExistingData(companyId: string): Promise<Record<string, any>> {
    const { data } = await supabase
      .from('company_data_fields')
      .select('*')
      .eq('company_id', companyId);
    
    const result: Record<string, any> = {};
    data?.forEach(row => {
      result[row.field_name] = {
        value: row.value,
        confidence: row.confidence,
        source_type: row.source_type,
        source_name: row.source_name,
        is_verified: row.is_verified
      };
    });
    return result;
  }
  
  private calculatePriority(sourceType: string, confidence: number): number {
    const basePriority = SOURCE_PRIORITY[sourceType] || 50;
    return basePriority * (confidence || 0.5);
  }
  
  private valuesMatch(a: any, b: any): boolean {
    if (typeof a === 'number' && typeof b === 'number') {
      if (a === 0 && b === 0) return true;
      return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) < 0.05;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase().trim() === b.toLowerCase().trim();
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
    }
    return JSON.stringify(a) === JSON.stringify(b);
  }
  
  private getRecommendation(
    currentPriority: number,
    newPriority: number,
    newConfidence: number
  ): 'keep_current' | 'use_new' | 'needs_review' {
    if (newPriority > currentPriority * 1.2 && newConfidence >= 0.7) {
      return 'use_new';
    }
    if (currentPriority > newPriority * 1.5) {
      return 'keep_current';
    }
    return 'needs_review';
  }
  
  private createMergedField(fieldData: ExtractedField, source: DataSource): MergedField {
    return {
      value: fieldData.value,
      confidence: fieldData.confidence,
      source: {
        type: source.type,
        name: source.sourceName,
        id: source.sourceId,
        url: source.sourceUrl,
        excerpt: fieldData.excerpt
      }
    };
  }
  
  private getFieldCategory(fieldName: string): string {
    const info = getFieldInfo(fieldName);
    return info?.category || 'other';
  }
  
  private async saveToDatabase(
    companyId: string,
    userId: string,
    merged: Record<string, MergedField>
  ): Promise<number> {
    let updated = 0;
    
    for (const [fieldName, field] of Object.entries(merged)) {
      const { error } = await supabase
        .from('company_data_fields')
        .upsert({
          company_id: companyId,
          user_id: userId,
          field_name: fieldName,
          field_category: this.getFieldCategory(fieldName),
          value: field.value,
          value_type: typeof field.value,
          source_type: field.source.type,
          source_id: field.source.id || null,
          source_name: field.source.name,
          source_url: field.source.url || null,
          source_excerpt: field.source.excerpt || null,
          confidence: field.confidence,
          extracted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id,field_name'
        });
      
      if (!error) updated++;
    }
    
    return updated;
  }
  
  private async logExtraction(
    companyId: string,
    userId: string,
    sources: DataSource[],
    fieldsUpdated: number,
    conflicts: Conflict[]
  ): Promise<void> {
    await supabase.from('extraction_history').insert({
      company_id: companyId,
      user_id: userId,
      extraction_type: 'bulk',
      source_name: sources.map(s => s.sourceName).join(', '),
      fields_extracted: sources.reduce((sum, s) => sum + Object.keys(s.data).length, 0),
      fields_updated: fieldsUpdated,
      status: conflicts.length > 0 ? 'partial' : 'success',
      extracted_data: { 
        sources: sources.map(s => ({ type: s.type, name: s.sourceName })), 
        conflicts 
      } as any
    });
  }
  
  /**
   * Get all extracted fields for a company
   */
  async getCompanyFields(companyId: string): Promise<Record<string, any>> {
    const { data } = await supabase
      .from('company_data_fields')
      .select('*')
      .eq('company_id', companyId);
    
    const result: Record<string, any> = {};
    data?.forEach(row => {
      result[row.field_name] = {
        value: row.value,
        confidence: row.confidence,
        sourceType: row.source_type,
        sourceName: row.source_name,
        sourceUrl: row.source_url,
        sourceExcerpt: row.source_excerpt,
        isVerified: row.is_verified,
        extractedAt: row.extracted_at
      };
    });
    return result;
  }
}

export const dataReconciliationService = new DataReconciliationService();
