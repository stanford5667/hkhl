import React from 'react';
import { Building2, DollarSign, TrendingUp, User, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QuickPreviewCard } from './QuickPreviewCard';
import type { Tables } from '@/integrations/supabase/types';

type Company = Tables<'companies'>;

interface CompanyQuickPreviewProps {
  company: Company;
  recentActivity?: string;
  topContact?: { name: string; role?: string } | null;
  onClose: () => void;
  onOpenDetail: () => void;
  onEdit?: () => void;
  onAddTask?: () => void;
  onAddNote?: () => void;
}

export function CompanyQuickPreview({
  company,
  recentActivity,
  topContact,
  onClose,
  onOpenDetail,
  onEdit,
  onAddTask,
  onAddNote,
}: CompanyQuickPreviewProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return '—';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const getStageColor = (stage: string | null) => {
    switch (stage?.toLowerCase()) {
      case 'closed':
      case 'won':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'due diligence':
      case 'diligence':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'negotiation':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'passed':
      case 'lost':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <QuickPreviewCard
      title={company.name}
      subtitle={company.industry || company.description?.slice(0, 50)}
      icon={<Building2 className="h-5 w-5" />}
      badge={
        company.pipeline_stage && (
          <Badge variant="outline" className={getStageColor(company.pipeline_stage)}>
            {company.pipeline_stage}
          </Badge>
        )
      }
      onClose={onClose}
      onOpenDetail={onOpenDetail}
      onEdit={onEdit}
      onAddTask={onAddTask}
      onAddNote={onAddNote}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            Revenue LTM
          </div>
          <p className="font-medium">{formatCurrency(company.revenue_ltm)}</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            EBITDA LTM
          </div>
          <p className="font-medium">{formatCurrency(company.ebitda_ltm)}</p>
        </div>
      </div>

      {/* Top Contact */}
      {topContact && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
          <User className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{topContact.name}</p>
            {topContact.role && (
              <p className="text-xs text-muted-foreground truncate">{topContact.role}</p>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity && (
        <div className="flex items-start gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-muted-foreground">{recentActivity}</p>
        </div>
      )}
    </QuickPreviewCard>
  );
}
