import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, User, CheckSquare, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelationshipBadgesProps {
  company?: { id: string; name: string } | null;
  contact?: { id: string; name: string } | null;
  assignee?: { id: string; name: string; avatar?: string } | null;
  size?: 'sm' | 'md';
  className?: string;
}

export function RelationshipBadges({ 
  company, 
  contact, 
  assignee, 
  size = 'md',
  className 
}: RelationshipBadgesProps) {
  const badgeClass = size === 'sm' ? 'text-xs py-0 px-1.5' : 'text-xs py-0.5 px-2';
  const iconClass = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';
  
  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      {company && (
        <Link to={`/portfolio/${company.id}`} onClick={(e) => e.stopPropagation()}>
          <Badge 
            variant="outline" 
            className={cn(
              "text-blue-400 border-blue-800/50 hover:bg-blue-900/30 transition-colors cursor-pointer",
              badgeClass
            )}
          >
            <Building2 className={cn(iconClass, "mr-1")} />
            {company.name}
          </Badge>
        </Link>
      )}
      {contact && (
        <Link to={`/contacts?id=${contact.id}`} onClick={(e) => e.stopPropagation()}>
          <Badge 
            variant="outline" 
            className={cn(
              "text-emerald-400 border-emerald-800/50 hover:bg-emerald-900/30 transition-colors cursor-pointer",
              badgeClass
            )}
          >
            <User className={cn(iconClass, "mr-1")} />
            {contact.name}
          </Badge>
        </Link>
      )}
      {assignee && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-purple-400 border-purple-800/50",
            badgeClass
          )}
        >
          <Avatar className={cn(size === 'sm' ? "h-3 w-3" : "h-4 w-4", "mr-1")}>
            <AvatarImage src={assignee.avatar} />
            <AvatarFallback className="text-[6px] bg-purple-700/50">
              {assignee.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {assignee.name}
        </Badge>
      )}
    </div>
  );
}

interface RelationshipCountsProps {
  tasks?: number;
  contacts?: number;
  documents?: number;
  className?: string;
}

export function RelationshipCounts({ tasks, contacts, documents, className }: RelationshipCountsProps) {
  return (
    <div className={cn("flex gap-3 text-xs text-muted-foreground", className)}>
      {typeof tasks === 'number' && (
        <span className="flex items-center gap-1">
          <CheckSquare className="h-3 w-3" />
          {tasks}
        </span>
      )}
      {typeof contacts === 'number' && (
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {contacts}
        </span>
      )}
      {typeof documents === 'number' && (
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {documents}
        </span>
      )}
    </div>
  );
}
