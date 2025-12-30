import { useState } from 'react';
import { FileText, Globe, User, Search, Calculator, Check, Pencil, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { formatFieldValue } from '@/config/companyFields';

interface SourcedFieldProps {
  fieldName: string;
  label: string;
  value: any;
  type: string;
  unit?: string;
  sourceType: string;
  sourceName: string;
  sourceExcerpt?: string;
  confidence: number;
  isVerified?: boolean;
  onEdit?: () => void;
}

export function SourcedField({
  label,
  value,
  type,
  unit,
  sourceType,
  sourceName,
  sourceExcerpt,
  confidence,
  isVerified,
  onEdit
}: SourcedFieldProps) {
  const [showExcerpt, setShowExcerpt] = useState(false);

  const sourceConfig: Record<string, { icon: typeof FileText; color: string; label: string }> = {
    document: { icon: FileText, color: 'text-blue-500', label: 'Document' },
    website: { icon: Globe, color: 'text-emerald-500', label: 'Website' },
    user_input: { icon: User, color: 'text-purple-500', label: 'Manual' },
    perplexity: { icon: Search, color: 'text-amber-500', label: 'Research' },
    calculated: { icon: Calculator, color: 'text-slate-500', label: 'Calculated' }
  };

  const source = sourceConfig[sourceType] || sourceConfig.calculated;
  const SourceIcon = source.icon;

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'bg-emerald-500';
    if (confidence >= 0.5) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {/* Source icon with tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-0.5 hover:bg-muted rounded"
                  onClick={() => setShowExcerpt(!showExcerpt)}
                >
                  <SourceIcon className={cn('h-3 w-3', source.color)} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-medium">{source.label}</p>
                  <p className="text-muted-foreground">{sourceName}</p>
                  <p className="text-muted-foreground">
                    Confidence: {Math.round(confidence * 100)}%
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Confidence indicator */}
          <div className={cn('h-2 w-2 rounded-full', getConfidenceColor())} />

          {/* Verified badge */}
          {isVerified && (
            <Check className="h-3 w-3 text-emerald-500" />
          )}

          {/* Edit button */}
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="font-medium">
        {formatFieldValue(value, type, unit)}
      </div>

      {/* Excerpt (expandable) */}
      {showExcerpt && sourceExcerpt && (
        <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs">
          <p className="italic text-muted-foreground">"{sourceExcerpt}"</p>
          <p className="text-muted-foreground mt-1">— {sourceName}</p>
        </div>
      )}
    </div>
  );
}
