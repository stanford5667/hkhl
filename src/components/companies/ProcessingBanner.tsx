import { useCompanyDocuments } from '@/hooks/useAppData';
import { Sparkles, FileText, Loader2, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProcessingBannerProps {
  companyId: string;
}

export function ProcessingBanner({ companyId }: ProcessingBannerProps) {
  const { processingStats, isProcessing } = useCompanyDocuments(companyId);
  
  if (!isProcessing) return null;

  const { pending, processing, completed, total } = processingStats;
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const activeCount = pending + processing;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border",
      "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5",
      "border-primary/20"
    )}>
      {/* Animated gradient border */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 opacity-50 animate-pulse" />
      
      <div className="relative p-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-full animate-pulse">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="font-medium text-sm">
                Analyzing {activeCount} document{activeCount !== 1 ? 's' : ''}...
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Extracting key metrics and generating summary
            </p>
          </div>
          
          <div className="text-right text-sm text-muted-foreground">
            {completed} of {total} complete
          </div>
        </div>
        
        {/* Progress bar */}
        <Progress value={progress} className="h-1.5 mt-3" />
      </div>
    </div>
  );
}

// Compact processing indicator for headers
export function ProcessingIndicator({ companyId }: { companyId: string }) {
  const { isProcessing, processingStats } = useCompanyDocuments(companyId);
  
  if (!isProcessing) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-primary">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>Analyzing {processingStats.pending + processingStats.processing} docs...</span>
    </div>
  );
}

// Completion badge for when processing is done
export function AIAnalyzedBadge({ companyId }: { companyId: string }) {
  const { processingStats, isProcessing, documents } = useCompanyDocuments(companyId);
  
  // Only show if there are completed documents and not currently processing
  if (isProcessing || processingStats.completed === 0) return null;
  
  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600">
      <CheckCircle className="h-3 w-3" />
      <span>AI-Analyzed</span>
    </div>
  );
}