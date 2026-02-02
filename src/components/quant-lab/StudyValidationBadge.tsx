/**
 * Study Validation Badge
 * 
 * Displays validation score and details for study results.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  BarChart3,
  Target,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  ValidationResult, 
  getValidationSummary,
} from '@/lib/studyValidation';

interface StudyValidationBadgeProps {
  validation: ValidationResult;
  compact?: boolean;
  className?: string;
}

export function StudyValidationBadge({ 
  validation, 
  compact = false,
  className,
}: StudyValidationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const summary = getValidationSummary(validation);
  
  const getIcon = () => {
    switch (summary.grade) {
      case 'A': return <ShieldCheck className="h-3.5 w-3.5" />;
      case 'B': return <Shield className="h-3.5 w-3.5" />;
      case 'C': return <Shield className="h-3.5 w-3.5" />;
      case 'D': return <ShieldAlert className="h-3.5 w-3.5" />;
      case 'F': return <ShieldX className="h-3.5 w-3.5" />;
    }
  };
  
  const getColorClasses = () => {
    switch (summary.color) {
      case 'emerald': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
      case 'green': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'yellow': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'orange': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'red': return 'bg-red-500/10 text-red-500 border-red-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };
  
  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "cursor-pointer gap-1 font-mono text-[10px]",
              getColorClasses(),
              className
            )}
          >
            {getIcon()}
            {validation.overallScore}
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <ValidationDetails validation={validation} />
        </PopoverContent>
      </Popover>
    );
  }
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn(
            "gap-2 h-8",
            getColorClasses(),
            className
          )}
        >
          {getIcon()}
          <span className="font-medium">{summary.label}</span>
          <span className="font-mono text-[10px] opacity-70">
            {validation.overallScore}/100
          </span>
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <ValidationDetails validation={validation} />
      </PopoverContent>
    </Popover>
  );
}

function ValidationDetails({ validation }: { validation: ValidationResult }) {
  const summary = getValidationSummary(validation);
  const { dataQuality, statisticalValidity, sanityChecks, warnings, errors } = validation;
  
  return (
    <div className="divide-y divide-border">
      {/* Header */}
      <div className="p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-2xl font-bold",
              summary.color === 'emerald' && 'text-emerald-500',
              summary.color === 'green' && 'text-green-500',
              summary.color === 'yellow' && 'text-yellow-500',
              summary.color === 'orange' && 'text-orange-500',
              summary.color === 'red' && 'text-red-500',
            )}>
              {summary.grade}
            </span>
            <div>
              <p className="font-medium text-sm">{summary.label}</p>
              <p className="text-xs text-muted-foreground">{summary.description}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold">{validation.overallScore}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Score</p>
          </div>
        </div>
      </div>
      
      {/* Score Breakdown */}
      <div className="p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Score Breakdown
        </p>
        
        <ScoreBar 
          label="Data Quality" 
          score={dataQuality.score} 
          icon={<Database className="h-3.5 w-3.5" />}
          detail={`${dataQuality.sampleSize} samples`}
        />
        
        <ScoreBar 
          label="Statistical Validity" 
          score={statisticalValidity.score} 
          icon={<BarChart3 className="h-3.5 w-3.5" />}
          detail={statisticalValidity.confidenceLevel}
        />
        
        <ScoreBar 
          label="Sanity Checks" 
          score={sanityChecks.score} 
          icon={<Target className="h-3.5 w-3.5" />}
          detail={`${sanityChecks.passedChecks}/${sanityChecks.totalChecks} passed`}
        />
      </div>
      
      {/* Key Metrics */}
      <div className="p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Key Metrics
        </p>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 rounded bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Sample Size</p>
            <p className="font-mono font-medium">
              {dataQuality.sampleSize}
              {!dataQuality.isSufficientSample && (
                <span className="text-orange-500 ml-1">
                  (min: {dataQuality.minSampleSize})
                </span>
              )}
            </p>
          </div>
          
          <div className="p-2 rounded bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Confidence</p>
            <p className="font-mono font-medium capitalize">
              {statisticalValidity.confidenceLevel}
            </p>
          </div>
          
          <div className="p-2 rounded bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Margin of Error</p>
            <p className="font-mono font-medium">
              ±{statisticalValidity.marginOfError.toFixed(1)}%
            </p>
          </div>
          
          <div className="p-2 rounded bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Significant?</p>
            <p className={cn(
              "font-mono font-medium",
              statisticalValidity.isStatisticallySignificant ? 'text-emerald-500' : 'text-orange-500'
            )}>
              {statisticalValidity.isStatisticallySignificant ? 'Yes' : 'No'}
              {statisticalValidity.pValue !== undefined && (
                <span className="text-muted-foreground ml-1">
                  (p={statisticalValidity.pValue.toFixed(3)})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
      
      {/* Warnings & Errors */}
      {(warnings.length > 0 || errors.length > 0) && (
        <div className="p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Issues
          </p>
          
          {errors.map((error, i) => (
            <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-red-500/10">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-500 font-medium">{error.code}</p>
                <p className="text-xs text-muted-foreground">{error.message}</p>
              </div>
            </div>
          ))}
          
          {warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-600 font-medium">{warning.code}</p>
                <p className="text-xs text-muted-foreground">{warning.message}</p>
                {warning.suggestion && (
                  <p className="text-xs text-yellow-600 mt-1">💡 {warning.suggestion}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Sanity Check Details */}
      {sanityChecks.checks.length > 0 && (
        <div className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Validation Checks
          </p>
          
          <div className="space-y-1">
            {sanityChecks.checks.map((check, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex items-center gap-2 text-xs p-1.5 rounded",
                  check.passed ? 'text-muted-foreground' : 'bg-orange-500/10 text-orange-600'
                )}
              >
                {check.passed ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                ) : check.severity === 'error' ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                )}
                <span>{check.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ 
  label, 
  score, 
  icon,
  detail,
}: { 
  label: string; 
  score: number;
  icon: React.ReactNode;
  detail?: string;
}) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {detail && (
            <span className="text-muted-foreground">{detail}</span>
          )}
          <span className="font-mono font-medium">{score}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// BATCH VALIDATION SUMMARY
// ============================================================

import type { BatchValidationResult } from '@/lib/studyValidation';

interface BatchValidationSummaryProps {
  validation: BatchValidationResult;
  className?: string;
}

export function BatchValidationSummary({ 
  validation,
  className,
}: BatchValidationSummaryProps) {
  const { totalStudies, validStudies, invalidStudies, averageScore, crossStudyIssues } = validation;
  
  const getGrade = (score: number) => {
    if (score >= 80) return { grade: 'A', color: 'emerald' };
    if (score >= 65) return { grade: 'B', color: 'green' };
    if (score >= 50) return { grade: 'C', color: 'yellow' };
    if (score >= 35) return { grade: 'D', color: 'orange' };
    return { grade: 'F', color: 'red' };
  };
  
  const gradeInfo = getGrade(averageScore);
  
  return (
    <div className={cn("p-4 rounded-lg border bg-card", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium">Study Validation Summary</h3>
            <p className="text-xs text-muted-foreground">
              {totalStudies} studies analyzed
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className={cn(
              "text-2xl font-bold",
              gradeInfo.color === 'emerald' && 'text-emerald-500',
              gradeInfo.color === 'green' && 'text-green-500',
              gradeInfo.color === 'yellow' && 'text-yellow-500',
              gradeInfo.color === 'orange' && 'text-orange-500',
              gradeInfo.color === 'red' && 'text-red-500',
            )}>
              {gradeInfo.grade}
            </p>
            <p className="text-[10px] text-muted-foreground">GRADE</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-mono font-bold">{averageScore}</p>
            <p className="text-[10px] text-muted-foreground">AVG SCORE</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded bg-muted/30 text-center">
          <p className="text-lg font-mono font-bold text-emerald-500">{validStudies}</p>
          <p className="text-[10px] text-muted-foreground">Valid</p>
        </div>
        <div className="p-2 rounded bg-muted/30 text-center">
          <p className="text-lg font-mono font-bold text-orange-500">{invalidStudies}</p>
          <p className="text-[10px] text-muted-foreground">Invalid</p>
        </div>
        <div className="p-2 rounded bg-muted/30 text-center">
          <p className="text-lg font-mono font-bold">{crossStudyIssues.length}</p>
          <p className="text-[10px] text-muted-foreground">Issues</p>
        </div>
      </div>
      
      {crossStudyIssues.length > 0 && (
        <div className="space-y-2">
          {crossStudyIssues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-yellow-500/10">
              <Info className="h-3.5 w-3.5 text-yellow-500 mt-0.5" />
              <span className="text-yellow-600">{issue.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
