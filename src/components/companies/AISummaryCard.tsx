import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  RefreshCw, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2 
} from 'lucide-react';
import { useCompanySummaries, generateAISummary, useCompanyDocuments } from '@/hooks/useAppData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AISummaryCardProps {
  companyId: string;
  companyName: string;
}

export function AISummaryCard({ companyId, companyName }: AISummaryCardProps) {
  const { overview, highlights, isLoading, refetch, isCreatingSummary } = useCompanySummaries(companyId);
  const { documents } = useCompanyDocuments(companyId);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { error } = await generateAISummary(companyId, 'overview');
      if (error) throw error;
      
      await refetch();
      toast.success('AI summary generated');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const sourceDocNames = overview?.source_document_ids?.length 
    ? documents
        .filter(d => overview.source_document_ids.includes(d.id))
        .map(d => d.name)
        .slice(0, 3)
    : [];

  if (isLoading) {
    return (
      <Card className="glass-card border-primary/20">
        <CardContent className="p-6">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No summary yet
  if (!overview && !highlights) {
    return (
      <Card className="glass-card border-dashed border-primary/30">
        <CardContent className="p-6 text-center">
          <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h4 className="font-medium mb-1">AI Summary Available</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Generate an AI-powered overview based on uploaded documents
          </p>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || documents.length === 0}
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Summary
              </>
            )}
          </Button>
          {documents.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Upload documents to the data room first
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-primary" />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">AI Summary</CardTitle>
            <Badge variant="secondary" className="text-xs">
              AI-Generated
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="icon-sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        {overview?.generated_at && (
          <p className="text-xs text-muted-foreground">
            Generated {formatDistanceToNow(new Date(overview.generated_at), { addSuffix: true })}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overview */}
        {overview && (
          <p className="text-sm text-foreground leading-relaxed">
            {overview.content}
          </p>
        )}

        {/* Highlights */}
        {highlights && highlights.items && highlights.items.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Key Highlights
            </h5>
            <div className="space-y-2">
              {highlights.items.slice(0, 4).map((item, index) => (
                <HighlightItem 
                  key={index}
                  title={item.title}
                  description={item.description}
                  sentiment={item.sentiment as 'positive' | 'negative' | 'neutral'}
                />
              ))}
            </div>
          </div>
        )}

        {/* Source documents */}
        {sourceDocNames.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>Based on: {sourceDocNames.join(', ')}</span>
            {(overview?.source_document_ids?.length || 0) > 3 && (
              <span>+{overview!.source_document_ids.length - 3} more</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HighlightItem({ 
  title, 
  description, 
  sentiment = 'neutral' 
}: { 
  title: string; 
  description: string; 
  sentiment?: 'positive' | 'negative' | 'neutral';
}) {
  const sentimentConfig = {
    positive: { icon: ThumbsUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    negative: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    neutral: { icon: Minus, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  };

  const config = sentimentConfig[sentiment] || sentimentConfig.neutral;
  const Icon = config.icon;

  return (
    <div className="flex gap-3 items-start">
      <div className={cn('p-1 rounded', config.bg)}>
        <Icon className={cn('h-3 w-3', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
      </div>
    </div>
  );
}