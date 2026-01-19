import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, User, Building2, Users } from 'lucide-react';
import { TierFilter as TierFilterType } from '@/hooks/useCommandCenterMetrics';

interface TierFilterProps {
  value: TierFilterType;
  onChange: (tier: TierFilterType) => void;
  tierBreakdown: {
    free: number;
    pro: number;
    enterprise: number;
  };
}

export function TierFilter({ value, onChange, tierBreakdown }: TierFilterProps) {
  const filters: { id: TierFilterType; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { 
      id: 'all', 
      label: 'All Users', 
      icon: <Users className="h-4 w-4" />, 
      count: tierBreakdown.free + tierBreakdown.pro + tierBreakdown.enterprise,
      color: 'bg-muted'
    },
    { 
      id: 'free', 
      label: 'Free', 
      icon: <User className="h-4 w-4" />, 
      count: tierBreakdown.free,
      color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
    },
    { 
      id: 'pro', 
      label: 'Pro', 
      icon: <Crown className="h-4 w-4" />, 
      count: tierBreakdown.pro,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    },
    { 
      id: 'enterprise', 
      label: 'Enterprise', 
      icon: <Building2 className="h-4 w-4" />, 
      count: tierBreakdown.enterprise,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.id}
          variant={value === filter.id ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
          onClick={() => onChange(filter.id)}
        >
          {filter.icon}
          <span>{filter.label}</span>
          <Badge 
            variant="secondary" 
            className={`ml-1 ${value === filter.id ? 'bg-primary-foreground/20 text-primary-foreground' : filter.color}`}
          >
            {filter.count}
          </Badge>
        </Button>
      ))}
    </div>
  );
}
