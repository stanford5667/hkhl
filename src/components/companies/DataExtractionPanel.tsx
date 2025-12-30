import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, FileText, Loader2, CheckCircle, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getFieldInfo } from '@/config/companyFields';

interface DataExtractionPanelProps {
  company: {
    id: string;
    name: string;
    website?: string | null;
    industry?: string | null;
    description?: string | null;
    revenue_ltm?: number | null;
    ebitda_ltm?: number | null;
    deal_lead?: string | null;
    status?: string | null;
  };
  onComplete?: () => void;
}

interface ExtractionStatus {
  step: 'idle' | 'company' | 'documents' | 'saving' | 'complete' | 'error';
  progress: number;
  message?: string;
  fieldsUpdated?: number;
  documentsProcessed?: number;
  error?: string;
}

interface ExtractedField {
  value: number | string;
  confidence: number;
  excerpt?: string;
}

export function DataExtractionPanel({ company, onComplete }: DataExtractionPanelProps) {
  const { user } = useAuth();
  const [isExtracting, setIsExtracting] = useState(false);
  const [status, setStatus] = useState<ExtractionStatus>({ step: 'idle', progress: 0 });

  const handleExtractAll = async () => {
    if (!user) {
      toast.error('You must be logged in to extract data');
      return;
    }

    setIsExtracting(true);
    let fieldsUpdated = 0;
    let documentsProcessed = 0;

    try {
      // Step 1: Extract from existing company data
      setStatus({ step: 'company', progress: 10, message: 'Extracting existing company data...' });
      
      const companyFields: Record<string, { value: any; confidence: number; sourceType: string; sourceName: string; excerpt?: string }> = {};
      
      // Map existing company fields
      if (company.description) {
        companyFields['description'] = {
          value: company.description,
          confidence: 1.0,
          sourceType: 'user_input',
          sourceName: 'Company Profile'
        };
      }
      if (company.industry) {
        companyFields['industry'] = {
          value: company.industry,
          confidence: 1.0,
          sourceType: 'user_input',
          sourceName: 'Company Profile'
        };
      }
      if (company.revenue_ltm) {
        companyFields['revenue_ltm'] = {
          value: company.revenue_ltm,
          confidence: 1.0,
          sourceType: 'user_input',
          sourceName: 'Company Profile'
        };
      }
      if (company.ebitda_ltm) {
        companyFields['ebitda_ltm'] = {
          value: company.ebitda_ltm,
          confidence: 1.0,
          sourceType: 'user_input',
          sourceName: 'Company Profile'
        };
      }
      if (company.website) {
        companyFields['website'] = {
          value: company.website,
          confidence: 1.0,
          sourceType: 'user_input',
          sourceName: 'Company Profile'
        };
      }

      // Step 2: Get all documents from data room
      setStatus({ step: 'documents', progress: 20, message: 'Fetching data room documents...' });
      
      const { data: documents } = await supabase
        .from('documents')
        .select('id, name, file_type, file_path, folder')
        .eq('company_id', company.id);

      const documentFields: Record<string, { value: any; confidence: number; sourceType: string; sourceName: string; excerpt?: string }> = {};

      if (documents && documents.length > 0) {
        const totalDocs = documents.length;
        
        // Filter to financial document types that are likely to contain metrics
        const financialDocs = documents.filter(doc => {
          const name = doc.name.toLowerCase();
          const folder = doc.folder?.toLowerCase() || '';
          const ext = doc.file_type?.toLowerCase() || name.split('.').pop() || '';
          
          // Include spreadsheets, CSVs, and common financial document names
          const isSpreadsheet = ['xlsx', 'xls', 'csv'].includes(ext);
          const isFinancialFolder = ['financials', 'financial', 'historical', 'models'].some(f => folder.includes(f));
          const isFinancialName = ['financial', 'model', 'p&l', 'income', 'balance', 'cim', 'teaser', 'summary', 'revenue', 'ebitda'].some(f => name.includes(f));
          
          return isSpreadsheet || isFinancialFolder || isFinancialName;
        });

        // Process all docs but prioritize financial ones
        const docsToProcess = [...financialDocs, ...documents.filter(d => !financialDocs.includes(d))];
        
        for (let i = 0; i < docsToProcess.length; i++) {
          const doc = docsToProcess[i];
          const progressPct = 20 + Math.round((i / docsToProcess.length) * 50);
          setStatus({ 
            step: 'documents', 
            progress: progressPct, 
            message: `Extracting from ${doc.name} (${i + 1}/${docsToProcess.length})...` 
          });

          try {
            // Download document content from storage
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('documents')
              .download(doc.file_path);

            if (downloadError || !fileData) {
              console.log(`Skipping ${doc.name}: Could not download`, downloadError);
              continue;
            }

            // Convert to text
            let textContent = '';
            try {
              textContent = await fileData.text();
              // Skip binary files
              if (textContent.includes('\u0000') || textContent.length < 50) {
                console.log(`Skipping ${doc.name}: Binary or too short`);
                continue;
              }
            } catch {
              console.log(`Skipping ${doc.name}: Cannot read as text`);
              continue;
            }

            // Call extract-company-financials edge function for detailed extraction
            const { data: extractionResult, error: extractionError } = await supabase.functions.invoke('extract-company-financials', {
              body: {
                file_data: textContent,
                file_name: doc.name,
                company_name: company.name
              }
            });

            if (extractionError) {
              console.log(`Error extracting from ${doc.name}:`, extractionError);
              // Fall back to summarize-document for non-financial docs
              continue;
            }

            if (!extractionResult?.success || !extractionResult?.extracted_fields) {
              console.log(`No fields extracted from ${doc.name}`);
              continue;
            }

            documentsProcessed++;
            console.log(`Extracted ${Object.keys(extractionResult.extracted_fields).length} fields from ${doc.name}`);

            // Merge extracted fields - keep highest confidence
            for (const [fieldName, fieldData] of Object.entries(extractionResult.extracted_fields as Record<string, ExtractedField>)) {
              const existingField = documentFields[fieldName];
              
              if (!existingField || (fieldData.confidence > existingField.confidence)) {
                documentFields[fieldName] = {
                  value: fieldData.value,
                  confidence: fieldData.confidence,
                  sourceType: 'document',
                  sourceName: doc.name,
                  excerpt: fieldData.excerpt
                };
              }
            }

          } catch (docError) {
            console.error(`Error processing ${doc.name}:`, docError);
          }
        }
      }

      // Step 3: Save all extracted fields
      setStatus({ step: 'saving', progress: 80, message: 'Saving extracted data...' });

      // Merge fields - document extractions can supplement profile data
      // Document data with high confidence can override user input
      const allFields = { ...companyFields };
      for (const [key, value] of Object.entries(documentFields)) {
        const existing = allFields[key];
        
        // Document data overrides if:
        // 1. No existing value, OR
        // 2. Document confidence is high (>= 0.8) and field is a financial metric
        const isFinancialField = ['revenue_ltm', 'ebitda_ltm', 'ebitda_margin', 'gross_margin', 'net_income', 
          'revenue_growth_yoy', 'total_debt', 'cash', 'net_debt', 'employee_count', 'asking_price', 
          'ev_ebitda_multiple', 'customer_count', 'nrr', 'churn_rate', 'customer_concentration',
          'revenue_cagr_3yr', 'recurring_revenue_pct'].includes(key);
        
        if (!existing) {
          allFields[key] = value;
        } else if (isFinancialField && value.confidence >= 0.8 && existing.sourceType === 'user_input') {
          // High-confidence document extraction can update financial metrics
          allFields[key] = value;
        }
      }

      // Save to company_data_fields table
      for (const [fieldName, fieldData] of Object.entries(allFields)) {
        const fieldInfo = getFieldInfo(fieldName);
        
        const { error: insertError } = await supabase
          .from('company_data_fields')
          .upsert({
            company_id: company.id,
            user_id: user.id,
            field_name: fieldName,
            field_category: fieldInfo?.category || 'other',
            value: fieldData.value,
            value_type: typeof fieldData.value,
            source_type: fieldData.sourceType,
            source_name: fieldData.sourceName,
            source_excerpt: fieldData.excerpt || null,
            confidence: fieldData.confidence,
            extracted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'company_id,field_name'
          });

        if (!insertError) {
          fieldsUpdated++;
        }
      }

      // Also update the companies table with key financial metrics from high-confidence extractions
      const updatePayload: Record<string, number | null> = {};
      if (documentFields['revenue_ltm']?.confidence >= 0.8 && documentFields['revenue_ltm']?.value) {
        updatePayload.revenue_ltm = Number(documentFields['revenue_ltm'].value);
      }
      if (documentFields['ebitda_ltm']?.confidence >= 0.8 && documentFields['ebitda_ltm']?.value) {
        updatePayload.ebitda_ltm = Number(documentFields['ebitda_ltm'].value);
      }
      
      if (Object.keys(updatePayload).length > 0) {
        await supabase
          .from('companies')
          .update(updatePayload)
          .eq('id', company.id);
      }

      // Log extraction history
      await supabase.from('extraction_history').insert({
        company_id: company.id,
        user_id: user.id,
        extraction_type: 'data_room',
        source_name: `Company profile + ${documentsProcessed} documents`,
        fields_extracted: Object.keys(allFields).length,
        fields_updated: fieldsUpdated,
        status: 'success',
        extracted_data: { 
          documentsProcessed,
          fieldNames: Object.keys(allFields),
          documentFieldsExtracted: Object.keys(documentFields)
        }
      });

      setStatus({
        step: 'complete',
        progress: 100,
        fieldsUpdated,
        documentsProcessed
      });

      toast.success(`Extracted ${fieldsUpdated} fields from ${documentsProcessed} documents`);
      onComplete?.();

    } catch (error) {
      console.error('Extraction error:', error);
      setStatus({ 
        step: 'error', 
        progress: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      toast.error('Extraction failed');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Auto-Fill Financials</h4>
              <p className="text-xs text-muted-foreground">
                Extract Revenue, EBITDA & more from data room documents
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleExtractAll} 
            disabled={isExtracting}
            size="sm"
          >
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Extract All
              </>
            )}
          </Button>
        </div>

        {/* Progress */}
        {status.step !== 'idle' && status.step !== 'complete' && status.step !== 'error' && (
          <div className="mt-4 space-y-2">
            <Progress value={status.progress} className="h-2" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {status.step === 'company' && <Database className="h-4 w-4" />}
              {status.step === 'documents' && <FileText className="h-4 w-4" />}
              {status.step === 'saving' && <RefreshCw className="h-4 w-4 animate-spin" />}
              {status.message}
            </div>
          </div>
        )}

        {/* Success */}
        {status.step === 'complete' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            <span>
              Updated {status.fieldsUpdated} fields from {status.documentsProcessed} documents
            </span>
          </div>
        )}

        {/* Error */}
        {status.step === 'error' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {status.error}
          </div>
        )}

        {/* Source indicators */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Company Profile
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Data Room (Financials, Models, CIMs)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
