import { Target, Briefcase, XCircle, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StageIndicatorProps {
  stage: string | null;
  subStage?: string | null;
}

const stageConfig: Record<string, { color: string; label: string; icon: typeof Target }> = {
  pipeline: { color: 'blue', label: 'Pipeline', icon: Target },
  portfolio: { color: 'emerald', label: 'Portfolio', icon: Briefcase },
  passed: { color: 'slate', label: 'Passed', icon: XCircle },
  prospect: { color: 'purple', label: 'Prospect', icon: LogOut },
};

const subStageLabels: Record<string, string> = {
  'sourcing': 'Sourcing',
  'initial-review': 'Initial Review',
  'deep-dive': 'Deep Dive',
  'loi': 'LOI',
  'due-diligence': 'Due Diligence',
  'closing': 'Closing',
};

export function StageIndicator({ stage, subStage }: StageIndicatorProps) {
  const config = stageConfig[stage || 'pipeline'] || stageConfig.pipeline;
  const Icon = config.icon;

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    emerald: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
    slate: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
    purple: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  };

  return (
    <div className="flex flex-col gap-1">
      <Badge className={cn('border', colorClasses[config.color])}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
      {subStage && stage === 'pipeline' && (
        <span className="text-xs text-muted-foreground pl-1">
          {subStageLabels[subStage] || subStage}
        </span>
      )}
    </div>
  );
}
