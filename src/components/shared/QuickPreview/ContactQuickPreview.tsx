import React from 'react';
import { User, Mail, Phone, Building2, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QuickPreviewCard } from './QuickPreviewCard';
import type { AppContact } from '@/hooks/useAppData';

interface ContactQuickPreviewProps {
  contact: AppContact;
  companyName?: string;
  recentTasks?: { title: string; dueDate?: string }[];
  onClose: () => void;
  onOpenDetail: () => void;
  onEdit?: () => void;
  onAddTask?: () => void;
}

export function ContactQuickPreview({
  contact,
  companyName,
  recentTasks,
  onClose,
  onOpenDetail,
  onEdit,
  onAddTask,
}: ContactQuickPreviewProps) {
  const fullName = `${contact.first_name} ${contact.last_name}`;

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'executive':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'lender':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'board':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'legal':
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <QuickPreviewCard
      title={fullName}
      subtitle={contact.title || undefined}
      icon={<User className="h-5 w-5" />}
      badge={
        contact.category && (
          <Badge variant="outline" className={getCategoryColor(contact.category)}>
            {contact.category}
          </Badge>
        )
      }
      onClose={onClose}
      onOpenDetail={onOpenDetail}
      onEdit={onEdit}
      onAddTask={onAddTask}
    >
      {/* Contact Info */}
      <div className="space-y-2">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span className="truncate">{contact.email}</span>
          </a>
        )}
        
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span>{contact.phone}</span>
          </a>
        )}
        
        {companyName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{companyName}</span>
          </div>
        )}
      </div>

      {/* Recent Tasks */}
      {recentTasks && recentTasks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Recent Tasks
          </p>
          <div className="space-y-1">
            {recentTasks.slice(0, 2).map((task, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-1.5 rounded bg-muted/50 text-sm"
              >
                <Briefcase className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes preview */}
      {contact.notes && (
        <p className="text-sm text-muted-foreground line-clamp-2">{contact.notes}</p>
      )}
    </QuickPreviewCard>
  );
}
