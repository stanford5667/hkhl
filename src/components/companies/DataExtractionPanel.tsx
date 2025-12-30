import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, FileText, Globe, Search, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { documentExtractionService } from '@/services/documentExtractionService';
import { websiteExtractionService } from '@/services/websiteExtractionService';
import { dataReconciliationService } from '@/services/dataReconciliationService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DataExtractionPanelProps {
  company: {
    id: string;
    name: string;
    website?: string | null;
    industry?: string | null;
  };
  onComplete?: () => void;
}

interface ExtractionStatus {
  step: 'idle' | 'documents' | 'website' | 'research' | 'saving' | 'complete' | 'error';
  progress: number;
  message?: string;
  fieldsUpdated?: number;
  conflicts?: any[];
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
    setStatus({ step: 'documents', progress: 20, message: 'Analyzing uploaded documents...' });

    const sources: any[] = [];

    try {
      // Step 1: Documents
      const docResults = await documentExtractionService.extractFromAllDocuments(company.id);
      if (Object.keys(docResults).length > 0) {
        sources.push({
          type: 'document',
          sourceName: 'Uploaded Documents',
          data: docResults
        });
      }

      // Step 2: Website
      if (company.website) {
        setStatus({ step: 'website', progress: 50, message: 'Scraping company website...' });
        const webResults = await websiteExtractionService.extractFromWebsite(company.website);
        if (webResults.success && Object.keys(webResults.data).length > 0) {
          sources.push({
            type: 'website',
            sourceName: company.website,
            sourceUrl: company.website,
            data: webResults.data
          });
        }
      }

      // Step 3: Reconcile & Save
      setStatus({ step: 'saving', progress: 80, message: 'Reconciling data...' });
      
      if (sources.length > 0) {
        const result = await dataReconciliationService.reconcileAndSave(company.id, user.id, sources);
        
        setStatus({
          step: 'complete',
          progress: 100,
          fieldsUpdated: result.fieldsUpdated,
          conflicts: result.conflicts
        });

        toast.success(`Updated ${result.fieldsUpdated} fields`);
      } else {
        setStatus({
          step: 'complete',
          progress: 100,
          fieldsUpdated: 0,
          message: 'No data sources available to extract from'
        });
        toast.info('No data sources available. Add a website or upload documents first.');
      }

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

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'documents': return <FileText className="h-4 w-4" />;
      case 'website': return <Globe className="h-4 w-4" />;
      case 'research': return <Search className="h-4 w-4" />;
      case 'saving': return <RefreshCw className="h-4 w-4 animate-spin" />;
      default: return null;
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
                Extract company data from website and documents
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
              {getStepIcon(status.step)}
              {status.message}
            </div>
          </div>
        )}

        {/* Success */}
        {status.step === 'complete' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            <span>Updated {status.fieldsUpdated} fields</span>
            {status.conflicts && status.conflicts.length > 0 && (
              <span className="text-amber-600 text-xs">
                ({status.conflicts.length} conflicts need review)
              </span>
            )}
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
            <Globe className="h-3 w-3" />
            Website {company.website ? '✓' : '—'}
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Documents
          </div>
          <div className="flex items-center gap-1">
            <Search className="h-3 w-3" />
            AI Research
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
