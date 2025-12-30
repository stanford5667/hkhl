import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompanyAvatar } from '@/components/companies/CompanyAvatar';
import { RelationshipCounts } from './RelationshipBadges';
import { cn } from '@/lib/utils';

interface CompanyMiniCardProps {
  company: {
    id: string;
    name: string;
    industry?: string | null;
    company_type?: string | null;
    pipeline_stage?: string | null;
    revenue_ltm?: number | null;
  };
  variant?: 'default' | 'compact' | 'detailed';
  counts?: {
    tasks?: number;
    contacts?: number;
    documents?: number;
  };
  className?: string;
}

const stageColors: Record<string, string> = {
  pipeline: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  portfolio: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  prospect: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  passed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export function CompanyMiniCard({ company, variant = 'default', counts, className }: CompanyMiniCardProps) {
  const formatRevenue = (value: number | null | undefined) => {
    if (!value) return null;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  };

  return (
    <Link to={`/companies/${company.id}`}>
      <Card className={cn(
        "bg-card border-border hover:border-slate-700 transition-all cursor-pointer group",
        variant === 'compact' && "p-2",
        variant === 'default' && "p-4",
        variant === 'detailed' && "p-5",
        className
      )}>
      <div className="flex items-start gap-3">
        <CompanyAvatar 
          company={{ name: company.name }} 
          size={variant === 'compact' ? 'sm' : 'md'}
          />
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate group-hover:text-primary transition-colors">
              {company.name}
            </h4>
            {company.industry && variant !== 'compact' && (
              <p className="text-sm text-muted-foreground truncate">{company.industry}</p>
            )}
            
            {variant !== 'compact' && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {company.company_type && (
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", stageColors[company.company_type] || stageColors.prospect)}
                  >
                    {company.company_type}
                  </Badge>
                )}
                {company.pipeline_stage && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {company.pipeline_stage}
                  </span>
                )}
                {company.revenue_ltm && (
                  <span className="text-xs text-emerald-400">
                    {formatRevenue(company.revenue_ltm)}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {variant === 'detailed' && counts && (
            <RelationshipCounts 
              tasks={counts.tasks}
              contacts={counts.contacts}
              documents={counts.documents}
            />
          )}
        </div>
      </Card>
    </Link>
  );
}
