import { useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, User, CheckSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type EntityType = 'company' | 'contact' | 'task';

interface LinkedEntityPreviewProps {
  type: EntityType;
  id: string;
  children: ReactNode;
}

export function LinkedEntityPreview({ type, id, children }: LinkedEntityPreviewProps) {
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data: preview, isLoading } = useQuery({
    queryKey: ['entity-preview', type, id],
    queryFn: async () => {
      if (type === 'company') {
        const { data } = await supabase
          .from('companies')
          .select('id, name, company_type, industry, revenue_ltm, pipeline_stage')
          .eq('id', id)
          .single();
        return data;
      }
      if (type === 'contact') {
        const { data } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, title, email, category')
          .eq('id', id)
          .single();
        return data;
      }
      if (type === 'task') {
        const { data } = await supabase
          .from('tasks')
          .select('id, title, status, priority, due_date')
          .eq('id', id)
          .single();
        return data;
      }
      return null;
    },
    enabled: shouldFetch,
    staleTime: 60000,
  });

  const formatRevenue = (value: number | null | undefined) => {
    if (!value) return null;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  };

  const renderPreview = () => {
    if (isLoading) {
      return <Skeleton className="h-16 w-full" />;
    }

    if (!preview) {
      return <p className="text-muted-foreground text-sm">Unable to load preview</p>;
    }

    if (type === 'company') {
      const company = preview as any;
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-blue-400" />
            <h4 className="font-medium">{company.name}</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{company.industry || 'No industry'}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs capitalize">
              {company.company_type}
            </Badge>
            {company.pipeline_stage && (
              <Badge variant="secondary" className="text-xs capitalize">
                {company.pipeline_stage}
              </Badge>
            )}
            {company.revenue_ltm && (
              <span className="text-xs text-emerald-400">
                {formatRevenue(company.revenue_ltm)} Revenue
              </span>
            )}
          </div>
        </div>
      );
    }

    if (type === 'contact') {
      const contact = preview as any;
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-emerald-400" />
            <h4 className="font-medium">{contact.first_name} {contact.last_name}</h4>
          </div>
          {contact.title && (
            <p className="text-sm text-muted-foreground mb-2">{contact.title}</p>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {contact.category || 'other'}
            </Badge>
            {contact.email && (
              <span className="text-xs text-muted-foreground truncate max-w-32">
                {contact.email}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (type === 'task') {
      const task = preview as any;
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="h-4 w-4 text-purple-400" />
            <h4 className="font-medium truncate">{task.title}</h4>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {task.status}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {task.priority}
            </Badge>
            {task.due_date && (
              <span className="text-xs text-muted-foreground">
                Due: {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger 
        asChild 
        onMouseEnter={() => setShouldFetch(true)}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72 bg-slate-900 border-slate-800">
        {renderPreview()}
      </HoverCardContent>
    </HoverCard>
  );
}
