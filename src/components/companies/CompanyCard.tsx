import { ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Company } from '@/hooks/useCompanies';
import { formatDistanceToNow } from 'date-fns';

interface CompanyCardProps {
  company: Company & { 
    company_type?: string; 
    website?: string;
    revenue_ltm?: number | null;
    ebitda_ltm?: number | null;
    pipeline_stage?: string;
  };
  onClick?: () => void;
}

function HealthDot({ score }: { score: number }) {
  const getHealthClass = () => {
    if (score >= 70) return 'health-dot-good';
    if (score >= 40) return 'health-dot-warning';
    return 'health-dot-critical';
  };

  return <div className={cn('health-dot', getHealthClass())} />;
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return '—';
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(1)}M`;
}

export function CompanyCard({ company, onClick }: CompanyCardProps) {
  // Calculate a mock health score based on available data
  const healthScore = company.ebitda_ltm && company.revenue_ltm 
    ? Math.min(100, Math.round((company.ebitda_ltm / company.revenue_ltm) * 100 * 5))
    : 75;

  const margin = company.ebitda_ltm && company.revenue_ltm
    ? ((company.ebitda_ltm / company.revenue_ltm) * 100).toFixed(1)
    : null;

  const stageBadgeVariant = company.company_type === 'portfolio' ? 'default' : 'secondary';

  return (
    <div 
      className="card-interactive p-5 cursor-pointer group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex gap-3 mb-4">
        <div className="h-12 w-12 bg-surface-3 rounded-lg flex items-center justify-center text-xl font-semibold text-muted-foreground">
          {company.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">{company.name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {company.industry || 'No industry'} • {company.pipeline_stage || company.company_type || 'Pipeline'}
          </p>
        </div>
        <HealthDot score={healthScore} />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4 py-3 border-y border-border text-center">
        <div>
          <p className="text-muted-foreground text-xs mb-1">Revenue</p>
          <p className="text-foreground font-medium">{formatCurrency(company.revenue_ltm)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-1">EBITDA</p>
          <p className="text-foreground font-medium">{formatCurrency(company.ebitda_ltm)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-1">Health</p>
          <p className={cn(
            'font-medium',
            healthScore >= 70 ? 'text-success' : healthScore >= 40 ? 'text-warning' : 'text-destructive'
          )}>
            {healthScore}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(new Date(company.updated_at), { addSuffix: true })}
          </span>
          {margin && (
            <Badge variant="outline" className="text-xs">
              {margin}% margin
            </Badge>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="opacity-0 group-hover:opacity-100 transition-opacity text-primary"
        >
          Open <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}