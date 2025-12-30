import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, FileText, Globe, Loader2, CheckCircle, AlertCircle, RefreshCw, Database } from 'lucide-react';
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
  step: 'idle' | 'company' | 'documents' | 'website' | 'saving' | 'complete' | 'error';
  progress: number;
  message?: string;
  fieldsUpdated?: number;
  documentsProcessed?: number;
  error?: string;
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
      
      const companyFields: Record<string, any> = {};
      
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
      setStatus({ step: 'documents', progress: 30, message: 'Fetching data room documents...' });
      
      const { data: documents } = await supabase
        .from('documents')
        .select('id, name, file_type, file_path, folder')
        .eq('company_id', company.id);

      const documentFields: Record<string, any> = {};

      if (documents && documents.length > 0) {
        const totalDocs = documents.length;
        
        for (let i = 0; i < documents.length; i++) {
          const doc = documents[i];
          const progressPct = 30 + Math.round((i / totalDocs) * 40);
          setStatus({ 
            step: 'documents', 
            progress: progressPct, 
            message: `Processing ${doc.name} (${i + 1}/${totalDocs})...` 
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

            // Convert to text (for text-based files)
            let textContent = '';
            if (doc.file_type?.includes('text') || 
                doc.file_type?.includes('json') || 
                doc.file_type?.includes('csv') ||
                doc.name.endsWith('.txt') ||
                doc.name.endsWith('.csv') ||
                doc.name.endsWith('.json')) {
              textContent = await fileData.text();
            } else {
              // For non-text files, try to get text anyway
              try {
                textContent = await fileData.text();
                // If it looks like binary, skip
                if (textContent.includes('\u0000')) {
                  console.log(`Skipping ${doc.name}: Binary file`);
                  continue;
                }
              } catch {
                console.log(`Skipping ${doc.name}: Cannot read as text`);
                continue;
              }
            }

            if (!textContent || textContent.length < 50) {
              continue;
            }

            // Call summarize-document to extract structured data
            const { data: summaryData, error: summaryError } = await supabase.functions.invoke('summarize-document', {
              body: {
                documentContent: textContent.substring(0, 15000),
                fileName: doc.name,
                fileType: doc.file_type || ''
              }
            });

            if (summaryError) {
              console.log(`Error summarizing ${doc.name}:`, summaryError);
              continue;
            }

            documentsProcessed++;

            // Extract key figures into our field format
            if (summaryData?.key_figures && Array.isArray(summaryData.key_figures)) {
              for (const figure of summaryData.key_figures) {
                const label = figure.label?.toLowerCase() || '';
                const value = figure.value;
                
                // Map common labels to our field names
                if (label.includes('revenue')) {
                  const numValue = parseNumericValue(value);
                  if (numValue !== null) {
                    documentFields['revenue_ltm'] = {
                      value: numValue,
                      confidence: 0.8,
                      sourceType: 'document',
                      sourceName: doc.name,
                      excerpt: `${figure.label}: ${figure.value}`
                    };
                  }
                } else if (label.includes('ebitda')) {
                  const numValue = parseNumericValue(value);
                  if (numValue !== null) {
                    documentFields['ebitda_ltm'] = {
                      value: numValue,
                      confidence: 0.8,
                      sourceType: 'document',
                      sourceName: doc.name,
                      excerpt: `${figure.label}: ${figure.value}`
                    };
                  }
                } else if (label.includes('employee')) {
                  const numValue = parseNumericValue(value);
                  if (numValue !== null) {
                    documentFields['employee_count'] = {
                      value: numValue,
                      confidence: 0.7,
                      sourceType: 'document',
                      sourceName: doc.name,
                      excerpt: `${figure.label}: ${figure.value}`
                    };
                  }
                } else if (label.includes('margin')) {
                  const numValue = parseNumericValue(value);
                  if (numValue !== null) {
                    if (label.includes('ebitda')) {
                      documentFields['ebitda_margin'] = {
                        value: numValue,
                        confidence: 0.8,
                        sourceType: 'document',
                        sourceName: doc.name,
                        excerpt: `${figure.label}: ${figure.value}`
                      };
                    } else if (label.includes('gross')) {
                      documentFields['gross_margin'] = {
                        value: numValue,
                        confidence: 0.8,
                        sourceType: 'document',
                        sourceName: doc.name,
                        excerpt: `${figure.label}: ${figure.value}`
                      };
                    }
                  }
                }
              }
            }

            // Store document summary as business_model if we don't have one
            if (summaryData?.summary && !documentFields['business_model'] && !companyFields['description']) {
              documentFields['business_model'] = {
                value: summaryData.summary,
                confidence: 0.7,
                sourceType: 'document',
                sourceName: doc.name,
                excerpt: summaryData.summary.substring(0, 100)
              };
            }

            // Store insights if available
            if (summaryData?.insights && Array.isArray(summaryData.insights) && summaryData.insights.length > 0) {
              documentFields['investment_thesis'] = {
                value: summaryData.insights.join('. '),
                confidence: 0.6,
                sourceType: 'document',
                sourceName: doc.name
              };
            }

          } catch (docError) {
            console.error(`Error processing ${doc.name}:`, docError);
          }
        }
      }

      // Step 3: Save all extracted fields
      setStatus({ step: 'saving', progress: 80, message: 'Saving extracted data...' });

      // Merge fields - document fields take precedence if company fields exist but are from user_input
      const allFields = { ...companyFields };
      for (const [key, value] of Object.entries(documentFields)) {
        if (!allFields[key] || allFields[key].sourceType === 'user_input') {
          // Document data can supplement but not override manual entries with higher confidence
          if (!allFields[key]) {
            allFields[key] = value;
          }
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
          fieldNames: Object.keys(allFields)
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
              <h4 className="font-medium text-sm">Auto-Fill Data</h4>
              <p className="text-xs text-muted-foreground">
                Extract from data room documents & company profile
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
              {status.step === 'website' && <Globe className="h-4 w-4" />}
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
            Data Room Documents
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper to parse numeric values from strings like "$45M", "45 million", "45%"
function parseNumericValue(value: string): number | null {
  if (!value) return null;
  
  const cleaned = value.replace(/[$,]/g, '').toLowerCase().trim();
  
  // Handle percentages
  if (cleaned.includes('%')) {
    const num = parseFloat(cleaned.replace('%', ''));
    return isNaN(num) ? null : num;
  }
  
  // Handle millions/billions
  let multiplier = 1;
  let numStr = cleaned;
  
  if (cleaned.includes('b') || cleaned.includes('billion')) {
    multiplier = 1000;
    numStr = cleaned.replace(/b(illion)?/g, '');
  } else if (cleaned.includes('m') || cleaned.includes('million')) {
    multiplier = 1;
    numStr = cleaned.replace(/m(illion)?/g, '');
  } else if (cleaned.includes('k') || cleaned.includes('thousand')) {
    multiplier = 0.001;
    numStr = cleaned.replace(/k|thousand/g, '');
  }
  
  const num = parseFloat(numStr);
  return isNaN(num) ? null : num * multiplier;
}
