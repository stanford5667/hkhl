import { cn } from '@/lib/utils';

interface HealthScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function HealthScore({ score, size = 'md', showLabel = false }: HealthScoreProps) {
  const getScoreColor = () => {
    if (score >= 70) return 'text-emerald-400 bg-emerald-500/20';
    if (score >= 40) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-rose-400 bg-rose-500/20';
  };

  const getScoreLabel = () => {
    if (score >= 70) return 'Healthy';
    if (score >= 40) return 'At Risk';
    return 'Critical';
  };

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-medium',
          sizeClasses[size],
          getScoreColor()
        )}
      >
        {score}
      </div>
      {showLabel && (
        <span className={cn('text-xs', getScoreColor().split(' ')[0])}>
          {getScoreLabel()}
        </span>
      )}
    </div>
  );
}
