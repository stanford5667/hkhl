import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type CompanyType = 'pipeline' | 'portfolio' | 'prospect' | 'passed';

interface CompanyTypeBadgeProps {
  type: CompanyType | null;
}

export function CompanyTypeBadge({ type }: CompanyTypeBadgeProps) {
  if (!type) return null;

  const variants: Record<CompanyType, string> = {
    pipeline: 'bg-primary/20 text-primary border-primary/30',
    portfolio: 'bg-success/20 text-success border-success/30',
    prospect: 'bg-warning/20 text-warning border-warning/30',
    passed: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Badge
      variant="outline"
      className={cn('capitalize font-medium', variants[type])}
    >
      {type}
    </Badge>
  );
}
